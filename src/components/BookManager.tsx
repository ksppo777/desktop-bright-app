import { Book, Chapter } from "../types";
import { useState, useRef, useEffect, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Trash2,
  X,
  Edit3,
  Copy,
  MoreVertical,
  Edit2,
  LayoutGrid,
  LayoutList,
  AlignJustify,
  PanelLeft,
} from "lucide-react";
import { cn, useLocalStorage } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { registerBackHandler } from "../lib/backHandler";

interface BookManagerProps {
  books: Book[];
  setBooks: (books: Book[] | ((prev: Book[]) => Book[])) => void;
}

const THEME_COLORS = [
  {
    id: "blue",
    class: "bg-blue-400",
    border: "border-blue-400",
    text: "text-blue-500",
    bar: "bg-blue-500",
  },
  {
    id: "emerald",
    class: "bg-emerald-400",
    border: "border-emerald-400",
    text: "text-emerald-500",
    bar: "bg-emerald-500",
  },
  {
    id: "amber",
    class: "bg-amber-400",
    border: "border-amber-400",
    text: "text-amber-500",
    bar: "bg-amber-500",
  },
  {
    id: "rose",
    class: "bg-rose-400",
    border: "border-rose-400",
    text: "text-rose-500",
    bar: "bg-rose-500",
  },
  {
    id: "indigo",
    class: "bg-indigo-400",
    border: "border-indigo-400",
    text: "text-indigo-500",
    bar: "bg-indigo-500",
  },
];

export default function BookManager({ books, setBooks }: BookManagerProps) {
  const { t } = useTranslation();
  const [layout, setLayout] = useLocalStorage<
    "list" | "compact" | "grid" | "sidebar"
  >("study-helper-book-layout", "list");
  const [isSidebarOpen, setIsSidebarOpen] = useLocalStorage<boolean>(
    "study-helper-sidebar-open",
    true
  );
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(THEME_COLORS[0]);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<
    "chapters" | "bookmarks" | "notes" | "autoGoal"
  >("chapters");

  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingBookTitle, setEditingBookTitle] = useState("");

  const [isAddingChapterId, setIsAddingChapterId] = useState<string | null>(
    null
  );
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterStart, setNewChapterStart] = useState("");
  const [newChapterEnd, setNewChapterEnd] = useState("");

  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState("");
  const [editChapterStart, setEditChapterStart] = useState("");
  const [editChapterEnd, setEditChapterEnd] = useState("");
  const [chapterMenuOpenId, setChapterMenuOpenId] = useState<string | null>(
    null
  );

  const [confirmDeleteBookId, setConfirmDeleteBookId] = useState<string | null>(
    null
  );
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const [newBmPage, setNewBmPage] = useState("");
  const [newBmLabel, setNewBmLabel] = useState("");

  const [newNotePage, setNewNotePage] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(
    null
  );
  const [editBmPage, setEditBmPage] = useState("");
  const [editBmLabel, setEditBmLabel] = useState("");
  const [bookmarkMenuOpenId, setBookmarkMenuOpenId] = useState<string | null>(
    null
  );

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNotePage, setEditNotePage] = useState("");
  const [editNoteContent, setEditNoteContent] = useState("");
  const [noteMenuOpenId, setNoteMenuOpenId] = useState<string | null>(null);

  // Auto Goal state
  const [editingAg, setEditingAg] = useState<{
    bookId: string;
    goalId: string | "NEW";
  } | null>(null);
  const [agStartDate, setAgStartDate] = useState("");
  const [agEndDate, setAgEndDate] = useState("");
  const [agIterations, setAgIterations] = useState("1");
  const [agTargetChapterIds, setAgTargetChapterIds] = useState<string[]>([]);

  const prevBooksCount = useRef(books.length);
  useEffect(() => {
    // Check if new book was added just now (within last 3 seconds) and has no chapters
    const checkAndExpandNewBook = () => {
      const newBook = books[0];
      if (newBook && (!newBook.chapters || newBook.chapters.length === 0)) {
        if (Date.now() - newBook.createdAt < 3000) {
          setExpandedBookId(newBook.id);
          setDetailTab("chapters");
          setIsAddingChapterId(newBook.id);
        }
      }
    };

    if (books.length > prevBooksCount.current) {
      checkAndExpandNewBook();
    } else {
      // Also check on mount
      checkAndExpandNewBook();
    }
    prevBooksCount.current = books.length;
  }, [books.length, books]);

  const toggleExpand = (bookId: string) => {
    if (expandedBookId === bookId) {
      setExpandedBookId(null);
    } else {
      setExpandedBookId(bookId);
      setDetailTab("chapters"); // reset tab on expand
      setIsAddingChapterId(null);
    }
  };

  const handleAddBook = (e: FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim()) return;

    const newBook: Book = {
      id: Date.now().toString(),
      title: newBookTitle,
      author: newBookAuthor,
      themeColor: selectedTheme.id,
      chapters: [],
      bookmarks: [],
      notes: [],
      createdAt: Date.now(),
    };

    setBooks((prev) => [newBook, ...prev]);
    setIsAddingBook(false);
    setNewBookTitle("");
    setNewBookAuthor("");
  };

  const handleAddChapter = (bookId: string, e: FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim() || !newChapterStart || !newChapterEnd) return;

    const start = parseInt(newChapterStart, 10);
    const end = parseInt(newChapterEnd, 10);

    if (start > end) {
      try {
        window.alert(t("bookManager.errors.startPageGreater"));
      } catch (e) {}
      return;
    }

    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: newChapterTitle,
      startPage: start,
      endPage: end,
      completed: false,
    };

    setBooks((prev) =>
      prev.map((book) => {
        if (book.id === bookId) {
          return { ...book, chapters: [...(book.chapters || []), newChapter] };
        }
        return book;
      })
    );

    setIsAddingChapterId(null);
    setNewChapterTitle("");
    setNewChapterStart("");
    setNewChapterEnd("");
  };

  const handleAddBookmark = (bookId: string, e: FormEvent) => {
    e.preventDefault();
    const page = parseInt(newBmPage, 10);
    if (!page) return;

    const newBookmark = { id: Date.now().toString(), page, label: newBmLabel };
    setBooks((prev) =>
      prev.map((book) => {
        if (book.id === bookId) {
          return {
            ...book,
            bookmarks: [...(book.bookmarks || []), newBookmark].sort(
              (a, b) => a.page - b.page
            ),
          };
        }
        return book;
      })
    );
    setNewBmPage("");
    setNewBmLabel("");
  };

  const handleAddNote = (bookId: string, e: FormEvent) => {
    e.preventDefault();
    const page = parseInt(newNotePage, 10);
    if (!page || !newNoteContent.trim()) return;

    const newNote = {
      id: Date.now().toString(),
      page,
      content: newNoteContent,
      createdAt: Date.now(),
    };
    setBooks((prev) =>
      prev.map((book) => {
        if (book.id === bookId) {
          return {
            ...book,
            notes: [...(book.notes || []), newNote].sort(
              (a, b) => a.page - b.page
            ),
          };
        }
        return book;
      })
    );
    setNewNotePage("");
    setNewNoteContent("");
  };

  const toggleChapterComplete = (bookId: string, chapterId: string) => {
    setBooks((prev) =>
      prev.map((book) => {
        if (book.id === bookId) {
          return {
            ...book,
            chapters: (book.chapters || []).map((ch) =>
              ch.id === chapterId ? { ...ch, completed: !ch.completed } : ch
            ),
          };
        }
        return book;
      })
    );
  };

  const deleteBook = (bookId: string) => {
    if (confirmDeleteBookId === bookId) {
      setBooks((prev) =>
        prev.map((b) => (b.id === bookId ? { ...b, isTrash: true } : b))
      );
      setConfirmDeleteBookId(null);
    } else {
      setConfirmDeleteBookId(bookId);
    }
  };

  const copyBook = (bookToCopy: Book) => {
    const newBook: Book = {
      ...bookToCopy,
      id: Date.now().toString(),
      title: `${bookToCopy.title} ${t("bookManager.copySuffix")}`,
      createdAt: Date.now(),
      chapters:
        bookToCopy.chapters?.map((ch) => ({
          ...ch,
          id: Math.random().toString(36).substr(2, 9),
        })) || [],
      bookmarks:
        bookToCopy.bookmarks?.map((bm) => ({
          ...bm,
          id: Math.random().toString(36).substr(2, 9),
        })) || [],
      notes:
        bookToCopy.notes?.map((n) => ({
          ...n,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: Date.now(),
        })) || [],
      autoGoals:
        bookToCopy.autoGoals?.map((ag) => ({
          ...ag,
          id: Math.random().toString(36).substr(2, 9),
          enabled: false,
        })) || [],
    };
    setBooks((prev) => [newBook, ...prev]);
  };

  const saveBookTitle = (bookId: string) => {
    if (!editingBookTitle.trim()) {
      setEditingBookId(null);
      return;
    }
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, title: editingBookTitle } : b))
    );
    setEditingBookId(null);
  };

  const deleteChapter = (bookId: string, chapterId: string) => {
    setBooks((prev) =>
      prev.map((book) => {
        if (book.id === bookId) {
          return {
            ...book,
            chapters: (book.chapters || []).filter((ch) => ch.id !== chapterId),
          };
        }
        return book;
      })
    );
  };

  const handleSaveEditChapter = (
    bookId: string,
    chapterId: string,
    e: FormEvent
  ) => {
    e.preventDefault();
    if (!editChapterTitle.trim() || !editChapterStart || !editChapterEnd)
      return;
    const start = parseInt(editChapterStart, 10);
    const end = parseInt(editChapterEnd, 10);
    if (start > end) {
      try {
        window.alert(t("bookManager.errors.startPageGreater"));
      } catch (e) {}
      return;
    }

    setBooks((prev) =>
      prev.map((book) => {
        if (book.id === bookId) {
          return {
            ...book,
            chapters: (book.chapters || []).map((ch) =>
              ch.id === chapterId
                ? {
                    ...ch,
                    title: editChapterTitle,
                    startPage: start,
                    endPage: end,
                  }
                : ch
            ),
          };
        }
        return book;
      })
    );
    setEditingChapterId(null);
  };

  const handleSaveEditBookmark = (
    bookId: string,
    bmId: string,
    e: FormEvent
  ) => {
    e.preventDefault();
    const page = parseInt(editBmPage, 10);
    if (!page) return;

    setBooks((prev) =>
      prev.map((book) => {
        if (book.id === bookId) {
          return {
            ...book,
            bookmarks: (book.bookmarks || [])
              .map((b) =>
                b.id === bmId ? { ...b, page, label: editBmLabel } : b
              )
              .sort((a, b) => a.page - b.page),
          };
        }
        return book;
      })
    );
    setEditingBookmarkId(null);
  };

  const handleSaveEditNote = (bookId: string, noteId: string, e: FormEvent) => {
    e.preventDefault();
    const page = parseInt(editNotePage, 10);
    if (!page || !editNoteContent.trim()) return;

    setBooks((prev) =>
      prev.map((book) => {
        if (book.id === bookId) {
          return {
            ...book,
            notes: (book.notes || [])
              .map((n) =>
                n.id === noteId ? { ...n, page, content: editNoteContent } : n
              )
              .sort((a, b) => a.page - b.page),
          };
        }
        return book;
      })
    );
    setEditingNoteId(null);
  };

  const deleteBookmark = (bookId: string, bmId: string) => {
    setBooks((prev) =>
      prev.map((book) => {
        if (book.id === bookId) {
          return {
            ...book,
            bookmarks: (book.bookmarks || []).filter((b) => b.id !== bmId),
          };
        }
        return book;
      })
    );
  };

  const deleteNote = (bookId: string, noteId: string) => {
    setBooks((prev) =>
      prev.map((book) => {
        if (book.id === bookId) {
          return {
            ...book,
            notes: (book.notes || []).filter((n) => n.id !== noteId),
          };
        }
        return book;
      })
    );
  };

  const handleSaveAutoGoal = (bookId: string) => {
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
      prev.map((book) => {
        if (book.id !== bookId) return book;

        let totalPages = 0;
        if (book.chapters && book.chapters.length > 0) {
          book.chapters.forEach((c) => {
            if (agTargetChapterIds.includes(c.id)) {
              totalPages += c.endPage - c.startPage + 1;
            }
          });
        }

        const totalTargetPages = totalPages * iterations;
        const dailyPages =
          diffDays > 0 ? Math.ceil(totalTargetPages / diffDays) : 0;

        const newGoal = {
          id:
            editingAg?.goalId !== "NEW"
              ? editingAg!.goalId
              : Date.now().toString(),
          enabled:
            editingAg?.goalId === "NEW"
              ? true
              : book.autoGoals?.find((ag) => ag.id === editingAg!.goalId)
                  ?.enabled || false,
          startDate: agStartDate,
          endDate: agEndDate,
          iterations,
          targetChapterIds: agTargetChapterIds,
          dailyPages,
          totalTargetPages,
        };

        const existingGoals = book.autoGoals || [];
        const updatedGoals =
          editingAg?.goalId === "NEW"
            ? [
                ...existingGoals.map((ag) => ({ ...ag, enabled: false })),
                newGoal,
              ] // only one can be active at a time
            : existingGoals.map((ag) =>
                ag.id === editingAg!.goalId ? newGoal : ag
              );

        return {
          ...book,
          autoGoals: updatedGoals,
        };
      })
    );

    setEditingAg(null);
  };

  const handleDeleteAutoGoal = (bookId: string, goalId: string) => {
    let proceed = true;
    try {
      proceed = window.confirm(t("bookManager.confirm.deleteAutoGoal"));
    } catch (e) {
      proceed = true;
    }
    if (!proceed) return;
    setBooks((prev) =>
      prev.map((book) => {
        if (book.id !== bookId) return book;
        return {
          ...book,
          autoGoals: (book.autoGoals || []).filter((ag) => ag.id !== goalId),
        };
      })
    );
  };

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
            // if enabling one, disable all others
            return { ...ag, enabled: false };
          }),
        };
      })
    );
  };

  const handleEditAutoGoalBtn = (book: Book, goalId: string | "NEW") => {
    setEditingAg({ bookId: book.id, goalId });
    if (goalId !== "NEW") {
      const g = book.autoGoals?.find((ag) => ag.id === goalId);
      if (g) {
        setAgStartDate(g.startDate);
        setAgEndDate(g.endDate);
        setAgIterations(String(g.iterations));
        setAgTargetChapterIds(
          g.targetChapterIds || book.chapters?.map((c) => c.id) || []
        );
      }
    } else {
      const todayString = new Date().toLocaleDateString("en-CA");
      setAgStartDate(todayString);
      setAgEndDate("");
      setAgIterations("1");
      setAgTargetChapterIds(book.chapters?.map((c) => c.id) || []);
    }
  };

  const getBookProgress = (book: Book) => {
    if (!book.chapters || book.chapters.length === 0) return 0;
    let totalPages = 0;
    let completedPages = 0;

    book.chapters.forEach((ch) => {
      const pages = ch.endPage - ch.startPage + 1;
      totalPages += pages;
      if (ch.completed) completedPages += pages;
    });

    return totalPages === 0
      ? 0
      : Math.round((completedPages / totalPages) * 100);
  };

  const validBooks = books.filter((b) => !b.isTrash);
  const trashedBooks = books.filter((b) => b.isTrash);
  const [showTrashModal, setShowTrashModal] = useState(false);

  useEffect(() => {
    if (showTrashModal) {
      return registerBackHandler(() => {
        setShowTrashModal(false);
        return true;
      });
    }
  }, [showTrashModal]);

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-black text-blue-900 dark:text-white flex items-center gap-2">
          {t("bookManager.title")}
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setLayout("list")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                layout === "list"
                  ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
                  : "text-slate-400 hover:text-slate-600"
              )}
              title="List View"
            >
              <LayoutList className="w-5 h-5" />
            </button>
            <button
              onClick={() => setLayout("compact")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                layout === "compact"
                  ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
                  : "text-slate-400 hover:text-slate-600"
              )}
              title="Compact View"
            >
              <AlignJustify className="w-5 h-5" />
            </button>
            <button
              onClick={() => setLayout("grid")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                layout === "grid"
                  ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
                  : "text-slate-400 hover:text-slate-600"
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setLayout("sidebar")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                layout === "sidebar"
                  ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
                  : "text-slate-400 hover:text-slate-600"
              )}
              title="Sidebar View"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => setShowTrashModal(true)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1 border border-transparent"
          >
            <Trash2 className="w-5 h-5" />
            <span className="hidden sm:inline">{t("bookManager.trash")}</span>
          </button>
          {validBooks.length > 0 &&
            (confirmDeleteAll ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setBooks((prev) =>
                      prev.map((b) => ({ ...b, isTrash: true }))
                    );
                    setConfirmDeleteAll(false);
                  }}
                  className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border border-red-200 dark:border-red-800"
                >
                  {t("bookManager.confirmDeleteAllQuestion")}
                </button>
                <button
                  onClick={() => setConfirmDeleteAll(false)}
                  className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border border-slate-200 dark:border-slate-700"
                >
                  {t("common.cancel")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteAll(true)}
                className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800"
              >
                <span>{t("bookManager.deleteAll")}</span>
              </button>
            ))}
          <button
            onClick={() => setIsAddingBook(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> {t("bookManager.addBook")}
          </button>
        </div>
      </div>

      {isAddingBook && (
        <form
          onSubmit={handleAddBook}
          className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none flex flex-col gap-5 border border-blue-50 dark:border-slate-700"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-blue-900 dark:text-white">
              {t("bookModal.title")}
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingBook(false)}
              className="text-blue-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-slate-300 rounded-lg p-2 bg-blue-50 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-slate-600 transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder={t("bookModal.bookNamePlaceholder")}
              value={newBookTitle}
              onChange={(e) => setNewBookTitle(e.target.value)}
              className="px-4 py-3 bg-blue-50/50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white dark:focus:bg-slate-800 transition-colors text-blue-900 dark:text-white font-medium placeholder:text-blue-300 dark:placeholder:text-slate-500"
              required
            />
            <input
              type="text"
              placeholder={t("bookModal.authorPlaceholder")}
              value={newBookAuthor}
              onChange={(e) => setNewBookAuthor(e.target.value)}
              className="px-4 py-3 bg-blue-50/50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white dark:focus:bg-slate-800 transition-colors text-blue-900 dark:text-white font-medium placeholder:text-blue-300 dark:placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-blue-400 uppercase mb-2 block tracking-wider">
              {t("bookModal.themeColor")}
            </label>
            <div className="flex gap-3">
              {THEME_COLORS.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-transform",
                    theme.class,
                    selectedTheme.id === theme.id
                      ? "scale-110 ring-4 ring-offset-2 ring-" +
                          theme.border.replace("border-", "")
                      : "hover:scale-105"
                  )}
                >
                  {selectedTheme.id === theme.id && (
                    <Check className="w-5 h-5 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none"
            >
              {t("bookModal.submit")}
            </button>
          </div>
        </form>
      )}

      {books.length === 0 && !isAddingBook && (
        <div className="text-center py-20 bg-blue-50 dark:bg-slate-800/50 border-2 border-blue-200 dark:border-slate-700 border-dashed rounded-3xl shadow-inner">
          <BookOpen className="w-16 h-16 text-blue-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-blue-500 dark:text-slate-400 font-medium mb-4">
            {t("bookManager.emptyMessage")}
          </p>
          <button
            onClick={() => setIsAddingBook(true)}
            className="text-blue-600 dark:text-indigo-400 font-bold text-sm uppercase tracking-wider hover:underline"
          >
            {t("bookManager.goToAddBook")}
          </button>
        </div>
      )}

      <motion.div
        className={cn(
          layout === "sidebar"
            ? isSidebarOpen
              ? "grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[240px_1fr] items-stretch"
              : "grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-[64px_1fr] items-stretch"
            : layout === "grid"
            ? "columns-2 gap-3 sm:gap-4 md:gap-6"
            : "grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1024px)] justify-center"
        )}
      >
        {layout === "sidebar" && validBooks.length > 0 && (
          <div className="md:h-full relative z-10 w-full max-w-full">
            <div className="flex md:flex-col gap-3 md:sticky md:top-4 md:max-h-[calc(100vh-6rem)] overflow-x-auto md:overflow-y-auto no-scrollbar pb-4 pr-1 snap-x scroll-px-4">
              <div className="hidden md:flex justify-between items-center px-1 pb-1 border-b border-slate-200 dark:border-slate-700">
                {isSidebarOpen && (
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {t("bookManager.title")} ({validBooks.length})
                  </span>
                )}
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-auto"
                >
                  {isSidebarOpen ? (
                    <ChevronLeft className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
              </div>
              {validBooks.map((b) => {
                const p = getBookProgress(b);
                const tTheme =
                  THEME_COLORS.find((t) => t.id === b.themeColor) ||
                  THEME_COLORS[0];
                const isActive = (expandedBookId || validBooks[0].id) === b.id;
                const firstLetter = Array.from(b.title)[0] || "";

                return (
                  <div key={`sidebar-${b.id}`} className="contents">
                    {/* Compact View (Used when sidebar closed OR on mobile) */}
                    <div
                      onClick={() => setExpandedBookId(b.id)}
                      className={cn(
                        "w-12 h-12 flex-shrink-0 md:mx-auto rounded-2xl border-2 flex items-center justify-center cursor-pointer transition-all group snap-start",
                        !isSidebarOpen || "md:hidden",
                        isActive
                          ? `bg-white dark:bg-slate-800 ${tTheme.border} shadow-md`
                          : "bg-slate-50/50 dark:bg-slate-800/30 border-transparent hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800"
                      )}
                      title={b.title}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm text-slate-800 dark:text-white",
                          tTheme.class
                        )}
                      >
                        {firstLetter}
                      </div>
                    </div>

                    {/* Full View (Used when sidebar open AND on desktop) */}
                    <div
                      onClick={() => setExpandedBookId(b.id)}
                      className={cn(
                        "p-3 rounded-2xl border-2 flex-shrink-0 cursor-pointer transition-all group snap-start hidden md:flex flex-col",
                        isSidebarOpen ? "md:flex" : "md:hidden",
                        isActive
                          ? `bg-white dark:bg-slate-800 ${tTheme.border} shadow-md`
                          : "bg-slate-50/50 dark:bg-slate-800/30 border-transparent hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={cn(
                            "font-bold text-xs tracking-tight leading-tight line-clamp-2 w-full",
                            isActive
                              ? "text-slate-900 dark:text-white"
                              : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200"
                          )}
                        >
                          {b.title}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-black shrink-0 ml-1",
                            isActive ? tTheme.text : "text-slate-400"
                          )}
                        >
                          {p}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-auto">
                        <div
                          className={cn(
                            "h-full",
                            isActive
                              ? tTheme.bar
                              : "bg-slate-300 dark:bg-slate-600"
                          )}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          className={cn(
            layout === "sidebar" ? "flex flex-col gap-6" : "contents"
          )}
        >
          {(layout === "sidebar" && validBooks.length > 0
            ? validBooks.filter(
                (book) => book.id === (expandedBookId || validBooks[0].id)
              )
            : validBooks
          ).map((book) => {
            const progress = getBookProgress(book);
            const theme =
              THEME_COLORS.find((t) => t.id === book.themeColor) ||
              THEME_COLORS[0];
            const isExpanded =
              layout === "sidebar" ? true : expandedBookId === book.id;

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                key={book.id}
                className={cn(
                  "bg-white dark:bg-slate-800/80 rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-none border border-blue-50 dark:border-slate-700/50 overflow-hidden flex flex-col",
                  layout === "sidebar" ? "h-full" : "",
                  layout === "grid"
                    ? "break-inside-avoid mb-3 sm:mb-4 md:mb-6"
                    : ""
                )}
              >
                <div
                  className={cn(
                    layout === "compact" || layout === "grid"
                      ? "p-4 sm:p-5"
                      : "p-6 sm:p-8"
                  )}
                >
                  <div
                    className={cn(
                      "flex justify-between gap-4",
                      layout === "grid"
                        ? "flex-col mb-4"
                        : "flex-col sm:flex-row sm:items-center mb-6",
                      layout === "compact" && "mb-3"
                    )}
                  >
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      {editingBookId === book.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editingBookTitle}
                            onChange={(e) =>
                              setEditingBookTitle(e.target.value)
                            }
                            onKeyDown={(e) =>
                              e.key === "Enter" && saveBookTitle(book.id)
                            }
                            autoFocus
                            className={cn(
                              "bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-lg font-bold text-blue-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1 min-w-0",
                              layout === "compact"
                                ? "px-2 py-1 text-lg"
                                : "px-3 py-1.5 text-xl sm:text-2xl"
                            )}
                          />
                          <button
                            onClick={() => saveBookTitle(book.id)}
                            className="shrink-0 p-1.5 bg-blue-100 dark:bg-slate-700 hover:bg-blue-200 dark:hover:bg-slate-600 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                          >
                            <Check
                              className={cn(
                                layout === "compact" || layout === "grid"
                                  ? "w-4 h-4"
                                  : "w-5 h-5"
                              )}
                            />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <h3
                            className={cn(
                              "font-bold text-blue-900 dark:text-slate-100 truncate",
                              layout === "compact"
                                ? "text-lg"
                                : "text-xl sm:text-2xl"
                            )}
                          >
                            {book.title}
                          </h3>
                          <button
                            onClick={() => {
                              setEditingBookId(book.id);
                              setEditingBookTitle(book.title);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-all rounded-md"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {book.author && (
                        <span
                          className={cn(
                            "text-blue-400 dark:text-slate-500 font-medium",
                            layout === "compact" || layout === "grid"
                              ? "text-xs"
                              : "text-sm"
                          )}
                        >
                          {book.author}
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "flex items-center shrink-0 min-w-0",
                        layout === "compact"
                          ? "gap-4"
                          : layout === "grid"
                          ? "gap-2 sm:gap-4"
                          : "gap-6",
                        layout === "grid" && "self-end w-full justify-between"
                      )}
                    >
                      <div className="flex flex-col items-end flex-1 min-w-0">
                        {layout !== "compact" && layout !== "grid" && (
                          <span className="text-[10px] font-bold text-blue-300 dark:text-slate-500 uppercase mb-1">
                            Total Progress
                          </span>
                        )}
                        <div className="flex items-center gap-2 sm:gap-3 w-full justify-end min-w-0">
                          <div
                            className={cn(
                              "bg-blue-50 dark:bg-slate-900 rounded-full overflow-hidden shrink",
                              layout === "grid"
                                ? "h-2 w-16 sm:w-32 flex-1"
                                : layout === "compact"
                                ? "h-2 w-24 sm:w-32"
                                : "h-3 w-32 sm:w-48"
                            )}
                          >
                            <motion.div
                              className={cn("h-full rounded-full", theme.bar)}
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                          </div>
                          <span
                            className={cn(
                              "font-black",
                              theme.text,
                              layout === "compact" || layout === "grid"
                                ? "text-base"
                                : "text-lg"
                            )}
                          >
                            {progress}%
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExpand(book.id)}
                        className={cn(
                          "rounded-xl bg-blue-50 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-slate-600 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-colors",
                          layout === "compact" || layout === "grid"
                            ? "w-8 h-8"
                            : "w-10 h-10"
                        )}
                      >
                        {isExpanded ? (
                          <ChevronUp
                            className={cn(
                              layout === "compact" ? "w-4 h-4" : "w-5 h-5"
                            )}
                          />
                        ) : (
                          <ChevronDown
                            className={cn(
                              layout === "compact" ? "w-4 h-4" : "w-5 h-5"
                            )}
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={cn(
                          "overflow-hidden border-t border-blue-50 dark:border-slate-700/50",
                          layout === "compact" ? "pt-4" : "pt-6"
                        )}
                      >
                        <div className="flex gap-2 mb-6 border-b border-blue-100 dark:border-slate-700 pb-2 overflow-x-auto touch-pan-x scrollbar-hide no-swipe">
                          {["chapters", "bookmarks", "notes", "autoGoal"].map(
                            (tab) => (
                              <button
                                key={tab}
                                onClick={() => setDetailTab(tab as any)}
                                className={cn(
                                  "px-4 py-2 rounded-t-xl font-bold text-sm transition-all -mb-2 border-b-2 whitespace-nowrap",
                                  detailTab === tab
                                    ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-slate-800"
                                    : "text-blue-300 dark:text-slate-500 border-transparent hover:text-blue-500 dark:hover:text-slate-300"
                                )}
                              >
                                {tab === "chapters" &&
                                  t("bookManager.tabs.chapters")}
                                {tab === "bookmarks" &&
                                  t("bookManager.tabs.bookmarks")}
                                {tab === "notes" && t("bookManager.tabs.notes")}
                                {tab === "autoGoal" &&
                                  t("bookManager.tabs.autoGoal")}
                              </button>
                            )
                          )}
                        </div>

                        {detailTab === "chapters" && (
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-bold text-blue-900 dark:text-slate-200 text-sm">
                                {t("bookManager.chaptersProgress")}
                              </h4>
                              <button
                                onClick={() => setIsAddingChapterId(book.id)}
                                className="text-xs font-bold text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 uppercase tracking-wider bg-blue-50 dark:bg-slate-700 px-3 py-1.5 rounded-lg"
                              >
                                <Plus className="w-3.5 h-3.5" />{" "}
                                {t("chapterModal.add")}
                              </button>
                            </div>

                            {isAddingChapterId === book.id && (
                              <form
                                onSubmit={(e) => handleAddChapter(book.id, e)}
                                className="bg-blue-50/50 dark:bg-slate-800/80 p-5 rounded-2xl mb-4 flex flex-col sm:flex-row gap-4 items-end border border-blue-100 dark:border-slate-700/50"
                              >
                                <div className="flex-1 w-full relative">
                                  <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                                    {t("chapterModal.chapterName")}
                                  </label>
                                  <input
                                    type="text"
                                    value={newChapterTitle}
                                    onChange={(e) =>
                                      setNewChapterTitle(e.target.value)
                                    }
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-medium text-blue-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder:text-blue-300 dark:placeholder:text-slate-500"
                                    required
                                  />
                                </div>
                                <div className="flex gap-4 w-full sm:w-auto">
                                  <div className="w-1/2 sm:w-24">
                                    <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                                      {t("chapterModal.pageStartPlaceholder")}
                                    </label>
                                    <input
                                      type="number"
                                      value={newChapterStart}
                                      onChange={(e) =>
                                        setNewChapterStart(e.target.value)
                                      }
                                      min="1"
                                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-bold text-blue-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                                      required
                                    />
                                  </div>
                                  <div className="w-1/2 sm:w-24">
                                    <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                                      {t("chapterModal.pageEndPlaceholder")}
                                    </label>
                                    <input
                                      type="number"
                                      value={newChapterEnd}
                                      onChange={(e) =>
                                        setNewChapterEnd(e.target.value)
                                      }
                                      min="1"
                                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-bold text-blue-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                                      required
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                                  <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-colors"
                                  >
                                    {t("chapterModal.add")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsAddingChapterId(null)}
                                    className="text-blue-400 px-3 py-2.5 text-sm font-bold hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                                  >
                                    {t("common.cancel")}
                                  </button>
                                </div>
                              </form>
                            )}

                            {!book.chapters || book.chapters.length === 0 ? (
                              <div className="text-center py-8 text-sm font-medium text-blue-300">
                                {t("bookManager.addChaptersPrompt")}
                              </div>
                            ) : (
                              <ul
                                className={cn(
                                  "space-y-3",
                                  (layout === "compact" ||
                                    layout === "sidebar" ||
                                    layout === "grid") &&
                                    "space-y-2"
                                )}
                              >
                                {book.chapters.map((chapter) => (
                                  <li
                                    key={chapter.id}
                                    className={cn(
                                      "group relative flex items-center justify-between rounded-2xl transition-colors border",
                                      layout === "compact" ||
                                        layout === "sidebar" ||
                                        layout === "grid"
                                        ? "p-3"
                                        : "p-4",
                                      chapter.completed
                                        ? "bg-blue-50/50 dark:bg-slate-700/50 border-blue-100 dark:border-slate-600"
                                        : "bg-white dark:bg-slate-700 border-blue-100 dark:border-slate-600 hover:border-blue-300 dark:hover:border-slate-500 hover:shadow-md hover:shadow-blue-900/5"
                                    )}
                                  >
                                    {editingChapterId === chapter.id ? (
                                      <form
                                        onSubmit={(e) =>
                                          handleSaveEditChapter(
                                            book.id,
                                            chapter.id,
                                            e
                                          )
                                        }
                                        className="w-full flex flex-col sm:flex-row gap-4 items-end"
                                      >
                                        <div className="flex-1 w-full relative">
                                          <input
                                            type="text"
                                            value={editChapterTitle}
                                            onChange={(e) =>
                                              setEditChapterTitle(
                                                e.target.value
                                              )
                                            }
                                            className={cn(
                                              "w-full bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-medium text-blue-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 focus:outline-none",
                                              layout === "compact" ||
                                                layout === "grid"
                                                ? "px-3 py-1.5"
                                                : "px-4 py-2"
                                            )}
                                            required
                                          />
                                        </div>
                                        <div className="flex gap-4 w-full sm:w-auto">
                                          <div className="w-1/2 sm:w-20">
                                            <input
                                              type="number"
                                              value={editChapterStart}
                                              onChange={(e) =>
                                                setEditChapterStart(
                                                  e.target.value
                                                )
                                              }
                                              min="1"
                                              className={cn(
                                                "w-full bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-bold text-blue-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 focus:outline-none",
                                                layout === "compact" ||
                                                  layout === "grid"
                                                  ? "px-3 py-1.5"
                                                  : "px-4 py-2"
                                              )}
                                              required
                                            />
                                          </div>
                                          <div className="w-1/2 sm:w-20">
                                            <input
                                              type="number"
                                              value={editChapterEnd}
                                              onChange={(e) =>
                                                setEditChapterEnd(
                                                  e.target.value
                                                )
                                              }
                                              min="1"
                                              className={cn(
                                                "w-full bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-bold text-blue-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 focus:outline-none",
                                                layout === "compact" ||
                                                  layout === "grid"
                                                  ? "px-3 py-1.5"
                                                  : "px-4 py-2"
                                              )}
                                              required
                                            />
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                                          <button
                                            type="submit"
                                            className={cn(
                                              "bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors",
                                              layout === "compact" ||
                                                layout === "grid"
                                                ? "px-3 py-1.5"
                                                : "px-4 py-2"
                                            )}
                                          >
                                            {t("common.save")}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingChapterId(null)
                                            }
                                            className={cn(
                                              "text-blue-400 text-sm font-bold hover:text-blue-600 transition-colors",
                                              layout === "compact" ||
                                                layout === "grid"
                                                ? "px-2 py-1.5"
                                                : "px-3 py-2"
                                            )}
                                          >
                                            {t("common.cancel")}
                                          </button>
                                        </div>
                                      </form>
                                    ) : (
                                      <>
                                        <div
                                          className="flex items-center gap-4 flex-1 cursor-pointer pr-8"
                                          onClick={() =>
                                            toggleChapterComplete(
                                              book.id,
                                              chapter.id
                                            )
                                          }
                                        >
                                          <button
                                            className={cn(
                                              "rounded-full border-2 flex items-center justify-center transition-colors shadow-sm shrink-0",
                                              layout === "compact" ||
                                                layout === "grid"
                                                ? "w-5 h-5"
                                                : "w-6 h-6",
                                              chapter.completed
                                                ? theme.class +
                                                    " border-transparent"
                                                : "border-blue-200 dark:border-slate-500 bg-white dark:bg-slate-800"
                                            )}
                                          >
                                            {chapter.completed && (
                                              <Check
                                                className={cn(
                                                  "text-white font-bold",
                                                  layout === "compact" ||
                                                    layout === "grid"
                                                    ? "w-3 h-3"
                                                    : "w-4 h-4"
                                                )}
                                              />
                                            )}
                                          </button>
                                          <div className="flex flex-col">
                                            <span
                                              className={cn(
                                                "font-bold transition-colors mb-1",
                                                layout === "compact" ||
                                                  layout === "grid"
                                                  ? "text-sm"
                                                  : "text-sm sm:text-base",
                                                chapter.completed
                                                  ? "text-blue-300 dark:text-slate-500 line-through"
                                                  : "text-blue-900 dark:text-slate-200"
                                              )}
                                            >
                                              {chapter.title}
                                            </span>
                                            <span
                                              className={cn(
                                                "font-bold uppercase",
                                                layout === "compact" ||
                                                  layout === "grid"
                                                  ? "text-[9px]"
                                                  : "text-[10px]",
                                                chapter.completed
                                                  ? "text-blue-200 dark:text-slate-600"
                                                  : "text-blue-400 dark:text-slate-400"
                                              )}
                                            >
                                              P. {chapter.startPage} /{" "}
                                              {chapter.endPage} (
                                              {chapter.endPage -
                                                chapter.startPage +
                                                1}
                                              p)
                                            </span>
                                          </div>
                                        </div>
                                        <div className="relative shrink-0">
                                          <button
                                            onClick={() =>
                                              setChapterMenuOpenId(
                                                chapterMenuOpenId === chapter.id
                                                  ? null
                                                  : chapter.id
                                              )
                                            }
                                            className="p-2 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-all rounded-md"
                                          >
                                            <MoreVertical className="w-5 h-5" />
                                          </button>
                                          <AnimatePresence>
                                            {chapterMenuOpenId ===
                                              chapter.id && (
                                              <motion.div
                                                initial={{
                                                  opacity: 0,
                                                  scale: 0.95,
                                                  y: -10,
                                                }}
                                                animate={{
                                                  opacity: 1,
                                                  scale: 1,
                                                  y: 0,
                                                }}
                                                exit={{
                                                  opacity: 0,
                                                  scale: 0.95,
                                                  y: -10,
                                                }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute right-0 top-10 mt-1 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-10"
                                              >
                                                <button
                                                  onClick={() => {
                                                    setEditingChapterId(
                                                      chapter.id
                                                    );
                                                    setEditChapterTitle(
                                                      chapter.title
                                                    );
                                                    setEditChapterStart(
                                                      chapter.startPage.toString()
                                                    );
                                                    setEditChapterEnd(
                                                      chapter.endPage.toString()
                                                    );
                                                    setChapterMenuOpenId(null);
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                                >
                                                  <Edit2 className="w-4 h-4" />{" "}
                                                  {t("common.edit")}
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    deleteChapter(
                                                      book.id,
                                                      chapter.id
                                                    );
                                                    setChapterMenuOpenId(null);
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                                >
                                                  <Trash2 className="w-4 h-4" />{" "}
                                                  {t("common.delete")}
                                                </button>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      </>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {detailTab === "bookmarks" && (
                          <div>
                            <form
                              onSubmit={(e) => handleAddBookmark(book.id, e)}
                              className="flex flex-col sm:flex-row gap-4 items-end mb-4 bg-blue-50/50 dark:bg-slate-800/80 p-5 rounded-2xl border border-blue-100 dark:border-slate-700/50"
                            >
                              <div className="w-full sm:w-24 relative">
                                <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                                  Page
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={newBmPage}
                                  onChange={(e) => setNewBmPage(e.target.value)}
                                  required
                                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-bold text-blue-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                                />
                              </div>
                              <div className="flex-1 w-full relative">
                                <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                                  Label (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={newBmLabel}
                                  onChange={(e) =>
                                    setNewBmLabel(e.target.value)
                                  }
                                  placeholder={t("bookManager.bookmarkExample")}
                                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-medium text-blue-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder:text-blue-300 dark:placeholder:text-slate-500"
                                />
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                                <button
                                  type="submit"
                                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-colors"
                                >
                                  {t("common.add")}
                                </button>
                              </div>
                            </form>

                            {!book.bookmarks || book.bookmarks.length === 0 ? (
                              <div className="text-center py-8 text-sm font-medium text-blue-300">
                                {t("bookManager.noBookmarks")}
                              </div>
                            ) : (
                              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {book.bookmarks.map((bm) => (
                                  <li
                                    key={bm.id}
                                    className={cn(
                                      "group relative bg-white dark:bg-slate-700 border border-blue-100 dark:border-slate-600 rounded-xl p-3 flex justify-between items-center shadow-sm hover:border-blue-300 dark:hover:border-slate-500 hover:shadow-md transition-all",
                                      editingBookmarkId === bm.id
                                        ? "col-span-full sm:col-span-full"
                                        : ""
                                    )}
                                  >
                                    {editingBookmarkId === bm.id ? (
                                      <form
                                        onSubmit={(e) =>
                                          handleSaveEditBookmark(
                                            book.id,
                                            bm.id,
                                            e
                                          )
                                        }
                                        className="w-full flex flex-col sm:flex-row gap-4 items-end"
                                      >
                                        <div className="w-full sm:w-24 relative">
                                          <input
                                            type="number"
                                            value={editBmPage}
                                            onChange={(e) =>
                                              setEditBmPage(e.target.value)
                                            }
                                            min="1"
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-bold text-blue-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                                            required
                                          />
                                        </div>
                                        <div className="flex-1 w-full relative">
                                          <input
                                            type="text"
                                            value={editBmLabel}
                                            onChange={(e) =>
                                              setEditBmLabel(e.target.value)
                                            }
                                            placeholder={t(
                                              "bookManager.bookmarkExample"
                                            )}
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-medium text-blue-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                                          />
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                                          <button
                                            type="submit"
                                            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                                          >
                                            {t("common.save")}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingBookmarkId(null)
                                            }
                                            className="text-blue-400 px-3 py-2 text-sm font-bold hover:text-blue-600 transition-colors"
                                          >
                                            {t("common.cancel")}
                                          </button>
                                        </div>
                                      </form>
                                    ) : (
                                      <>
                                        <div className="flex flex-col pr-8">
                                          <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                                            P. {bm.page}
                                          </span>
                                          {bm.label && (
                                            <span className="text-xs font-medium text-blue-900 dark:text-slate-300 truncate">
                                              {bm.label}
                                            </span>
                                          )}
                                        </div>
                                        <div className="relative shrink-0">
                                          <button
                                            onClick={() =>
                                              setBookmarkMenuOpenId(
                                                bookmarkMenuOpenId === bm.id
                                                  ? null
                                                  : bm.id
                                              )
                                            }
                                            className="p-2 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-all rounded-md"
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </button>
                                          <AnimatePresence>
                                            {bookmarkMenuOpenId === bm.id && (
                                              <motion.div
                                                initial={{
                                                  opacity: 0,
                                                  scale: 0.95,
                                                  y: -10,
                                                }}
                                                animate={{
                                                  opacity: 1,
                                                  scale: 1,
                                                  y: 0,
                                                }}
                                                exit={{
                                                  opacity: 0,
                                                  scale: 0.95,
                                                  y: -10,
                                                }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute right-0 top-10 mt-1 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-10"
                                              >
                                                <button
                                                  onClick={() => {
                                                    setEditingBookmarkId(bm.id);
                                                    setEditBmPage(
                                                      bm.page.toString()
                                                    );
                                                    setEditBmLabel(
                                                      bm.label || ""
                                                    );
                                                    setBookmarkMenuOpenId(null);
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                                >
                                                  <Edit2 className="w-4 h-4" />{" "}
                                                  {t("common.edit")}
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    deleteBookmark(
                                                      book.id,
                                                      bm.id
                                                    );
                                                    setBookmarkMenuOpenId(null);
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                                >
                                                  <Trash2 className="w-4 h-4" />{" "}
                                                  {t("common.delete")}
                                                </button>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      </>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {detailTab === "notes" && (
                          <div>
                            <form
                              onSubmit={(e) => handleAddNote(book.id, e)}
                              className="flex flex-col sm:flex-row gap-4 items-end mb-4 bg-blue-50/50 dark:bg-slate-800/80 p-5 rounded-2xl border border-blue-100 dark:border-slate-700/50"
                            >
                              <div className="w-full sm:w-24 relative">
                                <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                                  Page
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={newNotePage}
                                  onChange={(e) =>
                                    setNewNotePage(e.target.value)
                                  }
                                  required
                                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-bold text-blue-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                                />
                              </div>
                              <div className="flex-1 w-full relative">
                                <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                                  Note
                                </label>
                                <input
                                  type="text"
                                  value={newNoteContent}
                                  onChange={(e) =>
                                    setNewNoteContent(e.target.value)
                                  }
                                  required
                                  placeholder={t("bookManager.notePlaceholder")}
                                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-medium text-blue-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder:text-blue-300 dark:placeholder:text-slate-500"
                                />
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                                <button
                                  type="submit"
                                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-colors"
                                >
                                  Save
                                </button>
                              </div>
                            </form>

                            {!book.notes || book.notes.length === 0 ? (
                              <div className="text-center py-8 text-sm font-medium text-blue-300">
                                {t("bookManager.noNotes")}
                              </div>
                            ) : (
                              <ul className="space-y-3">
                                {book.notes.map((note) => (
                                  <li
                                    key={note.id}
                                    className="group relative bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/30 dark:bg-yellow-900/10 rounded-xl p-4 flex flex-col shadow-sm hover:shadow-md transition-all"
                                  >
                                    {editingNoteId === note.id ? (
                                      <form
                                        onSubmit={(e) =>
                                          handleSaveEditNote(
                                            book.id,
                                            note.id,
                                            e
                                          )
                                        }
                                        className="w-full flex flex-col sm:flex-row gap-4 items-end"
                                      >
                                        <div className="w-full sm:w-24 relative">
                                          <input
                                            type="number"
                                            value={editNotePage}
                                            onChange={(e) =>
                                              setEditNotePage(e.target.value)
                                            }
                                            min="1"
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-yellow-200 dark:border-yellow-900/50 rounded-xl text-sm font-bold text-yellow-700 dark:text-yellow-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                            required
                                          />
                                        </div>
                                        <div className="flex-1 w-full relative">
                                          <input
                                            type="text"
                                            value={editNoteContent}
                                            onChange={(e) =>
                                              setEditNoteContent(e.target.value)
                                            }
                                            placeholder={t(
                                              "bookManager.notePlaceholder"
                                            )}
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-yellow-200 dark:border-yellow-900/50 rounded-xl text-sm font-medium text-blue-900 dark:text-slate-100 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                            required
                                          />
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                                          <button
                                            type="submit"
                                            className="bg-yellow-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-yellow-700 transition-colors"
                                          >
                                            {t("common.save")}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingNoteId(null)
                                            }
                                            className="text-yellow-600 dark:text-yellow-500 px-3 py-2 text-sm font-bold hover:text-yellow-700 transition-colors"
                                          >
                                            {t("common.cancel")}
                                          </button>
                                        </div>
                                      </form>
                                    ) : (
                                      <>
                                        <div className="flex justify-between items-start mb-2 group-hover:pr-8 transition-all">
                                          <span className="font-bold text-yellow-700 dark:text-yellow-500 text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 rounded-md">
                                            Page {note.page}
                                          </span>
                                        </div>
                                        <p className="text-sm font-medium text-blue-900 dark:text-slate-200 whitespace-pre-wrap">
                                          {note.content}
                                        </p>
                                        <span className="text-[10px] font-bold text-blue-300 dark:text-slate-500 mt-2 text-right">
                                          {new Date(
                                            note.createdAt
                                          ).toLocaleDateString()}
                                        </span>
                                        <div className="absolute top-2 right-2">
                                          <button
                                            onClick={() =>
                                              setNoteMenuOpenId(
                                                noteMenuOpenId === note.id
                                                  ? null
                                                  : note.id
                                              )
                                            }
                                            className="p-2 text-yellow-600 dark:text-yellow-700 hover:text-yellow-800 dark:hover:text-yellow-500 transition-all rounded-md"
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </button>
                                          <AnimatePresence>
                                            {noteMenuOpenId === note.id && (
                                              <motion.div
                                                initial={{
                                                  opacity: 0,
                                                  scale: 0.95,
                                                  y: -10,
                                                }}
                                                animate={{
                                                  opacity: 1,
                                                  scale: 1,
                                                  y: 0,
                                                }}
                                                exit={{
                                                  opacity: 0,
                                                  scale: 0.95,
                                                  y: -10,
                                                }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute right-0 top-10 mt-1 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-10"
                                              >
                                                <button
                                                  onClick={() => {
                                                    setEditingNoteId(note.id);
                                                    setEditNotePage(
                                                      note.page.toString()
                                                    );
                                                    setEditNoteContent(
                                                      note.content
                                                    );
                                                    setNoteMenuOpenId(null);
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                                >
                                                  <Edit2 className="w-4 h-4" />{" "}
                                                  {t("common.edit")}
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    deleteNote(
                                                      book.id,
                                                      note.id
                                                    );
                                                    setNoteMenuOpenId(null);
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                                >
                                                  <Trash2 className="w-4 h-4" />{" "}
                                                  {t("common.delete")}
                                                </button>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      </>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {detailTab === "autoGoal" && (
                          <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-bold text-blue-900 dark:text-slate-200 text-sm">
                                {t("bookManager.autoGoalListTitle")}
                              </h4>
                              <button
                                onClick={() =>
                                  handleEditAutoGoalBtn(book, "NEW")
                                }
                                className="text-xs font-bold text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                {t("bookManager.createAutoGoal")}
                              </button>
                            </div>

                            {editingAg?.bookId === book.id && (
                              <div className="bg-blue-50/50 dark:bg-slate-800/50 p-5 rounded-2xl mb-4 border border-blue-100 dark:border-slate-700 flex flex-col gap-4">
                                <div>
                                  <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                                    {t("bookManager.challengeBook")}
                                  </label>
                                  <div className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-900/50 border border-blue-200/50 dark:border-slate-600/50 rounded-xl text-sm font-bold text-blue-900/70 dark:text-slate-400">
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
                                      onChange={(e) =>
                                        setAgStartDate(e.target.value)
                                      }
                                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-bold text-blue-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-blue-400 uppercase mb-1.5 block">
                                      {t("bookManager.challengeEndDate")}
                                    </label>
                                    <input
                                      type="date"
                                      value={agEndDate}
                                      onChange={(e) =>
                                        setAgEndDate(e.target.value)
                                      }
                                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-bold text-blue-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                                    onChange={(e) =>
                                      setAgIterations(e.target.value)
                                    }
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-xl text-sm font-bold text-blue-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  />
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
                                    <div className="max-h-40 overflow-y-auto space-y-1 bg-white/50 dark:bg-slate-900/50 p-2 rounded-xl border border-blue-200/50 dark:border-slate-600/50">
                                      {book.chapters.map((ch) => {
                                        const isChecked =
                                          agTargetChapterIds.includes(ch.id);
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
                                                  setAgTargetChapterIds([
                                                    ...agTargetChapterIds,
                                                    ch.id,
                                                  ]);
                                                } else {
                                                  setAgTargetChapterIds(
                                                    agTargetChapterIds.filter(
                                                      (id) => id !== ch.id
                                                    )
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
                                <div className="flex gap-2 justify-end mt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveAutoGoal(book.id)}
                                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 dark:shadow-none"
                                  >
                                    {t("common.save")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingAg(null)}
                                    className="text-blue-500 font-bold px-3 py-2.5 text-sm hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                  >
                                    {t("common.cancel")}
                                  </button>
                                </div>
                              </div>
                            )}

                            {book.autoGoals && book.autoGoals.length > 0 ? (
                              <div className="flex flex-col gap-3">
                                {book.autoGoals.map((ag) =>
                                  editingAg?.bookId !== book.id ||
                                  editingAg?.goalId !== ag.id ? (
                                    <div
                                      key={ag.id}
                                      className="bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col gap-3"
                                    >
                                      <div className="flex justify-between items-center pb-3 border-b border-blue-50 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                              {t("bookManager.onOffLabel")}
                                            </span>
                                            <button
                                              onClick={() =>
                                                handleToggleAutoGoal(
                                                  book.id,
                                                  ag.id
                                                )
                                              }
                                              className={cn(
                                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors outline-none",
                                                ag.enabled
                                                  ? "bg-emerald-500"
                                                  : "bg-slate-300 dark:bg-slate-600"
                                              )}
                                            >
                                              <span className="sr-only">
                                                Toggle Auto Goal
                                              </span>
                                              <span
                                                className={cn(
                                                  "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                  ag.enabled
                                                    ? "translate-x-2"
                                                    : "-translate-x-2"
                                                )}
                                              />
                                            </button>
                                          </div>
                                          <span
                                            className={cn(
                                              "text-xs font-bold px-2 py-1 rounded-md",
                                              ag.enabled
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                                                : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                                            )}
                                          >
                                            {ag.enabled
                                              ? t("bookManager.inProgress")
                                              : t("bookManager.stopped")}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() =>
                                              handleEditAutoGoalBtn(book, ag.id)
                                            }
                                            className="text-xs font-bold text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                                          >
                                            {t("common.edit")}
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleDeleteAutoGoal(
                                                book.id,
                                                ag.id
                                              )
                                            }
                                            className="text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
                                          >
                                            {t("common.delete")}
                                          </button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mt-1">
                                        <div className="flex flex-col gap-1">
                                          <span className="text-xs font-bold text-slate-400">
                                            {t("bookManager.startDate")}
                                          </span>
                                          <span className="font-bold text-slate-700 dark:text-slate-200">
                                            {ag.startDate}
                                          </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-xs font-bold text-slate-400">
                                            {t("bookManager.endDate")}
                                          </span>
                                          <span className="font-bold text-slate-700 dark:text-slate-200">
                                            {ag.endDate}
                                          </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-xs font-bold text-slate-400">
                                            {t("bookManager.targetIterations")}
                                          </span>
                                          <span className="font-bold text-slate-700 dark:text-slate-200">
                                            {ag.iterations}
                                            {t("bookManager.iterationsSuffix")}
                                          </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-xs font-bold text-blue-500">
                                            {t("bookManager.dailyTargetVolume")}
                                          </span>
                                          <span className="font-black text-blue-600 dark:text-blue-400 text-xl">
                                            {ag.dailyPages}p
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null
                                )}
                              </div>
                            ) : (
                              (!editingAg || editingAg.bookId !== book.id) && (
                                <div className="text-center py-8 text-sm font-medium text-blue-300 dark:text-slate-500">
                                  {t("bookManager.noAutoGoals")}
                                </div>
                              )
                            )}
                          </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-blue-50 dark:border-slate-700/50 flex justify-end gap-2">
                          {confirmDeleteBookId === book.id && (
                            <button
                              onClick={() => setConfirmDeleteBookId(null)}
                              className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 dark:border-slate-600 uppercase tracking-wider"
                            >
                              {t("common.cancel")}
                            </button>
                          )}
                          <button
                            onClick={() => copyBook(book)}
                            className="text-[10px] font-bold text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/30 border border-transparent px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 uppercase tracking-wider mr-2"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </button>
                          <button
                            onClick={() => deleteBook(book.id)}
                            className="text-[10px] font-bold text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/30 border border-transparent px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 uppercase tracking-wider"
                          >
                            {confirmDeleteBookId === book.id ? (
                              t("bookManager.confirmDeleteBook")
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5" />{" "}
                                {t("bookManager.deleteBook")}
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {showTrashModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Trash2 className="w-6 h-6 text-slate-400" />
                {t("bookManager.trash")}
              </h3>
              <button
                onClick={() => setShowTrashModal(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] bg-slate-50 dark:bg-slate-900">
              {trashedBooks.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold">
                  {t("bookManager.trashEmpty")}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => {
                        let proceed = true;
                        try {
                          proceed = window.confirm(
                            t("bookManager.confirm.emptyTrash")
                          );
                        } catch (e) {
                          proceed = true;
                        }
                        if (proceed) {
                          setBooks((prev) => prev.filter((b) => !b.isTrash));
                        }
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline"
                    >
                      {t("bookManager.emptyTrash")}
                    </button>
                  </div>
                  {trashedBooks.map((book) => (
                    <div
                      key={book.id}
                      className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl flex justify-between items-center shadow-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-1">
                          {book.title}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          {t("bookManager.totalPages", {
                            count:
                              book.chapters?.reduce(
                                (acc, ch) =>
                                  acc + ch.endPage - ch.startPage + 1,
                                0
                              ) || 0,
                          })}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setBooks((prev) =>
                              prev.map((b) =>
                                b.id === book.id ? { ...b, isTrash: false } : b
                              )
                            )
                          }
                          className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                        >
                          {t("bookManager.restore")}
                        </button>
                        <button
                          onClick={() => {
                            let proceed = true;
                            try {
                              proceed = window.confirm(
                                t("bookManager.confirm.permanentDelete")
                              );
                            } catch (e) {
                              proceed = true;
                            }
                            if (proceed) {
                              setBooks((prev) =>
                                prev.filter((b) => b.id !== book.id)
                              );
                            }
                          }}
                          className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                        >
                          {t("bookManager.permanentDelete")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end bg-white dark:bg-slate-800">
              <button
                onClick={() => setShowTrashModal(false)}
                className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-6 py-2.5 rounded-xl transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                {t("pomodoro.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
