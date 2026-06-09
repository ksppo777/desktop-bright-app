import { format } from 'date-fns';
import { getStorage, setStorage } from './storage';

export interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
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
}

export const parseMins = (t: string) => {
  if (!t) return 0;
  let [h, m] = t.split(':').map(Number);
  if (isNaN(h)) h = 0;
  if (isNaN(m)) m = 0;
  return h * 60 + m;
};

export const formatTime = (totalMins: number) => {
  const h = Math.floor(Math.abs(totalMins) / 60) % 24;
  const m = Math.floor(Math.abs(totalMins)) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const getDailySettings = async (targetDateStr: string) => {
  try {
    const isToday = targetDateStr === format(new Date(), 'yyyy-MM-dd');
    const dict = await getStorage('study-daily-settings') || {};
    const globalWake = await getStorage('study-wake-hour') || 8;
    const globalSleep = await getStorage('study-sleep-hour') || 23;
    
    const settings = dict[targetDateStr] || { wake: isToday ? globalWake : 8, sleep: isToday ? globalSleep : 23 };
    const wakeTimeRaw = settings.wake;
    const sleepTimeRaw = settings.sleep;

    const wakeTime = typeof wakeTimeRaw === 'number' ? `${String(wakeTimeRaw).padStart(2, '0')}:00` : (wakeTimeRaw || '08:00');
    const sleepTime = typeof sleepTimeRaw === 'number' ? `${String(sleepTimeRaw).padStart(2, '0')}:00` : (sleepTimeRaw || '23:00');

    return { wakeTime, sleepTime };
  } catch (e) {
    return { wakeTime: '08:00', sleepTime: '23:00' };
  }
};

export const generateDefaultBlocks = async (targetDateStr: string): Promise<TimeBlock[]> => {
  const { wakeTime, sleepTime } = await getDailySettings(targetDateStr);
  const blocks: TimeBlock[] = [];
  
  const startMins = parseMins(wakeTime);
  let targetEndMins = parseMins(sleepTime);
  
  if (targetEndMins <= startMins && targetEndMins !== startMins) {
    targetEndMins += 24 * 60; 
  }

  let current = startMins;
  let count = 0;

  while (current < targetEndMins && count < 24) {
    let duration = current % 60 === 0 ? 60 : 60 - (current % 60);
    
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
  
  if (blocks.length === 0) {
    const endHourStr = formatTime(current + 60);
    blocks.push({ id: wakeTime, startTime: wakeTime, endTime: endHourStr, duration: 60 });
  }

  return blocks;
};

export const getDailyLayouts = async (targetDateStr: string): Promise<TimeBlock[]> => {
  try {
    const dict = await getStorage('study-timetable-layouts') || {};
    if (dict[targetDateStr] && dict[targetDateStr].length > 0) {
      return dict[targetDateStr];
    }
  } catch (e) {}
  return await generateDefaultBlocks(targetDateStr);
};

export const getTimetableRecords = async (targetDateStr: string): Promise<TimeSlotGoal[]> => {
  try {
    const dict = await getStorage('study-timetable-records') || {};
    return dict[targetDateStr] || [];
  } catch (e) {}
  return [];
};

export const saveDailyLayouts = async (targetDateStr: string, layouts: TimeBlock[]) => {
  try {
    const dict = await getStorage('study-timetable-layouts') || {};
    dict[targetDateStr] = layouts;
    await setStorage('study-timetable-layouts', dict);
  } catch (e) {}
};

export const saveTimetableRecords = async (targetDateStr: string, records: TimeSlotGoal[]) => {
  try {
    const dict = await getStorage('study-timetable-records') || {};
    dict[targetDateStr] = records;
    await setStorage('study-timetable-records', dict);
  } catch (e) {}
};