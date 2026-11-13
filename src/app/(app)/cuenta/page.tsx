import { fmtFecha } from "@/lib/domain/crm";
import { requireUser } from "@/lib/server/store";
import { oficinas } from "@/lib/oficinas";
import { ActionForm } from "@/app/ui";
import { cambiarPasswordAction, editarPerfilAction } from "@/app/actions";

export default async function Cuenta() {
  const u = await requireUser();
  const ofs = oficinas();
  return (
    <>
      <div className="head"><div><h1>Mi perfil</h1><p>Tus datos de la cuenta.</p></div></div>
      <div className="grid2">
        <section className="section">
          <header><h2>Datos</h2></header>
          <div className="body">
            <dl className="kv">
              <dt>Nombre</dt><dd>{u.nombre}</dd>
              <dt>Mail</dt><dd>{u.email}</dd>
              <dt>Oficina</dt><dd>{u.oficina}</dd>
              <dt>Rol</dt><dd>{u.rol === "direccion" ? "Dirección (ve la actividad de todos)" : "Asesor"}</dd>
              <dt>Cuenta creada</dt><dd>{fmtFecha(u.createdAt.slice(0, 10))}</dd>
            </dl>
            <details>
              <summary>Cambiar nombre u oficina</summary>
              <ActionForm action={editarPerfilAction} submit="Guardar" className="stack">
                <label className="field">Nombre y apellido<input name="nombre" defaultValue={u.nombre} required /></label>
                <label className="field">Oficina
                  {ofs.length ? <select name="oficina" defaultValue={u.oficina}>{!ofs.includes(u.oficina) && <option>{u.oficina}</option>}{ofs.map((o) => <option key={o}>{o}</option>)}</select> : <input name="oficina" defaultValue={u.oficina} required />}
                </label>
              </ActionForm>
            </details>
          </div>
        </section>
        <section className="section">
          <header><h2>Cambiar mi contraseña</h2></header>
          <div className="body">
            <ActionForm action={cambiarPasswordAction} submit="Cambiar contraseña" className="stack" reset>
              <label className="field">Contraseña actual (o la temporal que te dio la dirección)<input name="actual" type="password" autoComplete="current-password" required /></label>
              <label className="field">Contraseña nueva (mínimo 8 caracteres)<input name="nueva" type="password" autoComplete="new-password" minLength={8} required /></label>
            </ActionForm>
          </div>
        </section>
      </div>
    </>
  );
}
