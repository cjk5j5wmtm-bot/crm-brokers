import Link from "next/link";
import { buscar, esTipo, estadoLlamada, hoyAR, fmtFecha, TIPOS, TIPO_KEYS } from "@/lib/domain/crm";
import { loadCartera, requireUser } from "@/lib/server/store";
import { ClienteLink, Contacto, LlamadaChip, TipoChip } from "@/lib/view";

export default async function Clientes({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const c = await loadCartera(user.id);
  const hoy = hoyAR();
  const tipo = esTipo(sp.tipo) ? sp.tipo : null;
  const q = (sp.q ?? "").slice(0, 80);
  const orden = { vencido: 0, hoy: 1, proximo: 2, sin_fecha: 3 };
  const lista = buscar(c.clientes.filter((x) => !tipo || x.tipo === tipo), q)
    .sort((a, b) => orden[estadoLlamada(a, hoy)] - orden[estadoLlamada(b, hoy)] || a.proximaFecha.localeCompare(b.proximaFecha));
  const link = (t: string | null) => `/clientes${t ? `?tipo=${t}` : ""}`;
  return (
    <>
      <div className="head">
        <div><h1>Mis clientes</h1><p>{c.clientes.length} en total. Los más atrasados, primero.</p></div>
        <div className="head-actions"><Link className="btn" href={`/clientes/nuevo${tipo ? `?tipo=${tipo}` : ""}`}>+ Nuevo cliente</Link></div>
      </div>
      <div className="head" style={{ marginBottom: 16 }}>
        <div className="seg" role="tablist">
          {tipo ? <Link href={link(null)}>Todos</Link> : <span>Todos</span>}
          {TIPO_KEYS.map((k) => (tipo === k ? <span key={k}>{TIPOS[k].plural}</span> : <Link key={k} href={link(k)}>{TIPOS[k].plural}</Link>))}
        </div>
        <form className="search" role="search">
          {tipo && <input type="hidden" name="tipo" value={tipo} />}
          <input name="q" defaultValue={q} placeholder="Buscar por nombre, teléfono, zona o nota" aria-label="Buscar" />
          <button className="btn ghost">Buscar</button>
        </form>
      </div>
      <section className="section">
        {lista.length ? (
          <div className="tbl">
            <table className="cards">
              <thead><tr><th>Cliente</th><th>Tipo</th><th>Próximo llamado</th><th>Último contacto</th><th className="r">Contacto</th></tr></thead>
              <tbody>
                {lista.map((x) => (
                  <tr key={x.id}>
                    <td><ClienteLink c={x} />{x.proximoPaso && <div className="small muted">{x.proximoPaso}</div>}</td>
                    <td><TipoChip c={x} /></td>
                    <td><LlamadaChip c={x} hoy={hoy} /></td>
                    <td className="small muted">{x.ultimoContacto ? fmtFecha(x.ultimoContacto) : "Nunca"}</td>
                    <td className="act"><Contacto c={x} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><b>{q ? "No encontré clientes con esa búsqueda" : "Todavía no hay clientes acá"}</b><Link href="/clientes/nuevo">Cargar un cliente</Link></div>
        )}
      </section>
    </>
  );
}
