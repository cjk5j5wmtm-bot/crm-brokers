import Link from "next/link";
import { esTipo, TIPOS, TIPO_KEYS } from "@/lib/domain/crm";
import { requireUser } from "@/lib/server/store";
import { ClienteForm } from "@/components/forms";

export default async function Nuevo({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const tipo = esTipo(sp.tipo) ? sp.tipo : "consulta";
  return (
    <>
      <div className="head"><div><h1>Nuevo cliente</h1><p>{TIPOS[tipo].desc}</p></div></div>
      <div className="seg" style={{ marginBottom: 20 }}>
        {TIPO_KEYS.map((k) => (k === tipo ? <span key={k}>{TIPOS[k].nombre}</span> : <Link key={k} href={`/clientes/nuevo?tipo=${k}`}>{TIPOS[k].nombre}</Link>))}
      </div>
      <section className="section"><div className="body"><ClienteForm key={tipo} tipo={tipo} /></div></section>
    </>
  );
}
