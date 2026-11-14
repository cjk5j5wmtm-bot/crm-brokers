import Link from "next/link";
import {
  buscar, diasEntre, esTipo, estadisticas, estadoLlamada, fmtFecha, fmtUSD, hoyAR, resumen, sumarDias,
  TIPOS, TIPO_KEYS, type Cliente,
} from "@/lib/domain/crm";
import { loadTodo, requireDueno } from "@/lib/server/store";
import { LlamadaChip, TipoChip } from "@/lib/view";
import { ActionForm } from "@/app/ui";
import { cambiarActivoAction, passwordTemporalAction } from "@/app/actions";

type SP = Record<string, string | undefined>;
const VISTAS = [
  { k: "resumen", n: "Resumen" },
  { k: "pendientes", n: "Llamadas pendientes" },
  { k: "llamadas", n: "Llamadas del mes" },
  { k: "clientes", n: "Todos los clientes" },
  { k: "equipo", n: "Asesores" },
] as const;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const nombreMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const mesMas = (m: string, n: number) => {
  const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};

export default async function General({ searchParams }: { searchParams: Promise<SP> }) {
  const yo = await requireDueno();
  const sp = await searchParams;
  const hoy = hoyAR();
  const vista = VISTAS.some((v) => v.k === sp.vista) ? sp.vista! : "resumen";
  const todo = await loadTodo();
  const oficinas = [...new Set(todo.map((x) => x.u.oficina))].sort();
  const of = sp.oficina && oficinas.includes(sp.oficina) ? sp.oficina : "";
  const asesorSel = todo.some((x) => x.u.id === sp.asesor) ? sp.asesor! : "";
  const visibles = todo.filter((x) => (!of || x.u.oficina === of) && (!asesorSel || x.u.id === asesorSel));

  // Une todos los clientes y llamadas, con el asesor al lado.
  const clientes = visibles.flatMap(({ u, c }) => c.clientes.map((cl) => ({ cl, u })));
  const nombreCliente = new Map(clientes.map((x) => [x.cl.id, x.cl.nombre]));
  const llamadas = visibles.flatMap(({ u, c }) => c.seguimientos.map((s) => ({ s, u })));

  const link = (extra: SP) => {
    const p = new URLSearchParams();
    const all = { vista, oficina: of, asesor: asesorSel, ...extra };
    for (const [k, v] of Object.entries(all)) if (v) p.set(k, v);
    return `/general?${p}`;
  };

  return (
    <>
      <div className="head">
        <div><h1>General</h1><p>Todo el equipo en un solo lugar. Solo vos ves esta pestaña. Es de solo lectura: cada asesor edita sus clientes.</p></div>
      </div>

      <nav className="tabs" aria-label="Vistas de General">
        {VISTAS.map((v) => <Link key={v.k} href={link({ vista: v.k })} aria-current={v.k === vista ? "page" : undefined}>{v.n}</Link>)}
      </nav>

      <form className="filters" action="/general">
        <input type="hidden" name="vista" value={vista} />
        <label className="field">Oficina
          <select name="oficina" defaultValue={of}><option value="">Todas</option>{oficinas.map((o) => <option key={o}>{o}</option>)}</select>
        </label>
        <label className="field">Asesor
          <select name="asesor" defaultValue={asesorSel}><option value="">Todos</option>{todo.map(({ u }) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select>
        </label>
        {vista === "clientes" && (
          <>
            <label className="field">Apartado
              <select name="tipo" defaultValue={esTipo(sp.tipo) ? sp.tipo : ""}><option value="">Todos</option>{TIPO_KEYS.map((k) => <option key={k} value={k}>{TIPOS[k].plural}</option>)}</select>
            </label>
            <label className="field">Buscar<input name="q" defaultValue={sp.q ?? ""} placeholder="Nombre, teléfono, zona…" /></label>
          </>
        )}
        {vista === "llamadas" && <input type="hidden" name="mes" value={/^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes : hoy.slice(0, 7)} />}
        <button className="btn ghost">Filtrar</button>
      </form>

      {vista === "resumen" && <Resumen visibles={visibles} hoy={hoy} link={link} />}
      {vista === "pendientes" && <Pendientes clientes={clientes} hoy={hoy} />}
      {vista === "llamadas" && <Llamadas llamadas={llamadas} nombreCliente={nombreCliente} mes={/^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : hoy.slice(0, 7)} link={link} />}
      {vista === "clientes" && <Clientes clientes={clientes} hoy={hoy} tipo={esTipo(sp.tipo) ? sp.tipo : null} q={(sp.q ?? "").slice(0, 80)} />}
      {vista === "equipo" && <Equipo visibles={visibles} hoy={hoy} yoId={yo.id} />}
    </>
  );
}

type Todo = Awaited<ReturnType<typeof loadTodo>>;

function Resumen({ visibles, hoy, link }: { visibles: Todo; hoy: string; link: (e: SP) => string }) {
  const filas = visibles.map(({ u, c }) => ({ u, r: resumen(c, hoy), e: estadisticas(c, hoy), mes: c.seguimientos.filter((s) => s.fecha.startsWith(hoy.slice(0, 7))).length }));
  const sum = (f: (x: (typeof filas)[number]) => number) => filas.reduce((t, x) => t + f(x), 0);
  const pendHoy = visibles.reduce((t, { c }) => t + c.clientes.filter((x) => x.etapa !== "Perdido" && estadoLlamada(x, hoy) === "hoy").length, 0);
  const ranking = [...filas].sort((a, b) => b.e.ventasAnio - a.e.ventasAnio || b.e.volumenAnio - a.e.volumenAnio || b.mes - a.mes);
  return (
    <>
      <div className="kpis four">
        <div className="kpi"><span>Clientes</span><b className="num">{sum((x) => x.r.consultas + x.r.propietarios + x.r.inquilinos + x.r.vendidos)}</b><small>Consultas {sum((x) => x.r.consultas)} · Propietarios {sum((x) => x.r.propietarios)} · Inquilinos {sum((x) => x.r.inquilinos)} · Compraron {sum((x) => x.r.vendidos)}</small></div>
        <div className="kpi"><span>Llamadas en {nombreMes(hoy.slice(0, 7))}</span><b className="num">{sum((x) => x.mes)}</b><small><Link href={link({ vista: "llamadas" })}>Ver todas</Link></small></div>
        <div className={`kpi ${sum((x) => x.r.vencidos) ? "alert" : ""}`}><span>Llamadas pendientes</span><b className="num">{sum((x) => x.r.vencidos) + pendHoy}</b><small>{sum((x) => x.r.vencidos)} atrasadas · {pendHoy} de hoy · <Link href={link({ vista: "pendientes" })}>Ver</Link></small></div>
        <div className="kpi"><span>Ventas {hoy.slice(0, 4)}</span><b className="num">{sum((x) => x.e.ventasAnio)}</b><small>{fmtUSD(sum((x) => x.e.volumenAnio))} · {sum((x) => x.e.ventasMes)} este mes</small></div>
      </div>
      <div className="kpis" style={{ marginTop: 12 }}>
        <div className="kpi"><span>Consultas nuevas del mes</span><b className="num">{sum((x) => x.e.consultasMes)}</b><small>Compradores e interesados cargados</small></div>
        <div className="kpi"><span>Captaciones del mes</span><b className="num">{sum((x) => x.e.captacionesMes)}</b><small>Propietarios nuevos</small></div>
        <div className="kpi"><span>Asesores activos</span><b className="num">{filas.filter((x) => x.u.activo).length}</b><small>{filas.filter((x) => x.u.activo && x.mes === 0).length} sin llamadas este mes</small></div>
      </div>
      <div className="section-title"><h2>Ranking de asesores</h2><span className="small muted">Por ventas del año</span></div>
      <section className="section">
        {ranking.length ? (
          <div className="tbl"><table className="cards">
            <thead><tr><th>#</th><th>Asesor</th><th>Oficina</th><th className="r">Ventas año</th><th className="r">Volumen</th><th className="r">Llamadas mes</th><th className="r">Atrasadas</th></tr></thead>
            <tbody>{ranking.map((x, i) => (
              <tr key={x.u.id}>
                <td className="num muted">{i + 1}</td>
                <td><Link href={`/general/${x.u.id}`}><b>{x.u.nombre}</b></Link>{!x.u.activo && <span className="chip" style={{ marginLeft: 6 }}>Baja</span>}</td>
                <td className="small">{x.u.oficina}</td>
                <td className="r num">{x.e.ventasAnio}</td>
                <td className="r num">{fmtUSD(x.e.volumenAnio) || "–"}</td>
                <td className="r num">{x.mes}</td>
                <td className="r">{x.r.vencidos ? <span className="chip bad">{x.r.vencidos}</span> : <span className="num">0</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="empty">Todavía no hay asesores.</p>}
      </section>
    </>
  );
}

function Pendientes({ clientes, hoy }: { clientes: { cl: Cliente; u: { id: string; nombre: string } }[]; hoy: string }) {
  const vivos = clientes.filter((x) => x.cl.etapa !== "Perdido");
  const grupos = [
    { t: "Atrasadas", l: vivos.filter((x) => estadoLlamada(x.cl, hoy) === "vencido") },
    { t: "Para hoy", l: vivos.filter((x) => estadoLlamada(x.cl, hoy) === "hoy") },
    { t: "Próximos 7 días", l: vivos.filter((x) => estadoLlamada(x.cl, hoy) === "proximo" && x.cl.proximaFecha <= sumarDias(hoy, 7)) },
  ];
  return (
    <>
      {grupos.map((g) => (
        <div key={g.t}>
          <div className="section-title"><h2>{g.t}</h2><span className="small muted">{g.l.length}</span></div>
          <section className="section">
            {g.l.length ? (
              <div className="tbl"><table className="cards">
                <thead><tr><th>Cliente</th><th>Asesor</th><th>Apartado</th><th>Llamado</th><th>Próximo paso</th></tr></thead>
                <tbody>{[...g.l].sort((a, b) => a.cl.proximaFecha.localeCompare(b.cl.proximaFecha)).map(({ cl, u }) => (
                  <tr key={cl.id}><td><b>{cl.nombre}</b></td><td className="small"><Link href={`/general/${u.id}`}>{u.nombre}</Link></td><td><TipoChip c={cl} /></td><td><LlamadaChip c={cl} hoy={hoy} /></td><td className="small muted">{cl.proximoPaso}</td></tr>
                ))}</tbody>
              </table></div>
            ) : <p className="empty">Nada por acá.</p>}
          </section>
        </div>
      ))}
    </>
  );
}

function Llamadas({ llamadas, nombreCliente, mes, link }: { llamadas: { s: { id: string; cliente: string; fecha: string; canal: string; resultado: string; texto: string; creado: string }; u: { id: string; nombre: string } }[]; nombreCliente: Map<string, string>; mes: string; link: (e: SP) => string }) {
  const delMes = llamadas.filter((x) => x.s.fecha.startsWith(mes)).sort((a, b) => b.s.fecha.localeCompare(a.s.fecha) || b.s.creado.localeCompare(a.s.creado));
  const contestaron = delMes.filter((x) => x.s.resultado === "Contestó").length;
  return (
    <>
      <div className="head" style={{ marginBottom: 12 }}>
        <div className="period">
          <Link href={link({ mes: mesMas(mes, -1) })} aria-label="Mes anterior">←</Link>
          <span>{nombreMes(mes)}</span>
          <Link href={link({ mes: mesMas(mes, 1) })} aria-label="Mes siguiente">→</Link>
        </div>
        <span className="small muted">{delMes.length} llamadas · {contestaron} contestaron</span>
      </div>
      <section className="section">
        {delMes.length ? (
          <div className="tbl"><table className="cards">
            <thead><tr><th>Fecha</th><th>Asesor</th><th>Cliente</th><th>Resultado</th><th>Qué hablaron</th></tr></thead>
            <tbody>{delMes.map(({ s, u }) => (
              <tr key={s.id}><td className="num">{fmtFecha(s.fecha)}</td><td className="small"><Link href={`/general/${u.id}`}>{u.nombre}</Link></td><td><b>{nombreCliente.get(s.cliente) ?? "Cliente borrado"}</b></td><td className="small">{s.canal}{s.resultado ? ` · ${s.resultado}` : ""}</td><td className="small muted">{s.texto}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="empty">No hay llamadas anotadas en {nombreMes(mes)}.</p>}
      </section>
    </>
  );
}

function Clientes({ clientes, hoy, tipo, q }: { clientes: { cl: Cliente; u: { id: string; nombre: string } }[]; hoy: string; tipo: Cliente["tipo"] | null; q: string }) {
  const ids = new Set(buscar(clientes.map((x) => x.cl), q).map((c) => c.id));
  const orden = { vencido: 0, hoy: 1, proximo: 2, sin_fecha: 3 };
  const lista = clientes.filter((x) => ids.has(x.cl.id) && (!tipo || x.cl.tipo === tipo))
    .sort((a, b) => orden[estadoLlamada(a.cl, hoy)] - orden[estadoLlamada(b.cl, hoy)] || a.cl.proximaFecha.localeCompare(b.cl.proximaFecha));
  return (
    <section className="section">
      <header><h2>Clientes</h2><span className="small muted">{lista.length}</span></header>
      {lista.length ? (
        <div className="tbl"><table className="cards">
          <thead><tr><th>Cliente</th><th>Asesor</th><th>Apartado</th><th>Teléfono</th><th>Próximo llamado</th><th>Último contacto</th></tr></thead>
          <tbody>{lista.map(({ cl, u }) => (
            <tr key={cl.id}>
              <td><b>{cl.nombre}</b>{cl.proximoPaso && <div className="small muted">{cl.proximoPaso}</div>}</td>
              <td className="small"><Link href={`/general/${u.id}`}>{u.nombre}</Link></td>
              <td><TipoChip c={cl} /></td>
              <td className="small num">{cl.tel}</td>
              <td><LlamadaChip c={cl} hoy={hoy} /></td>
              <td className="small muted">{cl.ultimoContacto ? fmtFecha(cl.ultimoContacto) : "Nunca"}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <p className="empty">No hay clientes con esos filtros.</p>}
    </section>
  );
}

function Equipo({ visibles, hoy, yoId }: { visibles: Todo; hoy: string; yoId: string }) {
  return (
    <section className="section">
      <header><h2>Asesores</h2><span className="small muted">Dar de baja o darles una contraseña temporal</span></header>
      <div className="tbl"><table className="cards">
        <thead><tr><th>Asesor</th><th>Oficina</th><th>Mail</th><th>Último contacto</th><th className="r">Cuenta</th></tr></thead>
        <tbody>{visibles.map(({ u, c }) => {
          const r = resumen(c, hoy);
          return (
            <tr key={u.id}>
              <td><Link href={`/general/${u.id}`}><b>{u.nombre}</b></Link>{u.id === yoId && <span className="chip info" style={{ marginLeft: 6 }}>Dueño</span>}{!u.activo && <span className="chip" style={{ marginLeft: 6 }}>Baja</span>}</td>
              <td className="small">{u.oficina}</td>
              <td className="small muted">{u.email}</td>
              <td className="small muted">{r.ultimoContacto ? `${fmtFecha(r.ultimoContacto)} (hace ${diasEntre(r.ultimoContacto, hoy)} d)` : "Nunca"}</td>
              <td className="act">
                {u.id !== yoId ? (
                  <details className="pop">
                    <summary className="btn ghost sm">Opciones</summary>
                    <div className="pop-body" style={{ display: "grid", gap: 12 }}>
                      <h3>{u.nombre}</h3>
                      <ActionForm action={passwordTemporalAction} submit="Darle una contraseña temporal" variant="ghost" confirm="Su contraseña actual deja de funcionar. ¿Seguimos?"><input type="hidden" name="asesor" value={u.id} /></ActionForm>
                      <ActionForm action={cambiarActivoAction} submit={u.activo ? "Dar de baja" : "Reactivar"} variant={u.activo ? "danger" : "ghost"} confirm={u.activo ? "No va a poder entrar más. Su historial queda guardado." : undefined}><input type="hidden" name="asesor" value={u.id} /></ActionForm>
                    </div>
                  </details>
                ) : <span className="small muted">Vos</span>}
              </td>
            </tr>
          );
        })}</tbody>
      </table></div>
    </section>
  );
}
