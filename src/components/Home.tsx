import { useState, useRef, useEffect } from 'react';
import { Book, StudySession, StudyAlarm, Chapter, AutoGoal } from '../types';
import { Play, Book as BookIcon, Target, TrendingUp, Bell, Clock, X, Flame, Quote, MoreVertical, Edit2, Trash2, RefreshCw, CalendarDays, Plus, List } from 'lucide-react';
import { isSameDay, parseISO, differenceInDays, format } from 'date-fns';
import BaseModal from './BaseModal';
import { cn, useLocalStorage, useLockBodyScroll } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { registerBackHandler } from '../lib/backHandler';

import AddBookModal from './AddBookModal';
import AddChapterModal from './AddChapterModal';
import { AutoGoalModal } from './AutoGoalModal';
import { AllAutoGoalsModal } from './AllAutoGoalsModal';

interface HomeProps {
  books: Book[];
  setBooks: (books: Book[] | ((prev: Book[]) => Book[])) => void;
  sessions: StudySession[];
  alarms: StudyAlarm[];
  setAlarms: (alarms: StudyAlarm[] | ((prev: StudyAlarm[]) => StudyAlarm[])) => void;
  setActiveTab: (tab: 'home' | 'plan' | 'books' | 'timer' | 'stats' | 'calendar' | 'alarms' | 'settings') => void;
  addStudySession: (seconds: number, bookId?: string, chapterId?: string, title?: string, date?: string) => void;
  realTimeAddedSeconds: number;
  dailyGoalMinutes: number;
  autoGoalDisplayMode: 'multiple' | 'single';
}


export default function Home({ books, setBooks, sessions, alarms, setAlarms, setActiveTab, addStudySession, realTimeAddedSeconds, dailyGoalMinutes, autoGoalDisplayMode }: HomeProps) {
  const today = new Date();
  const { t } = useTranslation();
  const quotes = t('home.quotes', { returnObjects: true }) as string[];
  
  const [quoteState, setQuoteState] = useLocalStorage<{text: string; isCustom: boolean; randomIndex: number}>('study-helper-quote', {text: quotes[today.getDay() % quotes.length], isCustom: false, randomIndex: today.getDay() % quotes.length});
  
  const [showQuoteMenu, setShowQuoteMenu] = useState(false);
  const [isEditingQuote, setIsEditingQuote] = useState(false);
  const [customQuoteText, setCustomQuoteText] = useState('');
  
  const [editingAg, setEditingAg] = useState<{book: Book, goalId: string} | null>(null);
  const [confirmCompleteAg, setConfirmCompleteAg] = useState<{book: Book, autoGoal: AutoGoal} | null>(null);

  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [addedBookForChapter, setAddedBookForChapter] = useState<Book | null>(null);
  const [showAllAutoGoalsModal, setShowAllAutoGoalsModal] = useState(false);

  const targetDateStr = format(new Date(), 'yyyy-MM-dd');
  const todayAutoGoals = books.flatMap(b => 
    (b.autoGoals?.filter(ag => 
      ag.enabled && targetDateStr >= ag.startDate && targetDateStr <= ag.endDate
    ) || []).map(ag => ({ book: b, autoGoal: ag }))
  );

  const toggleAutoGoalComplete = (bookId: string, goalId: string) => {
    setBooks(prev => prev.map(b => {
      if (b.id !== bookId) return b;
      return {
        ...b,
        autoGoals: b.autoGoals?.map(ag => {
          if (ag.id !== goalId) return ag;
          const completed = ag.completedDates || [];
          const isCompleted = completed.includes(targetDateStr);
          return {
            ...ag,
            completedDates: isCompleted 
              ? completed.filter(d => d !== targetDateStr)
              : [...completed, targetDateStr]
          };
        })
      };
    }));
    setConfirmCompleteAg(null);
  };

  const quoteMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quoteMenuRef.current && !quoteMenuRef.current.contains(event.target as Node)) {
        setShowQuoteMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const todaysQuote = quoteState.isCustom ? quoteState.text : quotes[quoteState.randomIndex];

  const handleRefreshQuote = () => {
    let nextIndex = quoteState.randomIndex;
    while(nextIndex === quoteState.randomIndex) {
      nextIndex = Math.floor(Math.random() * quotes.length);
    }
    setQuoteState({ text: quotes[nextIndex], isCustom: false, randomIndex: nextIndex });
    setShowQuoteMenu(false);
  };

  const handleSaveQuote = () => {
    if (customQuoteText.trim()) {
      setQuoteState(prev => ({ ...prev, text: customQuoteText.trim(), isCustom: true }));
    }
    setIsEditingQuote(false);
    setCustomQuoteText('');
  };

  const todaySessions = sessions.filter(s => isSameDay(parseISO(s.date), today));
  const todaySeconds = Math.min(86400, todaySessions.reduce((acc, curr) => acc + (curr.durationSeconds || curr.durationMinutes * 60), 0) + realTimeAddedSeconds);
  const todayMinutes = Math.floor(todaySeconds / 60);
  const progressPercent = dailyGoalMinutes > 0 ? Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100)) : 0;

  const streak = (() => {
    if (sessions.length === 0) return 0;
    const days = Array.from(new Set(sessions.map(s => new Date(s.date).toDateString())))
      .map(d => new Date(d).setHours(0,0,0,0))
      .sort((a, b) => b - a);
    
    let currentStreak = 0;
    let checkTime = new Date().setHours(0,0,0,0);

    if (days[0] === checkTime) {
      currentStreak++;
      checkTime -= 86400000;
      days.shift();
    } else if (days[0] === checkTime - 86400000) {
      // Didn't study today yet, streak alive
      checkTime -= 86400000;
    } else {
      return 0; // Streak broken
    }

    for (const day of days) {
      if (day === checkTime) {
        currentStreak++;
        checkTime -= 86400000;
      } else if (day < checkTime) {
        break;
      }
    }
    return currentStreak;
  })();

  const activeBooks = books.filter(b => {
    if (!b.chapters || b.chapters.length === 0) return false;
    const completed = b.chapters.filter(ch => ch.completed).length;
    return completed < b.chapters.length;
  });

  const enabledAlarms = alarms.filter(a => a.enabled);

  const [showManualModal, setShowManualModal] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualSelectedBlockId, setManualSelectedBlockId] = useState('');
  const [manualLayoutBlocks, setManualLayoutBlocks] = useState<any[]>([]);
  const [manualStartPage, setManualStartPage] = useState('');
  const [manualEndPage, setManualEndPage] = useState('');
  const [manualBookId, setManualBookId] = useState('');
  const [manualChapterId, setManualChapterId] = useState('');
  const [manualDate, setManualDate] = useState(format(today, 'yyyy-MM-dd'));

  useEffect(() => {
    if (showManualModal && manualDate) {
       import('../lib/timetableUtils').then(({ getDailyLayouts }) => {
          getDailyLayouts(manualDate).then(layouts => {
             setManualLayoutBlocks(layouts);
             setManualSelectedBlockId('');
          });
       });
    }
  }, [showManualModal, manualDate]);
  const [manualSyncConfirmData, setManualSyncConfirmData] = useState<{
    targetDateStr: string;
    startTimeStr: string;
    endTimeStr: string;
    blockId?: string;
    bookId: string;
    chapterId: string;
    startPage: number;
    endPage: number;
    mins: number;
  } | null>(null);

  useLockBodyScroll(showManualModal || showAlarmModal || manualSyncConfirmData !== null);

  useEffect(() => {
    if (showManualModal) {
      return registerBackHandler(() => {
        setShowManualModal(false);
        return true;
      });
    }
    if (showAlarmModal) {
      return registerBackHandler(() => {
        setShowAlarmModal(false);
        return true;
      });
    }
    if (manualSyncConfirmData) {
      return registerBackHandler(() => {
        setManualSyncConfirmData(null);
        return true;
      });
    }
  }, [showManualModal, showAlarmModal, manualSyncConfirmData]);

  const [newAlarmTime, setNewAlarmTime] = useState('09:00');
  const [newAlarmDays, setNewAlarmDays] = useState<number[]>([]);
  const DAYS = t('days.short', { returnObjects: true }) as string[];

  const submitManualAdd = async () => {
    const mins = parseInt(manualMinutes, 10);
    if (!isNaN(mins) && mins > 0) {
      if (manualSelectedBlockId) {
         const { getTimetableRecords } = await import('../lib/timetableUtils');
         const records = await getTimetableRecords(manualDate);
         const existingRecord = records.find(r => r.blockId === manualSelectedBlockId);
         
         if (existingRecord) {
             const block = manualLayoutBlocks.find(b => b.id === manualSelectedBlockId);
             setManualSyncConfirmData({
                 targetDateStr: manualDate,
                 startTimeStr: block ? `${block.startTime} ~ ${block.endTime}` : '', 
                 endTimeStr: '', 
                 bookId: manualBookId,
                 chapterId: manualChapterId,
                 startPage: parseInt(manualStartPage) || 0,
                 endPage: parseInt(manualEndPage) || 0,
                 mins: mins,
                 blockId: manualSelectedBlockId
             });
             return; // wait for confirmation
         }
      }
      executeManualAdd(mins, manualSelectedBlockId);
    }
  };

  const executeManualAdd = async (mins: number, blockId?: string) => {
    const [y, m, d] = manualDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, today.getHours(), today.getMinutes(), today.getSeconds());
    const dateStr = dateObj.toISOString();

    let blockIdGenerated = blockId;

    if (blockId) {
       const { getTimetableRecords, saveTimetableRecords } = await import('../lib/timetableUtils');
       const records = await getTimetableRecords(manualDate);
       
       const newRecords = [...records.filter(r => r.blockId !== blockId), {
           id: Date.now().toString(),
           blockId: blockId,
           bookId: manualBookId,
           chapterId: manualChapterId,
           startPage: parseInt(manualStartPage) || 0,
           endPage: parseInt(manualEndPage) || 0,
           memo: '',
           isManualAdded: true // Use 📝 icon
       }];
       await saveTimetableRecords(manualDate, newRecords);
       
       // Manually update weeklyPlans here to trigger event
       const { getStorage, setStorage } = await import('../lib/storage');
       const prev = await getStorage('brightstudy_weekly_plans');
       if (prev) {
           const oldPlan = prev[manualDate] || '';
           const bookObj = books.find(b => b.id === manualBookId);
           const chapterObj = bookObj?.chapters?.find(c => c.id === manualChapterId);
           const planText = bookObj && chapterObj ? `[${bookObj.title}] ${chapterObj.title}` : (bookObj ? `[${bookObj.title}]` : '');
           const syncStr = `📝 ${planText}`;
           
           if (planText && !oldPlan.includes(syncStr)) {
               const newPrev = { ...prev, [manualDate]: oldPlan ? `${oldPlan}\n${syncStr}` : syncStr };
               await setStorage('brightstudy_weekly_plans', newPrev);
           }
       }
    }

    addStudySession(mins * 60, manualBookId || undefined, manualChapterId || undefined, undefined, dateStr);
    
    // Update session right after creation to add timetable tracking (since App.tsx addStudySession doesn't natively accept it)
    setTimeout(async () => {
        const { getStorage, setStorage } = await import('../lib/storage');
        const sessionsObj = await getStorage('study-helper-sessions');
        if (sessionsObj && blockIdGenerated) {
            const latestSession = sessionsObj[sessionsObj.length - 1];
            if (latestSession) {
                latestSession.timetableDate = manualDate;
                latestSession.timetableBlockId = blockIdGenerated;
                await setStorage('study-helper-sessions', sessionsObj);
            }
        }
    }, 200);

    setShowManualModal(false);
    setManualMinutes('');
    setManualBookId('');
    setManualChapterId('');
    setManualSelectedBlockId('');
    setManualStartPage('');
    setManualEndPage('');
    setManualDate(format(today, 'yyyy-MM-dd'));
  };

  const addAlarm = () => {
    if (newAlarmDays.length === 0) { try { window.alert(t('alarms.selectDayAlert')); } catch(e){} return; }
    const newAlarm: StudyAlarm = {
      id: Date.now().toString(),
      time: newAlarmTime,
      days: newAlarmDays,
      enabled: true
    };
    setAlarms(prev => [...prev, newAlarm]);
    setNewAlarmDays([]);
    setShowAlarmModal(false);
  };

  const toggleAlarmDay = (dayIndex: number) => {
    setNewAlarmDays(prev => 
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 transition-colors">
      
      {/* Top Banner (Quote) */}
      <div className="grid grid-cols-1 gap-6">

        {streak > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 p-6 rounded-3xl flex items-center justify-between gap-4 group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 pointer-events-none transition-transform group-hover:scale-110"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <Flame className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mb-0.5">{t('home.streakTitle')}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-bold text-white">{t('home.continuousStudy')}</span>
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter drop-shadow-md">{streak}</span>
                  <span className="text-xl sm:text-2xl font-bold text-white">{t('home.daySuffix')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Quote of the Day */}
        <div className="bg-slate-900 dark:bg-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative group">
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -ml-20 pointer-events-none" />
          </div>
          <div className="relative z-10 flex gap-4 w-full">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
              <Quote className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1 pr-8">
              <h3 className="text-sm font-bold text-slate-400 mb-1 flex items-center gap-2">
                {t('home.quoteTitle')} {quoteState.isCustom && <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full">PINNED</span>}
              </h3>
              {isEditingQuote ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={customQuoteText}
                    onChange={e => setCustomQuoteText(e.target.value)}
                    placeholder={t('home.quotePlaceholder')}
                    className="flex-1 bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    onKeyDown={e => e.key === 'Enter' && handleSaveQuote()}
                    autoFocus
                  />
                  <button onClick={handleSaveQuote} className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg font-bold text-sm">{t('common.save')}</button>
                  <button onClick={() => setIsEditingQuote(false)} className="px-3 py-1.5 bg-white/10 text-white rounded-lg font-bold text-sm">{t('common.cancel')}</button>
                </div>
              ) : (
                <p className="text-lg font-medium text-white tracking-tight leading-snug">
                  "{todaysQuote}"
                </p>
              )}
            </div>
            
            <div className="absolute top-0 right-0 text-white/50" ref={quoteMenuRef}>
               <button 
                  onClick={() => setShowQuoteMenu(p => !p)} 
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
               </button>
               {showQuoteMenu && (
                 <div className="absolute right-0 top-10 w-36 bg-white dark:bg-slate-700 shadow-xl rounded-xl overflow-hidden py-1 z-20 border border-slate-100 dark:border-slate-600">
                    <button onClick={handleRefreshQuote} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> {t('home.refresh')}
                    </button>
                    <button onClick={() => { setIsEditingQuote(true); setCustomQuoteText(todaysQuote); setShowQuoteMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2">
                      <Edit2 className="w-4 h-4" /> {t('home.editPin')}
                    </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {todayAutoGoals.length > 0 && (
        <div className="flex flex-col gap-4">
          {autoGoalDisplayMode === 'single' ? (
            <div className="relative overflow-hidden bg-gradient-to-tr from-red-500 via-rose-500 to-orange-500 shadow-md shadow-red-500/20 rounded-3xl p-5 sm:p-6 text-white w-full">
              {/* Decorative Blur Blobs */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-400 blur-[80px] opacity-60 rounded-full mix-blend-screen pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-600 blur-[80px] opacity-60 rounded-full mix-blend-screen pointer-events-none"></div>
              
              <div className="font-bold text-red-100 uppercase tracking-widest mb-4 flex items-center justify-between opacity-90 text-[11px] sm:text-xs">
                <div className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-orange-200" /> {t('todayPlan.dailyChallengeTitle')}
                </div>
                <button
                  onClick={() => setShowAllAutoGoalsModal(true)}
                  className="bg-white/10 hover:bg-white/20 transition-colors p-1.5 rounded-lg cursor-pointer shrink-0"
                  title={t('allAutoGoals', '자동 목표 리스트') || "자동 목표 리스트"}
                >
                  <List className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 relative z-10 w-full">
                {todayAutoGoals.map(({book, autoGoal}, idx) => {
                  const isCompleted = autoGoal.completedDates?.includes(targetDateStr);
                  return (
                  <div 
                    key={`${book.id}-${autoGoal.id}`} 
                    className="flex flex-col bg-black/25 hover:bg-black/40 backdrop-blur-sm shadow-inner transition-colors rounded-2xl p-4 border border-white/10 relative z-10 w-full overflow-hidden cursor-pointer group"
                    onClick={() => setConfirmCompleteAg({ book, autoGoal })}
                  >
                    {isCompleted && (
                      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none bg-black/20">
                        <div className="animate-stamp border-4 border-emerald-400 text-emerald-400 rounded-lg px-4 py-1 text-2xl font-black shadow-[0_0_15px_rgba(52,211,153,0.5)] bg-black/40 backdrop-blur-sm">
                          DONE
                        </div>
                      </div>
                    )}
                    <div className={cn("flex flex-col w-full transition-opacity h-full", isCompleted ? "opacity-40" : "")}>
                      <div className="flex justify-between items-start mb-2 w-full">
                        <span className="text-xs sm:text-sm font-bold truncate pr-2 w-full" title={book.title}>{book.title}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingAg({ book, goalId: autoGoal.id }); }}
                          className="bg-white/10 hover:bg-white/20 transition-colors p-1.5 rounded-lg cursor-pointer shrink-0"
                          title={t('common.edit') || "수정"}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                      <div className="flex items-baseline gap-1.5 w-full">
                        <span className="text-2xl sm:text-3xl font-black tracking-tight">{autoGoal.dailyPages}</span>
                        <span className="text-[10px] sm:text-xs font-bold text-red-100 whitespace-nowrap">
                          {autoGoal.calculationBasis === 'chapter' ? (t('chaptersPerDay') || "챕터 / 일") : t('todayPlan.pagesPerDay')}
                        </span>
                      </div>
                      <span className="text-[10px] xl:text-xs font-medium text-red-100/80 mt-1 xl:mt-2 truncate w-full">
                        {autoGoal.startDate} ~ {autoGoal.endDate}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-" + Math.min(todayAutoGoals.length, 3))}>
              <div className="col-span-full flex justify-between items-center px-1 mb-1">
                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5 text-[11px] sm:text-xs">
                  <Target className="w-4 h-4 text-orange-500" /> {t('todayPlan.dailyChallengeTitle')}
                </div>
                <button
                  onClick={() => setShowAllAutoGoalsModal(true)}
                  className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title={t('allAutoGoals', '자동 목표 리스트') || "자동 목표 리스트"}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            {todayAutoGoals.map(({book, autoGoal}) => {
              const isCompleted = autoGoal.completedDates?.includes(targetDateStr);
              return (
              <div 
                key={`${book.id}-${autoGoal.id}`} 
                className="relative overflow-hidden bg-gradient-to-tr from-red-500 via-rose-500 to-orange-500 shadow-md shadow-red-500/20 rounded-3xl p-6 text-white flex justify-between items-center group cursor-pointer hover:shadow-lg transition-transform"
                onClick={() => setConfirmCompleteAg({ book, autoGoal })}
              >
                {/* Decorative Blur Blobs */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400 blur-3xl opacity-50 rounded-full mix-blend-screen pointer-events-none transition-transform group-hover:scale-110"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-600 blur-3xl opacity-50 rounded-full mix-blend-screen pointer-events-none transition-transform group-hover:scale-110"></div>
                
                {isCompleted && (
                  <div className="absolute inset-0 flex items-center xl:justify-center justify-end pr-10 z-20 pointer-events-none bg-black/20">
                    <div className="animate-stamp border-4 border-emerald-400 text-emerald-400 rounded-lg px-6 py-2 text-3xl font-black shadow-[0_0_20px_rgba(52,211,153,0.5)] bg-black/40 backdrop-blur-sm">
                      DONE
                    </div>
                  </div>
                )}
                
                <div className={cn("flex flex-col relative z-10 transition-opacity", isCompleted ? "opacity-50" : "")}>
                  <span className="text-xs font-bold text-red-100 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-orange-200" /> {t('todayPlan.dailyChallengeTitle')}
                  </span>
                  <span className="text-lg font-bold truncate max-w-[200px] sm:max-w-none mb-2">{book.title}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-tight">{autoGoal.dailyPages}</span>
                    <span className="text-sm font-bold text-red-100">
                      {autoGoal.calculationBasis === 'chapter' ? (t('chaptersPerDay') || "챕터 / 일") : t('todayPlan.pagesPerDay')}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-red-100 mt-1">
                    {autoGoal.startDate} ~ {autoGoal.endDate} ({t('home.goalWithCount', { count: autoGoal.iterations })})
                  </span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingAg({ book, goalId: autoGoal.id }); }}
                  className={cn("hidden sm:flex relative z-10 bg-white/20 hover:bg-white/30 transition-colors p-4 rounded-full cursor-pointer", isCompleted ? "opacity-50 pointer-events-none" : "")}
                  title={t('common.edit') || "수정"}
                >
                  <Edit2 className="w-8 h-8 text-white" />
                </button>
              </div>
              );
            })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Today's Progress Overview */}
        <div className={cn(
          "md:col-span-8 p-6 sm:p-8 rounded-3xl transition-colors flex flex-col justify-between group overflow-hidden relative border shadow-sm",
          progressPercent >= 100 
            ? "bg-gradient-to-tr from-rose-500 via-red-500 to-orange-500 border-red-500/50 shadow-red-500/30 text-white" 
            : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50 text-slate-800 dark:text-white"
        )}>
          {progressPercent >= 100 && (
            <>
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-400 blur-3xl opacity-50 rounded-full mix-blend-screen pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-600 blur-3xl opacity-50 rounded-full mix-blend-screen pointer-events-none"></div>
            </>
          )}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <h3 className={cn("text-lg font-bold flex items-center gap-2", progressPercent >= 100 ? "text-white" : "text-slate-800 dark:text-slate-100")}>
                {progressPercent >= 100 ? <Flame className="w-5 h-5 text-orange-200" /> : <Target className="w-5 h-5 text-emerald-500" />} 
                {t('home.studyStatusTitle')}
              </h3>
              <button 
                onClick={() => setActiveTab('plan')}
                className={cn("text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors", 
                  progressPercent >= 100 
                    ? "text-red-100 border-red-400/50 hover:bg-white/10" 
                    : "text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
                )}
              >
                {t('home.settings')}
              </button>
            </div>
            <p className={cn("text-sm font-medium mb-8", progressPercent >= 100 ? "text-red-100" : "text-slate-500 dark:text-slate-400") }>
              {progressPercent >= 100 ? t('home.goalAchieved') : t('home.progressing')}
            </p>
          </div>
          
          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex justify-between items-end flex-wrap gap-2">
              <span className={cn("text-3xl sm:text-5xl font-black font-mono tracking-tighter flex items-center flex-wrap gap-2", progressPercent >= 100 ? "text-white" : "text-slate-800 dark:text-white")}>
                <div>
                  {Math.floor(todaySeconds / 3600)}<span className={cn("text-lg sm:text-2xl mx-1 font-sans", progressPercent >= 100 ? "text-red-200" : "text-slate-400")}>h</span>
                  {Math.floor((todaySeconds % 3600) / 60)}<span className={cn("text-lg sm:text-2xl ml-1 font-sans", progressPercent >= 100 ? "text-red-200" : "text-slate-400")}>m</span>
                </div>
                <span className={cn("font-sans text-2xl mx-1", progressPercent >= 100 ? "text-red-300" : "text-slate-300 dark:text-slate-600")}>/</span>
                <div className={cn("text-2xl sm:text-3xl", progressPercent >= 100 ? "text-red-200" : "text-slate-400 dark:text-slate-500")}>
                  {Math.floor(dailyGoalMinutes / 60)}<span className={cn("text-base sm:text-xl mx-1 font-sans", progressPercent >= 100 ? "text-red-300" : "text-slate-400")}>h</span>
                  {dailyGoalMinutes % 60}<span className={cn("text-base sm:text-xl font-sans", progressPercent >= 100 ? "text-red-300" : "text-slate-400")}>m</span>
                </div>
              </span>
              <span className={cn("text-xl font-bold font-mono mb-1", progressPercent >= 100 ? "text-orange-200" : "text-emerald-500")}>
                {dailyGoalMinutes > 0 ? Math.round((todayMinutes / dailyGoalMinutes) * 100) : 0}%
              </span>
            </div>
            <div className={cn("w-full h-3 rounded-full overflow-hidden", progressPercent >= 100 ? "bg-red-900/30" : "bg-slate-100 dark:bg-slate-900")}>
              <div 
                className={cn("h-full rounded-full transition-all duration-1000", progressPercent >= 100 ? "bg-gradient-to-r from-orange-300 to-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.5)]" : "bg-emerald-500")}
                style={{ width: `${Math.min(100, (todayMinutes / dailyGoalMinutes) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="md:col-span-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-6 rounded-3xl shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">{t('home.quickActionsTitle')}</h3>
          
          <button 
            onClick={() => setActiveTab('timer')}
            className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-700 transition-colors text-left group"
          >
            <div className="w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none shrink-0 group-hover:scale-105 transition-transform">
              <Play className="w-6 h-6 ml-1" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">{t('home.startFocusMode')}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{t('home.goToPomodoroTimer')}</p>
            </div>
          </button>

          <button 
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-700 transition-colors text-left group"
          >
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-200 dark:shadow-none shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">{t('home.manualAddTitle')}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{t('home.manualWithoutTimer')}</p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ongoing Books Overview */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-6 rounded-3xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BookIcon className="w-5 h-5 text-indigo-500" /> {t('home.activeBooksTitle')}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAddBookModal(true)} className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors">{t('home.add')}</button>
              <button onClick={() => setActiveTab('books')} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors">{t('home.configure')}</button>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3">
                {activeBooks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <p className="text-sm font-medium text-slate-400">{t('home.noActiveBooks')}</p>
                <button onClick={() => setShowAddBookModal(true)} className="mt-4 px-4 py-2 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold transition-colors hover:bg-indigo-100">{t('home.registerNewBook')}</button>
              </div>
            ) : (
              activeBooks.slice(0, 3).map(book => {
                const total = book.chapters ? book.chapters.length : 0;
                const completed = book.chapters ? book.chapters.filter(ch => ch.completed).length : 0;
                const percent = Math.round((completed / total) * 100) || 0;
                
                return (
                  <div key={book.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-700 flex justify-between items-center group cursor-pointer hover:border-indigo-200 transition-colors" onClick={() => setActiveTab('books')}>
                    <div className="flex items-center gap-3 w-2/3">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", "bg-indigo-500")}></div>
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300 truncate">{book.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 font-mono tracking-widest">{completed}/{total}</span>
                      <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 w-9 text-right font-mono">{percent}%</div>
                    </div>
                  </div>
                )
              })
            )}
            {activeBooks.length > 3 && (
              <p className="text-center text-xs font-medium text-slate-400 mt-2">{t('home.moreBooks', { count: activeBooks.length - 3 })}</p>
            )}
          </div>
        </div>

        {/* Alarms Overview */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-6 rounded-3xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" /> {t('home.enabledAlarmsTitle')}
            </h3>
            <button onClick={() => setActiveTab('alarms')} className="text-xs font-bold text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-3 py-1.5 rounded-lg transition-colors">{t('home.settings')}</button>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            {enabledAlarms.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                 <p className="text-sm font-medium text-slate-400">{t('alarms.noAlarms')}</p>
                 <button onClick={() => setShowAlarmModal(true)} className="mt-4 px-4 py-2 bg-orange-50 dark:bg-slate-700 text-orange-600 dark:text-orange-400 rounded-xl text-sm font-bold transition-colors hover:bg-orange-100">{t('alarms.add')}</button>
               </div>
            ) : (
              enabledAlarms.slice(0, 3).map(alarm => (
                 <div key={alarm.id} className="p-4 bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex justify-between items-center group">
                   <div className="text-xl font-black text-orange-600 dark:text-orange-400 tracking-tighter font-mono">
                     {alarm.time}
                   </div>
                   <div className="flex gap-1">
                     {DAYS.map((d, dx) => (
                       <span key={dx} className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", alarm.days.includes(dx) ? "bg-orange-400 text-white dark:bg-orange-500 dark:text-white" : "bg-white text-slate-300 dark:bg-slate-800 dark:text-slate-600 border border-slate-100 dark:border-slate-700")}>
                         {d}
                       </span>
                     ))}
                   </div>
                 </div>
               ))
            )}
             {enabledAlarms.length > 3 && (
              <p className="text-center text-xs font-medium text-slate-400 mt-2">{t('home.moreAlarms', { count: enabledAlarms.length - 3 })}</p>
            )}
          </div>
        </div>
      </div>

      {showManualModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setShowManualModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{t('home.manualAddTitle')}</h3>
              <button 
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('home.dateLabel')}</label>
                <input 
                  type="date"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('home.timetableLabel')}</label>
                <select
                  value={manualSelectedBlockId}
                  onChange={e => {
                     const bid = e.target.value;
                     setManualSelectedBlockId(bid);
                     const block = manualLayoutBlocks.find(b => b.id === bid);
                     if (block) {
                         const start = block.startTime.split(':').map(Number);
                         const end = block.endTime.split(':').map(Number);
                         let diff = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
                         if (diff <= 0) diff += 24 * 60;
                         setManualMinutes(diff.toString());
                     } else {
                         setManualMinutes('');
                     }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                >
                  <option value="">{t('home.noBlockOption')}</option>
                  {manualLayoutBlocks.map(b => (
                     <option key={b.id} value={b.id}>{b.startTime} ~ {b.endTime}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('home.studyTimeLabel')}</label>
                <input 
                  type="number"
                  min="1"
                  value={manualMinutes}
                  onChange={e => setManualMinutes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium font-mono text-lg"
                  placeholder={t('home.studyTimePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('home.targetBookLabel')}</label>
                <select
                  value={manualBookId}
                  onChange={e => {
                    setManualBookId(e.target.value);
                    setManualChapterId('');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                >
                  <option value="">{t('home.noneOption')}</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>

              {manualBookId && (books.find(b => b.id === manualBookId)?.chapters?.length || 0) > 0 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('home.tableOfContentsLabel')}</label>
                    <select
                      value={manualChapterId}
                      onChange={e => setManualChapterId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                    >
                      <option value="">{t('home.noneOption')}</option>
                      {books.find(b => b.id === manualBookId)?.chapters?.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('home.startPageLabel')}</label>
                      <input 
                        type="number"
                        min="1"
                        value={manualStartPage}
                        onChange={e => setManualStartPage(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('home.endPageLabel')}</label>
                      <input 
                        type="number"
                        min="1"
                        value={manualEndPage}
                        onChange={e => setManualEndPage(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setShowManualModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={submitManualAdd}
                disabled={!manualMinutes || parseInt(manualMinutes, 10) <= 0}
                className="flex-1 px-4 py-3 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200 dark:shadow-none"
              >
                {t('home.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {manualSyncConfirmData && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setManualSyncConfirmData(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-full">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{t('home.existingRecordTitle')}</h3>
            </div>
            
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-6 leading-relaxed">
              {t('home.existingRecordBody', { startTimeStr: manualSyncConfirmData.startTimeStr })}
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setManualSyncConfirmData(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t('common.no')}
              </button>
              <button 
                onClick={async () => {
                  const blockIdToUse = manualSyncConfirmData.blockId;
                  setManualSyncConfirmData(null);
                  executeManualAdd(manualSyncConfirmData.mins, blockIdToUse);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors shadow-md shadow-amber-200 dark:shadow-none"
              >
                {t('home.confirmChange')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAlarmModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setShowAlarmModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{t('alarms.add')}</h3>
              <button 
                onClick={() => setShowAlarmModal(false)}
                className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 block tracking-wider">{t('alarms.timeLabel')}</label>
                <input 
                  type="time" 
                  value={newAlarmTime}
                  onChange={e => setNewAlarmTime(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 block tracking-wider">{t('alarms.daysLabel')}</label>
                <div className="flex gap-1 justify-between">
                  {DAYS.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleAlarmDay(idx)}
                      className={cn(
                        "w-10 h-10 rounded-full font-bold text-sm transition-all flex items-center justify-center",
                        newAlarmDays.includes(idx) 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                          : "bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:border-indigo-400"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setShowAlarmModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={addAlarm}
                className="flex-1 px-4 py-3 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-200 dark:shadow-none"
              >
                {t('alarms.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddBookModal 
        isOpen={showAddBookModal}
        onClose={() => setShowAddBookModal(false)}
        onAdd={(title, author, themeColor) => {
          const newBook: Book = {
            id: Date.now().toString(),
            title,
            author,
            themeColor,
            chapters: [],
            bookmarks: [],
            notes: [],
            createdAt: Date.now()
          };
          setBooks(prev => [newBook, ...prev]);
          setShowAddBookModal(false);
          setAddedBookForChapter(newBook);
        }}
      />

      <AddChapterModal
        isOpen={!!addedBookForChapter}
        book={addedBookForChapter}
        onClose={() => setAddedBookForChapter(null)}
        onAdd={(bookId, chapterTitle, startPage, endPage) => {
          const newChapter: Chapter = {
            id: Date.now().toString(),
            title: chapterTitle,
            startPage,
            endPage,
            completed: false
          };
          setBooks(prev => prev.map(b => b.id === bookId ? { ...b, chapters: [...b.chapters, newChapter] } : b));
          if (addedBookForChapter) {
             setAddedBookForChapter({ ...addedBookForChapter, chapters: [...addedBookForChapter.chapters, newChapter] });
          }
        }}
      />

      <AllAutoGoalsModal
        isOpen={showAllAutoGoalsModal}
        onClose={() => setShowAllAutoGoalsModal(false)}
        books={books}
        setBooks={setBooks}
      />

      <BaseModal
        isOpen={confirmCompleteAg !== null}
        onClose={() => setConfirmCompleteAg(null)}
        className="max-w-sm text-center p-6"
        hideCloseButton={true}
      >
        {confirmCompleteAg && (
          <>
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-400 to-emerald-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
              <span className="text-3xl">🏆</span>
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              {confirmCompleteAg.autoGoal.completedDates?.includes(targetDateStr) 
                ? t('home.undoGoalConfirmation', '도전 완료를 취소할까요?') 
                : t('home.completeGoalConfirmation', '오늘의 도전을 완료할까요?')}
            </h3>
            
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 whitespace-pre-line leading-relaxed">
              <span className="font-bold text-indigo-500 block mb-1">『{confirmCompleteAg.book.title}』</span>
              {confirmCompleteAg.autoGoal.dailyPages}
              {confirmCompleteAg.autoGoal.calculationBasis === 'chapter' ? (t('chaptersPerDay') || '챕터 / 일') : t('todayPlan.pagesPerDay')}
            </p>

            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmCompleteAg(null)}
                className="flex-1 py-3.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={() => toggleAutoGoalComplete(confirmCompleteAg.book.id, confirmCompleteAg.autoGoal.id)}
                className="flex-1 py-3.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-colors shadow-lg shadow-indigo-500/30"
              >
                {t('common.confirm')}
              </button>
            </div>
          </>
        )}
      </BaseModal>

      {editingAg && (
        <AutoGoalModal
          isOpen={true}
          onClose={() => setEditingAg(null)}
          book={editingAg.book}
          goalId={editingAg.goalId}
          setBooks={setBooks}
        />
      )}
    </div>
  );
}