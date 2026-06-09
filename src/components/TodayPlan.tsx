import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Target, Book as BookIcon, Clock, Plus, Trash2, X, CalendarDays, RotateCcw, Divide, MoreVertical, Edit2 } from 'lucide-react';
import { Book, Chapter } from '../types';
import { useLocalStorage, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface TodayPlanProps {
  dailyGoalMinutes: number;
  setDailyGoalMinutes: (val: number) => void;
  weeklyPlans: Record<string, string>;
  setWeeklyPlans: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  books: Book[];
  setActiveTab: (tab: any) => void;
  autoGoalDisplayMode: 'multiple' | 'single';
  dateStr?: string;
}

export interface TimeSlotGoal {
  id: string;
  hour?: number; // legacy
  blockId?: string; // modern identifier for customized blocks
  bookId: string;
  chapterId: string;
  startPage: number;
  endPage: number;
  memo: string;
  isAutoSynced?: boolean;
  isManualAdded?: boolean;
}

export interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
}

export default function TodayPlan({ dailyGoalMinutes, setDailyGoalMinutes, setWeeklyPlans, books, setActiveTab, autoGoalDisplayMode, dateStr }: TodayPlanProps) {
  const { t } = useTranslation();
  const targetDateStr = dateStr || format(new Date(), 'yyyy-MM-dd');
  const isToday = targetDateStr === format(new Date(), 'yyyy-MM-dd');

  const [timetableRecords, setTimetableRecords] = useLocalStorage<Record<string, TimeSlotGoal[]>>('study-timetable-records', {});
  
  const EMPTY_ARRAYRef = useRef<TimeSlotGoal[]>([]);
  const todayGoals = timetableRecords[targetDateStr] || EMPTY_ARRAYRef.current;

  const [globalWakeTimeRaw, setGlobalWakeTimeRaw] = useLocalStorage<string | number>('study-wake-hour', 8);
  const [globalSleepTimeRaw, setGlobalSleepTimeRaw] = useLocalStorage<string | number>('study-sleep-hour', 23);

  const [dailySettingsDict, setDailySettingsDict] = useLocalStorage<Record<string, { goal: number, wake: string | number, sleep: string | number }>>('study-daily-settings', {});
  
  const currentSettings = dailySettingsDict[targetDateStr] || { 
    goal: isToday ? dailyGoalMinutes : 120, 
    wake: isToday ? globalWakeTimeRaw : 8, 
    sleep: isToday ? globalSleepTimeRaw : 23 
  };

  const activeGoal = isToday ? dailyGoalMinutes : currentSettings.goal;
  const wakeTimeRaw = currentSettings.wake;
  const sleepTimeRaw = currentSettings.sleep;

  const handleUpdateGoal = (h: number, m: number) => {
    const total = h * 60 + m;
    if (isToday) setDailyGoalMinutes(total);
    setDailySettingsDict(prev => ({ ...prev, [targetDateStr]: { ...currentSettings, goal: total } }));
  };

  const wakeTime = typeof wakeTimeRaw === 'number' ? `${String(wakeTimeRaw).padStart(2, '0')}:00` : wakeTimeRaw;
  const sleepTime = typeof sleepTimeRaw === 'number' ? `${String(sleepTimeRaw).padStart(2, '0')}:00` : sleepTimeRaw;

  const [dailyLayouts, setDailyLayouts] = useLocalStorage<Record<string, TimeBlock[]>>('study-timetable-layouts', {});

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingBlockLabel, setEditingBlockLabel] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Goal Form State
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');
  const [memo, setMemo] = useState('');
  const [activeGoalMenuId, setActiveGoalMenuId] = useState<string | null>(null);

  // Sync to weeklyPlans for Calendar
  useEffect(() => {
    if (todayGoals.length === 0) {
       setWeeklyPlans(prev => {
         if (prev[targetDateStr] === '') return prev;
         return { ...prev, [targetDateStr]: '' };
       });
       return;
    }
    
    const grouped: Record<string, { start: number, end: number, isAutoSynced: boolean, isManualAdded?: boolean }> = {};
    const memoList: string[] = [];
    
    todayGoals.forEach(g => {
       const timeLabel = g.blockId || (g.hour !== undefined ? `${String(g.hour).padStart(2, '0')}:00` : '');
       if (g.bookId && g.chapterId) {
         const key = `${g.bookId}|${g.chapterId}`;
         if (!grouped[key]) {
           grouped[key] = { start: g.startPage, end: g.endPage, isAutoSynced: !!g.isAutoSynced, isManualAdded: !!g.isManualAdded };
         } else {
           grouped[key].start = Math.min(grouped[key].start, g.startPage);
           grouped[key].end = Math.max(grouped[key].end, g.endPage);
           grouped[key].isAutoSynced = grouped[key].isAutoSynced || !!g.isAutoSynced;
           grouped[key].isManualAdded = grouped[key].isManualAdded || !!g.isManualAdded;
         }
       } else if (g.memo) {
         if (g.isAutoSynced) {
            memoList.push(`⚡ [${timeLabel}] ${g.memo}`);
         } else if (g.isManualAdded) {
            memoList.push(`📝 [${timeLabel}] ${g.memo}`);
         } else {
            memoList.push(`[${timeLabel}] ${g.memo}`);
         }
       }
    });
    
    const lines: string[] = [];
    for (const [key, range] of Object.entries(grouped)) {
      const [bId, cId] = key.split('|');
      const book = books.find(b => b.id === bId);
      const chapter = book?.chapters.find(c => c.id === cId);
      if (book && chapter) {
         const prefix = range.isAutoSynced ? '⚡ ' : (range.isManualAdded ? '📝 ' : '');
         if (range.start === 0 && range.end === 0) {
           lines.push(`${prefix}[${book.title}] ${chapter.title}`);
         } else {
           lines.push(`${prefix}[${book.title}] ${chapter.title} (p.${range.start}~${range.end})`);
         }
      }
    }
    
    const finalText = [...lines, ...memoList].join('\n');
    setWeeklyPlans(prev => {
       if (prev[targetDateStr] === finalText) return prev;
       return { ...prev, [targetDateStr]: finalText };
    });
  }, [todayGoals, books, targetDateStr, setWeeklyPlans]);

  const generateDefaultBlocks = () => {
    const blocks: TimeBlock[] = [];
    
    // Parse time strings "HH:mm" to minutes
    const parseMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const startMins = parseMins(wakeTime);
    let targetEndMins = parseMins(sleepTime);
    
    // If sleep time is earlier than wake time, it means next day
    if (targetEndMins <= startMins && targetEndMins !== startMins) {
      targetEndMins += 24 * 60; 
    }

    let current = startMins;
    let count = 0;

    const formatTime = (totalMins: number) => {
      const h = Math.floor(totalMins / 60) % 24;
      const m = totalMins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    while (current < targetEndMins && count < 24) { // max 24 blocks safety
      let duration = current % 60 === 0 ? 60 : 60 - (current % 60);
      
      // Don't exceed sleep time
      if (current + duration > targetEndMins) {
        duration = targetEndMins - current;
      }

      const startHourStr = formatTime(current);
      const endHourStr = formatTime(current + duration);

      blocks.push({
        id: startHourStr,
        startTime: startHourStr,
        endTime: endHourStr,
        duration,
      });

      current += duration;
      count++;
    }
    
    // Fallback if empty (e.g., wake == sleep)
    if (blocks.length === 0) {
      const endHourStr = formatTime(current + 60);
      blocks.push({ id: wakeTime, startTime: wakeTime, endTime: endHourStr, duration: 60 });
    }

    return blocks;
  };

  const todayLayout = dailyLayouts[targetDateStr] || generateDefaultBlocks();

  const handleWakeChange = (val: string) => {
    if (isToday) setGlobalWakeTimeRaw(val);
    setDailySettingsDict(prev => ({ ...prev, [targetDateStr]: { ...currentSettings, wake: val } }));
    setDailyLayouts(prev => ({ ...prev, [targetDateStr]: undefined as any }));
  };

  const handleSleepChange = (val: string) => {
    if (isToday) setGlobalSleepTimeRaw(val);
    setDailySettingsDict(prev => ({ ...prev, [targetDateStr]: { ...currentSettings, sleep: val } }));
    setDailyLayouts(prev => ({ ...prev, [targetDateStr]: undefined as any }));
  };

  const addMinutesToTime = (timeStr: string, mins: number) => {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + mins;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const handleSplit = (index: number) => {
    setDailyLayouts(prev => {
      const layout = prev[targetDateStr] || generateDefaultBlocks();
      const newLayout = [...layout];
      const block = newLayout[index];
      
      let splitDuration = 0;
      if (block.duration >= 60) {
        splitDuration = 30;
      } else if (block.duration >= 20) {
        splitDuration = 10;
      } else {
        return prev;
      }

      const midTime = addMinutesToTime(block.startTime, splitDuration);
      
      const b1: TimeBlock = {
        id: block.id,
        startTime: block.startTime,
        endTime: midTime,
        duration: splitDuration
      };
      
      const b2: TimeBlock = {
        id: `${block.id}_s2_${Date.now().toString().slice(-4)}`,
        startTime: midTime,
        endTime: block.endTime,
        duration: block.duration - splitDuration
      };
      
      newLayout.splice(index, 1, b1, b2);
      return { ...prev, [targetDateStr]: newLayout };
    });
  };

  const handleMerge = (index: number) => {
    let b2IdToRemove: string | null = null;
    
    setDailyLayouts(prev => {
      const layout = prev[targetDateStr] || generateDefaultBlocks();
      if (index >= layout.length - 1) return prev;
      
      const newLayout = [...layout];
      const b1 = newLayout[index];
      const b2 = newLayout[index + 1];
      b2IdToRemove = b2.id;
      
      const merged: TimeBlock = {
        id: b1.id,
        startTime: b1.startTime,
        endTime: b2.endTime,
        duration: b1.duration + b2.duration,
      };
      
      newLayout.splice(index, 2, merged);
      return { ...prev, [targetDateStr]: newLayout };
    });

    if (b2IdToRemove) {
      setTimetableRecords(prev => {
        const records = prev[targetDateStr] || [];
        return { 
          ...prev, 
          [targetDateStr]: records.filter(g => g.blockId !== b2IdToRemove) 
        };
      });
    }
  };

  const handleResetTimetable = () => {
    setShowResetConfirm(true);
  };

  const handleSaveGoal = () => {
    if (!editingBlockId) return;
    if (!selectedBookId && !memo.trim()) return;

    const newGoal: TimeSlotGoal = {
      id: Date.now().toString(),
      blockId: editingBlockId,
      bookId: selectedBookId,
      chapterId: selectedChapterId,
      startPage: parseInt(startPage) || 0,
      endPage: parseInt(endPage) || 0,
      memo
    };

    setTimetableRecords(prev => {
      const records = prev[targetDateStr] || [];
      const updated = records.filter(g => g.blockId !== editingBlockId && (g.hour === undefined || `${String(g.hour).padStart(2, '0')}:00` !== editingBlockId));
      return { ...prev, [targetDateStr]: [...updated, newGoal] };
    });

    setEditingBlockId(null);
    setSelectedBookId('');
    setSelectedChapterId('');
    setStartPage('');
    setEndPage('');
    setMemo('');
  };

  const handleDeleteGoal = (blockId: string) => {
    setTimetableRecords(prev => {
      const records = prev[targetDateStr] || [];
      return { ...prev, [targetDateStr]: records.filter(g => g.blockId !== blockId && (g.hour === undefined || `${String(g.hour).padStart(2, '0')}:00` !== blockId)) };
    });
  };

  const openEditModal = (blockId: string, label: string) => {
    const existing = todayGoals.find(g => g.blockId === blockId || (g.hour !== undefined && `${String(g.hour).padStart(2, '0')}:00` === blockId));
    if (existing) {
      setSelectedBookId(existing.bookId);
      setSelectedChapterId(existing.chapterId);
      setStartPage(existing.startPage ? String(existing.startPage) : '');
      setEndPage(existing.endPage ? String(existing.endPage) : '');
      setMemo(existing.memo || '');
    } else {
      setSelectedBookId('');
      setSelectedChapterId('');
      setStartPage('');
      setEndPage('');
      setMemo('');
    }
    setEditingBlockId(blockId);
    setEditingBlockLabel(label);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 transition-colors">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{t('todayPlan.title')}</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('todayPlan.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">{t('todayPlan.dailyGoalLabel')}</label>
              <div className="flex items-center gap-1.5 sm:gap-4 w-full">
                <div className="flex items-center gap-1 sm:gap-2 shrink-1">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={Math.floor(dailyGoalMinutes / 60) === 0 && dailyGoalMinutes === 0 ? '' : Math.floor(dailyGoalMinutes / 60)}
                    onChange={(e) => {
                      const h = Number(e.target.value);
                      if (h >= 0 && h <= 24) {
                        setDailyGoalMinutes(h * 60 + (dailyGoalMinutes % 60));
                      }
                    }}
                    className="w-12 sm:w-20 px-1 sm:px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                  />
                  <span className="text-slate-500 font-bold whitespace-nowrap text-xs sm:text-base">{t('todayPlan.hoursLabel')}</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-1">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={dailyGoalMinutes % 60 === 0 && dailyGoalMinutes === 0 ? '' : dailyGoalMinutes % 60}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      if (m >= 0 && m <= 60) {
                        setDailyGoalMinutes(Math.floor(dailyGoalMinutes / 60) * 60 + m);
                      }
                    }}
                    className="w-12 sm:w-20 px-1 sm:px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                  />
                  <span className="text-slate-500 font-bold whitespace-nowrap text-xs sm:text-base">{t('todayPlan.minutesLabel')}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {books.some(b => b.autoGoals?.some(ag => ag.enabled)) && (
                <div className="flex flex-col gap-3">
                  {autoGoalDisplayMode === 'single' ? (
                    <div className="relative overflow-hidden bg-gradient-to-br from-red-500 via-rose-500 to-orange-500 shadow-sm shadow-red-500/20 rounded-2xl p-4 text-white flex flex-col gap-4">
                      {/* Decorative Blur Blobs */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-orange-400 blur-2xl opacity-50 rounded-full mix-blend-screen pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-600 blur-2xl opacity-50 rounded-full mix-blend-screen pointer-events-none"></div>
                      
                      {books.flatMap(b => (b.autoGoals?.filter(ag => ag.enabled) || []).map(ag => ({ book: b, autoGoal: ag }))).map(({book, autoGoal}, idx) => (
                        <div key={autoGoal.id} className={cn("flex justify-between items-center relative z-10", idx > 0 ? "pt-4 border-t border-white/20" : "")}>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-red-100 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                              <Target className="w-3 h-3 text-orange-200" /> {t('todayPlan.dailyChallengeTitle')}
                            </span>
                            <span className="font-bold text-sm truncate max-w-[150px] mb-1">{book.title}</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black tracking-tight">{autoGoal.dailyPages}</span>
                              <span className="text-xs font-bold text-red-100">{t('todayPlan.pagesPerDay')}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setActiveTab('books')}
                            className="bg-white/10 hover:bg-white/20 transition-colors p-2.5 rounded-xl cursor-pointer self-start shrink-0"
                            title={t('todayPlan.goToProgressManagement')}
                          >
                            <BookIcon className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    books.flatMap(b => (b.autoGoals?.filter(ag => ag.enabled) || []).map(ag => ({ book: b, autoGoal: ag }))).map(({book, autoGoal}) => (
                      <div key={autoGoal.id} className="relative overflow-hidden bg-gradient-to-br from-red-500 via-rose-500 to-orange-500 p-4 rounded-2xl text-white flex justify-between items-center shadow-sm group">
                        {/* Decorative Blur Blobs */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-400 blur-2xl opacity-50 rounded-full mix-blend-screen pointer-events-none transition-transform group-hover:scale-110"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-600 blur-2xl opacity-50 rounded-full mix-blend-screen pointer-events-none transition-transform group-hover:scale-110"></div>
                        
                        <div className="flex flex-col relative z-10">
                          <span className="text-[10px] font-bold text-red-100 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                            <Target className="w-3 h-3 text-orange-200" /> {t('todayPlan.dailyChallengeTitle')}
                          </span>
                          <span className="font-bold text-sm truncate max-w-[150px] mb-1">{book.title}</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black tracking-tight">{autoGoal.dailyPages}</span>
                            <span className="text-xs font-bold text-red-100">{t('todayPlan.pagesPerDay')}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setActiveTab('books')}
                          className="relative z-10 bg-white/20 hover:bg-white/30 transition-colors p-2.5 rounded-xl cursor-pointer"
                          title={t('todayPlan.goToProgressManagement')}
                        >
                          <BookIcon className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                   <Clock className="w-4 h-4 text-indigo-500" />
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('todayPlan.lifestyleTitle')}</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="text-xs font-bold text-slate-500 block mb-1">{t('todayPlan.wakeTimeLabel')}</label>
                    <select value={wakeTime} onChange={e => handleWakeChange(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
                      {Array.from({length:48}).map((_, i) => {
                        const h = Math.floor(i / 2);
                        const m = i % 2 === 0 ? '00' : '30';
                        const t = `${String(h).padStart(2,'0')}:${m}`;
                        return <option key={t} value={t}>{t}</option>;
                      })}
                    </select>
                  </div>
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="text-xs font-bold text-slate-500 block mb-1">{t('todayPlan.sleepTimeLabel')}</label>
                    <select value={sleepTime} onChange={e => handleSleepChange(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
                      {Array.from({length:49}).map((_, i) => {
                        const h = Math.floor(i / 2);
                        const m = i % 2 === 0 ? '00' : '30';
                        const t = `${String(h).padStart(2,'0')}:${m}`;
                        return <option key={t} value={t}>{t}</option>;
                      })}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
             <div className="flex items-center justify-between mb-4">
               <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                 <CalendarDays className="w-4 h-4 text-indigo-500" /> {t('todayPlan.todayTimetableTitle')}
               </h4>
               <button onClick={handleResetTimetable} className="text-xs font-bold text-slate-500 hover:text-rose-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 shadow-sm">
                 <RotateCcw className="w-3.5 h-3.5" /> {t('todayPlan.resetButton')}
               </button>
             </div>
             <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-200 dark:divide-slate-700/50">
               {todayLayout.map((block, idx) => {
                 const goal = todayGoals.find(g => g.blockId === block.id || (g.hour !== undefined && `${String(g.hour).padStart(2, '0')}:00` === block.id));
                 const bookObj = goal?.bookId ? books.find(b => b.id === goal.bookId) : null;
                 const chapterObj = bookObj && goal?.chapterId ? bookObj.chapters.find(c => c.id === goal.chapterId) : null;

                 return (
                   <div key={block.id} className="relative flex min-h-[4.5rem] group border-b border-slate-200 dark:border-slate-700/50 last:border-b-0">
                     <div className="w-24 sm:w-28 border-r border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50 flex flex-col items-center justify-center shrink-0 py-2 relative gap-1">
                       <div className="flex flex-col items-center">
                         <span className="text-sm font-bold text-slate-600 dark:text-slate-300 font-mono">{block.startTime}</span>
                         <span className="text-[10px] font-medium text-slate-400 font-mono mt-0.5">~ {block.endTime}</span>
                       </div>
                     </div>
                     <div className="flex-1 flex bg-white dark:bg-slate-800 relative transition-colors hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer min-h-full" onClick={() => openEditModal(block.id, `${block.startTime} ~ ${block.endTime}`)}>
                       <div className="flex-1 p-3">
                         {goal ? (
                           <div className="pr-8 h-full flex flex-col justify-center relative">
                             {bookObj && chapterObj ? (
                               <div className="flex flex-col">
                                 <div className="flex items-center gap-1 mb-0.5">
                                   {goal.isAutoSynced && <span title={t('todayPlan.autoSyncedRecordTitle')} className="text-xs">⚡</span>}
                                   {goal.isManualAdded && <span title={t('todayPlan.manualAddedRecordTitle')} className="text-xs">📝</span>}
                                   <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">[{bookObj.title}]</span>
                                 </div>
                                 <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{chapterObj.title}</span>
                                 {goal.startPage !== 0 || goal.endPage !== 0 ? (
                                   <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 font-mono">
                                      {t('todayPlan.pageRangeSummary', { start: goal.startPage, end: goal.endPage, pagesCount: (goal.endPage - goal.startPage) + 1 })}
                                   </span>
                                 ) : null}
                               </div>
                             ) : (
                               <div className="flex items-center gap-1">
                                 {goal.isAutoSynced && <span title={t('todayPlan.autoSyncedRecordTitle')} className="text-xs">⚡</span>}
                                 {goal.isManualAdded && <span title={t('todayPlan.manualAddedRecordTitle')} className="text-xs">📝</span>}
                                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{goal.memo}</span>
                               </div>
                             )}
                             <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
                               <button 
                                 onClick={(e) => { 
                                   e.stopPropagation(); 
                                   setActiveGoalMenuId(activeGoalMenuId === block.id ? null : block.id); 
                                 }} 
                                 className="p-2 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-all rounded-md"
                               >
                                  <MoreVertical className="w-5 h-5" />
                               </button>
                               <AnimatePresence>
                                 {activeGoalMenuId === block.id && (
                                   <motion.div
                                     initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                     animate={{ opacity: 1, scale: 1, y: 0 }}
                                     exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                     transition={{ duration: 0.15 }}
                                     className="absolute right-0 top-10 mt-1 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-20"
                                   >
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setActiveGoalMenuId(null);
                                         openEditModal(block.id, `${block.startTime} ~ ${block.endTime}`);
                                       }}
                                       className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                     >
                                       <Edit2 className="w-4 h-4" /> {t('todayPlan.editButton')}
                                     </button>
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleDeleteGoal(block.id);
                                         setActiveGoalMenuId(null);
                                       }}
                                       className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                     >
                                       <Trash2 className="w-4 h-4" /> {t('todayPlan.deleteButton')}
                                     </button>
                                   </motion.div>
                                 )}
                               </AnimatePresence>
                             </div>
                           </div>
                         ) : (
                           <div className="h-full w-full flex items-center text-slate-400 dark:text-slate-500 font-bold text-xs transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-400">
                             <Plus className="w-4 h-4 mr-1" /> {t('todayPlan.addPlan')}
                           </div>
                         )}
                       </div>

                       <div className="w-16 sm:w-20 shrink-0 flex flex-col items-center justify-center p-2 border-l border-slate-100 dark:border-slate-700/50">
                         <button onClick={(e) => { e.stopPropagation(); handleSplit(idx); }} className="w-full py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-lg transition-colors text-[10px] sm:text-xs font-bold border border-slate-200 dark:border-slate-600 shadow-sm flex items-center justify-center gap-1" title={t('todayPlan.splitTitle')}>
                           <Divide className="w-3.5 h-3.5" />
                         </button>
                       </div>
                     </div>

                     {idx < todayLayout.length - 1 && (
                       <div className="absolute left-[3rem] sm:left-[3.5rem] -bottom-[15px] -translate-x-1/2 z-10 pointer-events-auto">
                         <button onClick={(e) => { e.stopPropagation(); handleMerge(idx); }} className="w-[30px] h-[30px] bg-white dark:bg-slate-800 border-[1.5px] border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 group/merge" title={t('todayPlan.mergeTitle')}>
                           <Plus className="w-4 h-4 transition-transform group-hover/merge:scale-110" />
                         </button>
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
          </div>
        </div>
      </div>

      {editingBlockId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm" onClick={() => setEditingBlockId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" /> {t('todayPlan.editStudyPlanTitle', { timeRange: editingBlockLabel })}
              </h3>
              <button onClick={() => setEditingBlockId(null)} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">{t('todayPlan.bookSelectLabel')}</label>
                <select value={selectedBookId} onChange={e => { setSelectedBookId(e.target.value); setSelectedChapterId(''); }} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <option value="">{t('todayPlan.bookSelectPlaceholder')}</option>
                  {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>

              {selectedBookId && (
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">{t('todayPlan.chapterLabel')}</label>
                  <select value={selectedChapterId} onChange={e => {
                    const chapterId = e.target.value;
                    setSelectedChapterId(chapterId);
                    if (chapterId) {
                      const chapter = books.find(b => b.id === selectedBookId)?.chapters.find(c => c.id === chapterId);
                      if (chapter) {
                        setStartPage(String(chapter.startPage));
                        setEndPage(String(chapter.endPage));
                      }
                    } else {
                      setStartPage('');
                      setEndPage('');
                    }
                  }} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200">
                    <option value="">{t('todayPlan.chapterSelectPlaceholder')}</option>
                    {books.find(b => b.id === selectedBookId)?.chapters.map(c => <option key={c.id} value={c.id}>{c.title} (p.{c.startPage}~{c.endPage})</option>)}
                  </select>
                </div>
              )}

              {selectedChapterId && (
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">{t('todayPlan.pageRangeLabel')}</label>
                  <div className="flex items-center gap-3">
                    <input type="number" placeholder={t('todayPlan.pageStartPlaceholder')} value={startPage} onChange={e => setStartPage(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-center text-sm font-bold text-slate-700 dark:text-slate-200" />
                    <span className="text-slate-400 font-bold">~</span>
                    <input type="number" placeholder={t('todayPlan.pageEndPlaceholder')} value={endPage} onChange={e => setEndPage(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-center text-sm font-bold text-slate-700 dark:text-slate-200" />
                  </div>
                </div>
              )}

              {!selectedBookId && (
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">{t('todayPlan.manualMemoLabel')}</label>
                  <textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder={t('todayPlan.manualMemoPlaceholder')} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 resize-none min-h-[80px] focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setEditingBlockId(null)} className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleSaveGoal} className="flex-1 px-4 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-200 dark:shadow-none">
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-100 dark:border-slate-700 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-3 text-slate-800 dark:text-slate-100">{t('todayPlan.resetConfirmTitle')}</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
              {t('todayPlan.resetConfirmBody')}<br/><br/>{t('todayPlan.resetConfirmQuestion')}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={() => {
                setDailyLayouts(prev => {
                  const next = { ...prev };
                  delete next[targetDateStr];
                  return next;
                });
                setTimetableRecords(prev => {
                  const next = { ...prev };
                  delete next[targetDateStr];
                  return next;
                });
                setShowResetConfirm(false);
              }} className="flex-1 py-2.5 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-colors">
                {t('todayPlan.resetButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}