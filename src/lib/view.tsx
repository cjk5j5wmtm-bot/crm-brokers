import Link from "next/link";
import { estadoLlamada, fmtFecha, diasEntre, linkWhatsApp, TIPOS, type Cliente } from "./domain/crm";

/** Logo: el arbolito de la inmobiliaria, en verde. El mismo dibujo está en src/app/icon.png (favicon). */
// eslint-disable-next-line @next/next/no-img-element
export const Logo = ({ size = 28 }: { size?: number }) => <img src="/marca/arbolito.png" width={size} height={size} alt="" aria-hidden="true" style={{ display: "block" }} />;

export const Wordmark = () => <span className="wordmark">Mesa de Brokers</span>;

export const TipoChip = ({ c }: { c: Pick<Cliente, "tipo"> }) => (
  <span className={`chip ${c.tipo === "consulta" ? "info" : c.tipo === "vendido" ? "ok" : ""}`}>{TIPOS[c.tipo].nombre}</span>
);

/** Estado del próximo llamado, siempre con texto (no solo color). */
export function LlamadaChip({ c, hoy }: { c: Cliente; hoy: string }) {
  const e = estadoLlamada(c, hoy);
  if (e === "sin_fecha") return <span className="chip">Sin fecha</span>;
  if (e === "vencido") {
    const d = diasEntre(c.proximaFecha, hoy);
    return <span className="chip bad">Atrasada {d} {d === 1 ? "día" : "días"}</span>;
  }
  if (e === "hoy") return <span className="chip warn">Llamar hoy</span>;
  return <span className="chip">{fmtFecha(c.proximaFecha)}</span>;
}

export function Contacto({ c }: { c: Pick<Cliente, "tel"> }) {
  if (!c.tel) return null;
  const wa = linkWhatsApp(c.tel);
  return (
    <span className="contact">
      <a className="btn ghost sm" href={`tel:${c.tel.replace(/[^\d+]/g, "")}`}>Llamar</a>
      {wa && <a className="btn ghost sm" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
    </span>
  );
}

export const ClienteLink = ({ c }: { c: Cliente }) => <Link href={`/clientes/${c.id}`}><b>{c.nombre}</b></Link>;
