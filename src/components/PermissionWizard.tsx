import React, { useState, useEffect } from "react";
import { App as CapApp } from "@capacitor/app";
import {
  Layers,
  Clock,
  Bell,
  Settings as SettingsIcon,
  CheckCircle2,
  Battery,
} from "lucide-react";
import { usePermissionChecker } from "../hooks/usePermissionChecker";
import { Capacitor } from "@capacitor/core";
import { useTranslation } from "react-i18next";

export default function PermissionWizard({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { t } = useTranslation();

  const {
    isChecking,
    permissionsState,
    requestOverlayPermission,
    requestExactAlarmPermission,
    requestNotificationPermission,
    requestBatteryOptimizationPermission,
  } = usePermissionChecker();

  const [step, setStep] = useState(0);

  const stepsInfo = [
    {
      id: "overlay",
      icon: Layers,
      title: t("permissions.overlay.title"),
      description: t("permissions.overlay.desc"),
      iconColor: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      needsAction: !permissionsState.overlay,
      action: requestOverlayPermission,
    },
    {
      id: "exactAlarm",
      icon: Clock,
      title: t("permissions.exactAlarm.title"),
      description: t("permissions.exactAlarm.desc"),
      iconColor: "text-rose-500",
      bgColor: "bg-rose-100 dark:bg-rose-900/30",
      needsAction: !permissionsState.exactAlarm,
      action: requestExactAlarmPermission,
    },
    {
      id: "batteryOptimization",
      icon: Battery,
      title: t("permissions.battery.title"),
      description: t("permissions.battery.desc"),
      iconColor: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      needsAction: !permissionsState.batteryOptimization,
      action: requestBatteryOptimizationPermission,
    },
    {
      id: "notifications",
      icon: Bell,
      title: t("permissions.notifications.title"),
      description: t("permissions.notifications.desc"),
      iconColor: "text-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      needsAction: !permissionsState.notifications,
      action: requestNotificationPermission,
    },
  ];

  const currentStepData = stepsInfo[step];

  const handleNext = async () => {
    if (currentStepData.needsAction) {
      // Request permission
      await currentStepData.action();
    } else {
      // Already granted, move to next
      goToNextStep();
    }
  };

  const goToNextStep = () => {
    if (step < stepsInfo.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  // Skip step automatically if already granted
  useEffect(() => {
    if (!isChecking && currentStepData && !currentStepData.needsAction) {
      // Wait a tiny bit for visual feedback of a checkmark, then proceed
      const timer = setTimeout(() => {
        goToNextStep();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [step, isChecking, currentStepData, permissionsState]);

  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  if (isChecking) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white dark:bg-slate-900 flex items-center justify-center"></div>
    );
  }

  const Icon = currentStepData?.icon || SettingsIcon;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Progress dots */}
        <div className="flex gap-2 mb-10 w-full justify-center">
          {stepsInfo.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === step
                  ? "w-8 bg-indigo-600 dark:bg-indigo-400"
                  : idx < step
                  ? "w-8 bg-indigo-200 dark:bg-indigo-900/50"
                  : "w-2 bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 w-full rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center transition-all duration-500 min-h-[380px]">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-inner ${
              currentStepData.bgColor
            } ${
              !currentStepData.needsAction
                ? "bg-emerald-100 dark:bg-emerald-900/30"
                : ""
            }`}
          >
            {!currentStepData.needsAction ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-in zoom-in duration-300" />
            ) : (
              <Icon
                className={`w-10 h-10 ${currentStepData.iconColor} animate-in fade-in duration-500`}
              />
            )}
          </div>

          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">
            {!currentStepData.needsAction
              ? t("permissions.grantedTitle")
              : currentStepData.title}
          </h2>

          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 flex-1">
            {!currentStepData.needsAction
              ? t("permissions.grantedDesc")
              : currentStepData.description}
          </p>

          <div className="w-full">
            <button
              onClick={handleNext}
              disabled={!currentStepData.needsAction}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                !currentStepData.needsAction
                  ? "bg-slate-100 text-slate-400 dark:bg-slate-700/50 dark:text-slate-500 cursor-not-allowed shadow-none"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-95"
              }`}
            >
              {!currentStepData.needsAction ? t("permissions.btnGranted") : t("permissions.btnRequest")}
            </button>
            <p className="text-[10px] text-slate-400 font-medium mt-4">
              {t("permissions.footer")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
