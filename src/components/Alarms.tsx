import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudyAlarm, Book } from '../types';
import { Bell, Plus, Trash2, Settings2, Book as BookIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface AlarmsProps {
  alarms: StudyAlarm[];
  setAlarms: (alarms: StudyAlarm[] | ((prev: StudyAlarm[]) => StudyAlarm[])) => void;
  books?: Book[];
}

export default function Alarms({ alarms, setAlarms, books = [] }: AlarmsProps) {
  const { t } = useTranslation();
  const [newAlarmTime, setNewAlarmTime] = useState('09:00');
  const [newAlarmDays, setNewAlarmDays] = useState<number[]>([]);
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [newAlertMode, setNewAlertMode] = useState<'sound' | 'vibrate' | 'both' | 'off'>('sound');
  const days = t('days.short', { returnObjects: true }) as string[];

  const addAlarm = () => {
    if (newAlarmDays.length === 0) { try { window.alert(t('alarms.selectDayAlert')); } catch(e){} return; }
    const newAlarm: StudyAlarm = {
      id: Date.now().toString(),
      time: newAlarmTime,
      days: newAlarmDays,
      enabled: true,
      expertMode: isExpertMode,
      bookId: isExpertMode ? selectedBookId : undefined,
      chapterId: isExpertMode ? selectedChapterId : undefined,
      alertMode: newAlertMode
    };
    setAlarms(prev => [...prev, newAlarm]);
    setNewAlarmDays([]);
    setIsExpertMode(false);
    setSelectedBookId('');
    setSelectedChapterId('');
    setNewAlertMode('sound');
  };

  const toggleAlarmDay = (dayIndex: number) => {
    setNewAlarmDays(prev => 
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const selectedBook = books.find(b => b.id === selectedBookId);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t('alarms.title')}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('alarms.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpertMode(!isExpertMode)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border",
              isExpertMode 
                ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
            )}
          >
            <Settings2 className="w-4 h-4" /> {t('alarms.advancedMode')}
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700 flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end pointer-events-auto">
            <div className="flex-1 w-full">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 block tracking-wider">{t('alarms.timeLabel')}</label>
              <input 
                type="time" 
                value={newAlarmTime}
                onChange={e => setNewAlarmTime(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 block tracking-wider">{t('alarms.daysLabel')}</label>
              <div className="flex gap-1 justify-between">
                {days.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleAlarmDay(idx)}
                    className={cn(
                      "w-10 h-10 rounded-full font-bold text-sm transition-all flex items-center justify-center",
                      newAlarmDays.includes(idx) 
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                        : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:border-indigo-400"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={addAlarm} className="w-full md:w-auto h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shrink-0">
              <Plus className="w-5 h-5" /> {t('alarms.add')}
            </button>
          </div>

          <div className="flex gap-2 w-full pt-1">
            {(['sound', 'vibrate', 'both', 'off'] as const).map(m => (
              <button
                key={m}
                onClick={() => setNewAlertMode(m)}
                className={cn(
                  "flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all capitalize border",
                  newAlertMode === m 
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400" 
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                )}
              >
                {m === 'sound' && t('alarms.alertModes.sound')}
                {m === 'vibrate' && t('alarms.alertModes.vibrate')}
                {m === 'both' && t('alarms.alertModes.both')}
                {m === 'off' && t('alarms.alertModes.off')}
              </button>
            ))}
          </div>

          {isExpertMode && (
            <div className="flex flex-col md:flex-row gap-4 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50 mt-2">
              <div className="flex-1 w-full">
                <label className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase mb-2 block tracking-wider gap-1 flex items-center">
                  <BookIcon className="w-3 h-3" /> {t('alarms.expert.bookLabel')}
                </label>
                <select
                  value={selectedBookId}
                  onChange={(e) => {
                    setSelectedBookId(e.target.value);
                    setSelectedChapterId('');
                  }}
                  className="w-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/50 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('alarms.selectNone')}</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 w-full">
                <label className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase mb-2 block tracking-wider gap-1 flex items-center">
                  <BookIcon className="w-3 h-3" /> {t('alarms.expert.chapterLabel')}
                </label>
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  disabled={!selectedBook}
                  className="w-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/50 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">{t('alarms.selectAllChapters')}</option>
                  {selectedBook?.chapters.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {alarms.length === 0 ? (
            <p className="text-center text-sm font-medium text-slate-400 py-4">{t('alarms.noAlarms')}</p>
          ) : (
             alarms.map(alarm => {
               const b = books.find(book => book.id === alarm.bookId);
               const c = b?.chapters.find(ch => ch.id === alarm.chapterId);
               
               return (
                 <div key={alarm.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm">
                   <div className="flex flex-col">
                     <div className="text-2xl font-black text-slate-800 dark:text-white mb-1" style={{ fontFamily: 'monospace' }}>
                       {alarm.time}
                     </div>
                     <div className="flex flex-wrap gap-1 mb-2">
                       {days.map((d, dx) => (
                         <span key={dx} className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", alarm.days.includes(dx) ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300" : "text-slate-300 dark:text-slate-600")}>
                           {d}
                         </span>
                       ))}
                     </div>
                     {alarm.expertMode && alarm.bookId && b && (
                       <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-1">
                         <BookIcon className="w-3.5 h-3.5" />
                         <span className="truncate max-w-[200px]">{b.title}</span>
                         {c && (
                           <>
                             <span className="text-slate-300 dark:text-slate-600">/</span>
                             <span className="truncate max-w-[150px]">{c.title}</span>
                           </>
                         )}
                       </div>
                     )}
                   </div>
                   <div className="flex items-center gap-4">
                     <label className="relative inline-flex items-center cursor-pointer">
                       <input type="checkbox" className="sr-only peer" checked={alarm.enabled} onChange={() => setAlarms(prev => prev.map(a => a.id === alarm.id ? {...a, enabled: !a.enabled} : a))} />
                       <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                     </label>
                     <button onClick={() => setAlarms(prev => prev.filter(a => a.id !== alarm.id))} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                       <Trash2 className="w-5 h-5" />
                     </button>
                   </div>
                 </div>
               );
             })
          )}
        </div>
      </div>
    </div>
  );
}