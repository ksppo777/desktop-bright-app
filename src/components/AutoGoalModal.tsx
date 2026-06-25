import React, { useState, useEffect } from "react";
import { Book, AutoGoal } from "../types";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import BaseModal from "./BaseModal";

interface AutoGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  goalId: string | "NEW";
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
}

export function AutoGoalModal({ isOpen, onClose, book, goalId, setBooks }: AutoGoalModalProps) {
  const { t } = useTranslation();

  const [agStartDate, setAgStartDate] = useState("");
  const [agEndDate, setAgEndDate] = useState("");
  const [agIterations, setAgIterations] = useState("1");
  const [agTargetChapterIds, setAgTargetChapterIds] = useState<string[]>([]);
  const [agCalculationBasis, setAgCalculationBasis] = useState<"page" | "chapter">("page");

  useEffect(() => {
    if (!isOpen) return;

    if (goalId !== "NEW") {
      const existing = book.autoGoals?.find((ag) => ag.id === goalId);
      if (existing) {
        setAgStartDate(existing.startDate);
        setAgEndDate(existing.endDate);
        setAgIterations(existing.iterations ? existing.iterations.toString() : "1");
        setAgTargetChapterIds(existing.targetChapterIds || []);
        setAgCalculationBasis(existing.calculationBasis || "page");
      }
    } else {
      const today = new Date();
      setAgStartDate(today.toISOString().split("T")[0]);
      
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setAgEndDate(nextMonth.toISOString().split("T")[0]);
      
      setAgIterations("1");
      setAgCalculationBasis("page");
      if (book.chapters) {
        setAgTargetChapterIds(book.chapters.map(c => c.id));
      } else {
        setAgTargetChapterIds([]);
      }
    }
  }, [isOpen, goalId, book]);

  const handleSaveAutoGoal = () => {
    if (!agStartDate || !agEndDate || !agIterations) return;
    if (agTargetChapterIds.length === 0) {
      try {
        window.alert(t("bookManager.errors.selectAtLeastOneChapter"));
      } catch (e) {}
      return;
    }

    const start = new Date(agStartDate);
    const end = new Date(agEndDate);
    if (end < start) {
      try {
        window.alert(t("bookManager.errors.endBeforeStart"));
      } catch (e) {}
      return;
    }
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const iterations = parseInt(agIterations, 10);

    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== book.id) return b;

        let totalAmount = 0;
        if (agCalculationBasis === "chapter") {
          totalAmount = agTargetChapterIds.length;
        } else {
          if (b.chapters && b.chapters.length > 0) {
            b.chapters.forEach((c) => {
              if (agTargetChapterIds.includes(c.id)) {
                totalAmount += c.endPage - c.startPage + 1;
              }
            });
          }
        }

        const totalTargetPages = totalAmount * iterations;
        const dailyPages =
          diffDays > 0 ? Math.ceil(totalTargetPages / diffDays) : 0;

        const newGoal: AutoGoal = {
          id: goalId !== "NEW" ? goalId : Date.now().toString(),
          enabled:
            goalId === "NEW"
              ? true
              : b.autoGoals?.find((ag) => ag.id === goalId)?.enabled || false,
          startDate: agStartDate,
          endDate: agEndDate,
          iterations,
          targetChapterIds: agTargetChapterIds,
          dailyPages,
          totalTargetPages,
          calculationBasis: agCalculationBasis,
        };

        const existingGoals = b.autoGoals || [];
        const updatedGoals =
          goalId === "NEW"
            ? [
                ...existingGoals.map((ag) => ({ ...ag, enabled: false })),
                newGoal,
              ]
            : existingGoals.map((ag) =>
                ag.id === goalId ? newGoal : ag
              );

        return {
          ...b,
          autoGoals: updatedGoals,
        };
      })
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-md w-full">
      <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700/50">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
          {goalId === "NEW" ? t("bookManager.createAutoGoal") : t("bookManager.autoGoalListTitle")}
        </h3>
      </div>

          <div className="p-6 overflow-y-auto max-h-[70vh]">
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                  {t("bookManager.challengeBook")}
                </label>
                <div className="w-full px-4 py-2.5 bg-blue-50/50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-600/50 rounded-xl text-sm font-bold text-blue-900/70 dark:text-slate-400">
                  {book.title}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                    {t("bookManager.challengeStartDate")}
                  </label>
                  <input
                    type="date"
                    value={agStartDate}
                    onChange={(e) => setAgStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                    {t("bookManager.challengeEndDate")}
                  </label>
                  <input
                    type="date"
                    value={agEndDate}
                    onChange={(e) => setAgEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                  {t("bookManager.targetIterations")}
                </label>
                <input
                  type="number"
                  min="1"
                  value={agIterations}
                  onChange={(e) => setAgIterations(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                  {t("calculationBasis") || "계산 기준"}
                </label>
                <div className="flex gap-4 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-600/50">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="radio"
                      name={`agCalculationBasis_modal`}
                      value="page"
                      checked={agCalculationBasis === "page"}
                      onChange={() => setAgCalculationBasis("page")}
                      className="w-4 h-4 text-blue-600 bg-white border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 pl-1">{t("basisPage") || "도서 페이지"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="radio"
                      name={`agCalculationBasis_modal`}
                      value="chapter"
                      checked={agCalculationBasis === "chapter"}
                      onChange={() => setAgCalculationBasis("chapter")}
                      className="w-4 h-4 text-blue-600 bg-white border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 pl-1">{t("basisChapter") || "챕터 갯수"}</span>
                  </label>
                </div>
              </div>

              {book.chapters && book.chapters.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 flex justify-between items-center">
                    <span>
                      {t("bookManager.challengeChapters", {
                        count: agTargetChapterIds.length,
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAgTargetChapterIds(
                          agTargetChapterIds.length === 0
                            ? book.chapters!.map((c) => c.id)
                            : []
                        )
                      }
                      className="text-blue-500 hover:underline"
                    >
                      {agTargetChapterIds.length === 0
                        ? t("bookManager.selectAll")
                        : t("bookManager.deselectAll")}
                    </button>
                  </label>
                  <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200 dark:border-slate-600/50">
                    {book.chapters.map((ch) => {
                      const isChecked = agTargetChapterIds.includes(ch.id);
                      return (
                        <label
                          key={ch.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAgTargetChapterIds([...agTargetChapterIds, ch.id]);
                              } else {
                                setAgTargetChapterIds(
                                  agTargetChapterIds.filter((id) => id !== ch.id)
                                );
                              }
                            }}
                            className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate flex-1">
                            {ch.title}
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            {ch.endPage - ch.startPage + 1}p
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/80 flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {t("common.cancel") || "취소"}
            </button>
            <button
              onClick={handleSaveAutoGoal}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 dark:shadow-none"
            >
              {t("common.save")}
            </button>
          </div>
    </BaseModal>
  );
}
