'use client';

/**
 * Modal Component System
 * 
 * Provides accessible modal dialogs with animations, keyboard navigation,
 * and focus trapping. Supports different sizes and variants.
 */

import { Fragment, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: ReactNode;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Focus trap and keyboard handling
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      // Focus the modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      
      // Restore focus
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        role="dialog"
        aria-modal="true"
      >
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
          onClick={handleOverlayClick}
        />

        {/* Modal container */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            ref={modalRef}
            tabIndex={-1}
            className={`
              relative w-full ${sizeClasses[size]} transform overflow-hidden rounded-lg
              bg-white dark:bg-gray-800 shadow-xl transition-all
              animate-in fade-in-0 zoom-in-95 duration-200
              ${className}
            `}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  {title && (
                    <h3 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p id="modal-description" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="ml-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Close modal"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="p-4">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );

  // Use portal to render modal at document body level
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}

