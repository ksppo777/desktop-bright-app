import React, { useState, useMemo } from 'react';
import { StudySession, Book } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Target, Book as BookIcon, ChevronDown, List, Trash2 } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, getWeeksInMonth, isSameWeek } from 'date-fns';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import QuickAddModal from './QuickAddModal';
import { Chapter } from '../types';

interface CalendarProps {
  sessions: StudySession[];
  weeklyPlans: Record<string, string>;
  setWeeklyPlans: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  monthlyPlans: Record<string, string>;
  setMonthlyPlans: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  books: Book[];
}

export default function CalendarWithGoals({ sessions, weeklyPlans, setWeeklyPlans, monthlyPlans, setMonthlyPlans, books }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { t } = useTranslation();
  const DAYS = t('days.short', { returnObjects: true }) as string[];
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [confirmDeleteWeek, setConfirmDeleteWeek] = useState<number | null>(null);
  const [quickAdd, setQuickAdd] = useState<{isOpen: boolean; dateKey: string; book: Book | null; chapter: Chapter | null}>({ isOpen: false, dateKey: '', book: null, chapter: null });

  const handleQuickAddSelect = (dateKey: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!e.target.value) return;
    const [bookId, chapterId] = e.target.value.split('|');
    const book = books.find(b => b.id === bookId);
    const chapter = book?.chapters.find(c => c.id === chapterId);
    if (book && chapter) {
      setQuickAdd({ isOpen: true, dateKey, book, chapter });
    }
    e.target.value = "";
  };

  const handleQuickAddSubmit = (text: string) => {
    setWeeklyPlans((prev) => {
      const curPlan = prev[quickAdd.dateKey] || '';
      const newPlan = curPlan ? `${curPlan}\n- ${text}` : `- ${text}`;
      return { ...prev, [quickAdd.dateKey]: newPlan };
    });
  };

  const [editYearStr, setEditYearStr] = useState(currentDate.getFullYear().toString());
  const [editMonthStr, setEditMonthStr] = useState((currentDate.getMonth() + 1).toString());

  // Navigation
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDateEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numY = parseInt(editYearStr, 10);
    const numM = parseInt(editMonthStr, 10);
    if (!isNaN(numY) && !isNaN(numM) && numM >= 1 && numM <= 12) {
      setCurrentDate(new Date(numY, numM - 1, 1));
    }
    setIsEditingDate(false);
  };

  const handleDeleteWeek = (weekDays: Date[], weekNum: number) => {
    if (confirmDeleteWeek === weekNum) {
      setWeeklyPlans((prev: Record<string, string>) => {
        const next = { ...prev };
        weekDays.forEach(d => {
          delete next[format(d, 'yyyy-MM-dd')];
        });
        return next;
      });
      setConfirmDeleteWeek(null);
    } else {
      setConfirmDeleteWeek(weekNum);
    }
  };

  // Calendar Days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      const dayKeyForCalendar = format(cloneDay, 'yyyy-MM-dd');
      
      const daySessions = sessions.filter(s => isSameDay(new Date(s.date), cloneDay));
      const totalSeconds = daySessions.reduce((acc, curr) => acc + (curr.durationSeconds || curr.durationMinutes * 60), 0);
      const totalMinutes = Math.floor(totalSeconds / 60);

      days.push(
        <div
          key={day.toString()}
          onClick={() => {
            if (isSameMonth(cloneDay, monthStart)) {
              setSelectedDate(cloneDay);
            } else {
              setCurrentDate(startOfMonth(cloneDay));
              setSelectedDate(cloneDay);
            }
          }}
          className={cn(
            "p-1 sm:p-2 aspect-square sm:aspect-auto sm:min-h-[120px] border border-slate-100 dark:border-slate-800 flex flex-col items-center sm:items-start justify-start relative transition-colors group cursor-pointer",
            !isSameMonth(day, monthStart)
              ? "bg-slate-50/50 dark:bg-slate-900/30 text-slate-300 dark:text-slate-600"
              : isSameDay(day, new Date())
                ? "bg-indigo-50/30 dark:bg-indigo-900/10 text-indigo-900 dark:text-indigo-100 font-bold"
                : isSameDay(day, selectedDate)
                  ? "bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-400 dark:ring-blue-500"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
          )}
        >
          {isSameDay(day, new Date()) && (
            <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 bg-indigo-500 rounded-bl-2xl sm:rounded-bl-3xl opacity-20 -z-0"></div>
          )}
          <div className="flex flex-col sm:flex-row justify-between w-full items-center sm:items-start gap-1 sm:gap-0 z-10 h-full sm:h-auto">
            <span className={cn(
              "text-xs sm:text-sm font-bold flex-shrink-0 mt-1 sm:mt-0", 
              isSameDay(day, new Date()) && "w-6 h-6 sm:w-7 sm:h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-sm"
            )}>
              {formattedDate}
            </span>
            {totalMinutes > 0 ? (
              <div className="flex items-baseline gap-0.5 max-w-full justify-center sm:justify-end flex-wrap sm:flex-nowrap mt-auto sm:mt-0 mb-1 sm:mb-0">
                <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tighter truncate">{totalMinutes}</span>
                <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase hidden xl:inline">m</span>
              </div>
            ) : <div className="hidden sm:block"></div>}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  // Monthly and Weekly Plans
  const currentMonthKey = format(currentDate, 'yyyy-MM');
  const monthPlan = monthlyPlans[currentMonthKey] || '';
  const handleMonthPlanChange = (val: string) => setMonthlyPlans((prev: Record<string, string>) => ({ ...prev, [currentMonthKey]: val }));

  return (
    <div className="w-full flex flex-col xl:flex-row gap-8 transition-colors">
      
      {/* LEFT/CENTER: Calendar Grid */}
      <div className="flex-1 bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
          <button onClick={prevMonth} className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="relative">
            {!isEditingDate ? (
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors tracking-tight flex items-center gap-2" onClick={() => {
                setEditYearStr(currentDate.getFullYear().toString());
                setEditMonthStr((currentDate.getMonth() + 1).toString());
                setIsEditingDate(true);
              }}>
                {t('calendar.header', { year: format(currentDate, 'yyyy'), month: format(currentDate, 'M') })}
              </h2>
            ) : (
              <form onSubmit={handleDateEditSubmit} className="flex gap-2 items-center">
                <input 
                  type="number" 
                  value={editYearStr} 
                  onChange={e => setEditYearStr(e.target.value)} 
                  className="w-20 sm:w-24 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-lg sm:text-xl font-bold dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xl font-bold dark:text-white">{t('calendar.yearSuffix')}</span>
                <input 
                  type="number" 
                  min="1" max="12"
                  value={editMonthStr} 
                  onChange={e => setEditMonthStr(e.target.value)} 
                  className="w-16 sm:w-20 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-lg sm:text-xl font-bold dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xl font-bold dark:text-white">{t('calendar.monthSuffix')}</span>
                <button type="submit" className="ml-2 px-3 py-1.5 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 text-sm">{t('calendar.moveButton')}</button>
                <button type="button" onClick={() => setIsEditingDate(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg text-sm">{t('common.cancel')}</button>
              </form>
            )}
          </div>

          <button onClick={nextMonth} className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-4">
          {DAYS.map((d, i) => (
            <div key={i} className="text-center font-bold text-slate-400 dark:text-slate-500 text-xs sm:text-sm tracking-wider uppercase">
              {d}
            </div>
          ))}
        </div>
        
        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm">
          {rows}
        </div>
      </div>

      {/* RIGHT: Goals and Plans */}
      <div className="w-full xl:w-96 shrink-0 flex flex-col gap-6">
        
        {/* Monthly Goal */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('calendar.monthGoalTitle', { month: format(currentDate, 'M') })}</h3>
          </div>
          <textarea
            value={monthPlan}
            onChange={(e) => handleMonthPlanChange(e.target.value)}
            placeholder={t('calendar.monthPlanPlaceholder', { month: format(currentDate, 'M') })}
            className="w-full flex-1 min-h-[140px] text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none placeholder-slate-400 dark:placeholder-slate-600 shadow-inner"
          />
        </div>

        {/* Weekly Goals Container */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex-1 flex flex-col min-h-[400px]">
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white shrink-0">{t('calendar.weeklyDetailsTitle')}</h3>
             </div>
             <button
               onClick={() => setShowAllWeeks(!showAllWeeks)}
               className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0", showAllWeeks ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600")}
             >
               <List className="w-3.5 h-3.5" />
               {showAllWeeks ? t('calendar.showCurrentWeek') : t('calendar.showAllWeeks')}
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-8 mt-2 scrollbar-thin">
            {[...Array(getWeeksInMonth(currentDate))].map((_, i) => {
              const weekNum = i + 1;
              // determine days in this week for the current month
              const ds = [];
              let wStart = startOfWeek(addDays(monthStart, i * 7), { weekStartsOn: 0 });
              let isWeekSelected = false;
              for(let j=0; j<7; j++) {
                const cur = addDays(wStart, j);
                if (isSameMonth(cur, currentDate)) {
                  ds.push(cur);
                  if (isSameWeek(cur, selectedDate, { weekStartsOn: 0 })) {
                    isWeekSelected = true;
                  }
                }
              }

              if (!showAllWeeks && !isWeekSelected) return null;

              return (
                <div key={weekNum} className="relative animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 mb-4 sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm py-2 z-10">
                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-black rounded-lg uppercase tracking-wider">{t('calendar.weekLabel', { week: weekNum })}</span>
                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700"></div>
                     <div className="flex items-center gap-1 shrink-0">
                       <button
                         onClick={() => handleDeleteWeek(ds, weekNum)}
                         className={cn("text-[10px] font-bold px-2 py-1 rounded transition-colors border flex items-center gap-1", confirmDeleteWeek === weekNum ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700")}
                       >
                         {confirmDeleteWeek === weekNum ? t('calendar.deleteAll') : <><Trash2 className="w-3 h-3"/> {t('calendar.deleteAll')}</>}
                       </button>
                       {confirmDeleteWeek === weekNum && (
                         <button onClick={() => setConfirmDeleteWeek(null)} className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded hover:bg-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600">{t('common.cancel')}</button>
                       )}
                     </div>
                  </div>
                  
                  <div className="space-y-4">
                    {ds.map(d => {
                      const dayKey = format(d, 'yyyy-MM-dd');
                      const plan = weeklyPlans[dayKey] || '';
                      const isToday = isSameDay(d, new Date());
                      const isSelected = isSameDay(d, selectedDate);
                      return (
                         <div key={dayKey} className={cn("group relative flex flex-col p-2.5 rounded-xl border border-transparent transition-colors", isSelected && "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700")}>
                           <div className="flex items-start gap-3">
                             <div className="w-9 shrink-0 flex flex-col items-center justify-start pt-1.5">
                              <span className={cn("text-sm font-black", 
                                isToday ? "bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center -mt-1 shadow-sm" : 
                                isSelected ? "text-indigo-600 dark:text-indigo-400" :
                                "text-slate-400 dark:text-slate-500"
                              )}>
                                {format(d, 'd')}
                              </span>
                             </div>
                             <div className="flex-1 flex flex-col gap-2">
                               <textarea
                                value={plan}
                                onChange={(e) => setWeeklyPlans((prev: Record<string, string>) => ({ ...prev, [dayKey]: e.target.value }))}
                                placeholder={t('calendar.dayGoalPlaceholder', { day: DAYS[d.getDay()] })}
                                className="w-full min-h-[46px] text-sm font-medium text-slate-700 dark:text-slate-200 bg-transparent border-b border-slate-100 dark:border-slate-700 pb-2 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 resize-none placeholder-slate-300 dark:placeholder-slate-600 overflow-hidden"
                                style={{ height: 'auto' }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                  <BookIcon className="w-3 h-3" /> {t('calendar.quickAddLabel')}
                                </span>
                                {books.length === 0 ? (
                                  <span className="text-[10px] text-slate-400">{t('calendar.noBooks')}</span>
                                ) : (
                                  <select 
                                    className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-400 w-32 truncate"
                                    onChange={(e) => handleQuickAddSelect(dayKey, e)}
                                  >
                                    <option value="">{t('calendar.selectBookChapter')}</option>
                                    {books.map(b => (
                                      <optgroup key={b.id} label={b.title}>
                                        {b.chapters.map(c => (
                                          <option key={c.id} value={`${b.id}|${c.id}`}>
                                            {c.title} (p.{c.startPage}~{c.endPage})
                                          </option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </select>
                                )}
                              </div>
                             </div>
                           </div>
                         </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
      
      {quickAdd.book && quickAdd.chapter && (
        <QuickAddModal 
          isOpen={quickAdd.isOpen} 
          onClose={() => setQuickAdd({ isOpen: false, dateKey: '', book: null, chapter: null })} 
          onAdd={handleQuickAddSubmit} 
          book={quickAdd.book} 
          chapter={quickAdd.chapter} 
        />
      )}
    </div>
  );
}