import { requireUser } from "@/lib/auth";
import { restoreItem, saveSettings } from "@/app/actions";
import { knownItems } from "@/lib/learn";
import { Nav } from "@/components/Nav";
import { ActionForm, Field, inputCls } from "@/components/Forms";

export default async function SettingsPage() {
  const u = await requireUser();
  const hidden = await knownItems(u.id);
  return (
    <>
      <Nav name={u.name} level={u.level} />
      <main className="mx-auto max-w-md px-4 pb-16 pt-4">
        <h1 className="mb-6 font-display text-3xl font-bold">Ayarlar</h1>
        <ActionForm action={saveSettings} submit="Kaydet">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Kaç dakikada bir kart gelsin?</span>
            <select name="intervalMin" defaultValue={u.intervalMin} className={inputCls}>
              {[1, 3, 5, 10, 15, 20, 30].map((m) => <option key={m} value={m}>{m} dakika</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mesai başlangıcı" name="workStart" type="time" defaultValue={u.workStart} required />
            <Field label="Mesai bitişi" name="workEnd" type="time" defaultValue={u.workEnd} required />
          </div>
          <Field label="Günlük hedef (kart)" name="dailyGoal" type="number" min={5} max={200} defaultValue={u.dailyGoal} required />
          <label className="flex items-start gap-3 rounded-xl border-2 border-line bg-paper px-4 py-3 text-sm">
            <input type="checkbox" name="sound" defaultChecked={u.sound} className="mt-0.5 size-5 accent-[var(--pen)]" />
            <span>
              <span className="font-bold">Sesler otomatik çalsın</span>
              <span className="block text-muted">
                Kapalıyken kartlar kendiliğinden okunmaz ve dinleme soruları gelmez. 🔊 düğmeleri yine çalışır.
              </span>
            </span>
          </label>
          <p className="text-sm text-muted">Mesai dışında kart gelmez. İstediğin an &ldquo;Şimdi öğren&rdquo; ile yine çalışabilirsin.</p>
        </ActionForm>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Gizlediğin kartlar ({hidden.length})</h2>
          <p className="mt-1 text-sm text-muted">
            &ldquo;Bir daha gösterme&rdquo; dediğin kartlar burada. Seviye geçişinde öğrenilmiş sayılırlar. Geri getirirsen
            yeni kart olarak sırası gelince tekrar çıkar.
          </p>
          {hidden.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Henüz gizlediğin kart yok.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-1.5">
              {hidden.map((it) => (
                <li key={it.id} className="flex items-center gap-3 rounded-xl bg-paper px-3 py-2">
                  <span className="lv-chip rounded-full px-2 py-0.5 text-xs font-bold" style={{ "--lv": `var(--${it.level})` } as React.CSSProperties}>
                    {it.level}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-bold">{it.en}</span> <span className="text-muted">{it.tr}</span>
                  </span>
                  <form action={restoreItem.bind(null, it.id)}>
                    <button className="shrink-0 rounded-lg px-2.5 py-1 text-sm text-pen hover:bg-desk">Geri getir</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
