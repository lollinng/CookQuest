'use client';

import { useState, useEffect, useCallback } from 'react';

const DISMISS_KEY = 'cookquest-pwa-dismissed';
const DISMISS_DAYS = 7;

declare global {
  interface Navigator { standalone?: boolean; }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // default true to prevent flash

  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const canInstall = !!deferredPrompt;

  useEffect(() => {
    // Check standalone mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      navigator.standalone === true;
    setIsStandalone(standalone);

    // Check dismiss timestamp
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const elapsed = Date.now() - parseInt(dismissed, 10);
      setIsDismissed(elapsed < DISMISS_DAYS * 86400000);
    } else {
      setIsDismissed(false);
    }

    // Capture Chrome/Edge beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsDismissed(true);
  }, []);

  const shouldShow = !isStandalone && !isDismissed;

  return { isIOS, isAndroid, isStandalone, canInstall, isDismissed, shouldShow, promptInstall, dismiss };
}
