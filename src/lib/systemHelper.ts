import { registerPlugin } from '@capacitor/core';

export interface SystemHelperPlugin {
  startForegroundService(options: { title: string; text: string }): Promise<void>;
  updateForegroundService(options: { text: string }): Promise<void>;
  stopForegroundService(): Promise<void>;
  bringToFront(): Promise<void>;
  checkPermissions(): Promise<{ overlay: boolean; exactAlarm: boolean }>;
  requestOverlayPermission(): Promise<void>;
  requestExactAlarmPermission(): Promise<void>;
}

export const SystemHelper = registerPlugin<SystemHelperPlugin>('SystemHelper');

