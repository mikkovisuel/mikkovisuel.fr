"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut, CheckCircle, DeviceMobile } from "@phosphor-icons/react/dist/ssr";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPwaCta() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const updateStandalone = () =>
      setIsStandalone(standaloneQuery.matches || (window.navigator as { standalone?: boolean }).standalone === true);
    updateStandalone();
    standaloneQuery.addEventListener("change", updateStandalone);

    // Platform can only be read once mounted (no server-side navigator).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      standaloneQuery.removeEventListener("change", updateStandalone);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isStandalone) {
    return (
      <p className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted">
        <CheckCircle size={18} weight="fill" className="text-accent" />
        Application déjà installée sur cet appareil
      </p>
    );
  }

  if (deferredPrompt) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          setDeferredPrompt(null);
        }}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
      >
        <DeviceMobile size={18} weight="bold" />
        Installer l&apos;application
      </button>
    );
  }

  if (isIOS) {
    return (
      <p className="flex max-w-md items-start gap-2 text-sm text-ink-muted">
        <ArrowSquareOut size={18} className="mt-0.5 shrink-0 text-accent" />
        <span>
          Sur iPhone/iPad : appuyez sur le bouton{" "}
          <span className="font-medium text-ink">Partager</span> de Safari,
          puis sur{" "}
          <span className="font-medium text-ink">« Sur l&apos;écran d&apos;accueil »</span>.
        </span>
      </p>
    );
  }

  return (
    <p className="max-w-md text-sm text-ink-muted">
      Depuis le menu de votre navigateur, choisissez{" "}
      <span className="font-medium text-ink">« Installer l&apos;application »</span>{" "}
      ou <span className="font-medium text-ink">« Ajouter à l&apos;écran d&apos;accueil »</span>.
    </p>
  );
}
