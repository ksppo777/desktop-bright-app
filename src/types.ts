export interface Bookmark {
  id: string;
  page: number;
  label?: string; // Optional label for the bookmark
}

export interface Note {
  id: string;
  page: number;
  content: string;
  createdAt: number;
}

export interface Chapter {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  completed: boolean;
}

export interface AutoGoal {
  id: string;
  enabled: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  iterations: number; // 회독수
  targetChapterIds?: string[]; // Optional specific chapters
  dailyPages: number; // 매일 달성해야하는 분량 (Calculated)
  totalTargetPages: number; // 총 페이지 수 * 회독수
}

export interface Book {
  id: string;
  title: string;
  author: string;
  themeColor: string;
  chapters: Chapter[];
  bookmarks: Bookmark[]; // Added bookmarks
  notes: Note[];         // Added notes
  autoGoals?: AutoGoal[];
  createdAt: number;
  isTrash?: boolean;
}

export interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  durationSeconds?: number;
  bookId?: string;
  chapterId?: string;
  title?: string;
  timetableBlockId?: string;
  timetableDate?: string;
}

export interface ExamDate {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
}

export interface StudyAlarm {
  id: string;
  time: string; // HH:mm
  days: number[]; // 0-6 corresponding to Sun-Sat
  enabled: boolean;
  expertMode?: boolean;
  bookId?: string;
  chapterId?: string;
  alertMode?: 'sound' | 'vibrate' | 'both' | 'off';
}