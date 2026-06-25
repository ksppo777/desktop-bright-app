import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Play,
  Pause,
  RefreshCw,
  Coffee,
  Brain,
  Settings2,
  Target,
  Square,
  MoreVertical,
  X,
  Pencil,
  Trash2,
  Info,
} from "lucide-react";
import { cn, useLockBodyScroll } from "../lib/utils";
import { StudySession } from "../types";
import { isSameDay, parseISO } from "date-fns";
import { registerBackHandler } from "../lib/backHandler";
import AlertGuideModal from "./AlertGuideModal";
import BaseModal from "./BaseModal";

let capacitorNotifications: any = null;
import("../lib/capacitor-notifications")
  .then((m) => {
    capacitorNotifications = m;
  })
  .catch(() => {});

interface PomodoroTimerProps {
  onSessionComplete: (durationMinutes: number) => void;
  sessions: StudySession[];
  timerProps: any;
  books?: any[];
  updateSession: (id: string, updates: Partial<StudySession>) => void;
  deleteSession: (id: string) => void;
  dailyGoalMinutes: number;
}

export default function PomodoroTimer({
  onSessionComplete,
  sessions,
  timerProps,
  books,
  updateSession,
  deleteSession,
  dailyGoalMinutes,
}: PomodoroTimerProps) {
  const { t } = useTranslation();
  const {
    timeLeft,
    setTimeLeft,
    isActive,
    setIsActive,
    mode,
    setMode,
    timerMode,
    setTimerMode,
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
    initialTimeLeft,
    stopTimer,
    syncIntention,
    setSyncIntention,
    executeImmediateSync,
    realTimeAddedSeconds,
  } = timerProps;

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<StudySession | null>(null);
  const [editSeconds, setEditSeconds] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isRecordsExpanded, setIsRecordsExpanded] = useState(false);
  const [showAlertGuide, setShowAlertGuide] = useState(false);
  const [syncConfirmData, setSyncConfirmData] = useState<{
    targetDateStr: string;
    startTimeStr: string;
    bookId: string;
    chapterId: string;
    confirmMsg: string;
  } | null>(null);
  const [pendingTimerMode, setPendingTimerMode] = useState<
    "beginner" | "expert" | "stopwatch" | null
  >(null);

  useLockBodyScroll(
    editModalOpen ||
      syncConfirmData !== null ||
      showAlertGuide ||
      pendingTimerMode !== null
  );

  useEffect(() => {
    if (editModalOpen) {
      return registerBackHandler(() => {
        setEditModalOpen(false);
        setSessionToEdit(null);
        setConfirmDelete(false);
        return true;
      });
    }
    if (syncConfirmData) {
      return registerBackHandler(() => {
        setSyncConfirmData(null);
        return true;
      });
    }
    if (pendingTimerMode) {
      return registerBackHandler(() => {
        setPendingTimerMode(null);
        return true;
      });
    }
  }, [editModalOpen, syncConfirmData, pendingTimerMode]);

  const toggleTimer = async () => {
    if (!isActive && !timerBookId && mode === "focus") {
      try {
        window.alert(t("pomodoro.confirmSelectBook"));
      } catch (e) {}
      return;
    }

    if (!isActive) {
      if (capacitorNotifications) {
        capacitorNotifications.requestNotificationPermission();
      }
    }

    if (!isActive && mode === "focus" && timerBookId) {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const currentMins = h * 60 + m;

      const { getDailyLayouts, getTimetableRecords, parseMins } = await import(
        "../lib/timetableUtils"
      );
      const { format } = await import("date-fns");
      const targetDateStr = format(now, "yyyy-MM-dd");

      const layouts = await getDailyLayouts(targetDateStr);
      const records = await getTimetableRecords(targetDateStr);

      let currentBlock = layouts.find((b) => {
        const startM = parseMins(b.startTime);
        let endM = parseMins(b.endTime);
        if (endM <= startM) endM += 24 * 60;
        let cm = currentMins;
        if (cm < startM && cm < 12 * 60 && startM >= 12 * 60) cm += 24 * 60;
        return cm >= startM && cm < endM;
      });

      if (!currentBlock) {
        const currentH = Math.floor(currentMins / 60);
        const startStr = `${String(currentH).padStart(2, "0")}:00`;
        const endH = (currentH + 1) % 24;
        const endStr = `${String(endH).padStart(2, "0")}:00`;

        currentBlock = {
          id: startStr,
          startTime: startStr,
          endTime: endStr,
          duration: 60,
        };

        layouts.push(currentBlock);
        layouts.sort((a, b) => parseMins(a.startTime) - parseMins(b.startTime));

        const { saveDailyLayouts } = await import("../lib/timetableUtils");
        await saveDailyLayouts(targetDateStr, layouts);
      }

      if (currentBlock) {
        const hasRecord = records.find(
          (r) =>
            r.blockId === currentBlock?.id ||
            (r.hour !== undefined &&
              `${String(r.hour).padStart(2, "0")}:00` === currentBlock?.id)
        );
        if (!hasRecord) {
          const book = books?.find((b) => b.id === timerBookId);
          const chapter = book?.chapters?.find((c) => c.id === timerChapterId);
          let chapterTitle = chapter?.title ? ` - ${chapter.title}` : "";
          const confirmMsg = t("pomodoro.autoSyncConfirm", {
            book: book?.title,
            chapter: chapterTitle,
          });

          setSyncConfirmData({
            targetDateStr,
            startTimeStr: `${String(h).padStart(2, "0")}:${String(m).padStart(
              2,
              "0"
            )}`,
            bookId: timerBookId,
            chapterId: timerChapterId || "",
            confirmMsg,
          });
          return; // Wait for user to act on modal
        }
      }
    }

    setIsActive(!isActive);
  };
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(initialTimeLeft);
  };
  const switchMode = (newMode: "focus" | "break") => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(
      newMode === "focus"
        ? timerMode === "stopwatch"
          ? 0
          : timerMode === "beginner"
          ? 25 * 60
          : expertTime.hours * 3600 +
            expertTime.minutes * 60 +
            expertTime.seconds
        : timerMode === "stopwatch"
        ? 0
        : timerMode === "beginner"
        ? 5 * 60
        : expertBreakTime.hours * 3600 +
          expertBreakTime.minutes * 60 +
          expertBreakTime.seconds
    );
  };

  const applyTimerMode = (
    newTimerMode: "beginner" | "expert" | "stopwatch"
  ) => {
    setIsActive(false);
    setTimerMode(newTimerMode);
    setMode("focus");
    if (newTimerMode === "beginner") {
      setTimeLeft(25 * 60);
    } else if (newTimerMode === "expert") {
      setTimeLeft(
        expertTime.hours * 3600 + expertTime.minutes * 60 + expertTime.seconds
      );
    } else {
      setTimeLeft(0);
    }
  };

  const handleTimerModeSelect = (
    newTimerMode: "beginner" | "expert" | "stopwatch"
  ) => {
    if (newTimerMode === timerMode) return;

    if (mode === "focus" && realTimeAddedSeconds > 0) {
      setPendingTimerMode(newTimerMode);
    } else {
      applyTimerMode(newTimerMode);
    }
  };

  const confirmModeSwitch = () => {
    if (pendingTimerMode) {
      stopTimer();
      // stopTimer resets to the old timer configuration, but that's fine because we immediately overwrite it.
      applyTimerMode(pendingTimerMode);
      setPendingTimerMode(null);
    }
  };

  const handleExpertTimeChange = (
    type: "hours" | "minutes" | "seconds",
    value: number
  ) => {
    setIsActive(false);
    if (mode === "focus") {
      const updatedTime = { ...expertTime, [type]: value };
      setExpertTime(updatedTime);
      setTimeLeft(
        updatedTime.hours * 3600 +
          updatedTime.minutes * 60 +
          updatedTime.seconds
      );
    } else {
      const updatedTime = { ...expertBreakTime, [type]: value };
      setExpertBreakTime(updatedTime);
      setTimeLeft(
        updatedTime.hours * 3600 +
          updatedTime.minutes * 60 +
          updatedTime.seconds
      );
    }
  };

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const progress =
    timerMode === "stopwatch"
      ? 100
      : initialTimeLeft > 0
      ? ((initialTimeLeft - timeLeft) / initialTimeLeft) * 100
      : 0;

  // Left panel calculations
  const today = new Date();
  const todaySessions = sessions.filter((s) =>
    isSameDay(parseISO(s.date), today)
  );
  const todayTotalSeconds =
    todaySessions.reduce(
      (sum, s) => sum + (s.durationSeconds || s.durationMinutes * 60),
      0
    ) + (mode === "focus" ? realTimeAddedSeconds : 0);
  const todayTotalMinutes = Math.floor(todayTotalSeconds / 60);
  const dailyProgress =
    dailyGoalMinutes > 0
      ? Math.min(100, Math.round((todayTotalMinutes / dailyGoalMinutes) * 100))
      : 0;

  let activeTitle = t("pomodoro.defaultStudyTitle");
  if (timerBookId) {
    const book = books?.find((b) => b.id === timerBookId);
    if (book) {
      activeTitle = book.title;
      if (timerChapterId) {
        const chapter = book.chapters?.find((c) => c.id === timerChapterId);
        if (chapter) activeTitle += ` - ${chapter.title}`;
      }
    }
  }

  const groupedSessions = todaySessions.reduce((acc, s) => {
    const title = s.title || t("pomodoro.defaultStudyTitle");
    if (!acc[title]) acc[title] = { totalSeconds: 0, items: [] };
    acc[title].totalSeconds += s.durationSeconds || s.durationMinutes * 60;
    acc[title].items.push(s);
    return acc;
  }, {} as Record<string, { totalSeconds: number; items: StudySession[] }>);

  const isTracking = mode === "focus" && (isActive || realTimeAddedSeconds > 0);

  if (isTracking) {
    if (!groupedSessions[activeTitle])
      groupedSessions[activeTitle] = { totalSeconds: 0, items: [] };
    groupedSessions[activeTitle].totalSeconds += realTimeAddedSeconds;
  }

  const groupedEntries = Object.entries(groupedSessions).sort(
    (a, b) => b[1].totalSeconds - a[1].totalSeconds
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl mx-auto transition-colors">
      {showAlertGuide && (
        <AlertGuideModal onClose={() => setShowAlertGuide(false)} />
      )}

      {/* Left Panel - Today's Record */}
      <div className="lg:w-1/4 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-blue-900/5 dark:shadow-none border border-blue-50 dark:border-slate-700 flex flex-col lg:min-h-[400px]">
        <h3 className="text-sm font-bold text-blue-900 dark:text-slate-100 mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" />{" "}
          {t("pomodoro.todayRecord")}
        </h3>

        <div className="mb-6 flex flex-col gap-2">
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs font-bold text-slate-400">
              {t("pomodoro.progressRate")}
            </span>
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
              {dailyProgress}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                dailyProgress >= 100 ? "bg-emerald-500" : "bg-indigo-500"
              )}
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 font-medium text-right mt-1">
            {Math.floor(todayTotalMinutes / 60) > 0
              ? `${Math.floor(todayTotalMinutes / 60)}${t("common.hours")} ${
                  todayTotalMinutes % 60
                }${t("pomodoro.minuteSuffix")}`
              : `${todayTotalMinutes}${t("pomodoro.minuteSuffix")}`}{" "}
            /{" "}
            {Math.floor(dailyGoalMinutes / 60) > 0
              ? `${Math.floor(dailyGoalMinutes / 60)}${t("common.hours")} ${
                  dailyGoalMinutes % 60
                }${t("pomodoro.minuteSuffix")}`
              : `${dailyGoalMinutes}${t("pomodoro.minuteSuffix")}`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {groupedEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600">
              <span className="text-sm font-medium mt-4">
                {t("pomodoro.noRecords")}
              </span>
            </div>
          ) : (
            <div className="flex flex-col h-full space-y-4">
              <ul className="space-y-4">
                {groupedEntries.map(([title, data], index) => {
                  if (index > 0 && !isRecordsExpanded) return null;
                  const isActiveGroup = title === activeTitle && isTracking;
                  return (
                    <li
                      key={title}
                      className="flex flex-col p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight pr-2">
                          {title}
                        </span>
                        <span
                          className={cn(
                            "text-lg font-black whitespace-nowrap",
                            isActiveGroup
                              ? "text-blue-500 animate-pulse"
                              : "text-indigo-600 dark:text-indigo-400"
                          )}
                        >
                          {Math.floor(data.totalSeconds / 3600) > 0
                            ? `${Math.floor(data.totalSeconds / 3600)}${t(
                                "common.hours"
                              )} `
                            : ""}
                          {Math.floor((data.totalSeconds % 3600) / 60) > 0 ||
                          Math.floor(data.totalSeconds / 3600) > 0
                            ? `${Math.floor(
                                (data.totalSeconds % 3600) / 60
                              )}${t("pomodoro.minuteSuffix")} `
                            : ""}
                          {data.totalSeconds % 60}
                          {t("pomodoro.secondSuffix")}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5 mt-2">
                        {data.items.map((s, itemIdx) => {
                          if (!isRecordsExpanded && itemIdx > 0) return null;
                          return (
                            <div
                              key={s.id}
                              className="group relative flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700/50"
                            >
                              <span>
                                {new Date(s.date).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-indigo-500 dark:text-indigo-400">
                                  +
                                  {s.durationSeconds
                                    ? (Math.floor(s.durationSeconds / 3600) > 0
                                        ? `${Math.floor(
                                            s.durationSeconds / 3600
                                          )}${t("common.hours")} `
                                        : "") +
                                      (Math.floor(
                                        (s.durationSeconds % 3600) / 60
                                      ) > 0 ||
                                      Math.floor(s.durationSeconds / 3600) > 0
                                        ? `${Math.floor(
                                            (s.durationSeconds % 3600) / 60
                                          )}${t("pomodoro.minuteSuffix")} `
                                        : "") +
                                      (s.durationSeconds % 60) +
                                      t("pomodoro.secondSuffix")
                                    : (Math.floor(s.durationMinutes / 60) > 0
                                        ? `${Math.floor(
                                            s.durationMinutes / 60
                                          )}${t("common.hours")} `
                                        : "") +
                                      (s.durationMinutes % 60) +
                                      t("pomodoro.minuteSuffix")}
                                </span>
                                <button
                                  onClick={() => {
                                    setSessionToEdit(s);
                                    setEditSeconds(
                                      s.durationSeconds ||
                                        s.durationMinutes * 60
                                    );
                                    setEditModalOpen(true);
                                  }}
                                  className="p-1 -mr-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {isActiveGroup && (
                          <div className="flex items-center justify-between text-xs font-bold text-blue-500 bg-blue-50 dark:bg-slate-800 px-2.5 py-2 rounded-lg border border-blue-200 dark:border-slate-700/50 animate-pulse">
                            <span className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                              {t("pomodoro.inProgress")}
                            </span>
                            <span>
                              +
                              {Math.floor(realTimeAddedSeconds / 3600) > 0
                                ? `${Math.floor(
                                    realTimeAddedSeconds / 3600
                                  )}${t("common.hours")} `
                                : ""}
                              {Math.floor((realTimeAddedSeconds % 3600) / 60) >
                                0 || Math.floor(realTimeAddedSeconds / 3600) > 0
                                ? `${Math.floor(
                                    (realTimeAddedSeconds % 3600) / 60
                                  )}${t("pomodoro.minuteSuffix")} `
                                : ""}
                              {realTimeAddedSeconds % 60}
                              {t("pomodoro.secondSuffix")}
                            </span>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {(groupedEntries.length > 1 ||
                (groupedEntries[0] &&
                  groupedEntries[0][1].items.length > 1)) && (
                <button
                  onClick={() => setIsRecordsExpanded(!isRecordsExpanded)}
                  className="w-full py-2 text-xs font-bold text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/30 dark:hover:bg-slate-900/50 rounded-xl mt-2"
                >
                  {isRecordsExpanded
                    ? t("common.collapse", "접기")
                    : t("common.expand", "펼쳐보기")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Timer */}
      <div className="lg:w-1/2 flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none border border-blue-50 dark:border-slate-700">
        {/* Target Selection */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mb-6 bg-slate-50 dark:bg-slate-900/50 p-2 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
          <select
            className="flex-1 bg-white dark:bg-slate-800 border p-2 rounded-xl text-xs sm:text-sm font-bold border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300 shadow-sm"
            value={timerBookId || ""}
            onChange={(e) => {
              setTimerBookId(e.target.value);
              setTimerChapterId("");
            }}
          >
            <option value="">({t("pomodoro.noTargetBook")})</option>
            {books?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>

          {timerBookId &&
            (books?.find((b) => b.id === timerBookId)?.chapters?.length || 0) >
              0 && (
              <select
                className="flex-1 bg-white dark:bg-slate-800 border p-2 rounded-xl text-xs sm:text-sm font-bold border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300 shadow-sm"
                value={timerChapterId || ""}
                onChange={(e) => setTimerChapterId(e.target.value)}
              >
                <option value="">({t("pomodoro.noTargetChapter")})</option>
                {books
                  ?.find((b) => b.id === timerBookId)
                  ?.chapters?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
              </select>
            )}
        </div>

        {/* Alert Mode Selection */}
        <div className="flex bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700/50 w-full max-w-sm mb-6 items-center">
          <div className="flex gap-2 w-full">
            {(["sound", "vibrate", "both", "off"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setTimerAlertMode(m)}
                className={cn(
                  "flex-1 py-1.5 text-[11px] sm:text-xs font-bold rounded-xl transition-all capitalize",
                  timerAlertMode === m
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {m === "sound" && t("pomodoro.soundOnly")}
                {m === "vibrate" && t("pomodoro.vibrateOnly")}
                {m === "both" && t("pomodoro.soundAndVibrate")}
                {m === "off" && t("pomodoro.screenOnly")}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAlertGuide(true)}
            className="p-1.5 ml-1 text-slate-400 hover:text-indigo-500 transition-colors"
            title={t("alertGuide.title")}
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 p-1.5 mb-8 bg-blue-50/80 dark:bg-slate-900/80 rounded-full border border-blue-100 dark:border-slate-700">
          <button
            onClick={() => switchMode("focus")}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase transition-all shadow-sm",
              mode === "focus"
                ? cn(
                    "bg-white dark:bg-slate-700",
                    timerMode === "expert"
                      ? "text-red-500"
                      : timerMode === "stopwatch"
                      ? "text-emerald-500"
                      : "text-blue-500"
                  )
                : "bg-transparent text-blue-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-slate-300 shadow-none"
            )}
          >
            <Brain className="w-4 h-4" /> {t("pomodoro.focusButton")}
          </button>
          <button
            onClick={() => switchMode("break")}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase transition-all shadow-sm",
              mode === "break"
                ? "bg-white dark:bg-slate-700 text-emerald-500"
                : "bg-transparent text-blue-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-slate-300 shadow-none"
            )}
          >
            <Coffee className="w-4 h-4" /> {t("pomodoro.breakButton")}
          </button>
        </div>

        <div className="relative flex items-center justify-center mb-10 group w-full max-w-[18rem]">
          <svg
            className="w-full h-auto aspect-square transform -rotate-90"
            viewBox="0 0 288 288"
          >
            <circle
              cx="144"
              cy="144"
              r="132"
              stroke="currentColor"
              strokeWidth={timerMode === "expert" ? "4" : "10"}
              fill="transparent"
              strokeDasharray={
                timerMode === "expert"
                  ? "8 8"
                  : timerMode === "stopwatch"
                  ? "1 15"
                  : "none"
              }
              strokeLinecap={timerMode === "stopwatch" ? "round" : "butt"}
              className="text-blue-50 dark:text-slate-700 transition-all duration-300"
            />
            {timerMode === "expert" && (
              <circle
                cx="144"
                cy="144"
                r="118"
                stroke="currentColor"
                strokeWidth="1"
                fill="transparent"
                className="text-blue-100 dark:text-slate-600 opacity-50 transition-all duration-300"
              />
            )}
            <circle
              cx="144"
              cy="144"
              r="132"
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 132}
              strokeDashoffset={
                timerMode === "stopwatch"
                  ? 2 *
                    Math.PI *
                    132 *
                    (1 -
                      (timeLeft % 60 === 0 && timeLeft > 0
                        ? 1
                        : (timeLeft % 60) / 60))
                  : 2 * Math.PI * 132 * (progress / 100)
              }
              className={cn(
                "transition-all duration-1000 ease-linear shadow-sm",
                mode === "focus"
                  ? timerMode === "expert"
                    ? "text-rose-500"
                    : timerMode === "stopwatch"
                    ? "text-emerald-500"
                    : "text-blue-500"
                  : "text-emerald-500"
              )}
              strokeLinecap="round"
            />
            {timerMode === "stopwatch" && isActive && (
              <circle
                cx="144"
                cy="144"
                r="132"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 132}
                strokeDashoffset={
                  2 *
                  Math.PI *
                  132 *
                  (1 -
                    (timeLeft % 60 === 0 && timeLeft > 0
                      ? 1
                      : (timeLeft % 60) / 60))
                }
                className="text-emerald-400 opacity-40 animate-pulse blur-[6px] transition-all duration-1000 ease-linear"
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="absolute flex flex-col items-center justify-center px-4 w-full text-center">
            <span
              className={cn(
                "font-black text-blue-900 dark:text-white tracking-tighter whitespace-nowrap",
                hours > 0
                  ? "text-[2.75rem] sm:text-[3.5rem]"
                  : "text-6xl sm:text-7xl"
              )}
              style={{ fontFamily: "monospace" }}
            >
              {hours > 0 ? `${String(hours).padStart(2, "0")}:` : ""}
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </span>
            <span className="text-blue-400 dark:text-slate-400 font-bold text-[10px] uppercase mt-2 tracking-widest">
              {mode === "focus"
                ? t("pomodoro.stayFocused")
                : t("pomodoro.timeToRelax")}
            </span>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <button
            onClick={toggleTimer}
            className={cn(
              "flex items-center justify-center w-20 h-20 rounded-full text-white shadow-xl transition-all active:scale-95",
              mode === "focus"
                ? timerMode === "expert"
                  ? isActive
                    ? "bg-slate-600 hover:bg-slate-700 shadow-slate-200 dark:shadow-none"
                    : "bg-red-500 hover:bg-red-600 shadow-red-200 dark:shadow-none"
                  : timerMode === "stopwatch"
                  ? isActive
                    ? "bg-slate-600 hover:bg-slate-700 shadow-slate-200 dark:shadow-none"
                    : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 dark:shadow-none"
                  : isActive
                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none"
                  : "bg-blue-500 hover:bg-blue-600 shadow-blue-200 dark:shadow-none"
                : isActive
                ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none"
                : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 dark:shadow-none"
            )}
          >
            {isActive ? (
              <Pause className="w-10 h-10 fill-current" />
            ) : (
              <Play className="w-10 h-10 fill-current ml-1.5" />
            )}
          </button>

          <button
            onClick={stopTimer}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-600 transition-transform active:scale-95"
            title={t("pomodoro.stop")}
          >
            <Square className="w-6 h-6 fill-current" />
          </button>

          <button
            onClick={resetTimer}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-600 transition-transform active:scale-95"
            title={t("pomodoro.reset")}
          >
            <RefreshCw className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Right Panel - Modes */}
      <div className="lg:w-1/4 flex flex-col gap-4">
        <button
          onClick={() => handleTimerModeSelect("beginner")}
          className={cn(
            "text-left bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-blue-900/5 dark:shadow-none border transition-all h-auto",
            timerMode === "beginner"
              ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900/30"
              : "border-blue-50 dark:border-slate-700 hover:border-blue-200 dark:hover:border-slate-600"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-blue-900 dark:text-slate-100 flex items-center gap-2">
              <span className="text-xl">🌱</span>{" "}
              {t("pomodoro.beginnerMode", "초심자 모드")}
            </h4>
            {timerMode === "beginner" && (
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            {t("pomodoro.beginnerDescription", "25분 집중, 5분 휴식")}
          </p>
          <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300 font-mono">
            25:00
          </span>
        </button>

        <div
          className={cn(
            "bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-blue-900/5 dark:shadow-none border transition-all flex flex-col",
            timerMode === "expert"
              ? "border-red-500 ring-2 ring-red-200 dark:ring-red-900/30"
              : "border-blue-50 dark:border-slate-700 hover:border-red-200 dark:hover:border-slate-600"
          )}
        >
          <button
            className="w-full text-left"
            onClick={() => handleTimerModeSelect("expert")}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-blue-900 dark:text-slate-100 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-red-500" />{" "}
                {t("pomodoro.expertMode", "고수 모드")}
              </h4>
              {timerMode === "expert" && (
                <div className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">
              {mode === "focus"
                ? t("pomodoro.focusTime", "집중 시간")
                : t("pomodoro.breakTime", "휴식 시간")}
            </p>
          </button>

          {timerMode === "expert" && (
            <div className="flex gap-2 items-center bg-red-50/50 dark:bg-slate-900/50 p-3 rounded-2xl border border-red-100 dark:border-slate-700 mt-2">
              <div className="flex flex-col items-center flex-1">
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={
                    (mode === "focus" ? expertTime : expertBreakTime).hours ||
                    ""
                  }
                  placeholder="0"
                  onChange={(e) =>
                    handleExpertTimeChange(
                      "hours",
                      parseInt(e.target.value, 10) || 0
                    )
                  }
                  className="w-full bg-white dark:bg-slate-800 text-center font-bold text-red-900 dark:text-slate-100 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 placeholder-slate-300"
                />
                <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                  H
                </span>
              </div>
              <span className="font-black text-slate-300 dark:text-slate-600 mb-5">
                :
              </span>
              <div className="flex flex-col items-center flex-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={
                    (mode === "focus" ? expertTime : expertBreakTime).minutes ||
                    ""
                  }
                  placeholder="0"
                  onChange={(e) =>
                    handleExpertTimeChange(
                      "minutes",
                      parseInt(e.target.value, 10) || 0
                    )
                  }
                  className="w-full bg-white dark:bg-slate-800 text-center font-bold text-red-900 dark:text-slate-100 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 placeholder-slate-300"
                />
                <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                  M
                </span>
              </div>
              <span className="font-black text-slate-300 dark:text-slate-600 mb-5">
                :
              </span>
              <div className="flex flex-col items-center flex-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={
                    (mode === "focus" ? expertTime : expertBreakTime).seconds ||
                    ""
                  }
                  placeholder="0"
                  onChange={(e) =>
                    handleExpertTimeChange(
                      "seconds",
                      parseInt(e.target.value, 10) || 0
                    )
                  }
                  className="w-full bg-white dark:bg-slate-800 text-center font-bold text-blue-900 dark:text-slate-100 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-300"
                />
                <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                  S
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => handleTimerModeSelect("stopwatch")}
          className={cn(
            "text-left bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-blue-900/5 dark:shadow-none border transition-all h-auto",
            timerMode === "stopwatch"
              ? "border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900/30"
              : "border-blue-50 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-slate-600"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-blue-900 dark:text-slate-100 flex items-center gap-2">
              <span className="text-xl">⏱️</span>{" "}
              {t("pomodoro.stopwatchMode", "스톱워치 모드")}
            </h4>
            {timerMode === "stopwatch" && (
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            {t(
              "pomodoro.stopwatchDescription",
              "무제한으로 시간을 측정합니다."
            )}
          </p>
          <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300 font-mono">
            ∞
          </span>
        </button>
      </div>

      {/* Edit Session Modal */}
      {editModalOpen && sessionToEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setEditModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-blue-50 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-blue-900 dark:text-slate-100 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-500" />{" "}
                {t("pomodoro.editRecord")}
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                title={t("pomodoro.close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {sessionToEdit.title || t("pomodoro.defaultStudyTitle")}
              </div>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {new Date(sessionToEdit.date).toLocaleString("ko-KR", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {t("pomodoro.studyTimeMinutes")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={Math.floor(editSeconds / 60)}
                    onChange={(e) =>
                      setEditSeconds(
                        Math.max(0, parseInt(e.target.value) || 0) * 60 +
                          (editSeconds % 60)
                      )
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {t("pomodoro.seconds")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={editSeconds % 60}
                    onChange={(e) =>
                      setEditSeconds(
                        Math.floor(editSeconds / 60) * 60 +
                          Math.max(
                            0,
                            Math.min(59, parseInt(e.target.value) || 0)
                          )
                      )
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (confirmDelete) {
                    deleteSession(sessionToEdit.id);
                    setEditModalOpen(false);
                    setConfirmDelete(false);
                  } else {
                    setConfirmDelete(true);
                    setTimeout(() => setConfirmDelete(false), 3000);
                  }
                }}
                className={cn(
                  "flex-shrink-0 px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center",
                  confirmDelete
                    ? "bg-red-500 text-white shadow-lg shadow-red-200 dark:shadow-none"
                    : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20"
                )}
                title={t("pomodoro.delete")}
              >
                {confirmDelete ? (
                  <span className="text-sm px-1">
                    {t("pomodoro.deleteConfirm")}
                  </span>
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => {
                  if (editSeconds > 0) {
                    updateSession(sessionToEdit.id, {
                      durationSeconds: editSeconds,
                      durationMinutes: Math.floor(editSeconds / 60),
                    });
                  } else {
                    deleteSession(sessionToEdit.id);
                  }
                  setEditModalOpen(false);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
              >
                {t("common.done")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Switch Confirm Modal */}
      <BaseModal
        isOpen={pendingTimerMode !== null}
        onClose={() => setPendingTimerMode(null)}
      >
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {t("pomodoro.confirmModeSwitchTitle", "모드 변경 확인")}
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            {t(
              "pomodoro.confirmModeSwitchMessage",
              "현재 측정 중인 학습 시간이 있습니다. 모드를 변경하면 측정된 시간이 기록되고 새 모드로 전환됩니다. 계속하시겠습니까?"
            )}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setPendingTimerMode(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors"
            >
              {t("common.cancel", "취소")}
            </button>
            <button
              onClick={confirmModeSwitch}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors shadow-sm"
            >
              {t("common.confirm", "확인")}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Sync Confirm Modal */}
      {syncConfirmData && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setSyncConfirmData(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-blue-50 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-blue-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-500" />{" "}
              {t("pomodoro.autoSyncTitle")}
            </h3>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {syncConfirmData.confirmMsg}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsActive(true);
                  setSyncConfirmData(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={async () => {
                  const {
                    getDailyLayouts,
                    getTimetableRecords,
                    saveTimetableRecords,
                    parseMins,
                  } = await import("../lib/timetableUtils");
                  const { targetDateStr, startTimeStr, bookId, chapterId } =
                    syncConfirmData;
                  const layouts = await getDailyLayouts(targetDateStr);
                  const records = await getTimetableRecords(targetDateStr);

                  const startMins = parseMins(startTimeStr);
                  const currentBlock = layouts.find((b) => {
                    const bStart = parseMins(b.startTime);
                    let bEnd = parseMins(b.endTime);
                    if (bEnd <= bStart) bEnd += 24 * 60;
                    return startMins >= bStart && startMins < bEnd;
                  });

                  if (currentBlock) {
                    const newRecords = [
                      ...records,
                      {
                        id: Date.now().toString(),
                        blockId: currentBlock.id,
                        bookId: bookId,
                        chapterId: chapterId,
                        startPage: 0,
                        endPage: 0,
                        memo: "",
                        isAutoSynced: true,
                      },
                    ];
                    await saveTimetableRecords(targetDateStr, newRecords);
                  }

                  timerProps.executeImmediateSync &&
                    timerProps.executeImmediateSync(syncConfirmData);
                  timerProps.setSyncIntention &&
                    timerProps.setSyncIntention({
                      targetDateStr,
                      startTimeStr,
                      bookId,
                      chapterId,
                      blockId: currentBlock?.id,
                    });

                  setIsActive(true);
                  setSyncConfirmData(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                {t("pomodoro.syncStart")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
