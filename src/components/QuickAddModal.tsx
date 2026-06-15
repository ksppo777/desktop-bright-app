import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Book, Chapter } from '../types';
import { registerBackHandler } from '../lib/backHandler';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (text: string) => void;
  book: Book;
  chapter: Chapter;
}

export default function QuickAddModal({ isOpen, onClose, onAdd, book, chapter }: QuickAddModalProps) {
  const { t } = useTranslation();
  const [startPage, setStartPage] = useState(chapter.startPage);
  const [endPage, setEndPage] = useState(chapter.endPage);
  const [isFullChapter, setIsFullChapter] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStartPage(chapter.startPage);
      setEndPage(chapter.endPage);
      setIsFullChapter(false);
      
      return registerBackHandler(() => {
        onClose();
        return true;
      });
    }
  }, [isOpen, chapter, onClose]);

  if (!isOpen) return null;

  const handleToggleFull = (checked: boolean) => {
    setIsFullChapter(checked);
    if (checked) {
      setStartPage(chapter.startPage);
      setEndPage(chapter.endPage);
    }
  };

  const handleAdd = () => {
    onAdd(`[${book.title}] ${chapter.title} (p.${startPage}~${endPage})`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('quickAdd.title')}</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">[{book.title}]</span><br/>
            {chapter.title} (p.{chapter.startPage}~{chapter.endPage})
          </p>

          <label className="flex items-center gap-2 cursor-pointer mt-4">
            <input 
              type="checkbox"
              checked={isFullChapter}
              onChange={(e) => handleToggleFull(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('quickAdd.fullStudy')}</span>
          </label>

          <div className="flex items-center gap-3">
            <input 
              type="number"
              value={startPage}
              onChange={e => {
                setStartPage(Number(e.target.value));
                setIsFullChapter(false);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-center"
            />
            <span className="text-slate-500 font-bold">~</span>
            <input 
              type="number"
              value={endPage}
              onChange={e => {
                setEndPage(Number(e.target.value));
                setIsFullChapter(false);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-center"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button 
            onClick={handleAdd}
            className="flex-1 px-4 py-2 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-sm"
          >
            {t('quickAdd.add')}
          </button>
        </div>
      </div>
    </div>
  );
}
