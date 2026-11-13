import { requireUser } from "@/lib/server/store";
import { ActionForm } from "@/app/ui";
import { cambiarPasswordAction } from "@/app/actions";

export default async function Cuenta() {
  const u = await requireUser();
  return (
    <>
      <div className="head"><div><h1>Mi cuenta</h1><p>{u.nombre} · {u.oficina} · {u.email}</p></div></div>
      <section className="section">
        <header><h2>Cambiar mi contraseña</h2></header>
        <div className="body">
          <ActionForm action={cambiarPasswordAction} submit="Cambiar contraseña" className="stack" reset>
            <label className="field">Contraseña actual (o la temporal que te dio la dirección)<input name="actual" type="password" autoComplete="current-password" required /></label>
            <label className="field">Contraseña nueva (mínimo 8 caracteres)<input name="nueva" type="password" autoComplete="new-password" minLength={8} required /></label>
          </ActionForm>
        </div>
      </section>
    </>
  );
}
