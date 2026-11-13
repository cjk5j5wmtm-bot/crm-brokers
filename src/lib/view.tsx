import Link from "next/link";
import { estadoLlamada, fmtFecha, diasEntre, linkWhatsApp, TIPOS, type Cliente } from "./domain/crm";

/** Logo: casa en dos azules con un tubo de teléfono adentro. El mismo dibujo está en src/app/icon.svg. */
export const Logo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <linearGradient id="crm-l" x1="0" y1="1" x2="0.6" y2="0"><stop offset="0" stopColor="#0A2FC2" /><stop offset="1" stopColor="#1F55F0" /></linearGradient>
      <linearGradient id="crm-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3D86FF" /><stop offset="1" stopColor="#5AA9FF" /></linearGradient>
    </defs>
    <path d="M24 3 45 18V45H31V30H17V45H3V18Z" fill="url(#crm-l)" />
    <path d="M24 3 45 18V26L24 11Z" fill="url(#crm-r)" />
    <circle cx="24" cy="22" r="4" fill="#9CC8FF" />
  </svg>
);

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
