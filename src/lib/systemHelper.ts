import { registerPlugin } from "@capacitor/core";

export interface NotificationStrings {
  strFocusMode?: string;
  strBreakMode?: string;
  strRunning?: string;
  strRemaining?: string;
  strElapsed?: string;
  strPaused?: string;
  strPlay?: string;
  strPause?: string;
  strStop?: string;
  strTimerComplete?: string;
  strFocusEnded?: string;
  strBreakEnded?: string;
  strAppRunning?: string;
  strTapToOpen?: string;
}

export interface StartTimerOptions extends NotificationStrings {
  timerMode: string;
  timerType: string;
  timeLeftSec: number;
  title?: string;
  alertMode?: string;
}

export interface SystemHelperPlugin {
  bringToFront(): Promise<void>;
  checkPermissions(): Promise<{
    overlay: boolean;
    exactAlarm: boolean;
    batteryOptimization: boolean;
  }>;
  requestOverlayPermission(): Promise<void>;
  requestExactAlarmPermission(): Promise<void>;
  requestBatteryOptimizationPermission(): Promise<void>;
  acquireWakelock(): Promise<void>;
  releaseWakelock(): Promise<void>;
  vibrate(): Promise<void>;
  getLogcat(): Promise<{ logcat: string }>;
  saveLogToDownloads(options: {
    data: string;
    fileName: string;
  }): Promise<{ path: string }>;

  // Foreground Service (알림바)
  startForegroundTimer(options: StartTimerOptions): Promise<void>;
  pauseForegroundTimer(): Promise<void>;
  resumeForegroundTimer(): Promise<void>;
  stopForegroundTimer(): Promise<void>;
  startIdleNotification(options?: NotificationStrings): Promise<void>;
  stopNotificationService(): Promise<void>;
  getTimerState(): Promise<{ timerMode: string; isActive: boolean; timeLeftSec: number }>;

  addListener(eventName: 'timerAction', listenerFunc: (data: { action: string; remainingSeconds: number }) => void): Promise<{ remove: () => void }>;
}

export const SystemHelper = registerPlugin<SystemHelperPlugin>("SystemHelper");
