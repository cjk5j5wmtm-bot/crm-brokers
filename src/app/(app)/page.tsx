import Link from "next/link";
import { hoyAR, paraLlamar, proximosDias, sumarDias, fmtFecha } from "@/lib/domain/crm";
import { loadCartera, requireUser } from "@/lib/server/store";
import { ClienteLink, Contacto, LlamadaChip, TipoChip } from "@/lib/view";
import { LlamadaForm } from "@/components/forms";

const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export default async function Hoy() {
  const user = await requireUser();
  const c = await loadCartera(user.id);
  const hoy = hoyAR();
  const llamar = paraLlamar(c.clientes, hoy);
  const prox = proximosDias(c.clientes, hoy);
  const semana = c.seguimientos.filter((s) => s.fecha > sumarDias(hoy, -7)).length;
  const nombre = user.nombre.split(" ")[0];
  return (
    <div className="home">
      <div className="head">
        <div>
          <h1>Hola, {nombre}</h1>
          <p>{llamar.length ? `Hoy tenés ${llamar.length} ${llamar.length === 1 ? "llamada" : "llamadas"} para hacer.` : "Estás al día con tus llamadas."}</p>
        </div>
        <div className="head-actions"><Link className="btn" href="/clientes/nuevo">+ Nuevo cliente</Link></div>
      </div>

      <div className="kpis">
        <div className={`kpi ${llamar.length ? "alert" : ""}`}><span>Para llamar hoy</span><b className="num">{llamar.length}</b><small>Atrasadas y de hoy</small></div>
        <div className="kpi"><span>Mis clientes</span><b className="num">{c.clientes.length}</b><small>{cuenta(c.clientes.filter((x) => x.tipo === "consulta").length, "consulta", "consultas")} · {cuenta(c.clientes.filter((x) => x.tipo === "propietario").length, "propietario", "propietarios")} · {cuenta(c.clientes.filter((x) => x.tipo === "inquilino").length, "inquilino", "inquilinos")}</small></div>
        <div className="kpi"><span>Llamadas en 7 días</span><b className="num">{semana}</b><small>Las que anotaste</small></div>
      </div>

      <div className="section-title"><h2>Llamadas de hoy</h2></div>
      <section className="section">
        {llamar.length ? (
          <ul className="call-list">
            {llamar.map((x) => (
              <li key={x.id}>
                <div className="who">
                  <ClienteLink c={x} />
                  <div className="meta"><TipoChip c={x} /><LlamadaChip c={x} hoy={hoy} />{x.proximoPaso && <span>{x.proximoPaso}</span>}</div>
                </div>
                <div className="acts">
                  <Contacto c={x} />
                  <details className="pop">
                    <summary className="btn sm">Anotar llamada</summary>
                    <div className="pop-body"><h3>{x.nombre}</h3><LlamadaForm c={x} compacto /></div>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <b>No tenés llamadas pendientes</b>
            <span className="muted small">{c.clientes.length ? "Las próximas aparecen abajo." : "Cargá tu primer cliente y te aviso cuándo llamarlo."}</span>
          </div>
        )}
      </section>

      <div className="section-title"><h2>Próximos 7 días</h2></div>
      <section className="section">
        {prox.length ? (
          <ul className="call-list">
            {prox.map((x) => (
              <li key={x.id}>
                <div className="who"><ClienteLink c={x} /><div className="meta"><TipoChip c={x} /><span>{fmtFecha(x.proximaFecha)}</span></div></div>
                <div className="acts"><Contacto c={x} /></div>
              </li>
            ))}
          </ul>
        ) : <p className="empty">Nada agendado para esta semana.</p>}
      </section>
    </div>
  );
}
