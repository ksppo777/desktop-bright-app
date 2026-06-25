import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { StudySession, TimeSlotGoal, TimeBlock } from "../types";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  format,
  subDays,
  parseISO,
  isSameDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  isAfter,
  addDays,
  getDay,
  startOfDay,
} from "date-fns";
import { ko, enUS, ja as jaLocale } from "date-fns/locale";
import { X, CheckCircle2 } from "lucide-react";
import { cn, useLockBodyScroll } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import BaseModal from "./BaseModal";
import TodayPlan, { TodayPlanProps } from "./TodayPlan";
import { useTranslation } from "react-i18next";
import { registerBackHandler } from "../lib/backHandler";

interface StatisticsProps {
  sessions: StudySession[];
  realTimeAddedSeconds?: number;
  weeklyPlans: Record<string, string>;
  setWeeklyPlans: (
    val:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>)
  ) => void;
  dailyGoalMinutes: number;
  setDailyGoalMinutes?: (val: number) => void;
  books?: any[];
  setBooks?: any;
  setActiveTab?: (tab: string) => void;
  autoGoalDisplayMode?: "multiple" | "single";
  timetableRecords: Record<string, TimeSlotGoal[]>;
  setTimetableRecords: React.Dispatch<
    React.SetStateAction<Record<string, TimeSlotGoal[]>>
  >;
  globalWakeTimeRaw: string | number;
  setGlobalWakeTimeRaw: React.Dispatch<React.SetStateAction<string | number>>;
  globalSleepTimeRaw: string | number;
  setGlobalSleepTimeRaw: React.Dispatch<React.SetStateAction<string | number>>;
  dailySettingsDict: Record<
    string,
    { goal: number; wake: string | number; sleep: string | number }
  >;
  setDailySettingsDict: React.Dispatch<
    React.SetStateAction<
      Record<
        string,
        { goal: number; wake: string | number; sleep: string | number }
      >
    >
  >;
  dailyLayouts: Record<string, TimeBlock[]>;
  setDailyLayouts: React.Dispatch<
    React.SetStateAction<Record<string, TimeBlock[]>>
  >;
}

export default function Statistics({
  sessions,
  realTimeAddedSeconds = 0,
  weeklyPlans,
  setWeeklyPlans,
  dailyGoalMinutes,
  setDailyGoalMinutes,
  books = [],
  setBooks,
  setActiveTab,
  autoGoalDisplayMode = "multiple",
  timetableRecords,
  setTimetableRecords,
  globalWakeTimeRaw,
  setGlobalWakeTimeRaw,
  globalSleepTimeRaw,
  setGlobalSleepTimeRaw,
  dailySettingsDict,
  setDailySettingsDict,
  dailyLayouts,
  setDailyLayouts,
}: StatisticsProps) {
  const { t, i18n } = useTranslation();
  const dateLocale =
    i18n.language === "ja" ? jaLocale : i18n.language === "en" ? enUS : ko;
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [selectedMonthDay, setSelectedMonthDay] = useState<Date | null>(null);
  const [showPastPlansModal, setShowPastPlansModal] = useState(false);
  const [pastPlansDate, setPastPlansDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [dateRangeType, setDateRangeType] = useState("7"); // '3', '7', '14', '30', 'custom'
  const [customStartDate, setCustomStartDate] = useState(
    format(subDays(new Date(), 6), "yyyy-MM-dd")
  );
  const [customEndDate, setCustomEndDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );

  useLockBodyScroll(showWeeklyModal || showMonthlyModal || showPastPlansModal);

  useEffect(() => {
    if (showWeeklyModal) {
      return registerBackHandler(() => {
        setShowWeeklyModal(false);
        return true;
      });
    }
    if (showMonthlyModal) {
      return registerBackHandler(() => {
        setShowMonthlyModal(false);
        return true;
      });
    }
    if (showPastPlansModal) {
      return registerBackHandler(() => {
        setShowPastPlansModal(false);
        return true;
      });
    }
  }, [showWeeklyModal, showMonthlyModal, showPastPlansModal]);

  useEffect(() => {
    if (selectedMonthDay) {
      return registerBackHandler(() => {
        setSelectedMonthDay(null);
        return true;
      });
    }
  }, [selectedMonthDay]);

  const handlePlanChange = (dateKey: string, value: string) => {
    setWeeklyPlans((prev: Record<string, string>) => ({
      ...prev,
      [dateKey]: value,
    }));
  };

  const now = useMemo(() => new Date(), []);

  // Calculate target days based on filter
  const targetDays = useMemo(() => {
    let start,
      end = now;
    if (dateRangeType === "3") start = subDays(now, 2);
    else if (dateRangeType === "7") start = subDays(now, 6);
    else if (dateRangeType === "14") start = subDays(now, 13);
    else if (dateRangeType === "30") start = subDays(now, 29);
    else if (dateRangeType === "custom") {
      start = new Date(customStartDate);
      end = new Date(customEndDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        start = subDays(now, 6);
        end = now;
      }
    } else start = subDays(now, 6);

    if (isAfter(start, end)) {
      const temp = start;
      start = end;
      end = temp;
    }

    const days = [];
    let curr = startOfDay(start);
    const endT = startOfDay(end);
    while (curr <= endT) {
      days.push(curr);
      curr = addDays(curr, 1);
    }
    if (days.length > 90) return days.slice(days.length - 90);
    return days;
  }, [dateRangeType, customStartDate, customEndDate, now]);

  const chartData = useMemo(
    () =>
      targetDays.map((day, i) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const daySessions = sessions.filter((s) =>
          isSameDay(parseISO(s.date), day)
        );
        let totalSeconds = daySessions.reduce(
          (acc, curr) =>
            acc + (curr.durationSeconds || curr.durationMinutes * 60),
          0
        );
        // Add realTimeAddedSeconds only if the day is today
        if (isSameDay(now, day)) totalSeconds += realTimeAddedSeconds;
        totalSeconds = Math.min(86400, totalSeconds);

        const minutes = Math.floor(totalSeconds / 60);
        const daySettings = dailySettingsDict[dayStr] || {
          goal: dailyGoalMinutes,
        };
        const goalMinutes = daySettings.goal || dailyGoalMinutes;

        return {
          date: format(day, "MMM d (E)", { locale: dateLocale }),
          shortDate: format(day, "dd"),
          minutes: Number((totalSeconds / 60).toFixed(1)),
          seconds: totalSeconds,
          hours: +(totalSeconds / 3600).toFixed(1),
          goalMinutes,
          completionRate:
            goalMinutes > 0
              ? Math.min(100, Math.round((minutes / goalMinutes) * 100))
              : 0,
        };
      }),
    [
      targetDays,
      sessions,
      now,
      realTimeAddedSeconds,
      dailySettingsDict,
      dailyGoalMinutes,
      dateLocale,
    ]
  );

  const totalSecondsAllTime = useMemo(
    () =>
      sessions.reduce(
        (acc, curr) =>
          acc + (curr.durationSeconds || curr.durationMinutes * 60),
        0
      ) + realTimeAddedSeconds,
    [sessions, realTimeAddedSeconds]
  );
  const totalMinutesAllTime = Math.floor(totalSecondsAllTime / 60);
  const totalHoursAllTime = Math.floor(totalMinutesAllTime / 60);

  const todaySeconds = useMemo(() => {
    const daySessions = sessions.filter((s) =>
      isSameDay(parseISO(s.date), now)
    );
    return Math.min(
      86400,
      daySessions.reduce(
        (acc, curr) =>
          acc + (curr.durationSeconds || curr.durationMinutes * 60),
        0
      ) + realTimeAddedSeconds
    );
  }, [sessions, now, realTimeAddedSeconds]);

  // Calculate Streak
  const streak = (() => {
    if (sessions.length === 0) return 0;
    const days = Array.from(
      new Set(sessions.map((s) => new Date(s.date).toDateString()))
    )
      .map((d) => new Date(d).setHours(0, 0, 0, 0))
      .sort((a, b) => b - a);

    let currentStreak = 0;
    let checkTime = new Date().setHours(0, 0, 0, 0);

    if (days[0] === checkTime) {
      currentStreak++;
      checkTime -= 86400000;
      days.shift();
    } else if (days[0] === checkTime - 86400000) {
      // Didn't study today yet, streak alive
      checkTime -= 86400000;
    } else {
      return 0; // Streak broken
    }

    for (const day of days) {
      if (day === checkTime) {
        currentStreak++;
        checkTime -= 86400000;
      } else if (day < checkTime) {
        break;
      }
    }
    return currentStreak;
  })();

  // Weekly Stats (Current week starting Monday)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekSessions = sessions.filter((s) => {
    const d = parseISO(s.date);
    return isAfter(d, weekStart) || isSameDay(d, weekStart);
  });
  const weekSeconds =
    weekSessions.reduce(
      (acc, curr) => acc + (curr.durationSeconds || curr.durationMinutes * 60),
      0
    ) + realTimeAddedSeconds;
  const weekMinutes = Math.floor(weekSeconds / 60);

  // Generate week days for modal
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dayStrVal = format(day, "yyyy-MM-dd");
    const daySessions = sessions.filter((s) =>
      isSameDay(parseISO(s.date), day)
    );
    let seconds = daySessions.reduce(
      (acc, curr) => acc + (curr.durationSeconds || curr.durationMinutes * 60),
      0
    );
    if (isSameDay(now, day)) seconds += realTimeAddedSeconds;
    seconds = Math.min(86400, seconds);
    const minutes = Math.floor(seconds / 60);
    const daySettings = dailySettingsDict[dayStrVal] || {
      goal: dailyGoalMinutes,
    };
    const goalMinutes = daySettings.goal || dailyGoalMinutes;

    return {
      date: day,
      dayStr: format(day, "EEEE", { locale: dateLocale }),
      minutes,
      seconds,
      goalMinutes,
      progress:
        goalMinutes > 0
          ? Math.min(100, Math.round((seconds / 60 / goalMinutes) * 100))
          : 0,
    };
  });

  // Monthly Stats (Current month)
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthSessions = sessions.filter((s) => {
    const d = parseISO(s.date);
    return isAfter(d, monthStart) || isSameDay(d, monthStart);
  });
  const monthSeconds =
    monthSessions.reduce(
      (acc, curr) => acc + (curr.durationSeconds || curr.durationMinutes * 60),
      0
    ) + realTimeAddedSeconds;
  const monthMinutes = Math.floor(monthSeconds / 60);

  // Generate calendar days for month modal
  const startDayOfWeek = getDay(monthStart); // 0 = Sunday, 1 = Monday...
  const calendarGrid = useMemo(() => {
    const emptyDaysBefore = Array.from(
      { length: startDayOfWeek },
      (_, i) => null
    );
    const daysInMonth = Array.from({ length: monthEnd.getDate() }, (_, i) => {
      const day = addDays(monthStart, i);
      const daySessions = sessions.filter((s) =>
        isSameDay(parseISO(s.date), day)
      );
      let seconds = daySessions.reduce(
        (acc, curr) =>
          acc + (curr.durationSeconds || curr.durationMinutes * 60),
        0
      );
      if (isSameDay(now, day)) seconds += realTimeAddedSeconds;
      seconds = Math.min(86400, seconds);
      const minutes = Math.floor(seconds / 60);
      return {
        dayStr: format(day, "d"),
        minutes,
        seconds,
        date: day,
        progress:
          dailyGoalMinutes > 0
            ? Math.min(100, Math.round((seconds / 60 / dailyGoalMinutes) * 100))
            : 0,
        sessions: daySessions,
      };
    });
    return [...emptyDaysBefore, ...daysInMonth];
  }, [
    monthStart,
    monthEnd,
    startDayOfWeek,
    sessions,
    now,
    realTimeAddedSeconds,
    dailyGoalMinutes,
  ]);

  // ================= 5 Point Plan Calculations =================
  // 1. Subject Distribution (Selected Days)
  const subjectDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    targetDays.forEach((day, i) => {
      const daySessions = sessions.filter((s) =>
        isSameDay(parseISO(s.date), day)
      );
      daySessions.forEach((s) => {
        const fallbackActiveKey = i18n.language === "en" ? "Unspecified" : i18n.language === "ja" ? "未指定" : "항목 미지정";
        const key = s.bookId
          ? books.find((b) => b.id === s.bookId)?.title ||
            (s.title ? s.title.split(" - ")[0] : fallbackActiveKey)
          : (s.title ? s.title.split(" - ")[0] : fallbackActiveKey);
        dist[key] =
          (dist[key] || 0) + (s.durationSeconds || s.durationMinutes * 60);
      });
      // Handle active tracking session for today
      if (isSameDay(now, day) && realTimeAddedSeconds > 0) {
        // Without knowing the active book easily, put it in Unknown or Active tracking
        const activeKey = i18n.language === "en" ? "Unspecified" : i18n.language === "ja" ? "未指定" : "항목 미지정";
        dist[activeKey] = (dist[activeKey] || 0) + realTimeAddedSeconds;
      }
    });
    return Object.entries(dist)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [sessions, books, targetDays, realTimeAddedSeconds, i18n.language, now]);

  const PIE_COLORS = [
    "#3b82f6",
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#06b6d4",
    "#ec4899",
    "#64748b",
  ];

  const hourDistribution = useMemo(() => {
    const dist = Array(24).fill(0);
    sessions.forEach((s) => {
      const ms = parseInt(s.id);
      if (!isNaN(ms) && ms > 1000000000000) {
        const hour = new Date(ms).getHours();
        dist[hour] += s.durationSeconds || s.durationMinutes * 60;
      }
    });

    return dist.map((value, hour) => ({
      hour: `${hour}:00`,
      minutes: Number((value / 60).toFixed(1)),
      seconds: value,
    }));
  }, [sessions]);

  // 2. Averages for Selected Days Insight
  const avgSevenDaysSeconds =
    targetDays.length > 0
      ? chartData.reduce((acc, curr) => acc + curr.seconds, 0) /
        targetDays.length
      : 0;
  const avgH = Math.floor(avgSevenDaysSeconds / 3600);
  const avgM = Math.floor((avgSevenDaysSeconds % 3600) / 60);
  const topSubject =
    subjectDistribution.length > 0 ? subjectDistribution[0].name : "";

  // 3. Weekly / Monthly comparisons
  const lastWeekStart = subDays(weekStart, 7);
  const lastWeekEnd = subDays(weekStart, 1);
  const lastWeekSessions = sessions.filter((s) => {
    const d = parseISO(s.date);
    return (
      (isAfter(d, lastWeekStart) || isSameDay(d, lastWeekStart)) &&
      (isSameDay(d, lastWeekEnd) || isAfter(lastWeekEnd, d))
    );
  });
  const lastWeekSeconds = lastWeekSessions.reduce(
    (acc, curr) => acc + (curr.durationSeconds || curr.durationMinutes * 60),
    0
  );
  const weekDiff = weekSeconds - lastWeekSeconds;

  const lastMonthStart = startOfMonth(subDays(monthStart, 1));
  const lastMonthEnd = endOfMonth(lastMonthStart);
  const lastMonthSessions = sessions.filter((s) => {
    const d = parseISO(s.date);
    return (
      (isAfter(d, lastMonthStart) || isSameDay(d, lastMonthStart)) &&
      (isSameDay(d, lastMonthEnd) || isAfter(lastMonthEnd, d))
    );
  });
  const lastMonthSeconds = lastMonthSessions.reduce(
    (acc, curr) => acc + (curr.durationSeconds || curr.durationMinutes * 60),
    0
  );
  const monthDiff = monthSeconds - lastMonthSeconds;

  const formatDiff = (diffDiffSeconds: number) => {
    const absDiff = Math.abs(diffDiffSeconds);
    const m = Math.floor((absDiff % 3600) / 60);
    const h = Math.floor(absDiff / 3600);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 transition-colors tracking-tight">
      {/* Date Range Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl shadow-xl shadow-indigo-900/5 dark:shadow-none border border-indigo-50 dark:border-slate-700">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none snap-x pb-2 md:pb-0">
          {[
            { value: "3", label: t("statistics.3days", "3일") },
            { value: "7", label: t("statistics.7days", "7일") },
            { value: "14", label: t("statistics.14days", "14일") },
            { value: "30", label: t("statistics.30days", "30일") },
            {
              value: "custom",
              label: t("statistics.customRange", "직접 선택"),
            },
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => setDateRangeType(type.value)}
              className={cn(
                "px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm font-bold snap-center whitespace-nowrap transition-colors",
                dateRangeType === type.value
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>

        {dateRangeType === "custom" && (
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 animate-in fade-in slide-in-from-right-4 duration-300">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 md:flex-none"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 md:flex-none"
            />
          </div>
        )}
      </div>

      {/* 5. Insight (성취도 코멘트) */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800/50 p-5 rounded-2xl flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 mb-1">
            {dateRangeType === "custom"
              ? t("statistics.insightTitleCustom", "선택 기간 분석")
              : t("statistics.insightTitleN", {
                  n: dateRangeType,
                  defaultValue: `최근 ${dateRangeType}일 분석`,
                })}
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
            {avgSevenDaysSeconds > 0 ? (
              <>
                {avgH > 0
                  ? t("statistics.insightDescAvg", {
                      h: avgH,
                      m: avgM,
                      defaultValue: `해당 기간 동안 하루 평균 ${avgH}시간 ${avgM}분 집중했어요.`,
                    })
                  : t("statistics.insightDescAvgShort", {
                      m: avgM,
                      defaultValue: `해당 기간 동안 하루 평균 ${avgM}분 집중했어요.`,
                    })}
                {topSubject && (
                  <span className="ml-1 text-slate-600 dark:text-slate-300 font-medium">
                    {t("statistics.insightDescTopSubject", {
                      subject: topSubject,
                      defaultValue: `가장 많이 학습한 항목은 '${topSubject}'입니다.`,
                    })}
                  </span>
                )}
              </>
            ) : (
              t(
                "statistics.insightDescEmpty",
                "조회하신 기간동안의 학습 기록이 부족합니다. 오늘부터 기록을 시작해보세요!"
              )
            )}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-3 bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex flex-col justify-center relative overflow-hidden">
          <span className="text-blue-400 dark:text-slate-400 font-bold text-[10px] uppercase mb-1">
            {t("statistics.streakTitle")}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tight text-orange-500">
              {streak}
            </span>
            <span className="text-blue-300 dark:text-slate-500 font-bold uppercase text-[10px]">
              {t("statistics.streakUnit")}
            </span>
          </div>
          {streak > 0 && (
            <div className="absolute right-4 bottom-4 text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1 rounded-full pointer-events-none">
              {streak}
              {t("statistics.continuousLearning", "일 연속 학습 중! 🔥")}
            </div>
          )}
        </div>
        <div className="md:col-span-5 bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex flex-col justify-center">
          <span className="text-blue-400 dark:text-slate-400 font-bold text-[10px] uppercase mb-1">
            {t("statistics.todayFocus")}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl lg:text-5xl font-black tracking-tight text-emerald-500">
              {Math.floor(todaySeconds / 3600)}
              <span className="text-2xl ml-0.5 text-emerald-400">
                {t("statistics.hourShort")}
              </span>
            </span>
            <span className="text-4xl lg:text-5xl font-black tracking-tight text-emerald-500">
              {Math.floor((todaySeconds % 3600) / 60)}
              <span className="text-2xl ml-0.5 text-emerald-400">
                {t("statistics.minuteShort")}
              </span>
            </span>
            <span className="text-4xl lg:text-5xl font-black tracking-tight text-emerald-500">
              {todaySeconds % 60}
              <span className="text-2xl ml-0.5 text-emerald-400">
                {t("statistics.secondShort")}
              </span>
            </span>
          </div>
        </div>
        <div className="md:col-span-4 bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex flex-col justify-center">
          <span className="text-blue-400 dark:text-slate-400 font-bold text-[10px] uppercase mb-1">
            {t("statistics.totalStudy")}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl lg:text-5xl font-black tracking-tight text-blue-500">
              {(totalMinutesAllTime / 60).toFixed(1)}
            </span>
            <span className="text-blue-300 dark:text-slate-500 font-bold uppercase text-[10px]">
              {t("statistics.totalUnit")}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 sm:p-8 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex flex-col min-w-0 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-blue-900 dark:text-slate-100">
              {dateRangeType === "custom"
                ? t("statistics.customRangeTitle", "선택 기간 학습 추이")
                : t("statistics.dynamicRangeTitle", {
                    n: dateRangeType,
                    defaultValue: `최근 ${dateRangeType}일 학습 추이`,
                  })}
            </h3>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {t("statistics.studyTime", "학습 시간")}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                {t("statistics.goalLabel", "목표 시간")}
              </span>
            </div>
          </div>
          <div className="h-64 sm:h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="shortDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#60a5fa", fontSize: 12, fontWeight: "bold" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#60a5fa", fontSize: 12, fontWeight: "bold" }}
                />
                <Tooltip
                  cursor={{ fill: "#eff6ff", opacity: 0.5 }}
                  contentStyle={{
                    borderRadius: "16px",
                    border: "1px solid #dbeafe",
                    boxShadow: "0 10px 15px -3px rgb(30 58 138 / 0.1)",
                    color: "#1e3a8a",
                    fontWeight: "bold",
                    backgroundColor: "var(--tw-colors-white)",
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    if (name === "goalMinutes") {
                      const h = Math.floor(value / 60);
                      const m = value % 60;
                      if (h > 0)
                        return [
                          t("statistics.timeWithHours", {
                            h,
                            m,
                            s: 0,
                            defaultValue: `${h}시간 ${m}분 0초`,
                          }),
                          t("statistics.goalLabel", "목표 시간"),
                        ];
                      return [
                        t("statistics.timeNoHours", {
                          m,
                          s: 0,
                          defaultValue: `${m}분 0초`,
                        }),
                        t("statistics.goalLabel", "목표 시간"),
                      ];
                    }
                    const totalSecs = props.payload.seconds;
                    const h = Math.floor(totalSecs / 3600);
                    const m = Math.floor((totalSecs % 3600) / 60);
                    const s = totalSecs % 60;
                    if (h > 0)
                      return [
                        t("statistics.timeWithHours", { h, m, s }),
                        t("statistics.studyTime", "학습 시간"),
                      ];
                    return [
                      t("statistics.timeNoHours", { m, s }),
                      t("statistics.studyTime", "학습 시간"),
                    ];
                  }}
                  labelFormatter={(label) => {
                    const dayData = chartData.find(
                      (d) => d.shortDate === label
                    );
                    return dayData ? dayData.date : label;
                  }}
                />
                {avgSevenDaysSeconds > 0 && (
                  <ReferenceLine
                    y={Number((avgSevenDaysSeconds / 60).toFixed(1))}
                    stroke="#818cf8"
                    strokeDasharray="3 3"
                    label={{
                      position: "top",
                      value: t("statistics.avgTimeLabel", {
                        val: Math.round(avgSevenDaysSeconds / 60),
                        defaultValue: `평균 ${Math.round(
                          avgSevenDaysSeconds / 60
                        )}분`,
                      }),
                      fill: "#818cf8",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  />
                )}
                <Bar dataKey="minutes" radius={[8, 8, 8, 8]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.completionRate >= 100
                          ? "#10b981"
                          : index === chartData.length - 1
                          ? "#ef4444"
                          : "#3b82f6"
                      }
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="goalMinutes"
                  stroke="#fb923c"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 sm:p-8 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex flex-col min-w-0 overflow-hidden">
          <h3 className="text-lg font-bold text-blue-900 dark:text-slate-100 mb-6">
            {dateRangeType === "custom"
              ? t(
                  "statistics.subjectDistributionCustom",
                  "과목별 학습 비율 (선택 기간)"
                )
              : t("statistics.subjectDistributionN", {
                  n: dateRangeType,
                  defaultValue: `과목별 학습 비율 (최근 ${dateRangeType}일)`,
                })}
          </h3>
          <div className="h-[250px] sm:h-[320px] w-full min-w-0 flex-1 min-h-[250px] sm:min-h-[320px]">
            {subjectDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
                  <Pie
                    data={subjectDistribution}
                    cx="50%"
                    cy="45%"
                    innerRadius="45%"
                    outerRadius="75%"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {subjectDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid #dbeafe",
                      boxShadow: "0 10px 15px -3px rgb(30 58 138 / 0.1)",
                      fontWeight: "bold",
                    }}
                    formatter={(value: number) => {
                      const h = Math.floor(value / 3600);
                      const m = Math.floor((value % 3600) / 60);
                      if (h > 0) return [`${h}h ${m}m`, ""];
                      return [`${m}m`, ""];
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: "11px",
                      fontWeight: "bold",
                      bottom: 0,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-400">
                {t("statistics.noData", "데이터가 없습니다.")}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 sm:p-8 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none min-w-0">
        <h3 className="text-lg font-bold text-blue-900 dark:text-slate-100 mb-6 flex items-center gap-2">
          {t("statistics.hourlyActivity", "시간대별 집중 분포 (All-time)")}
        </h3>
        <div className="h-48 sm:h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart
              data={hourDistribution}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
              />
              <Tooltip
                cursor={{ fill: "#eff6ff", opacity: 0.5 }}
                contentStyle={{
                  borderRadius: "16px",
                  border: "1px solid #dbeafe",
                  boxShadow: "0 10px 15px -3px rgb(30 58 138 / 0.1)",
                  color: "#1e3a8a",
                  fontWeight: "bold",
                  backgroundColor: "var(--tw-colors-white)",
                }}
                formatter={(value: number, name: string, props: any) => {
                  const totalSecs = props.payload.seconds;
                  const h = Math.floor(totalSecs / 3600);
                  const m = Math.floor((totalSecs % 3600) / 60);
                  const s = totalSecs % 60;
                  if (h > 0)
                    return [
                      t("statistics.timeWithHours", {
                        h,
                        m,
                        s,
                        defaultValue: `${h}시간 ${m}분 ${s}초`,
                      }),
                      t("statistics.studyTime", "누적 집중 시간"),
                    ];
                  return [
                    t("statistics.timeNoHours", {
                      m,
                      s,
                      defaultValue: `${m}분 ${s}초`,
                    }),
                    t("statistics.studyTime", "누적 집중 시간"),
                  ];
                }}
              />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]} barSize={20}>
                {hourDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.minutes > 0 ? "#34d399" : "#f8fafc"}
                    className="dark:fill-slate-700"
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div
          onClick={() => setShowWeeklyModal(true)}
          className="md:col-span-4 cursor-pointer bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex flex-col justify-center hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group"
        >
          <h4 className="text-blue-900 dark:text-slate-100 font-bold mb-4 flex items-center gap-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            {t("statistics.weeklyStats")}
          </h4>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t("statistics.thisWeekTotal")}
              </span>
              {weekDiff !== 0 && (
                <span
                  className={cn(
                    "text-xs font-bold",
                    weekDiff > 0 ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {t("statistics.lastWeekCompare", "지난주 대비")}{" "}
                  {weekDiff > 0 ? "▲ " : "▼ "}
                  {formatDiff(weekDiff)}
                </span>
              )}
              {weekDiff === 0 && weekSeconds > 0 && (
                <span className="text-xs font-bold text-slate-400">
                  {t("statistics.lastWeekCompare", "지난주 대비")}{" "}
                  {t("statistics.timeSame", "변동 없음")}
                </span>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 flex items-baseline mt-1">
              {Math.floor(weekSeconds / 3600)}
              <span className="text-lg sm:text-xl text-indigo-400 dark:text-indigo-500 mx-1">
                h
              </span>
              {Math.floor((weekSeconds % 3600) / 60)}
              <span className="text-lg sm:text-xl text-indigo-400 dark:text-indigo-500 mx-1">
                m
              </span>
              {weekSeconds % 60}
              <span className="text-lg sm:text-xl text-indigo-400 dark:text-indigo-500 ml-1">
                s
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            {t("statistics.clickShowWeek")}
          </span>
        </div>

        <div
          onClick={() => setShowMonthlyModal(true)}
          className="md:col-span-4 cursor-pointer bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex flex-col justify-center hover:border-violet-300 dark:hover:border-violet-600 transition-colors group"
        >
          <h4 className="text-blue-900 dark:text-slate-100 font-bold mb-4 flex items-center gap-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            <span className="w-2 h-2 rounded-full bg-violet-500"></span>
            {t("statistics.monthlyStats")}
          </h4>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t("statistics.thisMonthTotal")}
              </span>
              {monthDiff !== 0 && (
                <span
                  className={cn(
                    "text-xs font-bold",
                    monthDiff > 0 ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {t("statistics.lastMonthCompare", "지난달 대비")}{" "}
                  {monthDiff > 0 ? "▲ " : "▼ "}
                  {formatDiff(monthDiff)}
                </span>
              )}
              {monthDiff === 0 && monthSeconds > 0 && (
                <span className="text-xs font-bold text-slate-400">
                  {t("statistics.lastMonthCompare", "지난달 대비")}{" "}
                  {t("statistics.timeSame", "변동 없음")}
                </span>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400 flex items-baseline mt-1">
              {Math.floor(monthSeconds / 3600)}
              <span className="text-lg sm:text-xl text-violet-400 dark:text-violet-500 mx-1">
                h
              </span>
              {Math.floor((monthSeconds % 3600) / 60)}
              <span className="text-lg sm:text-xl text-violet-400 dark:text-violet-500 mx-1">
                m
              </span>
              {monthSeconds % 60}
              <span className="text-lg sm:text-xl text-violet-400 dark:text-violet-500 ml-1">
                s
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-violet-400 uppercase mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            {t("statistics.clickShowCalendar")}
          </span>
        </div>

        <div
          onClick={() => setShowPastPlansModal(true)}
          className="md:col-span-4 cursor-pointer bg-white dark:bg-slate-800 border border-blue-50 dark:border-slate-700 p-6 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex flex-col justify-center hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors group"
        >
          <h4 className="text-blue-900 dark:text-slate-100 font-bold mb-4 flex items-center gap-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {t("statistics.pastPlans")}
          </h4>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {t("statistics.viewEditPast")}
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 uppercase mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            {t("statistics.clickShowPlans")}
          </span>
        </div>
      </div>

      <BaseModal
        isOpen={showWeeklyModal}
        onClose={() => setShowWeeklyModal(false)}
        className="max-w-7xl p-6 sm:p-8 overflow-hidden h-max max-h-[90vh]"
      >
        <h2 className="text-2xl font-black text-blue-900 dark:text-white mb-2 shrink-0">
          {t("statistics.thisWeekTitle")}
        </h2>
        <p className="text-sm font-medium text-blue-400 dark:text-slate-400 mb-6 shrink-0">
          {t("statistics.thisWeekDesc")}
        </p>

        <div className="no-swipe overflow-x-auto pb-6 pt-4 -mx-2 px-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-1 min-h-[300px]">
          <div className="flex gap-4 w-max min-w-full h-full">
            {weekDays.map((day, idx) => {
              const isToday = isSameDay(day.date, now);
              const dayKey = format(day.date, "yyyy-MM-dd");

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex flex-col p-5 rounded-3xl border transition-colors relative h-full min-h-[260px] w-64 shrink-0 snap-center shadow-sm",
                    isToday
                      ? "bg-indigo-50/80 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800"
                      : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
                  )}
                >
                  {isToday && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-black px-3 py-1 rounded-full z-10 shadow-sm border border-white dark:border-slate-800 tracking-wider">
                      {t("statistics.todayTag")}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 items-center mb-5 shrink-0">
                    <span
                      className={cn(
                        "text-sm font-bold px-3 py-1.5 rounded-xl w-full text-center tracking-tight",
                        isToday
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                      )}
                    >
                      {day.dayStr}
                    </span>
                    <span className="text-xs font-black text-slate-400 font-mono">
                      {format(day.date, "MM/dd")}
                    </span>
                  </div>

                  <textarea
                    value={weeklyPlans[dayKey] || ""}
                    onChange={(e) => handlePlanChange(dayKey, e.target.value)}
                    placeholder={t("statistics.planPlaceholder")}
                    className="w-full text-sm font-medium text-slate-600 dark:text-slate-300 bg-transparent border-none focus:outline-none focus:ring-0 resize-none flex-1 placeholder-slate-300 dark:placeholder-slate-600 mb-4"
                  />

                  <div className="mt-auto flex flex-col items-center shrink-0 pt-5 border-t border-slate-100 dark:border-slate-700/50">
                    <span
                      className={cn(
                        "text-2xl font-black mb-1 leading-none flex items-baseline gap-0.5 font-mono",
                        day.seconds > 0
                          ? day.progress >= 100
                            ? "text-emerald-500"
                            : "text-indigo-600 dark:text-indigo-400"
                          : "text-slate-300 dark:text-slate-600"
                      )}
                    >
                      {day.minutes}
                      <span className="text-xs opacity-70 font-bold font-sans">
                        {t("common.minute")}
                      </span>
                      {day.seconds % 60}
                      <span className="text-xs opacity-70 font-bold font-sans">
                        {t("common.second")}
                      </span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mb-3 whitespace-nowrap tracking-wider">
                      {t("statistics.goalLabel", "목표")}:{" "}
                      {Math.floor(day.goalMinutes / 60) > 0
                        ? `${Math.floor(day.goalMinutes / 60)}${t(
                            "statistics.hourShort",
                            "시간"
                          )} ${day.goalMinutes % 60}${t(
                            "statistics.minuteShort",
                            "분"
                          )}`
                        : `${day.goalMinutes}${t(
                            "statistics.minuteShort",
                            "분"
                          )}`}
                    </span>

                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          day.progress >= 100
                            ? "bg-emerald-500"
                            : "bg-indigo-500"
                        )}
                        style={{ width: `${day.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </BaseModal>

      <BaseModal
        isOpen={showMonthlyModal}
        onClose={() => {
          setShowMonthlyModal(false);
          setSelectedMonthDay(null);
        }}
        className="max-w-2xl p-0 overflow-hidden"
      >
        <div className="p-6 sm:p-8 flex flex-col sm:h-[680px] transition-all duration-300">
          <div className="shrink-0">
            <h2 className="text-2xl font-black text-blue-900 dark:text-white mb-2">
              {format(monthStart, "MMMM", { locale: dateLocale })}{" "}
              {t("statistics.calendar")}
            </h2>
            <p className="text-sm font-medium text-blue-400 dark:text-slate-400 mb-6">
              {t("statistics.calendarDesc")}
            </p>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {(t("days.short", { returnObjects: true }) as string[]).map(
                (day: string, idx: number) => (
                  <div
                    key={idx}
                    className="text-center text-xs font-bold text-slate-400 uppercase"
                  >
                    {day}
                  </div>
                )
              )}
            </div>
          </div>

          <div
            className={cn(
              "grid grid-cols-7 shrink-0 transition-all duration-300",
              selectedMonthDay ? "gap-2 sm:gap-1.5" : "gap-2"
            )}
          >
            {calendarGrid.map((day, idx) => {
              if (!day)
                return (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-xl transition-all duration-300 bg-slate-50/50 dark:bg-slate-800/50",
                      selectedMonthDay
                        ? "aspect-square sm:aspect-auto sm:h-12"
                        : "aspect-square"
                    )}
                  />
                );

              const isToday = isSameDay(day.date, now);
              const isSelected =
                selectedMonthDay && isSameDay(day.date, selectedMonthDay);

              return (
                <div
                  key={idx}
                  onClick={() =>
                    setSelectedMonthDay(isSelected ? null : day.date)
                  }
                  className={cn(
                    "rounded-xl border flex flex-col items-center relative overflow-hidden group cursor-pointer hover:border-violet-400 focus:outline-none transition-all duration-300",
                    selectedMonthDay
                      ? "aspect-square p-1 justify-between sm:aspect-auto sm:h-12 sm:justify-center sm:p-1"
                      : "aspect-square justify-between p-1 sm:p-2",
                    isSelected
                      ? "ring-2 ring-violet-500 border-violet-500 scale-105 z-10 shadow-lg"
                      : "",
                    isToday && !isSelected
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                      : day.progress >= 100 && !isSelected
                      ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900/30"
                      : !isSelected
                      ? "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800"
                      : "bg-white dark:bg-slate-800"
                  )}
                >
                  <span
                    className={cn(
                      "font-bold z-10 transition-all duration-300",
                      selectedMonthDay
                        ? "text-xs sm:text-[11px] sm:mb-1"
                        : "text-xs sm:text-sm",
                      isToday
                        ? "text-violet-700 dark:text-violet-300"
                        : "text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {day.dayStr}
                  </span>

                  <div
                    className={cn(
                      "bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden z-10 transition-all duration-300",
                      selectedMonthDay
                        ? "h-1 w-full mt-auto mb-1 sm:h-1 sm:w-6 sm:mt-0 sm:mb-0"
                        : "h-1 sm:h-1.5 w-full mt-auto mb-1"
                    )}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        day.progress >= 100 ? "bg-emerald-500" : "bg-violet-400"
                      )}
                      style={{ width: `${day.progress}%` }}
                    />
                  </div>

                  {/* Tooltip on hover */}
                  <div className="absolute inset-x-0 bottom-full mb-2 hidden sm:group-hover:flex flex-col items-center justify-center p-2 bg-slate-800 text-white rounded-lg text-[10px] whitespace-nowrap z-20 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                    <span className="font-bold">
                      {day.minutes}
                      {t("common.minute")} {day.seconds % 60}
                      {t("common.second")} {t("statistics.study")}
                    </span>
                    <span className="text-slate-300">
                      {Math.round(day.progress)}% {t("statistics.achieved")}
                    </span>
                    <div className="w-2 h-2 bg-slate-800 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                  </div>
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {selectedMonthDay &&
              (() => {
                const dayStr = format(selectedMonthDay, "yyyy-MM-dd");
                const selectedDayData = calendarGrid.find(
                  (d) => d && isSameDay(d.date, selectedMonthDay)
                );
                const daySessions = selectedDayData?.sessions || [];
                let dayMemo = weeklyPlans[dayStr] || "";

                const content = (
                  <>
                    <div className="flex justify-between items-center mb-4 shrink-0">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {format(selectedMonthDay, "MM.dd(E)", {
                          locale: dateLocale,
                        })}{" "}
                        {t("statistics.dailyDetails", "상세")}
                      </h3>
                      <button
                        onClick={() => setSelectedMonthDay(null)}
                        className="p-1 sm:p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <X className="w-5 h-5 sm:w-4 sm:h-4 text-slate-500" />
                      </button>
                    </div>

                    <div
                      className="flex-1 sm:flex-none -mx-2 px-2 overflow-y-auto scrollbar-none pb-4 sm:max-h-[40vh]"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      {daySessions.length > 0 ? (
                        <div className="space-y-4 mb-6 relative mt-2 pt-2">
                          {/* Vertical Line for Timeline */}
                          <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-indigo-100 dark:bg-indigo-900/50" />

                          {daySessions.map((session, i) => {
                            const book = books?.find(
                              (b) => b.id === session.bookId
                            );
                            const chapter = book?.chapters?.find(
                              (c: any) => c.id === session.chapterId
                            );
                            const title =
                              session.title ||
                              chapter?.title ||
                              book?.title ||
                              t("statistics.unknownSession", "기타 학습");
                            const durationSecs =
                              session.durationSeconds ||
                              session.durationMinutes * 60;
                            const m = Math.floor(durationSecs / 60);
                            const s = durationSecs % 60;

                            const startTimeMs = parseInt(session.id);
                            const isValidStartTime =
                              !isNaN(startTimeMs) &&
                              startTimeMs > 1000000000000;
                            const startTimeStr = isValidStartTime
                              ? format(new Date(startTimeMs), "HH:mm")
                              : "";
                            const endTimeStr = isValidStartTime
                              ? format(
                                  new Date(startTimeMs + durationSecs * 1000),
                                  "HH:mm"
                                )
                              : "";

                            return (
                              <div key={i} className="flex gap-3 relative px-2">
                                {/* Timeline Node */}
                                <div className="mt-2.5 w-8 flex-shrink-0 flex justify-center z-10 relative left-0">
                                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-800" />
                                </div>

                                {/* Content Card */}
                                <div className="flex-1 flex flex-col gap-1 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm sm:shadow-none sm:bg-slate-50 sm:dark:bg-slate-900/50">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                                      {title}
                                    </span>
                                    <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-lg">
                                      {m > 0
                                        ? `${m}${t("common.minute")} `
                                        : ""}
                                      {s}
                                      {t("common.second")}
                                    </span>
                                  </div>
                                  {isValidStartTime && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="font-mono text-xs font-bold text-slate-400">
                                        {startTimeStr} - {endTimeStr}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-center text-sm font-medium text-slate-400 mb-6 border border-slate-100 dark:border-slate-700 mt-2">
                          {t("statistics.noData", "데이터가 없습니다.")}
                        </div>
                      )}

                      <div className="mb-2 shrink-0">
                        <span className="text-xs font-bold text-slate-500 uppercase">
                          {t("statistics.memoLabel", "학습 메모")}
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-sm font-medium text-amber-800 dark:text-amber-500 whitespace-pre-wrap shrink-0">
                        {dayMemo ||
                          t("statistics.noMemo", "기록된 메모가 없습니다.")}
                      </div>
                    </div>
                  </>
                );

                return (
                  <React.Fragment key={selectedMonthDay.toISOString()}>
                    {/* Desktop Inline Expansion */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="hidden sm:flex flex-col flex-1 mt-4 min-h-0"
                    >
                      <div className="flex-1 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl p-4 sm:p-5 flex flex-col min-h-0 border border-slate-100 dark:border-slate-700 shadow-inner">
                        {content}
                      </div>
                    </motion.div>

                    {/* Mobile Portal */}
                    {createPortal(
                      <div
                        className="sm:hidden"
                        style={{ position: "relative", zIndex: 9999 }}
                      >
                        {/* Mobile Backdrop */}
                        <motion.div
                          key={`backdrop-${selectedMonthDay.toISOString()}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setSelectedMonthDay(null)}
                          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                          style={{ zIndex: 9999 }}
                        />

                        {/* Mobile Bottom Sheet Overlay */}
                        <motion.div
                          key={`sheet-${selectedMonthDay.toISOString()}`}
                          initial={{ y: "100%" }}
                          animate={{ y: 0 }}
                          exit={{ y: "100%" }}
                          transition={{
                            type: "spring",
                            damping: 25,
                            stiffness: 200,
                          }}
                          drag="y"
                          dragConstraints={{ top: 0, bottom: 0 }}
                          dragElastic={0.2}
                          onDragEnd={(e, info) => {
                            if (info.offset.y > 100 || info.velocity.y > 500) {
                              setSelectedMonthDay(null);
                            }
                          }}
                          className="fixed inset-x-0 bottom-0 bg-white dark:bg-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-3xl border-t border-slate-100 dark:border-slate-700 flex flex-col outline-none calendar-cell-detailed-view"
                          style={{ height: "75vh", zIndex: 10000 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="p-5 h-full flex flex-col relative w-full overflow-hidden">
                            {/* Handle bar */}
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 shrink-0" />
                            {content}
                          </div>
                        </motion.div>
                      </div>,
                      document.body
                    )}
                  </React.Fragment>
                );
              })()}
          </AnimatePresence>
        </div>
      </BaseModal>

      {showPastPlansModal && (
        <div
          className="fixed inset-0 z-50 flex flex-col pt-16 pb-4 px-4 bg-slate-50 dark:bg-slate-900 overflow-y-auto"
          onClick={() => setShowPastPlansModal(false)}
        >
          <button
            onClick={() => setShowPastPlansModal(false)}
            className="fixed top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-white dark:bg-slate-800 rounded-full shadow-md z-50"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="w-full max-w-4xl mx-auto flex flex-col gap-6 relative z-10 mb-8 pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
              <span className="text-lg font-bold text-slate-700 dark:text-slate-200">
                {t("statistics.pastDateLabel")}
              </span>
              <input
                type="date"
                value={pastPlansDate}
                onChange={(e) => setPastPlansDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
                className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div
              className={cn(
                "transition-opacity",
                pastPlansDate === format(new Date(), "yyyy-MM-dd")
                  ? "opacity-50 pointer-events-none"
                  : "opacity-100"
              )}
            >
              {pastPlansDate === format(new Date(), "yyyy-MM-dd") && (
                <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                  <div className="bg-slate-900/80 text-white font-bold px-6 py-3 rounded-2xl">
                    {t("statistics.todayDateWarning")}
                  </div>
                </div>
              )}
              <TodayPlan
                dailyGoalMinutes={dailyGoalMinutes}
                setDailyGoalMinutes={setDailyGoalMinutes || (() => {})}
                weeklyPlans={weeklyPlans}
                setWeeklyPlans={setWeeklyPlans}
                books={books || []}
                setBooks={setBooks || (() => {})}
                setActiveTab={setActiveTab || (() => {})}
                autoGoalDisplayMode={autoGoalDisplayMode}
                dateStr={pastPlansDate}
                timetableRecords={timetableRecords}
                setTimetableRecords={setTimetableRecords}
                globalWakeTimeRaw={globalWakeTimeRaw}
                setGlobalWakeTimeRaw={setGlobalWakeTimeRaw}
                globalSleepTimeRaw={globalSleepTimeRaw}
                setGlobalSleepTimeRaw={setGlobalSleepTimeRaw}
                dailySettingsDict={dailySettingsDict}
                setDailySettingsDict={setDailySettingsDict}
                dailyLayouts={dailyLayouts}
                setDailyLayouts={setDailyLayouts}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
