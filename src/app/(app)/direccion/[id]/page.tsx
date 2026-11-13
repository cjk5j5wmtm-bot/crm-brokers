import Link from "next/link";
import { notFound } from "next/navigation";
import { estadoLlamada, fmtFecha, hoyAR, sumarDias } from "@/lib/domain/crm";
import { findUserById } from "@/lib/server/auth";
import { loadCartera, requireDireccion } from "@/lib/server/store";
import { LlamadaChip, TipoChip } from "@/lib/view";

export default async function AsesorDetalle({ params }: { params: Promise<{ id: string }> }) {
  await requireDireccion();
  const { id } = await params;
  const u = await findUserById(id);
  if (!u) notFound();
  const c = await loadCartera(u.id);
  const hoy = hoyAR();
  const nombre = new Map(c.clientes.map((x) => [x.id, x.nombre]));
  const orden = { vencido: 0, hoy: 1, proximo: 2, sin_fecha: 3 };
  const clientes = [...c.clientes].sort((a, b) => orden[estadoLlamada(a, hoy)] - orden[estadoLlamada(b, hoy)] || a.proximaFecha.localeCompare(b.proximaFecha));
  const segs = c.seguimientos.filter((s) => s.fecha >= sumarDias(hoy, -30)).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado.localeCompare(a.creado));
  return (
    <>
      <p className="small"><Link href="/direccion">← Dirección</Link></p>
      <div className="head"><div><h1>{u.nombre}</h1><p>{u.oficina} · {u.email}{!u.activo ? " · Dado de baja" : ""}</p></div></div>
      <div className="grid2">
        <section className="section">
          <header><h2>Clientes</h2><span className="small muted">{clientes.length}</span></header>
          {clientes.length ? (
            <div className="tbl"><table className="cards">
              <thead><tr><th>Cliente</th><th>Tipo</th><th>Próximo llamado</th><th>Último contacto</th></tr></thead>
              <tbody>{clientes.map((x) => (
                <tr key={x.id}><td><b>{x.nombre}</b>{x.proximoPaso && <div className="small muted">{x.proximoPaso}</div>}</td><td><TipoChip c={x} /></td><td><LlamadaChip c={x} hoy={hoy} /></td><td className="small muted">{x.ultimoContacto ? fmtFecha(x.ultimoContacto) : "Nunca"}</td></tr>
              ))}</tbody>
            </table></div>
          ) : <p className="empty">No cargó clientes todavía.</p>}
        </section>
        <section className="section">
          <header><h2>Llamadas de los últimos 30 días</h2><span className="small muted">{segs.length}</span></header>
          {segs.length ? (
            <ul className="timeline">{segs.map((s) => (
              <li key={s.id}><div className="meta"><b>{fmtFecha(s.fecha)}</b><span>{nombre.get(s.cliente) ?? "Cliente borrado"}</span><span>· {s.canal}{s.resultado ? ` · ${s.resultado}` : ""}</span></div><span>{s.texto}</span></li>
            ))}</ul>
          ) : <p className="empty">Sin llamadas anotadas en 30 días.</p>}
        </section>
      </div>
    </>
  );
}
