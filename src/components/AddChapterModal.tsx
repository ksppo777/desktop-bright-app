import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, List } from 'lucide-react';
import { Book } from '../types';

interface AddChapterModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
  onAdd: (bookId: string, title: string, startPage: number, endPage: number) => void;
}

export default function AddChapterModal({ isOpen, book, onClose, onAdd }: AddChapterModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');

  if (!isOpen || !book) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startPage || !endPage) return;
    onAdd(book.id, title, Number(startPage), Number(endPage));
    setTitle('');
    setStartPage('');
    setEndPage('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
             <List className="w-5 h-5 text-indigo-500" /> {t('chapterModal.title')}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-300 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-lg">
          {book.title}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">{t('chapterModal.chapterName')}</label>
            <input 
              type="text" 
              placeholder={t('chapterModal.chapterNamePlaceholder')}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">{t('chapterModal.pageRange')}</label>
            <div className="flex items-center gap-3">
              <input 
                type="number" 
                placeholder={t('chapterModal.pageStartPlaceholder')}
                value={startPage}
                onChange={e => setStartPage(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
              />
              <span className="text-slate-400 font-bold">~</span>
              <input 
                type="number" 
                placeholder={t('chapterModal.pageEndPlaceholder')}
                value={endPage}
                onChange={e => setEndPage(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
             <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors">
               {t('chapterModal.done')}
             </button>
             <button type="submit" disabled={!title.trim() || !startPage || !endPage} className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm">
               <Plus className="w-4 h-4" /> {t('chapterModal.add')}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}