import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocalStorage } from './lib/utils';
import { Book, StudySession, StudyAlarm } from './types';
import BookManager from './components/BookManager';
import PomodoroTimer from './components/PomodoroTimer';
import Statistics from './components/Statistics';
import Settings from './components/Settings';
import Home from './components/Home';
import Alarms from './components/Alarms';
import Calendar from './components/Calendar';
import TodayPlan from './components/TodayPlan';
import { Book as BookIcon, Timer, LineChart, Sparkles, Settings as SettingsIcon, Home as HomeIcon, Bell, Calendar as CalendarIcon, Target, CalendarDays, Plus, MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { differenceInDays, parseISO } from 'date-fns';
import { getCloudSyncErrorMessage, syncDataToCloud } from './lib/cloudSync';

const AUTO_CLOUD_BACKUP_DEBOUNCE_MS = 8000;

export default function App() {
  const [books, setBooks, isBooksLoaded] = useLocalStorage<Book[]>('study-helper-books', []);
  const [sessions, setSessions, isSessionsLoaded] = useLocalStorage<StudySession[]>('study-helper-sessions', []);
  const [alarms, setAlarms, isAlarmsLoaded] = useLocalStorage<StudyAlarm[]>('study-helper-alarms', []);
  const [weeklyPlans, setWeeklyPlans, isWeeklyPlansLoaded] = useLocalStorage<Record<string, string>>('brightstudy_weekly_plans', {});
  const [monthlyPlans, setMonthlyPlans, isMonthlyPlansLoaded] = useLocalStorage<Record<string, string>>('brightstudy_monthly_plans', {});
  const [dailyGoalMinutes, setDailyGoalMinutes, isDailyGoalLoaded] = useLocalStorage<number>('study-helper-daily-goal', 120);
  const [isDarkMode, setIsDarkMode, isDarkLoaded] = useLocalStorage<boolean>('study-helper-dark', false);
  const [autoGoalDisplayMode, setAutoGoalDisplayMode, isAutoGoalLoaded] = useLocalStorage<'multiple' | 'single'>('study-auto-goal-display', 'multiple');
  const [activeTab, setActiveTab] = useState<'home' | 'plan' | 'books' | 'timer' | 'stats' | 'calendar' | 'alarms' | 'settings'>('home');

  const [dDay, setDDay, isDDayLoaded] = useLocalStorage<{date: string, title: string} | null>('study-helper-dday', null);
  
  const [globalFontSize, setGlobalFontSize, isFontSizeLoaded] = useLocalStorage<number>('study-helper-font-size', 16);
  const [preventWordWrap, setPreventWordWrap, isWordWrapLoaded] = useLocalStorage<boolean>('study-helper-word-wrap', false);
  const [showNavLabelsMobile, setShowNavLabelsMobile, isNavLabelsLoaded] = useLocalStorage<boolean>('study-helper-nav-labels', false);
  const [dDaySize, setDDaySize, isDDaySizeLoaded] = useLocalStorage<number>('study-helper-dday-size', 30);
  const [lastAutoBackupAt, setLastAutoBackupAt] = useState<string | null>(null);
  const [autoBackupStatus, setAutoBackupStatus] = useState<string>('자동 백업 대기 중');

  const isAllLoaded = isBooksLoaded && isSessionsLoaded && isAlarmsLoaded && isWeeklyPlansLoaded && 
                      isMonthlyPlansLoaded && isDailyGoalLoaded && isDarkLoaded && isAutoGoalLoaded && 
                      isDDayLoaded && isFontSizeLoaded && isWordWrapLoaded && isNavLabelsLoaded && isDDaySizeLoaded;

  const cloudSyncPayload = useMemo(() => ({
    books,
    sessions,
    alarms,
    isDarkMode,
  }), [books, sessions, alarms, isDarkMode]);

  const autoBackupEnabledRef = useRef(false);
  const autoBackupTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAllLoaded) return;
    let migrated = false;
    const newBooks = books.map((book: any) => {
      if (book.autoGoal) {
        migrated = true;
        const ag = book.autoGoal;
        if (!ag.id) ag.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        const { autoGoal, ...rest } = book;
        return {
          ...rest,
          autoGoals: [ag]
        } as Book;
      }
      return book;
    });

    if (migrated) {
      setBooks(newBooks);
    }
  }, [books, setBooks, isAllLoaded]);

  const activeBooks = books.filter((b: Book) => !b.isTrash);
  const [isEditingDDay, setIsEditingDDay] = useState(false);
  const [showDDayMenu, setShowDDayMenu] = useState(false);
  const [dDayTitleInput, setDDayTitleInput] = useState('');
  const [dDayDateInput, setDDayDateInput] = useState('');

  const dDayMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dDayMenuRef.current && !dDayMenuRef.current.contains(event.target as Node)) {
        setShowDDayMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveDDay = () => {
    if (dDayTitleInput.trim() && dDayDateInput) {
      setDDay({ title: dDayTitleInput.trim(), date: dDayDateInput });
    }
    setIsEditingDDay(false);
  };

  // Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');
  const [timerType, setTimerType] = useState<'beginner' | 'expert'>('beginner');
  const [expertTime, setExpertTime] = useState({ hours: 0, minutes: 25, seconds: 0 });
  const [expertBreakTime, setExpertBreakTime] = useState({ hours: 0, minutes: 5, seconds: 0 });
  const [timerBookId, setTimerBookId] = useState<string>('');
  const [timerChapterId, setTimerChapterId] = useState<string>('');

  const initialTimeLeft = timerMode === 'focus' 
    ? (timerType === 'beginner' ? 25 * 60 : (expertTime.hours * 3600 + expertTime.minutes * 60 + expertTime.seconds)) 
    : (timerType === 'beginner' ? 5 * 60 : (expertBreakTime.hours * 3600 + expertBreakTime.minutes * 60 + expertBreakTime.seconds));
  
  const realTimeAddedSeconds = (isActive || (!isActive && timeLeft < initialTimeLeft)) && timerMode === 'focus' 
    ? (initialTimeLeft - timeLeft) 
    : 0;

  const addStudySession = (seconds: number, bookIdParam?: string, chapterIdParam?: string, titleParam?: string, dateParam?: string) => {
    let finalTitle = titleParam;
    
    // Auto-generate title if missing but IDs are provided
    if (!finalTitle && bookIdParam) {
      const book = books.find(b => b.id === bookIdParam);
      if (book) {
        finalTitle = book.title;
        if (chapterIdParam) {
          const chapter = book.chapters?.find(c => c.id === chapterIdParam);
          if (chapter) finalTitle += ` - ${chapter.title}`;
        }
      }
    }

    const durationMinutes = Math.floor(seconds / 60);

    const newSession: StudySession = {
      id: Date.now().toString(),
      date: dateParam || new Date().toISOString(),
      durationMinutes: durationMinutes,
      durationSeconds: seconds,
      bookId: bookIdParam,
      chapterId: chapterIdParam,
      title: finalTitle
    };
    setSessions(prev => [...prev, newSession]);
  };

  const updateSession = (id: string, updates: Partial<StudySession>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft <= 0) {
      if (timerMode === 'focus') {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
        addStudySession(initialTimeLeft, timerBookId, timerChapterId);
        setTimerMode('break');
        setTimeLeft(5 * 60);
      } else {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
        setTimerMode('focus');
        setTimeLeft(timerType === 'beginner' ? 25 * 60 : (expertTime.hours * 3600 + expertTime.minutes * 60 + expertTime.seconds));
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, timerMode, timerType, expertTime, initialTimeLeft, timerBookId, timerChapterId]);

  const stopTimer = () => {
    setIsActive(false);
    if (timerMode === 'focus') {
      const elapsedSeconds = initialTimeLeft - timeLeft;
      if (elapsedSeconds > 0) {
        addStudySession(elapsedSeconds, timerBookId, timerChapterId);
      }
    }
    setTimerMode('focus');
    setTimeLeft(timerType === 'beginner' ? 25 * 60 : (expertTime.hours * 3600 + expertTime.minutes * 60 + expertTime.seconds));
  };

  const timerProps = {
    timeLeft, setTimeLeft,
    isActive, setIsActive,
    mode: timerMode, setMode: setTimerMode,
    timerMode: timerType, setTimerMode: setTimerType,
    expertTime, setExpertTime,
    expertBreakTime, setExpertBreakTime,
    timerBookId, setTimerBookId,
    timerChapterId, setTimerChapterId,
    initialTimeLeft,
    stopTimer,
    realTimeAddedSeconds
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${globalFontSize}px`;
  }, [globalFontSize]);

  useEffect(() => {
    if (preventWordWrap) {
      document.body.classList.add('break-keep');
    } else {
      document.body.classList.remove('break-keep');
    }
  }, [preventWordWrap]);

  // Handle Alarm logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getSeconds() !== 0) return; // Trigger exactly on the minute

      const currentDay = now.getDay();
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentHours = String(now.getHours()).padStart(2, '0');
      const timeStr = `${currentHours}:${currentMinutes}`;
      const uniqueTriggerKey = `alarm-triggered-${now.toDateString()}-${timeStr}`;

      if (window.sessionStorage.getItem(uniqueTriggerKey)) return;

      const triggerAlarm = alarms.find(a => a.enabled && a.days.includes(currentDay) && a.time === timeStr);
      
      if (triggerAlarm) {
        window.sessionStorage.setItem(uniqueTriggerKey, 'true');
        // Play notification sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
        
        let message = '⏰ 규칙적인 학습 시간이 되었습니다! 학습을 시작해볼까요?';
        if (triggerAlarm.expertMode && triggerAlarm.bookId) {
          const book = books.find(b => b.id === triggerAlarm.bookId);
          const chapter = book?.chapters.find(c => c.id === triggerAlarm.chapterId);
          if (book) {
            if (chapter) {
              message = `⏰ ${book.title} ${chapter.title} 공부할 시간이 되었습니다!`;
            } else {
              message = `⏰ ${book.title} 공부할 시간이 되었습니다!`;
            }
          }
        }
        // Don't auto-delete alarms, just alert.
        alert(message);
      }
    }, 1000); // Check every 1 second

    return () => clearInterval(interval);
  }, [alarms, books]);

  const getAllData = () => cloudSyncPayload;

  const onDataSync = (data: any) => {
    if (data.books) setBooks(data.books);
    if (data.sessions) setSessions(data.sessions);
    if (data.alarms) setAlarms(data.alarms);
    if (data.isDarkMode !== undefined) setIsDarkMode(data.isDarkMode);
  };

  useEffect(() => {
    if (!isAllLoaded) {
      return;
    }

    if (!autoBackupEnabledRef.current) {
      autoBackupEnabledRef.current = true;
      setAutoBackupStatus('자동 백업 준비 완료');
      return;
    }

    setAutoBackupStatus('변경 감지됨 · 자동 백업 예약 중');

    if (autoBackupTimerRef.current) {
      window.clearTimeout(autoBackupTimerRef.current);
    }

    autoBackupTimerRef.current = window.setTimeout(async () => {
      try {
        setAutoBackupStatus('자동 백업 실행 중...');
        await syncDataToCloud(cloudSyncPayload, 'auto');
        const backupTime = new Date().toISOString();
        setLastAutoBackupAt(backupTime);
        setAutoBackupStatus('자동 백업 완료');
      } catch (error) {
        setAutoBackupStatus(`자동 백업 실패: ${getCloudSyncErrorMessage(error)}`);
      }
    }, AUTO_CLOUD_BACKUP_DEBOUNCE_MS);

    return () => {
      if (autoBackupTimerRef.current) {
        window.clearTimeout(autoBackupTimerRef.current);
        autoBackupTimerRef.current = null;
      }
    };
  }, [cloudSyncPayload, isAllLoaded]);

  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartRef.current.x;
    const dy = touchEndY - touchStartRef.current.y;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      const target = e.target as HTMLElement;
      if (
        target.closest('.no-swipe') || 
        target.closest('input') || 
        target.closest('textarea') || 
        Math.abs(dy) > 50
      ) {
        touchStartRef.current = null;
        return;
      }
      
      const tabIds = navItems.map(item => item.id);
      const currentIndex = tabIds.indexOf(activeTab);
      
      if (dx > 0) {
        setActiveTab(tabIds[currentIndex > 0 ? currentIndex - 1 : tabIds.length - 1] as any);
      } else if (dx < 0) {
        setActiveTab(tabIds[currentIndex < tabIds.length - 1 ? currentIndex + 1 : 0] as any);
      }
    }
    
    touchStartRef.current = null;
  };

  const navItems = [
    { id: 'home', label: '홈', icon: HomeIcon },
    { id: 'plan', label: '오늘 계획', icon: Target },
    { id: 'books', label: '진도 관리', icon: BookIcon },
    { id: 'timer', label: '타이머', icon: Timer },
    { id: 'calendar', label: '달력', icon: CalendarIcon },
    { id: 'stats', label: '통계', icon: LineChart },
    { id: 'alarms', label: '알림 설정', icon: Bell },
    { id: 'settings', label: '설정', icon: SettingsIcon },
  ] as const;

  if (!isAllLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-bold">데이터를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between sticky top-0 z-40 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-20 w-full flex items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => setActiveTab('home')}>
            <img src="/icon.png" alt="Bright Study Icon" className="w-11 h-11 object-cover rounded-xl shadow-sm border-2 border-white dark:border-white bg-white" />
            <h1 className="hidden sm:block text-xl font-black text-slate-800 dark:text-white tracking-tight font-sans whitespace-nowrap">
              Bright Study
            </h1>
          </div>
          <nav className="flex gap-1 bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 max-w-full overflow-x-auto touch-pan-x scrollbar-hide no-swipe">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all relative whitespace-nowrap shrink-0",
                    isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className={cn("uppercase text-[10px] tracking-wider mt-0.5", showNavLabelsMobile ? "inline" : "hidden md:inline")}>{item.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-10 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6">
          <div className="text-center sm:text-left">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">
              {activeTab === 'home' && "오늘도 목표를 향해 달려볼까요? 🚀"}
              {activeTab === 'plan' && "오늘의 학습 목표를 설정해볼까요? 🎯"}
              {activeTab === 'books' && "오늘의 목표를 달성해볼까요? 🌟"}
              {activeTab === 'timer' && "딱 25분만 집중해보아요! ⏰"}
              {activeTab === 'calendar' && "나의 학습 기록과 계획 📅"}
              {activeTab === 'stats' && "꾸준함이 만드는 기적 ✨"}
              {activeTab === 'alarms' && "학습 리듬을 만들어보세요 ⏰"}
              {activeTab === 'settings' && "나만의 학습 환경 설정 ⚙️"}
            </h2>
          </div>

          {/* D-Day Header Component */}
          {activeTab === 'home' && (
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center relative overflow-visible group min-w-[240px]">
            <div className="absolute top-3 right-3" ref={dDayMenuRef}>
               <button onClick={() => setShowDDayMenu(p => !p)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                 <MoreVertical className="w-4 h-4" />
               </button>
               {showDDayMenu && (
                 <div className="absolute right-0 top-6 w-36 bg-white dark:bg-slate-700 shadow-xl rounded-xl overflow-hidden py-1 z-20 border border-slate-100 dark:border-slate-600">
                    <button onClick={() => { setIsEditingDDay(true); setDDayTitleInput(dDay?.title || ''); setDDayDateInput(dDay?.date || ''); setShowDDayMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2">
                      <Edit2 className="w-3.5 h-3.5" /> 수정
                    </button>
                    <button onClick={() => { setDDay(null); setShowDDayMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 mb-1">
                      <Trash2 className="w-3.5 h-3.5" /> 삭제
                    </button>
                    <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-600">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">크기</span>
                      <div className="flex gap-1">
                         <button onClick={() => setDDaySize(s => Math.max(16, s - 2))} className="w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-600 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500 font-bold">-</button>
                         <button onClick={() => setDDaySize(s => Math.min(80, s + 2))} className="w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-600 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500 font-bold">+</button>
                      </div>
                    </div>
                 </div>
               )}
            </div>

            {isEditingDDay ? (
              <div className="space-y-3 pt-1">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">D-Day 설정</h3>
                <input type="text" placeholder="시험/목표 이름" value={dDayTitleInput} onChange={e => setDDayTitleInput(e.target.value)} className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white" />
                <input type="date" value={dDayDateInput} onChange={e => setDDayDateInput(e.target.value)} className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]" />
                <div className="flex gap-2">
                  <button onClick={handleSaveDDay} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold py-1.5 rounded transition-colors">저장</button>
                  <button onClick={() => setIsEditingDDay(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold py-1.5 rounded transition-colors">취소</button>
                </div>
              </div>
            ) : !dDay ? (
              <div className="flex flex-col items-center justify-center text-center space-y-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer py-2" onClick={() => setIsEditingDDay(true)}>
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400">
                  <Plus className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-500 font-bold">D-Day 추가하기</p>
              </div>
            ) : (
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate pr-6">{dDay.title}</span>
                </div>
                <div className="flex items-baseline gap-1" style={{ fontSize: `${dDaySize}px` }}>
                  <span className="font-black tracking-tighter text-slate-800 dark:text-white mr-1">D</span>
                  <span className="font-black tracking-tighter text-slate-800 dark:text-white">
                    {(() => {
                      const diff = differenceInDays(parseISO(dDay.date), new Date(new Date().setHours(0,0,0,0)));
                      if (diff === 0) return '-DAY';
                      if (diff > 0) return `-${diff}`;
                      return `+${Math.abs(diff)}`;
                    })()}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 mt-1">
                  {dDay.date.replace(/-/g, '.')}
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'home' && <Home books={activeBooks} setBooks={setBooks} sessions={sessions} alarms={alarms} setAlarms={setAlarms} setActiveTab={setActiveTab} addStudySession={addStudySession} realTimeAddedSeconds={realTimeAddedSeconds} dailyGoalMinutes={dailyGoalMinutes} autoGoalDisplayMode={autoGoalDisplayMode} />}
            {activeTab === 'plan' && <TodayPlan dailyGoalMinutes={dailyGoalMinutes} setDailyGoalMinutes={setDailyGoalMinutes} weeklyPlans={weeklyPlans} setWeeklyPlans={setWeeklyPlans} books={activeBooks} setActiveTab={setActiveTab} autoGoalDisplayMode={autoGoalDisplayMode} />}
            {activeTab === 'books' && <BookManager books={books} setBooks={setBooks} />}
            {activeTab === 'timer' && <PomodoroTimer onSessionComplete={addStudySession} sessions={sessions} timerProps={timerProps} books={activeBooks} updateSession={updateSession} deleteSession={deleteSession} dailyGoalMinutes={dailyGoalMinutes} />}
            {activeTab === 'calendar' && <Calendar sessions={sessions} weeklyPlans={weeklyPlans} setWeeklyPlans={setWeeklyPlans} monthlyPlans={monthlyPlans} setMonthlyPlans={setMonthlyPlans} books={activeBooks} />}
            {activeTab === 'stats' && <Statistics sessions={sessions} realTimeAddedSeconds={realTimeAddedSeconds} weeklyPlans={weeklyPlans} setWeeklyPlans={setWeeklyPlans} dailyGoalMinutes={dailyGoalMinutes} setDailyGoalMinutes={setDailyGoalMinutes} books={activeBooks} setActiveTab={setActiveTab} autoGoalDisplayMode={autoGoalDisplayMode} />}
            {activeTab === 'alarms' && <Alarms alarms={alarms} setAlarms={setAlarms} books={activeBooks} />}
            {activeTab === 'settings' && (
              <Settings 
                isDarkMode={isDarkMode} 
                setIsDarkMode={setIsDarkMode} 
                onDataSync={onDataSync}
                getAllData={getAllData}
                autoGoalDisplayMode={autoGoalDisplayMode}
                setAutoGoalDisplayMode={setAutoGoalDisplayMode}
                globalFontSize={globalFontSize}
                setGlobalFontSize={setGlobalFontSize}
                preventWordWrap={preventWordWrap}
                setPreventWordWrap={setPreventWordWrap}
                showNavLabelsMobile={showNavLabelsMobile}
                setShowNavLabelsMobile={setShowNavLabelsMobile}
                autoBackupStatus={autoBackupStatus}
                lastAutoBackupAt={lastAutoBackupAt}
              />
            )}
          </motion.div>
        </AnimatePresence>
        
        <div className="mt-12 text-center text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm">
          학습 기록은 기기에 안전하게 자동 저장됩니다. 편하게 이용해보세요.
        </div>
      </main>
    </div>
  );
}
