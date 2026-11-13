import Link from "next/link";
import { fmtFecha, hoyAR, resumen, diasEntre, estadisticas } from "@/lib/domain/crm";
import { listUsers } from "@/lib/server/auth";
import { loadCartera, requireDireccion } from "@/lib/server/store";
import { ActionForm } from "@/app/ui";
import { cambiarActivoAction, cambiarRolAction, passwordTemporalAction } from "@/app/actions";

export default async function Direccion({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const yo = await requireDireccion();
  const sp = await searchParams;
  const hoy = hoyAR();
  const users = await listUsers();
  const filas = await Promise.all(users.map(async (u) => { const c = await loadCartera(u.id); return { u, r: resumen(c, hoy), ventas: estadisticas(c, hoy).ventasAnio }; }));
  const oficinas = [...new Set(users.map((u) => u.oficina))].sort();
  const of = sp.oficina && oficinas.includes(sp.oficina) ? sp.oficina : "";
  const vis = filas.filter((f) => !of || f.u.oficina === of).sort((a, b) => b.r.vencidos - a.r.vencidos || a.u.nombre.localeCompare(b.u.nombre));
  const act = vis.filter((f) => f.u.activo);
  const tot = (k: "consultas" | "propietarios" | "inquilinos" | "vendidos" | "llamadas30" | "vencidos") => act.reduce((s, f) => s + f.r[k], 0);
  const sinLlamar = act.filter((f) => !f.r.ultimoContacto || diasEntre(f.r.ultimoContacto, hoy) > 7).length;
  return (
    <>
      <div className="head">
        <div><h1>Dirección</h1><p>Actividad de {act.length} asesores activos{of ? ` de ${of}` : ""}. Solo lectura: cada asesor edita sus clientes.</p></div>
      </div>
      {oficinas.length > 1 && (
        <div className="seg" style={{ marginBottom: 20, flexWrap: "wrap" }}>
          {of ? <Link href="/direccion">Todas</Link> : <span>Todas</span>}
          {oficinas.map((o) => (o === of ? <span key={o}>{o}</span> : <Link key={o} href={`/direccion?oficina=${encodeURIComponent(o)}`}>{o}</Link>))}
        </div>
      )}
      <div className="kpis four">
        <div className="kpi"><span>Clientes</span><b className="num">{tot("consultas") + tot("propietarios") + tot("inquilinos") + tot("vendidos")}</b><small>Consultas {tot("consultas")} · Propietarios {tot("propietarios")} · Inquilinos {tot("inquilinos")} · Compraron {tot("vendidos")}</small></div>
        <div className="kpi"><span>Llamadas en 30 días</span><b className="num">{tot("llamadas30")}</b><small>Anotadas por los asesores</small></div>
        <div className={`kpi ${tot("vencidos") ? "alert" : ""}`}><span>Llamadas atrasadas</span><b className="num">{tot("vencidos")}</b><small>Clientes con el llamado vencido</small></div>
        <div className={`kpi ${sinLlamar ? "alert" : ""}`}><span>Sin actividad en 7 días</span><b className="num">{sinLlamar}</b><small>Asesores que no anotaron llamadas</small></div>
      </div>
      <div className="section-title"><h2>Asesores</h2></div>
      <section className="section">
        {vis.length ? (
          <div className="tbl">
            <table className="cards">
              <thead><tr><th>Asesor</th><th>Oficina</th><th className="r">Consultas</th><th className="r">Propietarios</th><th className="r">Inquilinos</th><th className="r">Compraron</th><th className="r">Ventas del año</th><th className="r">Llamadas 30 d</th><th className="r">Atrasadas</th><th>Último contacto</th><th className="r">Cuenta</th></tr></thead>
              <tbody>
                {vis.map(({ u, r, ventas }) => (
                  <tr key={u.id}>
                    <td><Link href={`/direccion/${u.id}`}><b>{u.nombre}</b></Link>{u.rol === "direccion" && <span className="chip info" style={{ marginLeft: 6 }}>Dirección</span>}{!u.activo && <span className="chip" style={{ marginLeft: 6 }}>Baja</span>}</td>
                    <td className="small">{u.oficina}</td>
                    <td className="r num">{r.consultas}</td>
                    <td className="r num">{r.propietarios}</td>
                    <td className="r num">{r.inquilinos}</td>
                    <td className="r num">{r.vendidos}</td>
                    <td className="r num">{ventas}</td>
                    <td className="r num">{r.llamadas30}</td>
                    <td className="r">{r.vencidos ? <span className="chip bad">{r.vencidos}</span> : <span className="num">0</span>}</td>
                    <td className="small muted">{r.ultimoContacto ? `${fmtFecha(r.ultimoContacto)} (hace ${diasEntre(r.ultimoContacto, hoy)} d)` : "Nunca"}</td>
                    <td className="act">
                      {u.id !== yo.id ? (
                        <details className="pop">
                          <summary className="btn ghost sm">Opciones</summary>
                          <div className="pop-body" style={{ display: "grid", gap: 12 }}>
                            <h3>{u.nombre}</h3>
                            <ActionForm action={passwordTemporalAction} submit="Darle una contraseña temporal" variant="ghost" confirm="Su contraseña actual deja de funcionar. ¿Seguimos?"><input type="hidden" name="asesor" value={u.id} /></ActionForm>
                            <ActionForm action={cambiarRolAction} submit={u.rol === "direccion" ? "Quitar rol de dirección" : "Darle rol de dirección"} variant="ghost" confirm={u.rol === "direccion" ? "Deja de ver la actividad de todos." : "Va a ver los clientes y llamadas de todos los asesores."}><input type="hidden" name="asesor" value={u.id} /></ActionForm>
                            <ActionForm action={cambiarActivoAction} submit={u.activo ? "Dar de baja" : "Reactivar"} variant={u.activo ? "danger" : "ghost"} confirm={u.activo ? "No va a poder entrar más. Su historial queda guardado." : undefined}><input type="hidden" name="asesor" value={u.id} /></ActionForm>
                          </div>
                        </details>
                      ) : <span className="small muted">Vos</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="empty">Todavía no se registró nadie.</p>}
      </section>
    </>
  );
}
