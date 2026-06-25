import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Book as BookIcon } from 'lucide-react';
import BaseModal from './BaseModal';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, author: string, themeColor: string) => void;
}

const themeColors = [
  { id: 'blue', class: 'bg-blue-500' },
  { id: 'indigo', class: 'bg-indigo-500' },
  { id: 'violet', class: 'bg-violet-500' },
  { id: 'fuchsia', class: 'bg-fuchsia-500' },
  { id: 'rose', class: 'bg-rose-500' },
  { id: 'emerald', class: 'bg-emerald-500' },
];

export default function AddBookModal({ isOpen, onClose, onAdd }: AddBookModalProps) {
  const { t } = useTranslation();
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(themeColors[0]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim()) return;
    onAdd(newBookTitle, newBookAuthor, selectedTheme.id);
    setNewBookTitle('');
    setNewBookAuthor('');
    setSelectedTheme(themeColors[0]);
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-md p-6 sm:p-8" zIndex={100}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
             <BookIcon className="w-5 h-5 text-indigo-500" /> {t('bookModal.title')}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">{t('bookModal.bookName')}</label>
            <input 
              type="text" 
              placeholder={t('bookModal.bookNamePlaceholder')}
              value={newBookTitle}
              onChange={e => setNewBookTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">{t('bookModal.authorLabel')}</label>
            <input 
              type="text" 
              placeholder={t('bookModal.authorPlaceholder')}
              value={newBookAuthor}
              onChange={e => setNewBookAuthor(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
             <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">{t('bookModal.themeColor')}</label>
             <div className="flex items-center gap-2">
               {themeColors.map(color => (
                 <button
                   key={color.id}
                   type="button"
                   onClick={() => setSelectedTheme(color)}
                   className={`w-8 h-8 rounded-full ${color.class} ${selectedTheme.id === color.id ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800' : 'opacity-50 hover:opacity-100'} transition-all`}
                 />
               ))}
             </div>
          </div>

          <div className="pt-2 flex gap-3">
             <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors">
               {t('common.cancel')}
             </button>
             <button type="submit" disabled={!newBookTitle.trim()} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm">
               <Plus className="w-4 h-4" /> {t('bookModal.submit')}
             </button>
          </div>
        </form>
    </BaseModal>
  );
}
