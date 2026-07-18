import { useCallback, useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

/**
 * Admin-only PWA: injects admin manifest, registers SW, and exposes install UI.
 */
export function useAdminPwa() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const existing = document.querySelector('link[rel="manifest"]');
    const prevHref = existing?.getAttribute("href");
    let link = existing as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = "/admin.webmanifest";

    const metas: HTMLMetaElement[] = [];
    const ensureMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.name = name;
        document.head.appendChild(el);
        metas.push(el);
      }
      el.content = content;
    };
    ensureMeta("apple-mobile-web-app-capable", "yes");
    ensureMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    ensureMeta("apple-mobile-web-app-title", "DG Counter");
    ensureMeta("mobile-web-app-capable", "yes");

    let appleIcon = document.querySelector(
      'link[rel="apple-touch-icon"][data-admin-pwa]'
    ) as HTMLLinkElement | null;
    if (!appleIcon) {
      appleIcon = document.createElement("link");
      appleIcon.rel = "apple-touch-icon";
      appleIcon.setAttribute("data-admin-pwa", "1");
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = "/icons/admin-apple-180.png";

    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW() {
        /* registered for admin scope */
      },
    });
    void updateSW;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    setIosHint(isIos() && !isStandalone());
    setInstalled(isStandalone());

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      if (link) {
        if (prevHref) link.href = prevHref;
        else link.remove();
      }
      appleIcon?.remove();
      for (const m of metas) m.remove();
    };
  }, []);

  const canInstall = Boolean(deferred) && !installed;
  const showInstall = canInstall || (iosHint && !installed);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") setInstalled(true);
    return choice.outcome === "accepted";
  }, [deferred]);

  return {
    showInstall,
    canInstall,
    iosHint: iosHint && !installed,
    installed,
    install,
  };
}
