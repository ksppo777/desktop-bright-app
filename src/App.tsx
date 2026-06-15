import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocalStorage } from "./lib/utils";
import { checkAndApplyUpdate } from './supabaseUpdate';
import { getAllKeys } from "./lib/storage";
import { Book, StudySession, StudyAlarm } from "./types";
import { useTranslation } from "react-i18next";
import BookManager from "./components/BookManager";
import PomodoroTimer from "./components/PomodoroTimer";
import Statistics from "./components/Statistics";
import Settings from "./components/Settings";
import Home from "./components/Home";
import Alarms from "./components/Alarms";
import Calendar from "./components/Calendar";
import TodayPlan from "./components/TodayPlan";
import PermissionWizard from "./components/PermissionWizard";
import {
  Book as BookIcon,
  Timer,
  LineChart,
  Sparkles,
  Settings as SettingsIcon,
  Home as HomeIcon,
  Bell,
  Calendar as CalendarIcon,
  Target,
  CalendarDays,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "./lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { differenceInDays, parseISO } from "date-fns";
import { autoSyncDrive } from "./lib/driveSync";
import { appLog } from "./lib/logger";

let capacitorNotifications: any = null;
import("./lib/capacitor-notifications").then((m) => {
  capacitorNotifications = m;
}).catch(() => {});

import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { SystemHelper } from "./lib/systemHelper";

const AUTO_CLOUD_BACKUP_DEBOUNCE_MS = 8000;

export default function App() {
  const { t, i18n } = useTranslation();
  
  useEffect(() => {
    checkAndApplyUpdate();
  }, []);

  const [books, setBooks, isBooksLoaded] = useLocalStorage<Book[]>(
    "study-helper-books",
    []
  );
  const [sessions, setSessions, isSessionsLoaded] = useLocalStorage<
    StudySession[]
  >("study-helper-sessions", []);
  const [alarms, setAlarms, isAlarmsLoaded] = useLocalStorage<StudyAlarm[]>(
    "study-helper-alarms",
    []
  );
  const [weeklyPlans, setWeeklyPlans, isWeeklyPlansLoaded] = useLocalStorage<
    Record<string, string>
  >("brightstudy_weekly_plans", {});
  const [monthlyPlans, setMonthlyPlans, isMonthlyPlansLoaded] = useLocalStorage<
    Record<string, string>
  >("brightstudy_monthly_plans", {});
  const [dailyGoalMinutes, setDailyGoalMinutes, isDailyGoalLoaded] =
    useLocalStorage<number>("study-helper-daily-goal", 120);
  const [isDarkMode, setIsDarkMode, isDarkLoaded] = useLocalStorage<boolean>(
    "study-helper-dark",
    false
  );
  const [autoGoalDisplayMode, setAutoGoalDisplayMode, isAutoGoalLoaded] =
    useLocalStorage<"multiple" | "single">(
      "study-auto-goal-display",
      "multiple"
    );
  const [activeTab, setActiveTab] = useState<
    | "home"
    | "plan"
    | "books"
    | "timer"
    | "stats"
    | "calendar"
    | "alarms"
    | "settings"
  >("home");

  const [dDay, setDDay, isDDayLoaded] = useLocalStorage<{
    date: string;
    title: string;
  } | null>("study-helper-dday", null);

  const [globalFontSize, setGlobalFontSize, isFontSizeLoaded] =
    useLocalStorage<number>("study-helper-font-size", 16);
  const [preventWordWrap, setPreventWordWrap, isWordWrapLoaded] =
    useLocalStorage<boolean>("study-helper-word-wrap", false);

  const [hasSeenPermissionWizard, setHasSeenPermissionWizard, isWizardFlagLoaded] = useLocalStorage<boolean>(
    "study-helper-seen-wizard",
    false
  );
  const [showNavLabelsMobile, setShowNavLabelsMobile, isNavLabelsLoaded] =
    useLocalStorage<boolean>("study-helper-nav-labels", false);
  const [dDaySize, setDDaySize, isDDaySizeLoaded] = useLocalStorage<number>(
    "study-helper-dday-size",
    30
  );
  const [lastAutoBackupAt, setLastAutoBackupAt] = useState<string | null>(null);
  const [autoBackupStatus, setAutoBackupStatus] =
    useState<string>("자동 백업 대기 중");

  const [hideHeroText, setHideHeroText, isHideHeroLoaded] = useLocalStorage<boolean>("study-helper-hide-hero", false);

  const [localDataTimestamp, setLocalDataTimestamp, isLocalTimestampLoaded] = useLocalStorage<number>("study-helper-timestamp", Date.now());
  const [syncNetworkPreference, setSyncNetworkPreference, isSyncNetworkLoaded] = useLocalStorage<"all" | "wifi_only">("study-helper-network-pref", "all");
  const [language, setLanguage, isLanguageLoaded] = useLocalStorage<string | null>("study-helper-language", null);
  const [isNewInstallCheckDone, setIsNewInstallCheckDone] = useState(false);

  useEffect(() => {
    if (isLanguageLoaded) {
      if (language === null) {
        getAllKeys().then((keys) => {
          const isUpdate = keys.some(k => k.startsWith("study-helper-") && k !== "study-helper-language");
          if (isUpdate) {
            setLanguage("ko");
          }
          setIsNewInstallCheckDone(true);
        });
      } else {
        setIsNewInstallCheckDone(true);
      }
    }
  }, [isLanguageLoaded, language, setLanguage]);

  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  const isAllLoaded =
    isBooksLoaded &&
    isSessionsLoaded &&
    isAlarmsLoaded &&
    isWeeklyPlansLoaded &&
    isMonthlyPlansLoaded &&
    isDailyGoalLoaded &&
    isDarkLoaded &&
    isAutoGoalLoaded &&
    isDDayLoaded &&
    isFontSizeLoaded &&
    isWordWrapLoaded &&
    isNavLabelsLoaded &&
    isDDaySizeLoaded &&
    isLocalTimestampLoaded &&
    isSyncNetworkLoaded &&
    isLanguageLoaded &&
    isHideHeroLoaded &&
    isNewInstallCheckDone &&
    isWizardFlagLoaded;

  const cloudSyncPayload = useMemo(
    () => ({
      books,
      sessions,
      alarms,
      isDarkMode,
      weeklyPlans,
      monthlyPlans,
      dailyGoalMinutes,
      autoGoalDisplayMode,
      dDay,
      globalFontSize,
      preventWordWrap,
      showNavLabelsMobile,
      dDaySize,
      language,
      hideHeroText
    }),
    [books, sessions, alarms, isDarkMode, weeklyPlans, monthlyPlans, dailyGoalMinutes, autoGoalDisplayMode, dDay, globalFontSize, preventWordWrap, showNavLabelsMobile, dDaySize, language, hideHeroText]
  );


  const autoBackupEnabledRef = useRef(false);
  const autoBackupTimerRef = useRef<number | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (navRef.current) {
      const activeBtn = navRef.current.querySelector(
        `[data-active="true"]`
      ) as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isAllLoaded) return;
    let migrated = false;
    const newBooks = books.map((book: any) => {
      if (book.autoGoal) {
        migrated = true;
        const ag = book.autoGoal;
        if (!ag.id)
          ag.id =
            Date.now().toString() + Math.random().toString(36).substr(2, 5);
        const { autoGoal, ...rest } = book;
        return {
          ...rest,
          autoGoals: [ag],
        } as Book;
      }
      return book;
    });

    if (migrated) {
      setBooks(newBooks);
    }
  }, [books, setBooks, isAllLoaded]);

  const activeBooks = books.filter((b: Book) => !b.isTrash);
  const [isEditingDDay, setIsEditingDDay] = useState(false);
  const [showDDayMenu, setShowDDayMenu] = useState(false);
  const [dDayTitleInput, setDDayTitleInput] = useState("");
  const [dDayDateInput, setDDayDateInput] = useState("");

  const dDayMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dDayMenuRef.current &&
        !dDayMenuRef.current.contains(event.target as Node)
      ) {
        setShowDDayMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveDDay = () => {
    if (dDayTitleInput.trim() && dDayDateInput) {
      setDDay({ title: dDayTitleInput.trim(), date: dDayDateInput });
    }
    setIsEditingDDay(false);
  };

  // Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [timerMode, setTimerMode] = useState<"focus" | "break">("focus");
  const [timerType, setTimerType] = useState<"beginner" | "expert">("beginner");
  const [expertTime, setExpertTime] = useState({
    hours: 0,
    minutes: 25,
    seconds: 0,
  });
  const [expertBreakTime, setExpertBreakTime] = useState({
    hours: 0,
    minutes: 5,
    seconds: 0,
  });
  const [timerBookId, setTimerBookId] = useState<string>("");
  const [timerChapterId, setTimerChapterId] = useState<string>("");
  const [timerAlertMode, setTimerAlertMode] = useState<"sound" | "vibrate" | "both" | "off">("sound");
  const [timerEndNotification, setTimerEndNotification] = useState<"focus_ended" | "break_ended" | null>(null);
  const [activeAlarmNotification, setActiveAlarmNotification] = useState<StudyAlarm | null>(null);

  const playSystemAlert = (mode: "sound" | "vibrate" | "both" | "off") => {
    if (Capacitor.isNativePlatform()) {
      SystemHelper.bringToFront().catch(() => {});
    }
    if (mode === "sound" || mode === "both") {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
      audio.play().catch(() => {});
    }
    if (mode === "vibrate" || mode === "both") {
      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    }
  };

  const [syncIntention, setSyncIntention] = useState<{
    targetDateStr: string;
    startTimeStr: string;
    bookId: string;
    chapterId: string;
    blockId?: string;
  } | null>(null);

  // Refs for background logic
  const timerStateRef = useRef({
    isActive,
    timeLeft,
    timerMode
  });

  useEffect(() => {
    timerStateRef.current = { isActive, timeLeft, timerMode };
  }, [isActive, timeLeft, timerMode]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const listener = CapApp.addListener('appStateChange', ({ isActive: appActive }) => {
      const { isActive, timeLeft, timerMode } = timerStateRef.current;
      if (!appActive) {
        // App went to background
        if (isActive && timeLeft > 0 && capacitorNotifications) {
          capacitorNotifications.scheduleTimerNotification(timeLeft, timerMode);
        }
      } else {
        // App came to foreground
        if (capacitorNotifications) {
          capacitorNotifications.cancelTimerNotification();
        }
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  const initialTimeLeft =
    timerMode === "focus"
      ? timerType === "beginner"
        ? 25 * 60
        : expertTime.hours * 3600 + expertTime.minutes * 60 + expertTime.seconds
      : timerType === "beginner"
      ? 5 * 60
      : expertBreakTime.hours * 3600 +
        expertBreakTime.minutes * 60 +
        expertBreakTime.seconds;

  const realTimeAddedSeconds =
    (isActive || (!isActive && timeLeft < initialTimeLeft)) &&
    timerMode === "focus"
      ? initialTimeLeft - timeLeft
      : 0;

  const addStudySession = (
    seconds: number,
    bookIdParam?: string,
    chapterIdParam?: string,
    titleParam?: string,
    dateParam?: string
  ) => {
    let finalTitle = titleParam;

    // Auto-generate title if missing but IDs are provided
    if (!finalTitle && bookIdParam) {
      const book = books.find((b) => b.id === bookIdParam);
      if (book) {
        finalTitle = book.title;
        if (chapterIdParam) {
          const chapter = book.chapters?.find((c) => c.id === chapterIdParam);
          if (chapter) finalTitle += ` - ${chapter.title}`;
        }
      }
    }

    const durationMinutes = Math.max(1, Math.floor(seconds / 60));

    const baseSession: StudySession = {
      id: Date.now().toString(),
      date: dateParam || new Date().toISOString(),
      durationMinutes: durationMinutes,
      durationSeconds: seconds,
      bookId: bookIdParam,
      chapterId: chapterIdParam,
      title: finalTitle,
    };

    if (syncIntention) {
      // Find the record and attach the timetable block ID if necessary
      baseSession.timetableDate = syncIntention.targetDateStr;
      if (syncIntention.blockId) {
        baseSession.timetableBlockId = syncIntention.blockId;
      }
      setSyncIntention(null);
    }

    setSessions((prev) => [...prev, baseSession]);
    appLog('INFO', 'Study session added', baseSession);
  };

  const updateSession = (id: string, updates: Partial<StudySession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    appLog('INFO', 'Study session updated', { id, updates });
  };

  const deleteSession = (id: string) => {
    appLog('INFO', 'Study session deleted', { id });
    const session = sessions.find((s) => s.id === id);
    if (session && session.timetableBlockId && session.timetableDate) {
      import("./lib/timetableUtils").then(async (utils) => {
        const records = await utils.getTimetableRecords(session.timetableDate!);
        const newRecords = records.filter(
          (r: any) => r.blockId !== session.timetableBlockId
        );
        await utils.saveTimetableRecords(session.timetableDate!, newRecords);
      });
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      if (Capacitor.isNativePlatform()) {
        SystemHelper.startForegroundService({ title: "Bright Study", text: "타이머 진행..." }).catch(() => {});
      }
      const endTime = Date.now() + timeLeft * 1000;
      interval = setInterval(() => {
        const nextTime = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setTimeLeft(nextTime);
        if (Capacitor.isNativePlatform() && nextTime > 0) {
          const m = Math.floor(nextTime / 60);
          const s = nextTime % 60;
          SystemHelper.updateForegroundService({ text: `${m}분 ${s}초 남음` }).catch(() => {});
        }
      }, 500);
    } else {
      if (Capacitor.isNativePlatform()) {
        SystemHelper.stopForegroundService().catch(() => {});
      }
    }
    return () => {
      clearInterval(interval);
      if (Capacitor.isNativePlatform()) {
         SystemHelper.stopForegroundService().catch(() => {});
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (isActive && timeLeft <= 0) {
      setIsActive(false);
      playSystemAlert(timerAlertMode);
      
      if (timerMode === "focus") {
        addStudySession(initialTimeLeft, timerBookId, timerChapterId);
        setTimerEndNotification("focus_ended");
      } else {
        setTimerEndNotification("break_ended");
      }
    }
  }, [
    isActive,
    timeLeft,
    timerMode,
    timerType,
    expertTime,
    initialTimeLeft,
    timerBookId,
    timerChapterId,
  ]);

  const stopTimer = () => {
    setIsActive(false);
    if (capacitorNotifications) {
      capacitorNotifications.cancelTimerNotification();
    }
    if (timerMode === "focus") {
      const elapsedSeconds = initialTimeLeft - timeLeft;
      if (elapsedSeconds > 0) {
        addStudySession(elapsedSeconds, timerBookId, timerChapterId);
      }
    }
    setTimerMode("focus");
    setTimeLeft(
      timerType === "beginner"
        ? 25 * 60
        : expertTime.hours * 3600 + expertTime.minutes * 60 + expertTime.seconds
    );
  };

  const executeImmediateSync = (intention: {
    targetDateStr: string;
    startTimeStr: string;
    bookId: string;
    chapterId: string;
  }) => {
    const { targetDateStr, bookId, chapterId } = intention;
    // Weekly Plan synchronization
    setWeeklyPlans((prev) => {
      const oldPlan = prev[targetDateStr] || "";
      const bookObj = books.find((b) => b.id === bookId);
      const chapterObj = bookObj?.chapters?.find((c) => c.id === chapterId);
      const planText =
        bookObj && chapterObj
          ? `[${bookObj.title}] ${chapterObj.title}`
          : bookObj
          ? `[${bookObj.title}]`
          : "";
      const syncStr = `⚡ ${planText}`;

      if (planText && !oldPlan.includes(syncStr)) {
        return {
          ...prev,
          [targetDateStr]: oldPlan ? `${oldPlan}\n${syncStr}` : syncStr,
        };
      }
      return prev;
    });
  };

  const timerProps = {
    timeLeft,
    setTimeLeft,
    isActive,
    setIsActive,
    mode: timerMode,
    setMode: setTimerMode,
    timerMode: timerType,
    setTimerMode: setTimerType,
    expertTime,
    setExpertTime,
    expertBreakTime,
    setExpertBreakTime,
    timerBookId,
    setTimerBookId,
    timerChapterId,
    setTimerChapterId,
    timerAlertMode,
    setTimerAlertMode,
    syncIntention,
    setSyncIntention,
    executeImmediateSync,
    initialTimeLeft,
    stopTimer,
    realTimeAddedSeconds,
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${globalFontSize}px`;
  }, [globalFontSize]);

  useEffect(() => {
    if (preventWordWrap) {
      document.body.classList.add("break-keep");
    } else {
      document.body.classList.remove("break-keep");
    }
  }, [preventWordWrap]);

  // Handle Alarm logic
  useEffect(() => {
    // 1. Sync alarms natively if on mobile
    if (Capacitor.isNativePlatform() && capacitorNotifications) {
      capacitorNotifications.syncLocalAlarms(alarms, books);
    }

    // 2. Web fallback
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getSeconds() !== 0) return; // Trigger exactly on the minute

      const currentDay = now.getDay();
      const currentMinutes = String(now.getMinutes()).padStart(2, "0");
      const currentHours = String(now.getHours()).padStart(2, "0");
      const timeStr = `${currentHours}:${currentMinutes}`;
      const uniqueTriggerKey = `alarm-triggered-${now.toDateString()}-${timeStr}`;

      if (window.sessionStorage.getItem(uniqueTriggerKey)) return;

      const triggerAlarm = alarms.find(
        (a) => a.enabled && a.days.includes(currentDay) && a.time === timeStr
      );

      if (triggerAlarm) {
        window.sessionStorage.setItem(uniqueTriggerKey, "true");
        // Play notification alert
        const mode = triggerAlarm.alertMode || 'sound';
        playSystemAlert(mode);

        setActiveAlarmNotification(triggerAlarm);
      }
    }, 1000); // Check every 1 second

    return () => clearInterval(interval);
  }, [alarms, books]);

  const getAllData = () => cloudSyncPayload;

  const onDataSync = (data: any, newTimestamp: number) => {
    if (data.books) setBooks(data.books);
    if (data.sessions) setSessions(data.sessions);
    if (data.alarms) setAlarms(data.alarms);
    if (data.isDarkMode !== undefined) setIsDarkMode(data.isDarkMode);
    if (data.weeklyPlans) setWeeklyPlans(data.weeklyPlans);
    if (data.monthlyPlans) setMonthlyPlans(data.monthlyPlans);
    if (data.dailyGoalMinutes) setDailyGoalMinutes(data.dailyGoalMinutes);
    if (data.autoGoalDisplayMode) setAutoGoalDisplayMode(data.autoGoalDisplayMode);
    if (data.dDay !== undefined) setDDay(data.dDay);
    if (data.globalFontSize) setGlobalFontSize(data.globalFontSize);
    if (data.preventWordWrap !== undefined) setPreventWordWrap(data.preventWordWrap);
    if (data.showNavLabelsMobile !== undefined) setShowNavLabelsMobile(data.showNavLabelsMobile);
    if (data.dDaySize) setDDaySize(data.dDaySize);
    if (data.language) setLanguage(data.language);
    if (data.hideHeroText !== undefined) setHideHeroText(data.hideHeroText);
    
    setLocalDataTimestamp(newTimestamp);
  };

  useEffect(() => {
    if (!isAllLoaded) {
      return;
    }

    if (!autoBackupEnabledRef.current) {
      autoBackupEnabledRef.current = true;
      setAutoBackupStatus("자동 백업 준비 완료");
      return;
    }

    setAutoBackupStatus("변경 감지됨 · 자동 백업 예약 중");

    if (autoBackupTimerRef.current) {
      window.clearTimeout(autoBackupTimerRef.current);
    }

    autoBackupTimerRef.current = window.setTimeout(async () => {
      try {
        setAutoBackupStatus("자동 백업 실행 중...");
        const newTimestamp = Date.now();
        setLocalDataTimestamp(newTimestamp);
        const status = await autoSyncDrive(cloudSyncPayload, newTimestamp, onDataSync, syncNetworkPreference);
        if (status === "skipped_wifi") {
           setAutoBackupStatus("생략됨 (Wi-Fi 밖)");
        } else if (status === "skipped_offline") {
           setAutoBackupStatus("연결 대기 중");
        } else {
           const backupTime = new Date().toISOString();
           setLastAutoBackupAt(backupTime);
           setAutoBackupStatus("자동 백업 완료");
        }
      } catch (error: any) {
        setAutoBackupStatus(`자동 백업 실패: ${error.message}`);
      }
    }, AUTO_CLOUD_BACKUP_DEBOUNCE_MS);

    return () => {
      if (autoBackupTimerRef.current) {
        window.clearTimeout(autoBackupTimerRef.current);
        autoBackupTimerRef.current = null;
      }
    };
  }, [cloudSyncPayload, isAllLoaded]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartRef.current.x;
    const dy = touchEndY - touchStartRef.current.y;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      const target = e.target as HTMLElement;
      if (
        target.closest(".no-swipe") ||
        target.closest("input") ||
        target.closest("textarea") ||
        Math.abs(dy) > 50
      ) {
        touchStartRef.current = null;
        return;
      }

      const tabIds = navItems.map((item) => item.id);
      const currentIndex = tabIds.indexOf(activeTab);

      if (dx > 0) {
        setActiveTab(
          tabIds[currentIndex > 0 ? currentIndex - 1 : tabIds.length - 1] as any
        );
      } else if (dx < 0) {
        setActiveTab(
          tabIds[currentIndex < tabIds.length - 1 ? currentIndex + 1 : 0] as any
        );
      }
    }

    touchStartRef.current = null;
  };

  const navItems = [
    { id: "home", label: t('nav.home', "홈"), icon: HomeIcon },
    { id: "plan", label: t('nav.plan', "오늘 계획"), icon: Target },
    { id: "books", label: t('nav.books', "진도 관리"), icon: BookIcon },
    { id: "timer", label: t('nav.timer', "타이머"), icon: Timer },
    { id: "calendar", label: t('nav.calendar', "달력"), icon: CalendarIcon },
    { id: "stats", label: t('nav.stats', "통계"), icon: LineChart },
    { id: "alarms", label: t('nav.alarms', "알림 설정"), icon: Bell },
    { id: "settings", label: t('nav.settings', "설정"), icon: SettingsIcon },
  ] as const;

  if (!isAllLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-bold">
            {t('loader.loadingData')}
          </p>
        </div>
      </div>
    );
  }

  if (language === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{t('languageSelection.title')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {t('languageSelection.subtitle')}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setLanguage('ko')}
              className="w-full py-4 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl font-bold transition-all flex justify-center items-center gap-2"
            >
              {t('languageSelection.ko')}
            </button>
            <button
              onClick={() => setLanguage('en')}
              className="w-full py-4 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl font-bold transition-all flex justify-center items-center gap-2"
            >
              {t('languageSelection.en')}
            </button>
            <button
              onClick={() => setLanguage('ja')}
              className="w-full py-4 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl font-bold transition-all flex justify-center items-center gap-2"
            >
              {t('languageSelection.ja')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    {!hasSeenPermissionWizard && Capacitor.isNativePlatform() && (
      <PermissionWizard onComplete={() => setHasSeenPermissionWizard(true)} />
    )}
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between sticky top-0 z-40 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-20 w-full flex items-center justify-between gap-4 sm:gap-6">
          <div
            className="flex items-center gap-3 cursor-pointer shrink-0"
            onClick={() => setActiveTab("home")}
          >
            <img
              src="/icon.png"
              alt="Bright Study Icon"
              className="w-11 h-11 object-cover rounded-xl shadow-sm border-2 border-white dark:border-white bg-white"
            />
            <h1 className="hidden sm:block text-xl font-black text-slate-800 dark:text-white tracking-tight font-sans whitespace-nowrap">
              Bright Study
            </h1>
          </div>
          <nav
            ref={navRef}
            className="flex gap-1 bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 max-w-full overflow-x-auto touch-pan-x scrollbar-hide no-swipe"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  data-active={isActive ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all relative whitespace-nowrap shrink-0",
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span
                      className={cn(
                        "uppercase text-[10px] tracking-wider mt-0.5",
                        showNavLabelsMobile ? "inline" : "hidden md:inline"
                      )}
                    >
                      {item.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Timer End Modal */}
      {timerEndNotification && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">
              {timerEndNotification === "focus_ended" ? "🎉" : "💪"}
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3">
              {timerEndNotification === "focus_ended" ? t('timerEndModal.focusEndedTitle') : t('timerEndModal.breakEndedTitle')}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-8 font-medium">
              {timerEndNotification === "focus_ended" 
                ? t('timerEndModal.focusEndedBody') 
                : t('timerEndModal.breakEndedBody')}
            </p>
            <button
              onClick={() => {
                const nextMode = timerEndNotification === "focus_ended" ? "break" : "focus";
                setTimerMode(nextMode);
                setTimeLeft(
                  nextMode === "break"
                    ? 5 * 60
                    : (timerType === "beginner" ? 25 * 60 : expertTime.hours * 3600 + expertTime.minutes * 60 + expertTime.seconds)
                );
                setTimerEndNotification(null);
                setIsActive(true); // Automatically start next phase upon clicking OK
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-none text-lg"
            >
              {t('timerEndModal.confirm')}
            </button>
          </div>
        </div>
      )}

      {/* Alarm Trigger Modal */}
      {activeAlarmNotification && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner animate-bounce">
              ⏰
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3">
              {t('alarmNotification.title')}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-8 font-medium">
              {(() => {
                 if (activeAlarmNotification.expertMode && activeAlarmNotification.bookId) {
                   const book = activeBooks.find(b => b.id === activeAlarmNotification.bookId);
                   const chapter = book?.chapters.find(c => c.id === activeAlarmNotification.chapterId);
                   if (book) {
                     return chapter ? `${book.title} ${chapter.title} 공부할 시간이에요!` : `${book.title} 공부할 시간이에요!`;
                   }
                 }
                 return t('alarmNotification.defaultBody');
              })()}
            </p>
            <button
              onClick={() => setActiveAlarmNotification(null)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-none text-lg"
            >
              {t('alarmNotification.confirm')}
            </button>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {(!hideHeroText || activeTab === "home") && (
          <div className="mb-10 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6">
            {!hideHeroText && (
              <div className="text-center sm:text-left">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">
                  {activeTab === "home" && t('hero.home')}
                  {activeTab === "plan" && t('hero.plan')}
                  {activeTab === "books" && t('hero.books')}
                  {activeTab === "timer" && t('hero.timer')}
                  {activeTab === "calendar" && t('hero.calendar')}
                  {activeTab === "stats" && t('hero.stats')}
                  {activeTab === "alarms" && t('hero.alarms')}
                  {activeTab === "settings" && t('hero.settings')}
                </h2>
              </div>
            )}

            {/* D-Day Header Component */}
            {activeTab === "home" && (
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center relative overflow-visible group min-w-[240px]">
              <div className="absolute top-3 right-3" ref={dDayMenuRef}>
                <button
                  onClick={() => setShowDDayMenu((p) => !p)}
                  className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showDDayMenu && (
                  <div className="absolute right-0 top-6 w-36 bg-white dark:bg-slate-700 shadow-xl rounded-xl overflow-hidden py-1 z-20 border border-slate-100 dark:border-slate-600">
                    <button
                      onClick={() => {
                        setIsEditingDDay(true);
                        setDDayTitleInput(dDay?.title || "");
                        setDDayDateInput(dDay?.date || "");
                        setShowDDayMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> 수정
                    </button>
                    <button
                      onClick={() => {
                        setDDay(null);
                        setShowDDayMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 mb-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 삭제
                    </button>
                    <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-600">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        크기
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            setDDaySize((s) => Math.max(16, s - 2))
                          }
                          className="w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-600 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500 font-bold"
                        >
                          -
                        </button>
                        <button
                          onClick={() =>
                            setDDaySize((s) => Math.min(80, s + 2))
                          }
                          className="w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-600 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {isEditingDDay ? (
                <div className="space-y-3 pt-1">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {t('dDay.title')}
                  </h3>
                  <input
                    type="text"
                    placeholder={t('dDay.namePlaceholder')}
                    value={dDayTitleInput}
                    onChange={(e) => setDDayTitleInput(e.target.value)}
                    className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                  <input
                    type="date"
                    value={dDayDateInput}
                    onChange={(e) => setDDayDateInput(e.target.value)}
                    className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveDDay}
                      className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold py-1.5 rounded transition-colors"
                    >
                      {t('common.save')}
                    </button>
                    <button
                      onClick={() => setIsEditingDDay(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold py-1.5 rounded transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : !dDay ? (
                <div
                  className="flex flex-col items-center justify-center text-center space-y-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer py-2"
                  onClick={() => setIsEditingDDay(true)}
                >
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-500 font-bold">
                    {t('dDay.add')}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate pr-6">
                      {dDay.title}
                    </span>
                  </div>
                  <div
                    className="flex items-baseline gap-1"
                    style={{ fontSize: `${dDaySize}px` }}
                  >
                    <span className="font-black tracking-tighter text-slate-800 dark:text-white mr-1">
                      D
                    </span>
                    <span className="font-black tracking-tighter text-slate-800 dark:text-white">
                      {(() => {
                        const diff = differenceInDays(
                          parseISO(dDay.date),
                          new Date(new Date().setHours(0, 0, 0, 0))
                        );
                        if (diff === 0) return "-DAY";
                        if (diff > 0) return `-${diff}`;
                        return `+${Math.abs(diff)}`;
                      })()}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-1">
                    {dDay.date.replace(/-/g, ".")}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "home" && (
              <Home
                books={activeBooks}
                setBooks={setBooks}
                sessions={sessions}
                alarms={alarms}
                setAlarms={setAlarms}
                setActiveTab={setActiveTab}
                addStudySession={addStudySession}
                realTimeAddedSeconds={realTimeAddedSeconds}
                dailyGoalMinutes={dailyGoalMinutes}
                autoGoalDisplayMode={autoGoalDisplayMode}
              />
            )}
            {activeTab === "plan" && (
              <TodayPlan
                dailyGoalMinutes={dailyGoalMinutes}
                setDailyGoalMinutes={setDailyGoalMinutes}
                weeklyPlans={weeklyPlans}
                setWeeklyPlans={setWeeklyPlans}
                books={activeBooks}
                setActiveTab={setActiveTab}
                autoGoalDisplayMode={autoGoalDisplayMode}
              />
            )}
            {activeTab === "books" && (
              <BookManager books={books} setBooks={setBooks} />
            )}
            {activeTab === "timer" && (
              <PomodoroTimer
                onSessionComplete={addStudySession}
                sessions={sessions}
                timerProps={timerProps}
                books={activeBooks}
                updateSession={updateSession}
                deleteSession={deleteSession}
                dailyGoalMinutes={dailyGoalMinutes}
              />
            )}
            {activeTab === "calendar" && (
              <Calendar
                sessions={sessions}
                weeklyPlans={weeklyPlans}
                setWeeklyPlans={setWeeklyPlans}
                monthlyPlans={monthlyPlans}
                setMonthlyPlans={setMonthlyPlans}
                books={activeBooks}
              />
            )}
            {activeTab === "stats" && (
              <Statistics
                sessions={sessions}
                realTimeAddedSeconds={realTimeAddedSeconds}
                weeklyPlans={weeklyPlans}
                setWeeklyPlans={setWeeklyPlans}
                dailyGoalMinutes={dailyGoalMinutes}
                setDailyGoalMinutes={setDailyGoalMinutes}
                books={activeBooks}
                setActiveTab={setActiveTab}
                autoGoalDisplayMode={autoGoalDisplayMode}
              />
            )}
            {activeTab === "alarms" && (
              <Alarms
                alarms={alarms}
                setAlarms={setAlarms}
                books={activeBooks}
              />
            )}
            {activeTab === "settings" && (
              <Settings
                isDarkMode={isDarkMode}
                setIsDarkMode={setIsDarkMode}
                onDataSync={onDataSync}
                getAllData={getAllData}
                autoGoalDisplayMode={autoGoalDisplayMode}
                setAutoGoalDisplayMode={setAutoGoalDisplayMode}
                globalFontSize={globalFontSize}
                setGlobalFontSize={setGlobalFontSize}
                preventWordWrap={preventWordWrap}
                setPreventWordWrap={setPreventWordWrap}
                showNavLabelsMobile={showNavLabelsMobile}
                setShowNavLabelsMobile={setShowNavLabelsMobile}
                hideHeroText={hideHeroText}
                setHideHeroText={setHideHeroText}
                autoBackupStatus={autoBackupStatus}
                lastAutoBackupAt={lastAutoBackupAt}
                localDataTimestamp={localDataTimestamp}
                syncNetworkPreference={syncNetworkPreference}
                setSyncNetworkPreference={setSyncNetworkPreference}
                language={language}
                setLanguage={setLanguage}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 text-center text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm">
          학습 기록은 기기에 안전하게 자동 저장됩니다. 편하게 이용해보세요.
        </div>
      </main>
    </div>
    </>
  );
}