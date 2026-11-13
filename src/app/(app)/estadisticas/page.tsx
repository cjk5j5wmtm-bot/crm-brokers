import { avance, estadisticas, fmtFecha, fmtUSD, hoyAR, objetivosVacios } from "@/lib/domain/crm";
import { loadCartera, requireUser } from "@/lib/server/store";
import { ActionForm } from "@/app/ui";
import { guardarObjetivosAction } from "@/app/actions";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Tarjeta con número, meta y barra de avance. */
function Meta({ titulo, valor, meta, fmt = (n: number) => n.toLocaleString("es-AR"), pie }: { titulo: string; valor: number; meta: number; fmt?: (n: number) => string; pie: string }) {
  const a = avance(valor, meta);
  return (
    <div className="kpi goal">
      <span>{titulo}</span>
      <b className="num">{fmt(valor)}</b>
      {a != null ? (
        <>
          <div className="bar" role="progressbar" aria-valuenow={a} aria-valuemin={0} aria-valuemax={100} aria-label={`${titulo}: ${a}% de la meta`}><i style={{ width: `${a}%` }} /></div>
          <small>{a}% de tu meta de {fmt(meta)} {pie}</small>
        </>
      ) : <small>Sin meta. Cargala abajo.</small>}
    </div>
  );
}

export default async function Estadisticas() {
  const user = await requireUser();
  const c = await loadCartera(user.id);
  const hoy = hoyAR();
  const e = estadisticas(c, hoy);
  const o = c.objetivos ?? objetivosVacios();
  const maxSem = Math.max(1, ...e.semanas.map((s) => s.llamadas), o.llamadasSemana);
  const maxMes = Math.max(1, ...e.ventasPorMes);
  const mesActual = Number(hoy.slice(5, 7)) - 1;
  return (
    <>
      <div className="head"><div><h1>Mis estadísticas</h1><p>Tus ventas y tu actividad de {e.anio}. Solo las ves vos y la dirección.</p></div></div>

      <div className="kpis four">
        <Meta titulo={`Ventas ${e.anio}`} valor={e.ventasAnio} meta={o.ventasAnio} pie="del año" />
        <Meta titulo="Volumen vendido" valor={e.volumenAnio} meta={o.volumenAnio} fmt={(n) => fmtUSD(n)} pie="" />
        <Meta titulo="Llamadas esta semana" valor={e.llamadasSemana} meta={o.llamadasSemana} pie="por semana" />
        <Meta titulo="Captaciones del mes" valor={e.captacionesMes} meta={o.captacionesMes} pie="por mes" />
      </div>

      <div className="kpis" style={{ marginTop: 12 }}>
        <div className="kpi"><span>Ventas este mes</span><b className="num">{e.ventasMes}</b><small>Registradas con fecha de este mes</small></div>
        <div className="kpi"><span>Consultas nuevas del mes</span><b className="num">{e.consultasMes}</b><small>Compradores e interesados que cargaste</small></div>
        <div className="kpi"><span>Te contestaron (30 días)</span><b className="num">{e.llamadas30 ? `${Math.round((e.contestaron30 / e.llamadas30) * 100)}%` : "–"}</b><small>{e.contestaron30} de {e.llamadas30} llamadas</small></div>
      </div>

      <div className="grid2" style={{ marginTop: 20 }}>
        <section className="section">
          <header><h2>Llamadas por semana</h2><span className="small muted">Últimas 8 semanas{o.llamadasSemana ? ` · meta ${o.llamadasSemana}` : ""}</span></header>
          <div className="body">
            <div className="chart" aria-label="Llamadas por semana">
              {o.llamadasSemana > 0 && <div className="goal-line" style={{ bottom: `${(o.llamadasSemana / maxSem) * 100}%` }}><span>Meta</span></div>}
              {e.semanas.map((s, i) => (
                <div key={s.desde} className={`col ${i === 7 ? "now" : ""}`} title={`Semana del ${fmtFecha(s.desde)}: ${s.llamadas} llamadas`}>
                  <span className="v num">{s.llamadas}</span>
                  <i style={{ height: `${(s.llamadas / maxSem) * 100}%` }} />
                  <span className="l">{i === 7 ? "Esta" : fmtFecha(s.desde).slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="section">
          <header><h2>Ventas por mes</h2><span className="small muted">{e.anio}</span></header>
          <div className="body">
            <div className="chart months" aria-label="Ventas por mes">
              {e.ventasPorMes.map((v, i) => (
                <div key={i} className={`col ${i === mesActual ? "now" : ""} ${i > mesActual ? "future" : ""}`} title={`${MESES[i]}: ${v} ventas`}>
                  <span className="v num">{v || ""}</span>
                  <i style={{ height: `${(v / maxMes) * 100}%` }} />
                  <span className="l">{MESES[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid2">
        <section className="section">
          <header><h2>De dónde vienen tus clientes</h2>{e.conversion != null && <span className="small muted">{e.conversion}% de tus compradores ya compró</span>}</header>
          {e.origenes.length ? (
            <div className="tbl"><table>
              <thead><tr><th>Origen</th><th className="r">Clientes</th><th className="r">Ventas</th></tr></thead>
              <tbody>{e.origenes.map((x) => (<tr key={x.origen}><td>{x.origen}</td><td className="r num">{x.clientes}</td><td className="r num">{x.ventas}</td></tr>))}</tbody>
            </table></div>
          ) : <p className="empty">Todavía no cargaste clientes.</p>}
        </section>
        <section className="section">
          <header><h2>Mis objetivos</h2></header>
          <div className="body">
            <ActionForm action={guardarObjetivosAction} submit="Guardar objetivos" className="stack">
              <div className="row">
                <label className="field">Ventas en el año<input name="ventasAnio" inputMode="numeric" defaultValue={o.ventasAnio || ""} placeholder="Ej: 10" /></label>
                <label className="field">Volumen en el año (USD)<input name="volumenAnio" inputMode="numeric" defaultValue={o.volumenAnio || ""} placeholder="Ej: 1500000" /></label>
              </div>
              <div className="row">
                <label className="field">Llamadas por semana<input name="llamadasSemana" inputMode="numeric" defaultValue={o.llamadasSemana || ""} placeholder="Ej: 40" /></label>
                <label className="field">Captaciones por mes<input name="captacionesMes" inputMode="numeric" defaultValue={o.captacionesMes || ""} placeholder="Ej: 2" /></label>
              </div>
            </ActionForm>
            <p className="small muted">Las ventas se cuentan desde los clientes en “Ya compró” con fecha de compra. Para sumar una venta, entrá al cliente y tocá “Registrar venta”.</p>
          </div>
        </section>
      </div>
    </>
  );
}
