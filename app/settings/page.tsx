import { requireUser } from "@/lib/auth";
import { saveSettings } from "@/app/actions";
import { Nav } from "@/components/Nav";
import { ActionForm, Field, inputCls } from "@/components/Forms";

export default async function SettingsPage() {
  const u = await requireUser();
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
          <p className="text-sm text-muted">Mesai dışında kart gelmez. İstediğin an &ldquo;Şimdi öğren&rdquo; ile yine çalışabilirsin.</p>
        </ActionForm>
      </main>
    </>
  );
}
