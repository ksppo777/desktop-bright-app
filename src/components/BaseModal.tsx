import React, { useEffect } from 'react';
import { cn, useLockBodyScroll } from '../lib/utils';
import { registerBackHandler } from '../lib/backHandler';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
  className?: string; // For setting width (e.g. max-w-md, max-w-lg), padding, etc.
  containerClassName?: string; // For completely overriding the modal container styles
  hideCloseButton?: boolean;
  zIndex?: number;
}

export default function BaseModal({
  isOpen,
  onClose,
  onBack,
  children,
  className,
  containerClassName,
  hideCloseButton = false,
  zIndex = 50,
}: BaseModalProps) {
  
  // Custom hook to block body scrolling when this modal is open
  useLockBodyScroll(isOpen);

  // Auto-register hardware back button / ESC key behavior when open
  useEffect(() => {
    if (isOpen) {
      return registerBackHandler(() => {
        if (onBack) {
          onBack();
        } else {
          onClose();
        }
        return true;
      });
    }
  }, [isOpen, onClose, onBack]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 outline-none"
          style={{ zIndex, WebkitTapHighlightColor: "transparent" }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm pointer-events-auto outline-none"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: 'spring', bounce: 0.25 }}
            className={containerClassName || cn(
              "bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full border border-slate-100 dark:border-slate-700 mx-auto relative flex flex-col max-h-[90vh] overflow-hidden outline-none",
              className
            )}
            onClick={(e) => e.stopPropagation()}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
