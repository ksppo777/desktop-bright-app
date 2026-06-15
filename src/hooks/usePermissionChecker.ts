import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { SystemHelper } from "../lib/systemHelper";

let capacitorNotifications: any = null;
import("../lib/capacitor-notifications").then((m) => {
  capacitorNotifications = m;
}).catch(() => {});

export function usePermissionChecker() {
  const [permissionsState, setPermissionsState] = useState({ 
    overlay: true, 
    exactAlarm: true, 
    notifications: true 
  });
  
  const [isChecking, setIsChecking] = useState(true);

  const checkPerms = async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsChecking(false);
      return;
    }
    
    try {
      const sysPerms = await SystemHelper.checkPermissions();
      let notifGranted = true;
      if (capacitorNotifications && capacitorNotifications.checkNotificationPermission) {
        notifGranted = await capacitorNotifications.checkNotificationPermission();
      }
      setPermissionsState({
        overlay: sysPerms.overlay,
        exactAlarm: sysPerms.exactAlarm,
        notifications: notifGranted
      });
    } catch (e) {
      console.error("Failed to check permissions:", e);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    let listener: any;
    if (Capacitor.isNativePlatform()) {
      checkPerms();
      CapApp.addListener('appStateChange', ({ isActive: appActive }) => {
        if (appActive) {
           checkPerms();
        }
      }).then(l => listener = l);
    } else {
      setIsChecking(false);
    }
    
    return () => { 
      if (listener) listener.remove(); 
    };
  }, []);

  const requestOverlayPermission = async () => {
    try {
      await SystemHelper.requestOverlayPermission();
      await checkPerms();
    } catch (e) {}
  };

  const requestExactAlarmPermission = async () => {
    try {
      await SystemHelper.requestExactAlarmPermission();
      await checkPerms();
    } catch (e) {}
  };

  const requestNotificationPermission = async () => {
    try {
      if (capacitorNotifications) {
        await capacitorNotifications.requestNotificationPermission();
        await checkPerms();
      }
    } catch (e) {}
  };

  return {
    isChecking,
    permissionsState,
    checkPerms,
    requestOverlayPermission,
    requestExactAlarmPermission,
    requestNotificationPermission
  };
}