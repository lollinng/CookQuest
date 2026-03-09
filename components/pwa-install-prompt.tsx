'use client';

import { useEffect } from 'react';
import { ChefHat, X, Share, Plus, Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

interface PWAInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PWAInstallPrompt({ isOpen, onClose }: PWAInstallPromptProps) {
  const { isIOS, canInstall, promptInstall, dismiss, shouldShow } = usePWAInstall();

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen || !shouldShow) return null;

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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        onClick={handleDismiss}
      />

      {/* Bottom sheet */}
      <div className="relative w-full max-w-md bg-cq-surface border-t border-cq-border rounded-t-2xl p-6 pb-8 animate-slide-up-spring">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-cq-text-muted hover:text-cq-text-primary transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <ChefHat className="size-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-cq-text-primary">Get CookQuest</h3>
            <p className="text-sm text-cq-text-muted">Add to your home screen</p>
          </div>
        </div>

        <p className="text-sm text-cq-text-secondary mb-6">
          Quick access to recipes, photos & your cooking journey — right from your home screen.
        </p>

        {/* Platform-specific instructions */}
        {isIOS ? (
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-blue-400">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-cq-text-primary">
                  Tap the Share button
                </p>
                <p className="text-xs text-cq-text-muted flex items-center gap-1 mt-0.5">
                  <Share className="size-3.5" /> in Safari&apos;s toolbar
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-blue-400">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-cq-text-primary">
                  Scroll down and tap
                </p>
                <p className="text-xs text-cq-text-muted flex items-center gap-1 mt-0.5">
                  <Plus className="size-3.5" /> &quot;Add to Home Screen&quot;
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-blue-400">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-cq-text-primary">
                  Tap &quot;Add&quot;
                </p>
                <p className="text-xs text-cq-text-muted mt-0.5">
                  CookQuest will appear on your home screen
                </p>
              </div>
            </div>
          </div>
        ) : canInstall ? (
          <button
            onClick={handleInstall}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold transition-colors mb-4"
          >
            <Download className="size-5" />
            Install CookQuest
          </button>
        ) : (
          <div className="space-y-3 mb-6">
            <p className="text-sm text-cq-text-secondary">
              Look for the install icon in your browser&apos;s address bar, or use your browser&apos;s menu to &quot;Install app&quot; or &quot;Add to Home Screen&quot;.
            </p>
          </div>
        )}

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="w-full text-center text-sm text-cq-text-muted hover:text-cq-text-secondary transition-colors py-2"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
