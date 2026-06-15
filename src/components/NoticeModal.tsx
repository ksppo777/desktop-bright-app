import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronRight, Bell, FileText, ArrowLeft } from "lucide-react";
import { NOTICES, Notice } from "../data/notices";
import { cn } from "../lib/utils";

interface NoticeModalProps {
  onClose: () => void;
}

export default function NoticeModal({ onClose }: NoticeModalProps) {
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const sortedNotices = [...NOTICES].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.date.localeCompare(a.date);
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden h-[80vh] max-h-[700px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            {selectedNotice ? (
              <button
                onClick={() => setSelectedNotice(null)}
                className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500">
                <Bell className="w-4 h-4" />
              </div>
            )}
            <h2 className="font-black text-slate-800 dark:text-slate-100 text-lg">
              {selectedNotice ? selectedNotice.version : "공지사항"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto w-full bg-white dark:bg-slate-800">
          <AnimatePresence mode="wait">
            {selectedNotice ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg mb-2">
                    {selectedNotice.date}
                  </span>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                    {selectedNotice.title}
                  </h1>
                </div>
                <div className="space-y-4">
                  {selectedNotice.content.map((para, i) => (
                    <div key={i} className="flex gap-3 text-slate-600 dark:text-slate-300">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                      <p className="text-sm leading-relaxed">{para}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="divide-y divide-slate-100 dark:divide-slate-700/50"
              >
                {sortedNotices.length > 0 ? (
                  sortedNotices.map((notice) => (
                    <button
                      key={notice.id}
                      onClick={() => setSelectedNotice(notice)}
                      className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex flex-col gap-1 pr-4 truncate w-full min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            {notice.date}
                          </span>
                          {notice.pinned ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-100 text-rose-500 dark:bg-rose-500/20 rounded-md truncate">
                              중요
                            </span>
                          ) : (
                            sortedNotices.filter((n) => !n.pinned)[0]?.date === notice.date && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black bg-indigo-100 text-indigo-500 dark:bg-indigo-500/20 rounded-md truncate">
                                NEW
                              </span>
                            )
                          )}
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate w-full">
                          {notice.title}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-sm font-medium text-slate-400 dark:text-slate-500 flex flex-col items-center gap-3">
                    <FileText className="w-8 h-8 opacity-20" />
                    등록된 공지사항이 없습니다.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
