import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StudyAlarm, Book } from '../types';

export const checkNotificationPermission = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      return perm.display === 'granted';
    } catch (e) {
      console.error('Failed to check notification permission:', e);
      return false;
    }
  }
  return true;
};

export const requestNotificationPermission = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
    } catch (e) {
      console.error('Failed to request notification permission:', e);
    }
  }
};

export const syncLocalAlarms = async (alarms: StudyAlarm[], books: Book[]) => {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    // Request permission first
    await requestNotificationPermission();
    
    // Clear all existing pending scheduled alarms
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      // NOTE: We reserve IDs 1-10000 for Timer, 10000+ for Alarms
      const alarmIds = pending.notifications.filter(n => n.id >= 10000);
      if (alarmIds.length > 0) {
        await LocalNotifications.cancel({ notifications: alarmIds });
      }
    }

    const scheduled = [];

    // Schedule each recurring alarm
    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      
      const [hourStr, minStr] = alarm.time.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minStr, 10);

      let bodyText = "⏰ 규칙적인 학습 시간이 되었습니다! 학습을 시작해볼까요?";
      if (alarm.expertMode && alarm.bookId) {
        const book = books.find(b => b.id === alarm.bookId);
        const chapter = book?.chapters.find(c => c.id === alarm.chapterId);
        if (book) {
          if (chapter) {
            bodyText = `⏰ ${book.title} ${chapter.title} 공부할 시간이 되었습니다!`;
          } else {
            bodyText = `⏰ ${book.title} 공부할 시간이 되었습니다!`;
          }
        }
      }

      // Schedule for every chosen day
      for (const dayOfWeek of alarm.days) {
        const idOffset = dayOfWeek; 
        const notifId = 10000 + parseInt(alarm.id) * 10 + idOffset; // Ensuring unique ID per alarm per day
        
        // Convert JS day 0-6 (Sun-Sat) to Capacitor day 1-7 (Sun-Sat)
        const capacitorWeekday = dayOfWeek + 1; 

        scheduled.push({
          id: notifId,
          title: "Bright Study 학습 알림",
          body: bodyText,
          schedule: {
            on: {
              weekday: capacitorWeekday,
              hour: hour,
              minute: minute,
               // Second 0
              second: 0
            },
            allowWhileIdle: true, // Requires SCHEDULE_EXACT_ALARM on Android
          },
          sound: "beep.wav", 
        });
      }
    }

    if (scheduled.length > 0) {
      await LocalNotifications.schedule({ notifications: scheduled });
    }
    
  } catch (e) {
    console.error('Failed to sync local alarms:', e);
  }
};

export const scheduleTimerNotification = async (timeLeft: number, mode: 'focus' | 'break') => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const title = mode === 'focus' ? '집중 시간 종료!' : '휴식 시간 종료!';
    const body = mode === 'focus' ? '고생했어요! 휴식 시간을 가지세요.' : '휴식 완료! 다시 집중을 시작해볼까요?';
    
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 1, // Fixed ID for Timer
          title,
          body,
          schedule: {
            at: new Date(Date.now() + timeLeft * 1000),
            allowWhileIdle: true,
          },
          sound: "beep.wav",
        }
      ]
    });
  } catch (e) {
    console.error('Failed to schedule timer alert:', e);
  }
};

export const cancelTimerNotification = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
  } catch (e) {
    console.error('Failed to cancel timer alert:', e);
  }
};
