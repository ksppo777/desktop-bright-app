import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BaseModal from './BaseModal';

interface AlertGuideModalProps {
  onClose: () => void;
}

const AlertGuideModal: React.FC<AlertGuideModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const modalContent = (
    <BaseModal isOpen={true} onClose={onClose} className="max-w-sm rounded-2xl" zIndex={9999} hideCloseButton={true}>
          <div className="p-6 overflow-y-auto">
            <div className="flex items-center space-x-3 mb-5 text-blue-600 dark:text-blue-400">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Info className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {t("alertGuide.title")}
              </h2>
            </div>
            
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed" dangerouslySetInnerHTML={{ __html: t("alertGuide.intro") }} />
              <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div>
                  <strong className="text-slate-800 dark:text-slate-200 block mb-1">{t("alertGuide.soundTitle")}</strong>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{t("alertGuide.soundDesc")}</p>
                </div>
                <div>
                  <strong className="text-slate-800 dark:text-slate-200 block mb-1">{t("alertGuide.vibrateTitle")}</strong>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{t("alertGuide.vibrateDesc")}</p>
                </div>
                <div>
                  <strong className="text-slate-800 dark:text-slate-200 block mb-1">{t("alertGuide.screenTitle")}</strong>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{t("alertGuide.screenDesc")}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center mt-2 px-2">
                {t("alertGuide.outro")}
              </p>
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors active:scale-[0.98]"
            >
              <Check className="w-5 h-5" />
              <span>{t("alertGuide.confirm")}</span>
            </button>
          </div>
    </BaseModal>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
};

export default AlertGuideModal;

