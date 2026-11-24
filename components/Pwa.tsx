"use client";

import { useEffect, useSyncExternalStore } from "react";

type InstallEvent = Event & { prompt: () => Promise<void> };

// Chrome fires beforeinstallprompt once, often before the button mounts: keep it at module level.
let deferred: InstallEvent | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}
const subscribe = (f: () => void) => (subs.add(f), () => subs.delete(f));

/** Mounted once in the root layout. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

const iosNotInstalled = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) && !(navigator as Navigator & { standalone?: boolean }).standalone;

/** "Install" on Chrome/Edge/Android; a how-to line on iPhone (Safari has no install prompt). */
export function InstallButton() {
  const evt = useSyncExternalStore(subscribe, () => deferred, () => null);
  const ios = useSyncExternalStore(() => () => {}, iosNotInstalled, () => false);
  if (evt)
    return (
      <button
        onClick={async () => {
          await evt.prompt();
          deferred = null;
          notify();
        }}
        className="rounded-xl border-2 border-line px-3 py-2.5 text-left hover:border-pen"
      >
        <span className="font-bold">📲 Uygulama olarak yükle</span>
        <span className="block text-muted">Ana ekranda ve görev çubuğunda kendi penceresiyle açılır.</span>
      </button>
    );
  if (ios)
    return (
      <p className="rounded-xl bg-paper px-3 py-2.5 text-muted">
        📲 Telefona uygulama gibi eklemek için Safari&apos;de <b className="text-ink">Paylaş</b> → <b className="text-ink">Ana Ekrana Ekle</b>.
      </p>
    );
  return null;
}
