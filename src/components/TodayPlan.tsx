import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { format, addDays } from "date-fns";
import {
  Target,
  Book as BookIcon,
  Clock,
  Plus,
  Trash2,
  X,
  CalendarDays,
  RotateCcw,
  Divide,
  MoreVertical,
  Edit2,
  List,
  Check,
} from "lucide-react";
import { Book, Chapter, TimeSlotGoal, TimeBlock } from "../types";
import { useLocalStorage, cn, useLockBodyScroll } from "../lib/utils";
import BaseModal from "./BaseModal";
import { motion, AnimatePresence } from "motion/react";
import { registerBackHandler } from "../lib/backHandler";

import { AutoGoalModal } from "./AutoGoalModal";
import { AllAutoGoalsModal } from "./AllAutoGoalsModal";

export interface TodayPlanProps {
  dailyGoalMinutes: number;
  setDailyGoalMinutes: (val: number) => void;
  weeklyPlans: Record<string, string>;
  setWeeklyPlans: (
    val:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>)
  ) => void;
  books: Book[];
  setBooks: (books: Book[] | ((prev: Book[]) => Book[])) => void;
  setActiveTab: (tab: any) => void;
  autoGoalDisplayMode: "multiple" | "single";
  dateStr?: string;
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

export default function TodayPlan({
  dailyGoalMinutes,
  setDailyGoalMinutes,
  weeklyPlans,
  setWeeklyPlans,
  books,
  setBooks,
  setActiveTab,
  autoGoalDisplayMode,
  dateStr,
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
}: TodayPlanProps) {
  const { t } = useTranslation();
  const [editingAg, setEditingAg] = useState<{
    book: Book;
    goalId: string;
  } | null>(null);
  const targetDateStr = dateStr || format(new Date(), "yyyy-MM-dd");
  const isToday = targetDateStr === format(new Date(), "yyyy-MM-dd");

  const [showPlanAheadModal, setShowPlanAheadModal] = useState(false);
  const [planAheadDate, setPlanAheadDate] = useState(
    format(addDays(new Date(), 1), "yyyy-MM-dd")
  );

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingBlockLabel, setEditingBlockLabel] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAllAutoGoalsModal, setShowAllAutoGoalsModal] = useState(false);
  const [confirmCompleteAg, setConfirmCompleteAg] = useState<{
    book: Book;
    autoGoal: import("../types").AutoGoal;
  } | null>(null);

  const todayAutoGoals = books.flatMap((b) =>
    (
      b.autoGoals?.filter(
        (ag) =>
          ag.enabled &&
          targetDateStr >= ag.startDate &&
          targetDateStr <= ag.endDate
      ) || []
    ).map((ag) => ({ book: b, autoGoal: ag }))
  );

  const toggleAutoGoalComplete = (bookId: string, goalId: string) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          autoGoals: b.autoGoals?.map((ag) => {
            if (ag.id !== goalId) return ag;
            const completed = ag.completedDates || [];
            const isCompleted = completed.includes(targetDateStr);
            return {
              ...ag,
              completedDates: isCompleted
                ? completed.filter((d) => d !== targetDateStr)
                : [...completed, targetDateStr],
            };
          }),
        };
      })
    );
    setConfirmCompleteAg(null);
  };

  useLockBodyScroll(
    showPlanAheadModal || editingBlockId !== null || showResetConfirm
  );

  useEffect(() => {
    if (showPlanAheadModal) {
      return registerBackHandler(() => {
        setShowPlanAheadModal(false);
        return true;
      });
    }
  }, [showPlanAheadModal]);

  const EMPTY_ARRAYRef = useRef<TimeSlotGoal[]>([]);
  const todayGoals = timetableRecords[targetDateStr] || EMPTY_ARRAYRef.current;

  const currentSettings = dailySettingsDict[targetDateStr] || {
    goal: isToday ? dailyGoalMinutes : 120,
    wake: isToday ? globalWakeTimeRaw : 8,
    sleep: isToday ? globalSleepTimeRaw : 23,
  };

  const activeGoal = isToday ? dailyGoalMinutes : currentSettings.goal;
  const wakeTimeRaw = currentSettings.wake;
  const sleepTimeRaw = currentSettings.sleep;

  const handleUpdateGoal = (h: number, m: number) => {
    const total = h * 60 + m;
    if (isToday) setDailyGoalMinutes(total);
    setDailySettingsDict((prev) => ({
      ...prev,
      [targetDateStr]: { ...currentSettings, goal: total },
    }));
  };

  const wakeTime =
    typeof wakeTimeRaw === "number"
      ? `${String(wakeTimeRaw).padStart(2, "0")}:00`
      : wakeTimeRaw;
  const sleepTime =
    typeof sleepTimeRaw === "number"
      ? `${String(sleepTimeRaw).padStart(2, "0")}:00`
      : sleepTimeRaw;

  // Goal Form State
  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [startPage, setStartPage] = useState("");
  const [endPage, setEndPage] = useState("");
  const [memo, setMemo] = useState("");
  const [activeGoalMenuId, setActiveGoalMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (editingBlockId) {
      return registerBackHandler(() => {
        setEditingBlockId(null);
        return true;
      });
    }
    if (showResetConfirm) {
      return registerBackHandler(() => {
        setShowResetConfirm(false);
        return true;
      });
    }
  }, [editingBlockId, showResetConfirm]);

  // Sync to weeklyPlans for Calendar
  useEffect(() => {
    if (todayGoals.length === 0) {
      setWeeklyPlans((prev) => {
        if (prev[targetDateStr] === "") return prev;
        return { ...prev, [targetDateStr]: "" };
      });
      return;
    }

    const grouped: Record<
      string,
      {
        start: number;
        end: number;
        isAutoSynced: boolean;
        isManualAdded?: boolean;
      }
    > = {};
    const memoList: string[] = [];

    todayGoals.forEach((g) => {
      const timeLabel =
        g.blockId ||
        (g.hour !== undefined ? `${String(g.hour).padStart(2, "0")}:00` : "");
      if (g.bookId && g.chapterId) {
        const key = `${g.bookId}|${g.chapterId}`;
        if (!grouped[key]) {
          grouped[key] = {
            start: g.startPage,
            end: g.endPage,
            isAutoSynced: !!g.isAutoSynced,
            isManualAdded: !!g.isManualAdded,
          };
        } else {
          grouped[key].start = Math.min(grouped[key].start, g.startPage);
          grouped[key].end = Math.max(grouped[key].end, g.endPage);
          grouped[key].isAutoSynced =
            grouped[key].isAutoSynced || !!g.isAutoSynced;
          grouped[key].isManualAdded =
            grouped[key].isManualAdded || !!g.isManualAdded;
        }
      } else if (g.memo) {
        if (g.isAutoSynced) {
          memoList.push(`⚡ [${timeLabel}] ${g.memo}`);
        } else if (g.isManualAdded) {
          memoList.push(`📝 [${timeLabel}] ${g.memo}`);
        } else {
          memoList.push(`[${timeLabel}] ${g.memo}`);
        }
      }
    });

    const lines: string[] = [];
    for (const [key, range] of Object.entries(grouped)) {
      const [bId, cId] = key.split("|");
      const book = books.find((b) => b.id === bId);
      const chapter = book?.chapters.find((c) => c.id === cId);
      if (book && chapter) {
        const prefix = range.isAutoSynced
          ? "⚡ "
          : range.isManualAdded
          ? "📝 "
          : "";
        if (range.start === 0 && range.end === 0) {
          lines.push(`${prefix}[${book.title}] ${chapter.title}`);
        } else {
          lines.push(
            `${prefix}[${book.title}] ${chapter.title} (p.${range.start}~${range.end})`
          );
        }
      }
    }

    const finalText = [...lines, ...memoList].join("\n");
    setWeeklyPlans((prev) => {
      if (prev[targetDateStr] === finalText) return prev;
      return { ...prev, [targetDateStr]: finalText };
    });
  }, [todayGoals, books, targetDateStr, setWeeklyPlans]);

  const generateDefaultBlocks = () => {
    const blocks: TimeBlock[] = [];

    // Parse time strings "HH:mm" to minutes
    const parseMins = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const startMins = parseMins(wakeTime);
    let targetEndMins = parseMins(sleepTime);

    // If sleep time is earlier than wake time, it means next day
    if (targetEndMins <= startMins && targetEndMins !== startMins) {
      targetEndMins += 24 * 60;
    }

    let current = startMins;
    let count = 0;

    const formatTime = (totalMins: number) => {
      const h = Math.floor(totalMins / 60) % 24;
      const m = totalMins % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    while (current < targetEndMins && count < 24) {
      // max 24 blocks safety
      let duration = current % 60 === 0 ? 60 : 60 - (current % 60);

      // Don't exceed sleep time
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

    // Fallback if empty (e.g., wake == sleep)
    if (blocks.length === 0) {
      const endHourStr = formatTime(current + 60);
      blocks.push({
        id: wakeTime,
        startTime: wakeTime,
        endTime: endHourStr,
        duration: 60,
      });
    }

    return blocks;
  };

  const todayLayout = dailyLayouts[targetDateStr] || generateDefaultBlocks();

  const handleWakeChange = (val: string) => {
    if (isToday) setGlobalWakeTimeRaw(val);
    setDailySettingsDict((prev) => ({
      ...prev,
      [targetDateStr]: { ...currentSettings, wake: val },
    }));
    setDailyLayouts((prev) => ({ ...prev, [targetDateStr]: undefined as any }));
  };

  const handleSleepChange = (val: string) => {
    if (isToday) setGlobalSleepTimeRaw(val);
    setDailySettingsDict((prev) => ({
      ...prev,
      [targetDateStr]: { ...currentSettings, sleep: val },
    }));
    setDailyLayouts((prev) => ({ ...prev, [targetDateStr]: undefined as any }));
  };

  const addMinutesToTime = (timeStr: string, mins: number) => {
    const [h, m] = timeStr.split(":").map(Number);
    const total = h * 60 + m + mins;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
  };

  const handleSplit = (index: number) => {
    setDailyLayouts((prev) => {
      const layout = prev[targetDateStr] || generateDefaultBlocks();
      const newLayout = [...layout];
      const block = newLayout[index];

      let splitDuration = 0;
      if (block.duration >= 60) {
        splitDuration = 30;
      } else if (block.duration >= 20) {
        splitDuration = 10;
      } else {
        return prev;
      }

      const midTime = addMinutesToTime(block.startTime, splitDuration);

      const b1: TimeBlock = {
        id: block.id,
        startTime: block.startTime,
        endTime: midTime,
        duration: splitDuration,
      };

      const b2: TimeBlock = {
        id: `${block.id}_s2_${Date.now().toString().slice(-4)}`,
        startTime: midTime,
        endTime: block.endTime,
        duration: block.duration - splitDuration,
      };

      newLayout.splice(index, 1, b1, b2);
      return { ...prev, [targetDateStr]: newLayout };
    });
  };

  const handleMerge = (index: number) => {
    let b2IdToRemove: string | null = null;

    setDailyLayouts((prev) => {
      const layout = prev[targetDateStr] || generateDefaultBlocks();
      if (index >= layout.length - 1) return prev;

      const newLayout = [...layout];
      const b1 = newLayout[index];
      const b2 = newLayout[index + 1];
      b2IdToRemove = b2.id;

      const merged: TimeBlock = {
        id: b1.id,
        startTime: b1.startTime,
        endTime: b2.endTime,
        duration: b1.duration + b2.duration,
      };

      newLayout.splice(index, 2, merged);
      return { ...prev, [targetDateStr]: newLayout };
    });

    if (b2IdToRemove) {
      setTimetableRecords((prev) => {
        const records = prev[targetDateStr] || [];
        return {
          ...prev,
          [targetDateStr]: records.filter((g) => g.blockId !== b2IdToRemove),
        };
      });
    }
  };

  const handleResetTimetable = () => {
    setShowResetConfirm(true);
  };

  const handleSaveGoal = () => {
    if (!editingBlockId) return;
    if (!selectedBookId && !memo.trim()) return;

    const newGoal: TimeSlotGoal = {
      id: Date.now().toString(),
      blockId: editingBlockId,
      bookId: selectedBookId,
      chapterId: selectedChapterId,
      startPage: parseInt(startPage) || 0,
      endPage: parseInt(endPage) || 0,
      memo,
    };

    setTimetableRecords((prev) => {
      const records = prev[targetDateStr] || [];
      const updated = records.filter(
        (g) =>
          g.blockId !== editingBlockId &&
          (g.hour === undefined ||
            `${String(g.hour).padStart(2, "0")}:00` !== editingBlockId)
      );
      return { ...prev, [targetDateStr]: [...updated, newGoal] };
    });

    setEditingBlockId(null);
    setSelectedBookId("");
    setSelectedChapterId("");
    setStartPage("");
    setEndPage("");
    setMemo("");
  };

  const handleDeleteGoal = (blockId: string) => {
    setTimetableRecords((prev) => {
      const records = prev[targetDateStr] || [];
      return {
        ...prev,
        [targetDateStr]: records.filter(
          (g) =>
            g.blockId !== blockId &&
            (g.hour === undefined ||
              `${String(g.hour).padStart(2, "0")}:00` !== blockId)
        ),
      };
    });
  };

  const handleToggleGoalComplete = (blockId: string) => {
    setTimetableRecords((prev) => {
      const records = prev[targetDateStr] || [];
      return {
        ...prev,
        [targetDateStr]: records.map((g) => {
          if (
            g.blockId === blockId ||
            (g.hour !== undefined &&
              `${String(g.hour).padStart(2, "0")}:00` === blockId)
          ) {
            return { ...g, isCompleted: !g.isCompleted };
          }
          return g;
        }),
      };
    });
  };

  const openEditModal = (blockId: string, label: string) => {
    const existing = todayGoals.find(
      (g) =>
        g.blockId === blockId ||
        (g.hour !== undefined &&
          `${String(g.hour).padStart(2, "0")}:00` === blockId)
    );
    if (existing) {
      setSelectedBookId(existing.bookId);
      setSelectedChapterId(existing.chapterId);
      setStartPage(existing.startPage ? String(existing.startPage) : "");
      setEndPage(existing.endPage ? String(existing.endPage) : "");
      setMemo(existing.memo || "");
    } else {
      setSelectedBookId("");
      setSelectedChapterId("");
      setStartPage("");
      setEndPage("");
      setMemo("");
    }
    setEditingBlockId(blockId);
    setEditingBlockLabel(label);
  };

  return (
    <>
      <AnimatePresence>
        {showPlanAheadModal && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col pt-16 pb-4 px-4 bg-slate-50 dark:bg-slate-900 overflow-y-auto"
            onClick={() => setShowPlanAheadModal(false)}
          >
            <button
              onClick={() => setShowPlanAheadModal(false)}
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
                  {t("todayPlan.planAheadDateLabel")}
                </span>
                <input
                  type="date"
                  value={planAheadDate}
                  onChange={(e) => setPlanAheadDate(e.target.value)}
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div
                className={cn(
                  "transition-opacity relative",
                  planAheadDate === format(new Date(), "yyyy-MM-dd")
                    ? "opacity-50 pointer-events-none"
                    : "opacity-100"
                )}
              >
                {planAheadDate === format(new Date(), "yyyy-MM-dd") && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="bg-slate-900/80 text-white font-bold px-6 py-3 rounded-2xl">
                      {t("todayPlan.planAheadWarning")}
                    </div>
                  </div>
                )}
                <TodayPlan
                  dailyGoalMinutes={dailyGoalMinutes}
                  setDailyGoalMinutes={setDailyGoalMinutes}
                  weeklyPlans={weeklyPlans}
                  setWeeklyPlans={setWeeklyPlans}
                  books={books}
                  setBooks={setBooks}
                  setActiveTab={setActiveTab}
                  autoGoalDisplayMode={autoGoalDisplayMode}
                  dateStr={planAheadDate}
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
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 transition-colors">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                  {t("todayPlan.title")}
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t("todayPlan.subtitle")}
                </p>
              </div>
            </div>

            {!dateStr && (
              <button
                onClick={() => setShowPlanAheadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-sm font-bold rounded-xl border border-indigo-200 dark:border-indigo-500/30 transition-colors shadow-sm shrink-0"
              >
                <CalendarDays className="w-4 h-4" />
                {t("todayPlan.planAhead")}
              </button>
            )}
          </div>

          <div className="space-y-6">
            {todayAutoGoals.length > 0 && (
              <div className="flex flex-col gap-3">
                {autoGoalDisplayMode === "single" ? (
                  <div className="relative overflow-hidden bg-gradient-to-tr from-red-500 via-rose-500 to-orange-500 shadow-sm shadow-red-500/20 rounded-3xl p-5 sm:p-6 text-white w-full">
                    {/* Decorative Blur Blobs */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-orange-400 blur-[80px] opacity-60 rounded-full mix-blend-screen pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-600 blur-[80px] opacity-60 rounded-full mix-blend-screen pointer-events-none"></div>

                    <div className="font-bold text-red-100 uppercase tracking-widest mb-4 flex items-center justify-between opacity-90 text-[11px] sm:text-xs">
                      <div className="flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-orange-200" />{" "}
                        {t("todayPlan.dailyChallengeTitle")}
                      </div>
                      <button
                        onClick={() => setShowAllAutoGoalsModal(true)}
                        className="bg-white/10 hover:bg-white/20 transition-colors p-1.5 rounded-lg cursor-pointer shrink-0"
                        title={
                          t("allAutoGoals", "자동 목표 리스트") ||
                          "자동 목표 리스트"
                        }
                      >
                        <List className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 relative z-10 w-full">
                      {todayAutoGoals.map(({ book, autoGoal }) => {
                        const isCompleted =
                          autoGoal.completedDates?.includes(targetDateStr);
                        return (
                          <div
                            key={`${book.id}-${autoGoal.id}`}
                            className="flex flex-col bg-black/25 hover:bg-black/40 backdrop-blur-sm shadow-inner transition-colors rounded-2xl p-4 border border-white/10 relative z-10 w-full overflow-hidden cursor-pointer group"
                            onClick={() =>
                              setConfirmCompleteAg({ book, autoGoal })
                            }
                          >
                            {isCompleted && (
                              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none bg-black/20">
                                <div className="animate-stamp border-4 border-emerald-400 text-emerald-400 rounded-lg px-4 py-1 text-2xl font-black shadow-[0_0_15px_rgba(52,211,153,0.5)] bg-black/40 backdrop-blur-sm">
                                  DONE
                                </div>
                              </div>
                            )}
                            <div
                              className={cn(
                                "flex flex-col w-full transition-opacity h-full",
                                isCompleted ? "opacity-40" : ""
                              )}
                            >
                              <div className="flex justify-between items-start mb-2 w-full">
                                <span
                                  className="font-bold text-xs sm:text-sm truncate pr-2 w-full"
                                  title={book.title}
                                >
                                  {book.title}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingAg({ book, goalId: autoGoal.id });
                                  }}
                                  className="bg-white/10 hover:bg-white/20 transition-colors p-1.5 rounded-lg cursor-pointer shrink-0"
                                  title={t("common.edit") || "수정"}
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-white" />
                                </button>
                              </div>
                              <div className="flex items-baseline gap-1.5 w-full">
                                <span className="text-2xl sm:text-3xl font-black tracking-tight">
                                  {autoGoal.dailyPages}
                                </span>
                                <span className="text-[10px] sm:text-xs font-bold text-red-100 whitespace-nowrap">
                                  {autoGoal.calculationBasis === "chapter"
                                    ? t("chaptersPerDay") || "챕터 / 일"
                                    : t("todayPlan.pagesPerDay")}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-full flex justify-between items-center px-1">
                      <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5 text-[11px] sm:text-xs">
                        <Target className="w-4 h-4 text-orange-500" />{" "}
                        {t("todayPlan.dailyChallengeTitle")}
                      </div>
                      <button
                        onClick={() => setShowAllAutoGoalsModal(true)}
                        className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title={
                          t("allAutoGoals", "자동 목표 리스트") ||
                          "자동 목표 리스트"
                        }
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                    {todayAutoGoals.map(({ book, autoGoal }) => {
                      const isCompleted =
                        autoGoal.completedDates?.includes(targetDateStr);
                      return (
                        <div
                          key={`${book.id}-${autoGoal.id}`}
                          className="relative overflow-hidden bg-gradient-to-tr from-red-500 via-rose-500 to-orange-500 p-5 rounded-3xl text-white flex justify-between items-center shadow-md shadow-red-500/10 group cursor-pointer hover:shadow-lg transition-transform"
                          onClick={() =>
                            setConfirmCompleteAg({ book, autoGoal })
                          }
                        >
                          {/* Decorative Blur Blobs */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400 blur-3xl opacity-50 rounded-full mix-blend-screen pointer-events-none transition-transform group-hover:scale-110"></div>
                          <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-600 blur-3xl opacity-50 rounded-full mix-blend-screen pointer-events-none transition-transform group-hover:scale-110"></div>

                          {isCompleted && (
                            <div className="absolute inset-0 flex items-center xl:justify-center justify-end pr-10 z-20 pointer-events-none bg-black/20">
                              <div className="animate-stamp border-4 border-emerald-400 text-emerald-400 rounded-lg px-6 py-2 text-3xl font-black shadow-[0_0_20px_rgba(52,211,153,0.5)] bg-black/40 backdrop-blur-sm">
                                DONE
                              </div>
                            </div>
                          )}

                          <div
                            className={cn(
                              "flex flex-col relative z-10 transition-opacity",
                              isCompleted ? "opacity-50" : ""
                            )}
                          >
                            <span className="text-[10px] font-bold text-red-100 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-orange-200" />{" "}
                              {t("todayPlan.dailyChallengeTitle")}
                            </span>
                            <span className="font-bold text-sm truncate max-w-[200px] sm:max-w-[250px] mb-2">
                              {book.title}
                            </span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-3xl font-black tracking-tight">
                                {autoGoal.dailyPages}
                              </span>
                              <span className="text-xs font-bold text-red-100">
                                {autoGoal.calculationBasis === "chapter"
                                  ? t("chaptersPerDay") || "챕터 / 일"
                                  : t("todayPlan.pagesPerDay")}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAg({ book, goalId: autoGoal.id });
                            }}
                            className={cn(
                              "relative z-10 bg-white/20 hover:bg-white/30 transition-colors p-3.5 rounded-full cursor-pointer shrink-0 hidden sm:flex",
                              isCompleted
                                ? "opacity-50 pointer-events-none"
                                : ""
                            )}
                            title={t("common.edit") || "수정"}
                          >
                            <Edit2 className="w-6 h-6 text-white" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Daily Goal Setting */}
              <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-500" />
                  {t("todayPlan.dailyGoalLabel")}
                </label>
                <div className="flex items-center gap-2 sm:gap-4 w-full">
                  <div className="flex items-center gap-2 shrink-1 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto shadow-sm">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={
                        Math.floor(activeGoal / 60) === 0 && activeGoal === 0
                          ? ""
                          : Math.floor(activeGoal / 60)
                      }
                      onChange={(e) => {
                        const h = Number(e.target.value);
                        if (h >= 0 && h <= 24) {
                          handleUpdateGoal(h, activeGoal % 60);
                        }
                      }}
                      className="w-14 sm:w-20 bg-transparent text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:ring-0 text-center"
                      placeholder="0"
                    />
                    <span className="text-slate-500 font-bold whitespace-nowrap text-sm pr-2">
                      {t("todayPlan.hoursLabel")}
                    </span>
                  </div>
                  <span className="text-slate-400 font-bold">:</span>
                  <div className="flex items-center gap-2 shrink-1 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto shadow-sm">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={
                        activeGoal % 60 === 0 && activeGoal === 0
                          ? ""
                          : activeGoal % 60
                      }
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        if (m >= 0 && m <= 60) {
                          handleUpdateGoal(Math.floor(activeGoal / 60), m);
                        }
                      }}
                      className="w-14 sm:w-20 bg-transparent text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:ring-0 text-center"
                      placeholder="0"
                    />
                    <span className="text-slate-500 font-bold whitespace-nowrap text-sm pr-2">
                      {t("todayPlan.minutesLabel")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Life Style Pattern */}
              <div className="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {t("todayPlan.lifestyleTitle")}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="text-xs font-bold text-slate-500 block mb-1.5">
                      {t("todayPlan.wakeTimeLabel")}
                    </label>
                    <select
                      value={wakeTime}
                      onChange={(e) => handleWakeChange(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    >
                      {Array.from({ length: 48 }).map((_, i) => {
                        const h = Math.floor(i / 2);
                        const m = i % 2 === 0 ? "00" : "30";
                        const t = `${String(h).padStart(2, "0")}:${m}`;
                        return (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="text-xs font-bold text-slate-500 block mb-1.5">
                      {t("todayPlan.sleepTimeLabel")}
                    </label>
                    <select
                      value={sleepTime}
                      onChange={(e) => handleSleepChange(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    >
                      {Array.from({ length: 48 }).map((_, i) => {
                        const h = Math.floor(i / 2);
                        const m = i % 2 === 0 ? "00" : "30";
                        const t = `${String(h).padStart(2, "0")}:${m}`;
                        return (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" />{" "}
                {t("todayPlan.todayTimetableTitle")}
              </h4>
              <button
                onClick={handleResetTimetable}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />{" "}
                {t("todayPlan.resetButton")}
              </button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-200 dark:divide-slate-700/50">
              {todayLayout.map((block, idx) => {
                const goal = todayGoals.find(
                  (g) =>
                    g.blockId === block.id ||
                    (g.hour !== undefined &&
                      `${String(g.hour).padStart(2, "0")}:00` === block.id)
                );
                const bookObj = goal?.bookId
                  ? books.find((b) => b.id === goal.bookId)
                  : null;
                const chapterObj =
                  bookObj && goal?.chapterId
                    ? bookObj.chapters.find((c) => c.id === goal.chapterId)
                    : null;

                return (
                  <div
                    key={block.id}
                    className="relative flex min-h-[4.5rem] group border-b border-slate-200 dark:border-slate-700/50 last:border-b-0"
                  >
                    <div className="w-24 sm:w-28 border-r border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50 flex flex-col items-center justify-center shrink-0 py-2 relative gap-1">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300 font-mono">
                          {block.startTime}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 font-mono mt-0.5">
                          ~ {block.endTime}
                        </span>
                      </div>
                    </div>
                    <div
                      className="flex-1 flex bg-white dark:bg-slate-800 relative transition-colors hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer min-h-full"
                      onClick={() =>
                        openEditModal(
                          block.id,
                          `${block.startTime} ~ ${block.endTime}`
                        )
                      }
                    >
                      <div className="flex-1 p-3">
                        {goal ? (
                          <div className="pl-10 pr-8 h-full flex flex-col justify-center relative">
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 cursor-pointer z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleGoalComplete(block.id);
                              }}
                            >
                              <div
                                className={cn(
                                  "w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center transition-colors border shadow-sm",
                                  goal.isCompleted
                                    ? "bg-indigo-500 border-indigo-500 text-white"
                                    : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500"
                                )}
                              >
                                {goal.isCompleted && (
                                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                )}
                              </div>
                            </div>
                            <div
                              className={cn(
                                "transition-all duration-200",
                                goal.isCompleted && "opacity-50"
                              )}
                            >
                              {bookObj && chapterObj ? (
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1 mb-0.5">
                                    {goal.isAutoSynced && (
                                      <span
                                        title={t(
                                          "todayPlan.autoSyncedRecordTitle"
                                        )}
                                        className="text-xs"
                                      >
                                        ⚡
                                      </span>
                                    )}
                                    {goal.isManualAdded && (
                                      <span
                                        title={t(
                                          "todayPlan.manualAddedRecordTitle"
                                        )}
                                        className="text-xs"
                                      >
                                        📝
                                      </span>
                                    )}
                                    <span
                                      className={cn(
                                        "text-xs font-bold text-indigo-500 dark:text-indigo-400",
                                        goal.isCompleted && "line-through"
                                      )}
                                    >
                                      [{bookObj.title}]
                                    </span>
                                  </div>
                                  <span
                                    className={cn(
                                      "text-sm font-bold text-slate-800 dark:text-slate-200",
                                      goal.isCompleted && "line-through"
                                    )}
                                  >
                                    {chapterObj.title}
                                  </span>
                                  {goal.startPage !== 0 ||
                                  goal.endPage !== 0 ? (
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 font-mono">
                                      {t("todayPlan.pageRangeSummary", {
                                        start: goal.startPage,
                                        end: goal.endPage,
                                        pagesCount:
                                          goal.endPage - goal.startPage + 1,
                                      })}
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  {goal.isAutoSynced && (
                                    <span
                                      title={t(
                                        "todayPlan.autoSyncedRecordTitle"
                                      )}
                                      className="text-xs"
                                    >
                                      ⚡
                                    </span>
                                  )}
                                  {goal.isManualAdded && (
                                    <span
                                      title={t(
                                        "todayPlan.manualAddedRecordTitle"
                                      )}
                                      className="text-xs"
                                    >
                                      📝
                                    </span>
                                  )}
                                  <span
                                    className={cn(
                                      "text-sm font-medium text-slate-700 dark:text-slate-300",
                                      goal.isCompleted && "line-through"
                                    )}
                                  >
                                    {goal.memo}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveGoalMenuId(
                                    activeGoalMenuId === block.id
                                      ? null
                                      : block.id
                                  );
                                }}
                                className="p-2 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-all rounded-md"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                              <AnimatePresence>
                                {activeGoalMenuId === block.id && (
                                  <motion.div
                                    initial={{
                                      opacity: 0,
                                      scale: 0.95,
                                      y:
                                        todayLayout.length - idx <= 2
                                          ? 10
                                          : -10,
                                    }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{
                                      opacity: 0,
                                      scale: 0.95,
                                      y:
                                        todayLayout.length - idx <= 2
                                          ? 10
                                          : -10,
                                    }}
                                    transition={{ duration: 0.15 }}
                                    className={cn(
                                      "absolute right-0 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-50",
                                      todayLayout.length - idx <= 2
                                        ? "bottom-full mb-2"
                                        : "top-full mt-2"
                                    )}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveGoalMenuId(null);
                                        openEditModal(
                                          block.id,
                                          `${block.startTime} ~ ${block.endTime}`
                                        );
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                    >
                                      <Edit2 className="w-4 h-4" />{" "}
                                      {t("todayPlan.editButton")}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteGoal(block.id);
                                        setActiveGoalMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                    >
                                      <Trash2 className="w-4 h-4" />{" "}
                                      {t("todayPlan.deleteButton")}
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center text-slate-400 dark:text-slate-500 font-bold text-xs transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-400">
                            <Plus className="w-4 h-4 mr-1" />{" "}
                            {t("todayPlan.addPlan")}
                          </div>
                        )}
                      </div>

                      <div className="w-16 sm:w-20 shrink-0 flex flex-col items-center justify-center p-2 border-l border-slate-100 dark:border-slate-700/50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSplit(idx);
                          }}
                          className="w-full py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-lg transition-colors text-[10px] sm:text-xs font-bold border border-slate-200 dark:border-slate-600 shadow-sm flex items-center justify-center gap-1"
                          title={t("todayPlan.splitTitle")}
                        >
                          <Divide className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {idx < todayLayout.length - 1 && (
                      <div className="absolute left-[3rem] sm:left-[3.5rem] -bottom-[15px] -translate-x-1/2 z-10 pointer-events-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMerge(idx);
                          }}
                          className="w-[30px] h-[30px] bg-white dark:bg-slate-800 border-[1.5px] border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 group/merge"
                          title={t("todayPlan.mergeTitle")}
                        >
                          <Plus className="w-4 h-4 transition-transform group-hover/merge:scale-110" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {editingBlockId !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setEditingBlockId(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />{" "}
                {t("todayPlan.editStudyPlanTitle", {
                  timeRange: editingBlockLabel,
                })}
              </h3>
              <button
                onClick={() => setEditingBlockId(null)}
                className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  {t("todayPlan.bookSelectLabel")}
                </label>
                <select
                  value={selectedBookId}
                  onChange={(e) => {
                    setSelectedBookId(e.target.value);
                    setSelectedChapterId("");
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200"
                >
                  <option value="">
                    {t("todayPlan.bookSelectPlaceholder")}
                  </option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBookId && (
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    {t("todayPlan.chapterLabel")}
                  </label>
                  <select
                    value={selectedChapterId}
                    onChange={(e) => {
                      const chapterId = e.target.value;
                      setSelectedChapterId(chapterId);
                      if (chapterId) {
                        const chapter = books
                          .find((b) => b.id === selectedBookId)
                          ?.chapters.find((c) => c.id === chapterId);
                        if (chapter) {
                          setStartPage(String(chapter.startPage));
                          setEndPage(String(chapter.endPage));
                        }
                      } else {
                        setStartPage("");
                        setEndPage("");
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200"
                  >
                    <option value="">
                      {t("todayPlan.chapterSelectPlaceholder")}
                    </option>
                    {books
                      .find((b) => b.id === selectedBookId)
                      ?.chapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} (p.{c.startPage}~{c.endPage})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {selectedChapterId && (
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    {t("todayPlan.pageRangeLabel")}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder={t("todayPlan.pageStartPlaceholder")}
                      value={startPage}
                      onChange={(e) => setStartPage(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-center text-sm font-bold text-slate-700 dark:text-slate-200"
                    />
                    <span className="text-slate-400 font-bold">~</span>
                    <input
                      type="number"
                      placeholder={t("todayPlan.pageEndPlaceholder")}
                      value={endPage}
                      onChange={(e) => setEndPage(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-center text-sm font-bold text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>
              )}

              {!selectedBookId && (
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    {t("todayPlan.manualMemoLabel")}
                  </label>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder={t("todayPlan.manualMemoPlaceholder")}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 resize-none min-h-[80px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setEditingBlockId(null)}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSaveGoal}
                className="flex-1 px-4 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-200 dark:shadow-none"
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-100 dark:border-slate-700 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-3 text-slate-800 dark:text-slate-100">
              {t("todayPlan.resetConfirmTitle")}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
              {t("todayPlan.resetConfirmBody")}
              <br />
              <br />
              {t("todayPlan.resetConfirmQuestion")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => {
                  setDailyLayouts((prev) => {
                    const next = { ...prev };
                    delete next[targetDateStr];
                    return next;
                  });
                  setTimetableRecords((prev) => {
                    const next = { ...prev };
                    delete next[targetDateStr];
                    return next;
                  });
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2.5 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-colors"
              >
                {t("todayPlan.resetButton")}
              </button>
            </div>
          </div>
        </div>
      )}

      <BaseModal
        isOpen={confirmCompleteAg !== null}
        onClose={() => setConfirmCompleteAg(null)}
        className="max-w-sm text-center p-6"
        hideCloseButton={true}
      >
        {confirmCompleteAg && (
          <>
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-400 to-emerald-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
              <span className="text-3xl">🏆</span>
            </div>

            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              {confirmCompleteAg.autoGoal.completedDates?.includes(
                targetDateStr
              )
                ? t("home.undoGoalConfirmation", "도전 완료를 취소할까요?")
                : t(
                    "home.completeGoalConfirmation",
                    "오늘의 도전을 완료할까요?"
                  )}
            </h3>

            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 whitespace-pre-line leading-relaxed">
              <span className="font-bold text-indigo-500 block mb-1">
                『{confirmCompleteAg.book.title}』
              </span>
              {confirmCompleteAg.autoGoal.dailyPages}
              {confirmCompleteAg.autoGoal.calculationBasis === "chapter"
                ? t("chaptersPerDay") || "챕터 / 일"
                : t("todayPlan.pagesPerDay")}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCompleteAg(null)}
                className="flex-1 py-3.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() =>
                  toggleAutoGoalComplete(
                    confirmCompleteAg.book.id,
                    confirmCompleteAg.autoGoal.id
                  )
                }
                className="flex-1 py-3.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-colors shadow-lg shadow-indigo-500/30"
              >
                {t("common.confirm")}
              </button>
            </div>
          </>
        )}
      </BaseModal>

      {editingAg && (
        <AutoGoalModal
          isOpen={true}
          onClose={() => setEditingAg(null)}
          book={editingAg.book}
          goalId={editingAg.goalId}
          setBooks={setBooks}
        />
      )}

      <AllAutoGoalsModal
        isOpen={showAllAutoGoalsModal}
        onClose={() => setShowAllAutoGoalsModal(false)}
        books={books}
        setBooks={setBooks}
      />
    </>
  );
}
