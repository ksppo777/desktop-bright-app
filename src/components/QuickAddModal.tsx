import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Book, Chapter } from '../types';
import { registerBackHandler } from '../lib/backHandler';
import { useLockBodyScroll } from '../lib/utils';
import BaseModal from './BaseModal';

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

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (isOpen) {
      setStartPage(chapter.startPage);
      setEndPage(chapter.endPage);
      setIsFullChapter(false);
    }
  }, [isOpen, chapter]);

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
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-sm p-6" zIndex={100}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('quickAdd.title')}</h3>
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
      </BaseModal>
  );
}
