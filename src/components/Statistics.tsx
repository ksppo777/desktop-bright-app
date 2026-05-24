import { useState } from 'react';
import { StudySession } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, subDays, parseISO, isSameDay, startOfWeek, startOfMonth, endOfMonth, isAfter, addDays, getDay, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { X, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import TodayPlan from './TodayPlan';

interface StatisticsProps {
  sessions: StudySession[];
  realTimeAddedSeconds?: number;
  weeklyPlans: Record<string, string>;
  setWeeklyPlans: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  dailyGoalMinutes: number;
  setDailyGoalMinutes?: (val: number) => void;
  books?: any[];
  setActiveTab?: (tab: string) => void;
  autoGoalDisplayMode?: 'multiple' | 'single';
}

export default function Statistics({ sessions, realTimeAddedSeconds = 0, weeklyPlans, setWeeklyPlans, dailyGoalMinutes, setDailyGoalMinutes, books = [], setActiveTab, autoGoalDisplayMode = 'multiple' }: StatisticsProps) {
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [showPastPlansModal, setShowPastPlansModal] = useState(false);
  const [pastPlansDate, setPastPlansDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handlePlanChange = (dateKey: string, value: string) => {
    setWeeklyPlans((prev: Record<string, string>) => ({ ...prev, [dateKey]: value }));
  };

  const now = new Date();
  
  // Generate last 7 days data
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(now, 6 - i));

  const chartData = last7Days.map((day, i) => {
    const daySessions = sessions.filter(s => isSameDay(parseISO(s.date), day));
    let totalSeconds = daySessions.reduce((acc, curr) => acc + (curr.durationSeconds || curr.durationMinutes * 60), 0);
    if (i === 6) totalSeconds += realTimeAddedSeconds; // Add active timer to today
    
    const minutes = Math.floor(totalSeconds / 60);

    return {
      date: format(day, 'MMM d일 (E)', { locale: ko }),
      shortDate: format(day, 'dd'),
      minutes: Number((totalSeconds / 60).toFixed(1)),
      seconds: totalSeconds,
      hours: +(totalSeconds / 3600).toFixed(1)
    };
  });

  const totalSecondsAllTime = sessions.reduce((acc, curr) => acc + (curr.durationSeconds || curr.durationMinutes * 60), 0) + realTimeAddedSeconds;
  const totalMinutesAllTime = Math.floor(totalSecondsAllTime / 60);
  const totalHoursAllTime = Math.floor(totalMinutesAllTime / 60);

  const todayMinutes = chartData[6].minutes;
  const todaySeconds = chartData[6].seconds;
  
  // Calculate Streak
  let streak = 0;
  for (let i = 6; i >= 0; i--) {
    if (chartData[i].seconds > 0) streak++;
    else if (i !== 6) break; // If today is 0 it's fine, but if yesterday is 0, streak breaks
  }

  // Weekly Stats (Current week starting Monday)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekSessions = sessions.filter(s => {
    const d = parseISO(s.date);
    return isAfter(d, weekStart) || isSameDay(d, weekStart);
  });
  const weekSeconds = weekSessions.reduce((acc, curr) => acc + (curr.durationSeconds || curr.durationMinutes * 60), 0) + realTimeAddedSeconds;
  const weekMinutes = Math.floor(weekSeconds / 60);

  // Generate week days for modal
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const daySessions = sessions.filter(s => isSameDay(parseISO(s.date), day));
    let seconds = daySessions.reduce((acc, curr) => acc + (curr.durationSeconds || curr.durationMinutes * 60), 0);
    if (isSameDay(now, day)) seconds += realTimeAddedSeconds;
    const minutes = Math.floor(seconds / 60);
    return {
      date: day,
      dayStr: format(day, 'EEEE', { locale: ko }),
      minutes,
      seconds,
      progress: dailyGoalMinutes > 0 ? Math.min(100, Math.round((seconds / 60 / dailyGoalMinutes) * 100)) : 0
    };
  });

  // Monthly Stats (Current month)
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthSessions = sessions.filter(s => {
    const d = parseISO(s.date);
    return isAfter(d, monthStart) || isSameDay(d, monthStart);
  });
  const monthSeconds = monthSessions.reduce((acc, curr) => acc + (curr.durationSeconds || curr.durationMinutes * 60), 0) + realTimeAddedSeconds;
  const monthMinutes = Math.floor(monthSeconds / 60);

  // Generate calendar days for month modal
  const startDayOfWeek = getDay(monthStart); // 0 = Sunday, 1 = Monday...
  const emptyDaysBefore = Array.from({ length: startDayOfWeek }, (_, i) => null);
  const daysInMonth = Array.from({ length: monthEnd.getDate() }, (_, i) => {
    const day = addDays(monthStart, i);
    const daySessions = sessions.filter(s => isSameDay(parseISO(s.date), day));
    let seconds = daySessions.reduce((acc, curr) => acc + (curr.durationSeconds || curr.durationMinutes * 60), 0);
    if (isSameDay(now, day)) seconds += realTimeAddedSeconds;
    const minutes = Math.floor(seconds / 60);
    return {
      dayStr: format(day, 'd'),
      minutes,
      seconds,
      date: day,
      progress: dailyGoalMinutes > 0 ? Math.min(100, Math.round((seconds / 60 / dailyGoalMinutes) * 100)) : 0
    };
  });

  const calendarGrid = [...emptyDaysBefore, ...daysInMonth];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex flex-col justify-center">
          <span className="text-blue-400 dark:text-slate-400 font-bold text-[10px] uppercase mb-1">🔥 연속 학습일</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tight text-orange-500">{streak}</span>
            <span className="text-blue-300 dark:text-slate-500 font-bold uppercase text-[10px]">Days</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex flex-col justify-center">
          <span className="text-blue-400 dark:text-slate-400 font-bold text-[10px] uppercase mb-1">⏱️ 오늘 집중한 시간</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black tracking-tight text-emerald-500">
              {Math.floor(todaySeconds / 3600)}<span className="text-2xl ml-0.5 text-emerald-400">h</span>
            </span>
            <span className="text-4xl font-black tracking-tight text-emerald-500">
              {Math.floor((todaySeconds % 3600) / 60)}<span className="text-2xl ml-0.5 text-emerald-400">m</span>
            </span>
            <span className="text-4xl font-black tracking-tight text-emerald-500">
              {todaySeconds % 60}<span className="text-2xl ml-0.5 text-emerald-400">s</span>
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex flex-col justify-center">
          <span className="text-blue-400 dark:text-slate-400 font-bold text-[10px] uppercase mb-1">📚 누적 학습 시간</span>
          <div className="flex items-baseline gap-2">
             <span className="text-4xl font-black tracking-tight text-blue-500">{(totalMinutesAllTime / 60).toFixed(1)}</span>
             <span className="text-blue-300 dark:text-slate-500 font-bold uppercase text-[10px]">Hours</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 sm:p-8 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none">
          <h3 className="text-lg font-bold text-blue-900 dark:text-slate-100 mb-6">최근 7일 학습 시간 (분)</h3>
          <div className="h-64 sm:h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="shortDate" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#60a5fa', fontSize: 12, fontWeight: 'bold' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#60a5fa', fontSize: 12, fontWeight: 'bold' }}
                />
                <Tooltip 
                  cursor={{ fill: '#eff6ff', opacity: 0.5 }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid #dbeafe', boxShadow: '0 10px 15px -3px rgb(30 58 138 / 0.1)', color: '#1e3a8a', fontWeight: 'bold', backgroundColor: 'var(--tw-colors-white)' }}
                  formatter={(value: number, name: string, props: any) => {
                    const totalSecs = props.payload.seconds;
                    const h = Math.floor(totalSecs / 3600);
                    const m = Math.floor((totalSecs % 3600) / 60);
                    const s = totalSecs % 60;
                    if (h > 0) return [`${h}시간 ${m}분 ${s}초`, '학습 시간'];
                    return [`${m}분 ${s}초`, '학습 시간'];
                  }}
                  labelFormatter={(label) => {
                    const dayData = chartData.find(d => d.shortDate === label);
                    return dayData ? dayData.date : label;
                  }}
                />
                <Bar dataKey="minutes" radius={[8, 8, 8, 8]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="flex flex-col gap-6">
          <div 
            onClick={() => setShowWeeklyModal(true)}
            className="cursor-pointer bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex-1 flex flex-col justify-center hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group"
          >
            <h4 className="text-blue-900 dark:text-slate-100 font-bold mb-4 flex items-center gap-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>주간 통계
            </h4>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">이번 주 누적 시간</span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 flex items-baseline">
                {Math.floor(weekSeconds / 3600)}<span className="text-lg sm:text-xl text-indigo-400 dark:text-indigo-500 mx-1">h</span>
                {Math.floor((weekSeconds % 3600) / 60)}<span className="text-lg sm:text-xl text-indigo-400 dark:text-indigo-500 mx-1">m</span>
                {weekSeconds % 60}<span className="text-lg sm:text-xl text-indigo-400 dark:text-indigo-500 ml-1">s</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase mt-4 opacity-0 group-hover:opacity-100 transition-opacity">클릭해서 요일표 보기 →</span>
          </div>
          
          <div 
            onClick={() => setShowMonthlyModal(true)}
            className="cursor-pointer bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex-1 flex flex-col justify-center hover:border-violet-300 dark:hover:border-violet-600 transition-colors group"
          >
            <h4 className="text-blue-900 dark:text-slate-100 font-bold mb-4 flex items-center gap-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              <span className="w-2 h-2 rounded-full bg-violet-500"></span>월간 통계
            </h4>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">이번 달 누적 시간</span>
              <div className="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400 flex items-baseline">
                {Math.floor(monthSeconds / 3600)}<span className="text-lg sm:text-xl text-violet-400 dark:text-violet-500 mx-1">h</span>
                {Math.floor((monthSeconds % 3600) / 60)}<span className="text-lg sm:text-xl text-violet-400 dark:text-violet-500 mx-1">m</span>
                {monthSeconds % 60}<span className="text-lg sm:text-xl text-violet-400 dark:text-violet-500 ml-1">s</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-violet-400 uppercase mt-4 opacity-0 group-hover:opacity-100 transition-opacity">클릭해서 달력 보기 →</span>
          </div>

          <div 
            onClick={() => setShowPastPlansModal(true)}
            className="cursor-pointer bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex-1 flex flex-col justify-center hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors group"
          >
            <h4 className="text-blue-900 dark:text-slate-100 font-bold mb-4 flex items-center gap-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>지난 학습 계획 살펴보기
            </h4>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">과거 목표 및 계획 조회·수정</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase mt-4 opacity-0 group-hover:opacity-100 transition-opacity">클릭해서 계획 보기 →</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showWeeklyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-blue-900/20 dark:bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowWeeklyModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-7xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col overflow-hidden max-h-[90vh]"
            >
              <button 
                onClick={() => setShowWeeklyModal(false)} 
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-700 rounded-full z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-2xl font-black text-blue-900 dark:text-white mb-2 shrink-0">이번 주 요일표</h2>
              <p className="text-sm font-medium text-blue-400 dark:text-slate-400 mb-6 shrink-0">목표 대비 공부 시간과 일일 목표를 보여줍니다.</p>

              <div className="no-swipe overflow-x-auto pb-6 pt-4 -mx-2 px-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-1 min-h-[300px]">
                <div className="flex gap-4 w-max min-w-full h-full">
                  {weekDays.map((day, idx) => {
                    const isToday = isSameDay(day.date, now);
                    const dayKey = format(day.date, 'yyyy-MM-dd');

                    return (
                      <div key={idx} className={cn("flex flex-col p-5 rounded-3xl border transition-colors relative h-full min-h-[260px] w-64 shrink-0 snap-center shadow-sm", isToday ? "bg-indigo-50/80 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700")}>
                        {isToday && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-black px-3 py-1 rounded-full z-10 shadow-sm border border-white dark:border-slate-800 tracking-wider">TODAY</div>}
                        
                        <div className="flex flex-col gap-1.5 items-center mb-5 shrink-0">
                          <span className={cn("text-sm font-bold px-3 py-1.5 rounded-xl w-full text-center tracking-tight", isToday ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200")}>
                            {day.dayStr}
                          </span>
                          <span className="text-xs font-black text-slate-400 font-mono">{format(day.date, 'MM/dd')}</span>
                        </div>
                        
                        <textarea
                          value={weeklyPlans[dayKey] || ''}
                          onChange={e => handlePlanChange(dayKey, e.target.value)}
                          placeholder="구체적인 목표 계획 작성..."
                          className="w-full text-sm font-medium text-slate-600 dark:text-slate-300 bg-transparent border-none focus:outline-none focus:ring-0 resize-none flex-1 placeholder-slate-300 dark:placeholder-slate-600 mb-4"
                        />
                        
                        <div className="mt-auto flex flex-col items-center shrink-0 pt-5 border-t border-slate-100 dark:border-slate-700/50">
                          <span className={cn("text-2xl font-black mb-1 leading-none flex items-baseline gap-0.5 font-mono", day.seconds > 0 ? (day.progress >= 100 ? "text-emerald-500" : "text-indigo-600 dark:text-indigo-400") : "text-slate-300 dark:text-slate-600")}>
                            {day.minutes}<span className="text-xs opacity-70 font-bold font-sans">분</span>
                            {day.seconds % 60}<span className="text-xs opacity-70 font-bold font-sans">초</span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 mb-3 whitespace-nowrap tracking-wider">목표 {dailyGoalMinutes}분</span>
                          
                          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-1000", day.progress >= 100 ? "bg-emerald-500" : "bg-indigo-500")}
                              style={{ width: `${day.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showMonthlyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-blue-900/20 dark:bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowMonthlyModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col"
            >
              <button 
                onClick={() => setShowMonthlyModal(false)} 
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-2xl font-black text-blue-900 dark:text-white mb-2">{format(monthStart, 'MM월')} 달력</h2>
              <p className="text-sm font-medium text-blue-400 dark:text-slate-400 mb-6">일자별 목표 달성 현황을 간략하게 확인하세요.</p>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                  <div key={idx} className="text-center text-xs font-bold text-slate-400 uppercase">{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {calendarGrid.map((day, idx) => {
                  if (!day) return <div key={idx} className="aspect-square rounded-xl bg-slate-50/50 dark:bg-slate-800/50" />;
                  
                  const isToday = isSameDay(day.date, now);
                  
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "aspect-square rounded-xl border flex flex-col items-center justify-between p-1 sm:p-2 transition-colors relative overflow-hidden group",
                        isToday ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20" : 
                        day.progress >= 100 ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900/30" : 
                        "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800"
                      )}
                    >
                      <span className={cn(
                        "text-xs sm:text-sm font-bold z-10", 
                        isToday ? "text-violet-700 dark:text-violet-300" : "text-slate-700 dark:text-slate-300"
                      )}>{day.dayStr}</span>
                      
                      <div className="w-full h-1 sm:h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-auto mb-1 overflow-hidden z-10">
                        <div 
                          className={cn("h-full rounded-full transition-all", day.progress >= 100 ? "bg-emerald-500" : "bg-violet-400")}
                          style={{ width: `${day.progress}%` }}
                        />
                      </div>
                      
                      {/* Tooltip on hover */}
                      <div className="absolute inset-x-0 bottom-full mb-2 hidden group-hover:flex flex-col items-center justify-center p-2 bg-slate-800 text-white rounded-lg text-[10px] whitespace-nowrap z-20 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        <span className="font-bold">{day.minutes}분 {day.seconds % 60}초 공부</span>
                        <span className="text-slate-300">{Math.round(day.progress)}% 달성</span>
                        <div className="w-2 h-2 bg-slate-800 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {showPastPlansModal && (
          <div className="fixed inset-0 z-50 flex flex-col pt-16 pb-4 px-4 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
            <button 
              onClick={() => setShowPastPlansModal(false)} 
              className="fixed top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-white dark:bg-slate-800 rounded-full shadow-md z-50"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 relative z-10 mb-8 pt-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                <span className="text-lg font-bold text-slate-700 dark:text-slate-200">조회할 과거 날짜 선택:</span>
                <input 
                  type="date" 
                  value={pastPlansDate} 
                  onChange={(e) => setPastPlansDate(e.target.value)} 
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              
              <div className={cn("transition-opacity", pastPlansDate === format(new Date(), 'yyyy-MM-dd') ? "opacity-50 pointer-events-none" : "opacity-100")}>
                {pastPlansDate === format(new Date(), 'yyyy-MM-dd') && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="bg-slate-900/80 text-white font-bold px-6 py-3 rounded-2xl">오늘 날짜는 오늘 계획 탭에서 수정해주세요.</div>
                  </div>
                )}
                <TodayPlan 
                  dailyGoalMinutes={dailyGoalMinutes} 
                  setDailyGoalMinutes={setDailyGoalMinutes || (() => {})} 
                  weeklyPlans={weeklyPlans} 
                  setWeeklyPlans={setWeeklyPlans} 
                  books={books} 
                  setActiveTab={setActiveTab || (() => {})} 
                  autoGoalDisplayMode={autoGoalDisplayMode} 
                  dateStr={pastPlansDate} 
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
