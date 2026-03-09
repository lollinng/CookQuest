'use client';

import { useEffect } from 'react';
import { ChefHat, X, Share, Plus, Download, SquarePlus } from 'lucide-react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

interface PWAInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PWAInstallPrompt({ isOpen, onClose }: PWAInstallPromptProps) {
  const { isIOS, canInstall, promptInstall, dismiss } = usePWAInstall();

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    dismiss();
    onClose();
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={handleDismiss}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-cq-surface border border-cq-border rounded-2xl p-5 shadow-2xl animate-slide-up-spring"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-cq-text-muted hover:text-cq-text-primary transition-colors p-1"
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <ChefHat className="size-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-cq-text-primary">Install CookQuest</h3>
            <p className="text-xs text-cq-text-muted">Add to your home screen</p>
          </div>
        </div>

        {/* Platform-specific content */}
        {isIOS ? (
          <>
            <p className="text-sm text-cq-text-secondary mb-4">
              iOS doesn&apos;t have a direct install button. Follow these quick steps:
            </p>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3 bg-cq-bg/50 rounded-xl p-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                  <Share className="size-4 text-blue-400" />
                </div>
                <p className="text-sm text-cq-text-primary">
                  Tap <span className="font-semibold">Share</span> in Safari&apos;s bottom bar
                </p>
              </div>

              <div className="flex items-center gap-3 bg-cq-bg/50 rounded-xl p-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                  <SquarePlus className="size-4 text-blue-400" />
                </div>
                <p className="text-sm text-cq-text-primary">
                  Tap <span className="font-semibold">&quot;Add to Home Screen&quot;</span>
                </p>
              </div>

              <div className="flex items-center gap-3 bg-cq-bg/50 rounded-xl p-3">
                <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <Plus className="size-4 text-green-400" />
                </div>
                <p className="text-sm text-cq-text-primary">
                  Tap <span className="font-semibold">&quot;Add&quot;</span> to confirm
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold transition-colors text-sm"
            >
              Got it
            </button>
          </>
        ) : canInstall ? (
          <>
            <p className="text-sm text-cq-text-secondary mb-4">
              Get quick access to recipes &amp; your cooking journey from your home screen.
            </p>
            <button
              onClick={handleInstall}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold transition-colors text-sm"
            >
              <Download className="size-4" />
              Install CookQuest
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-cq-text-secondary mb-4">
              Use your browser&apos;s menu to find <span className="font-semibold">&quot;Install app&quot;</span> or <span className="font-semibold">&quot;Add to Home Screen&quot;</span>.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold transition-colors text-sm"
            >
              Got it
            </button>
          </>
        )}
      </div>
    </div>
  );
}
