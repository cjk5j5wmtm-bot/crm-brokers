import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtFecha, fmtUSD, hoyAR, TIPOS } from "@/lib/domain/crm";
import { loadCartera, requireUser } from "@/lib/server/store";
import { Contacto, LlamadaChip, TipoChip } from "@/lib/view";
import { ClienteForm, LlamadaForm } from "@/components/forms";
import { ActionForm } from "@/app/ui";
import { borrarClienteAction, marcarComproAction } from "@/app/actions";

export default async function Detalle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const c = await loadCartera(user.id);
  const x = c.clientes.find((y) => y.id === id);
  if (!x) notFound();
  const hoy = hoyAR();
  const segs = c.seguimientos.filter((s) => s.cliente === x.id).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado.localeCompare(a.creado));
  const datos: [string, string][] = ([
    ["Teléfono", x.tel], ["Mail", x.email], ["Llegó por", x.origen], ["Etapa", x.tipo === "consulta" ? x.etapa : ""],
    ["Zona", x.zona], ["Busca / tipo", x.tipoProp], ["Presupuesto", fmtUSD(x.presupuesto)], ["Pago", x.pago],
    [x.tipo === "vendido" ? "Compró" : x.tipo === "inquilino" ? "Alquila en" : "Propiedad", x.direccion], ["Precio publicado", fmtUSD(x.precio)], ["Fecha de compra", fmtFecha(x.fechaOp)], ["Le vence el contrato", fmtFecha(x.finContrato ?? "")],
    ["Alta", fmtFecha(x.alta)],
  ] as [string, string][]).filter(([, v]) => v);
  return (
    <>
      <p className="small"><Link href="/clientes">← Mis clientes</Link></p>
      <div className="head">
        <div>
          <h1>{x.nombre}</h1>
          <p style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><TipoChip c={x} /> <LlamadaChip c={x} hoy={hoy} />{x.proximoPaso && <span>{x.proximoPaso}</span>}</p>
        </div>
        <div className="head-actions"><Contacto c={x} /></div>
      </div>
      {sp.nuevo && <p className="focus-note">Cliente guardado. Te lo voy a mostrar en “Llamadas de hoy” el {fmtFecha(x.proximaFecha)}.</p>}
      <div className="grid2">
        <div>
          <section className="section">
            <header><h2>Anotar llamada</h2></header>
            <div className="body"><LlamadaForm c={x} /></div>
          </section>
          <section className="section">
            <header><h2>Historial</h2><span className="small muted">{segs.length} {segs.length === 1 ? "contacto" : "contactos"}</span></header>
            {segs.length ? (
              <ul className="timeline">
                {segs.map((s) => (
                  <li key={s.id}><div className="meta"><b>{fmtFecha(s.fecha)}</b><span>{s.canal}</span>{s.resultado && <span>· {s.resultado}</span>}</div><span>{s.texto}</span></li>
                ))}
              </ul>
            ) : <p className="empty">Todavía no anotaste llamadas con este cliente.</p>}
          </section>
        </div>
        <div>
          <section className="section">
            <header><h2>Datos</h2></header>
            <div className="body">
              <dl className="kv">{datos.map(([k, v]) => (<Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>))}</dl>
              {x.notas && <p className="draft">{x.notas}</p>}
            </div>
          </section>
          <details className="section">
            <summary>Editar datos</summary>
            <div className="body"><ClienteForm c={x} tipo={x.tipo} /></div>
          </details>
          {x.tipo !== "vendido" && (
            <section className="section"><div className="body">
              <h3>¿Compró? Registrá la venta</h3>
              <ActionForm action={marcarComproAction} submit="Registrar venta" variant="ghost" className="stack" confirm={`Paso a ${x.nombre} a "${TIPOS.vendido.plural}" y te aviso cada 2 meses para pedirle referidos. La venta suma a tus estadísticas.`}>
                <input type="hidden" name="id" value={x.id} />
                <div className="row">
                  <label className="field">Precio de venta (USD)<input name="precio" inputMode="numeric" defaultValue={x.precio ?? x.presupuesto ?? ""} /></label>
                  <label className="field">Fecha<input name="fechaOp" type="date" defaultValue={hoy} max={hoy} /></label>
                </div>
              </ActionForm>
            </div></section>
          )}
          <section className="section"><div className="body">
            <ActionForm action={borrarClienteAction} submit="Borrar cliente" variant="ghost" confirm="¿Borrar este cliente y todo su historial? No se puede deshacer.">
              <input type="hidden" name="id" value={x.id} />
            </ActionForm>
          </div></section>
        </div>
      </div>
    </>
  );
}
