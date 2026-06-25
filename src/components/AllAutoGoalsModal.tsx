import { useState, useEffect } from 'react';
import { Book } from '../types';
import { useTranslation } from 'react-i18next';
import { Target, Edit2, List, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { AutoGoalModal } from './AutoGoalModal';
import BaseModal from './BaseModal';

interface AllAutoGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  setBooks: (books: Book[] | ((prev: Book[]) => Book[])) => void;
}

export function AllAutoGoalsModal({ isOpen, onClose, books, setBooks }: AllAutoGoalsModalProps) {
  const { t } = useTranslation();

  const [editingAg, setEditingAg] = useState<{ bookId: string; goalId: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDeleteConfirmId(null);
    }
  }, [isOpen]);

  const booksWithGoals = books.filter(b => b.autoGoals && b.autoGoals.length > 0);

  const handleToggleAutoGoal = (bookId: string, goalId: string) => {
    setBooks((prev) =>
      prev.map((book) => {
        if (book.id !== bookId) return book;
        return {
          ...book,
          autoGoals: (book.autoGoals || []).map((ag) => {
            if (ag.id === goalId) {
              return { ...ag, enabled: !ag.enabled };
            }
            return { ...ag, enabled: false };
          }),
        };
      })
    );
  };

  const handleDeleteAutoGoal = (bookId: string, goalId: string) => {
    if (deleteConfirmId !== goalId) {
      setDeleteConfirmId(goalId);
      return;
    }
    
    setBooks((prev: Book[]) =>
      prev.map((book) => {
        if (book.id !== bookId) return book;
        return {
          ...book,
          autoGoals: book.autoGoals?.filter((ag) => ag.id !== goalId) || [],
        };
      })
    );
    setDeleteConfirmId(null);
  };

  return (
    <>
      <BaseModal
        isOpen={isOpen && !editingAg}
        onClose={() => {
          setDeleteConfirmId(null);
          onClose();
        }}
        className="max-w-4xl"
        zIndex={100}
      >
        <div 
          className="flex flex-col h-full overflow-hidden"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700/50 shrink-0">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <List className="w-5 h-5 text-blue-500" />
              {t('allAutoGoals', '자동 목표 리스트')}
            </h3>
          </div>
          
          <div className="p-5 overflow-y-auto space-y-6">
              {booksWithGoals.length > 0 ? (
                booksWithGoals.map(book => (
                  <div key={book.id} className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 pb-2 flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      {book.title}
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {book.autoGoals!.map(ag => (
                        <div
                          key={`${book.id}-${ag.id}`}
                          className="bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col gap-3"
                        >
                          <div className="flex justify-between items-center pb-3 border-b border-blue-50 dark:border-slate-700">
                            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar justify-between">
                              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                  {t("bookManager.onOffLabel", { defaultValue: "자동 목표 상태" })}
                                </span>
                                <button
                                  onClick={() => handleToggleAutoGoal(book.id, ag.id)}
                                  className={cn(
                                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors outline-none",
                                    ag.enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                                  )}
                                >
                                  <span className="sr-only">Toggle Auto Goal</span>
                                  <span
                                    className={cn(
                                      "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                      ag.enabled ? "translate-x-2" : "-translate-x-2"
                                    )}
                                  />
                                </button>
                              </div>
                              <span
                                className={cn(
                                  "text-xs font-bold px-2 py-1 rounded-md shrink-0",
                                  ag.enabled
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                                    : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                                )}
                              >
                                {ag.enabled ? t("bookManager.inProgress", { defaultValue: "진행중" }) : t("bookManager.stopped", { defaultValue: "중지됨" })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAg({ bookId: book.id, goalId: ag.id });
                                }}
                                className="text-xs font-bold text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                {t("common.edit", { defaultValue: "수정" })}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAutoGoal(book.id, ag.id);
                                }}
                                className={cn(
                                  "text-xs font-bold px-3 py-1.5 rounded-lg transition-colors",
                                  deleteConfirmId === ag.id
                                    ? "bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                                    : "text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20"
                                )}
                              >
                                {deleteConfirmId === ag.id ? t("common.confirmDelete", { defaultValue: "삭제 확인" }) : t("common.delete", { defaultValue: "삭제" })}
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mt-1">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-slate-400">
                                {t("bookManager.startDate", { defaultValue: "시작일" })}
                              </span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {ag.startDate}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-slate-400">
                                {t("bookManager.endDate", { defaultValue: "종료일" })}
                              </span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {ag.endDate}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-slate-400">
                                {t("bookManager.targetIterations", { defaultValue: "목표 회독수" })}
                              </span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {ag.iterations}
                                {t("bookManager.iterationsSuffix", { defaultValue: "회독" })}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-blue-500">
                                {t("bookManager.dailyTargetVolume", { defaultValue: "일일 목표치" })}
                              </span>
                              <span className="font-black text-blue-600 dark:text-blue-400 text-xl">
                                {ag.dailyPages}
                                <span className="text-sm font-bold ml-1">
                                  {ag.calculationBasis === "chapter" ? t("chaptersPerDay", { defaultValue: "챕터 / 일" }) : t("todayPlan.pagesPerDay", { defaultValue: "p / 일" })}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 py-10 text-sm font-medium">
                  {t('bookManager.noAutoGoals', '등록된 자동 목표가 없습니다.')}
                </div>
              )}
            </div>
        </div>
      </BaseModal>

      {editingAg && (
        <AutoGoalModal
          isOpen={true}
          onClose={() => setEditingAg(null)}
          book={books.find(b => b.id === editingAg.bookId)!}
          goalId={editingAg.goalId}
          setBooks={setBooks}
        />
      )}
    </>
  );
}
