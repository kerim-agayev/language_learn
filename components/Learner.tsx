"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { getBatch } from "@/app/actions";
import type { Quiz } from "@/lib/learn";
import { QuizCard } from "./Card";

type Settings = { intervalMin: number; workStart: string; workEnd: string };

const inWorkHours = (s: Settings, d = new Date()) => {
  const now = d.getHours() * 60 + d.getMinutes();
  const [a, b] = [s.workStart, s.workEnd].map((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)));
  return a <= b ? now >= a && now < b : now >= a || now < b; // supports night shifts
};

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const noop = () => () => {};

type DocPiP ={ requestWindow(o: { width: number; height: number }): Promise<Window> };

export function Learner({ settings }: { settings: Settings }) {
  const router = useRouter();
  const interval = settings.intervalMin * 60_000;
  const [nextAt, setNextAt] = useState(() => Date.now() + interval);
  const [now, setNow] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [queue, setQueue] = useState<Quiz[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [pip, setPip] = useState<Window | null>(null);
  const [, rerender] = useState(0);
  const sessionOpen = useRef(false);
  // browser-only capabilities; false/unsupported during SSR so hydration matches
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const notif = !mounted || typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  const pipSupported = mounted && "documentPictureInPicture" in window;

  const start = useCallback(async (fromTimer: boolean) => {
    if (sessionOpen.current) return;
    sessionOpen.current = true;
    setLoading(true);
    try {
      const batch = await getBatch();
      if (!batch.length) {
        setEmpty(true);
        sessionOpen.current = false;
        setNextAt(Date.now() + interval);
        return;
      }
      setEmpty(false);
      setQueue(batch);
      if (fromTimer && document.visibilityState === "hidden" && !pip && Notification?.permission === "granted") {
        const n = new Notification("Yeni kart hazır", { body: "1 dakikanı ayır, sonra işine dön.", tag: "damla" });
        n.onclick = () => { window.focus(); n.close(); };
      }
    } finally {
      setLoading(false);
    }
  }, [interval, pip]);

  // Clock. Works off timestamps, so background-tab throttling only delays, never skips.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (paused || queue || t < nextAt) return;
      if (!inWorkHours(settings)) setNextAt(t + interval);
      else start(true);
    }, 1000);
    return () => clearInterval(id);
  }, [nextAt, paused, queue, settings, interval, start]);

  useEffect(() => {
    document.title = queue ? "● Kart seni bekliyor · damla" : "damla";
  }, [queue]);

  function finishOne() {
    if (!queue) return;
    if (queue.length > 1) return setQueue(queue.slice(1));
    setQueue(null);
    sessionOpen.current = false;
    setNextAt(Date.now() + interval);
    router.refresh(); // update stats in the sidebar
  }

  function snooze() {
    setQueue(null);
    sessionOpen.current = false;
    setNextAt(Date.now() + 10 * 60_000);
  }

  // Esc = snooze, anywhere
  useEffect(() => {
    const wins = [window, pip].filter(Boolean) as Window[];
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && queue) snooze(); };
    wins.forEach((w) => w.addEventListener("keydown", onKey));
    return () => wins.forEach((w) => w.removeEventListener("keydown", onKey));
  });

  async function openPip() {
    const dpip = (window as unknown as { documentPictureInPicture?: DocPiP }).documentPictureInPicture;
    if (!dpip) return;
    const w = await dpip.requestWindow({ width: 380, height: 620 });
    // copy styles + theme + font variables into the PiP document
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const style = w.document.createElement("style");
        style.textContent = Array.from(sheet.cssRules).map((r) => r.cssText).join("\n");
        w.document.head.appendChild(style);
      } catch {
        if (sheet.href) {
          const link = w.document.createElement("link");
          link.rel = "stylesheet";
          link.href = sheet.href;
          w.document.head.appendChild(link);
        }
      }
    }
    const html = document.documentElement;
    w.document.documentElement.className = html.className;
    w.document.documentElement.setAttribute("data-theme", html.getAttribute("data-theme") ?? "light");
    w.document.body.className = "min-h-dvh p-4";
    w.addEventListener("pagehide", () => setPip(null));
    setPip(w);
  }

  const left = nextAt - now;

  const panel = (
    <div className="flex flex-col gap-4">
      {queue ? (
        <QuizCard key={queue[0].itemId + queue[0].mode + queue.length} quiz={queue[0]} onDone={finishOne} />
      ) : (
        <div className="note flex flex-col items-center gap-4 px-6 py-10 text-center" style={{ "--lv": "var(--line)" } as React.CSSProperties}>
          <p className="text-sm text-muted">{paused ? "Duraklatıldı" : inWorkHours(settings, new Date(now)) ? "Sonraki kart" : "Mesai dışı"}</p>
          <p className="font-display text-6xl font-bold tabular-nums" aria-live="off">{paused ? "—" : mmss(left)}</p>
          {empty && <p className="max-w-xs text-sm text-muted">Şu an tekrar edilecek bir şey yok. Kartlar zamanı gelince dönecek.</p>}
          <button
            onClick={() => start(false)}
            disabled={loading}
            className="rounded-xl bg-pen px-6 py-3 font-bold text-pen-ink disabled:opacity-60"
          >
            {loading ? "Hazırlanıyor…" : "Şimdi öğren"}
          </button>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2 text-sm">
        {queue && (
          <button onClick={snooze} className="rounded-full px-3 py-1.5 text-muted hover:bg-paper hover:text-ink">
            10 dk ertele <kbd className="text-xs">Esc</kbd>
          </button>
        )}
        <button onClick={() => setPaused((p) => !p)} className="rounded-full px-3 py-1.5 text-muted hover:bg-paper hover:text-ink">
          {paused ? "Devam et" : "Duraklat"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {pip ? (
        <>
          {createPortal(panel, pip.document.body)}
          <div className="note px-6 py-10 text-center text-muted">
            Kartlar mini pencerede.{" "}
            <button onClick={() => pip.close()} className="font-bold text-pen underline">Buraya geri al</button>
          </div>
        </>
      ) : (
        panel
      )}
      <div className="flex flex-wrap justify-center gap-2 text-sm">
        {pipSupported && !pip && (
          <button onClick={openPip} className="rounded-full border border-line px-3 py-1.5 hover:border-pen">
            Mini pencere aç (hep üstte)
          </button>
        )}
        {notif === "default" && (
          <button
            onClick={async () => { await Notification.requestPermission(); rerender((n) => n + 1); }}
            className="rounded-full border border-line px-3 py-1.5 hover:border-pen"
          >
            Bildirimleri aç
          </button>
        )}
      </div>
    </div>
  );
}
