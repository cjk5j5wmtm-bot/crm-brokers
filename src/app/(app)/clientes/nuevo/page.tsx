import { esTipo } from "@/lib/domain/crm";
import { requireUser } from "@/lib/server/store";
import { ClienteForm } from "@/components/forms";

export default async function Nuevo({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const tipo = esTipo(sp.tipo) ? sp.tipo : "consulta";
  return (
    <>
      <div className="head"><div><h1>Nuevo cliente</h1><p>Elegí el apartado y completá los datos. Te aviso cuándo llamarlo.</p></div></div>
      <section className="section"><div className="body"><ClienteForm key={tipo} tipo={tipo} /></div></section>
    </>
  );
}
