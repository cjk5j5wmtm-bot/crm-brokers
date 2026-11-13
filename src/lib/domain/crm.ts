/** Núcleo del CRM: tipos, listas y cálculos puros (sin base de datos), para poder probarlos. */

export type TipoCliente = "consulta" | "propietario" | "inquilino" | "vendido";

export const TIPOS: Record<TipoCliente, { nombre: string; plural: string; dias: number; desc: string }> = {
  consulta: { nombre: "Consulta", plural: "Consultas", dias: 2, desc: "Comprador o interesado. Llamada a los 2 días." },
  propietario: { nombre: "Propietario", plural: "Propietarios", dias: 30, desc: "Dueño de una propiedad captada. Llamada una vez por mes." },
  inquilino: { nombre: "Inquilino", plural: "Inquilinos", dias: 30, desc: "Alquila hoy. Llamada una vez por mes: puede comprar o mudarse cuando le vence el contrato." },
  vendido: { nombre: "Ya compró", plural: "Ya compraron", dias: 60, desc: "Cliente que ya compró. Llamada cada 2 meses para pedir referidos." },
};
export const TIPO_KEYS = Object.keys(TIPOS) as TipoCliente[];
export const esTipo = (t: unknown): t is TipoCliente => typeof t === "string" && t in TIPOS;

export const ETAPAS = ["Nuevo", "Contactado", "Calificado", "Visitando", "Oferta", "Reserva", "Cerrado", "Perdido"];
export const ORIGENES = ["Zonaprop", "Argenprop", "MercadoLibre", "TikTok", "Instagram", "WhatsApp", "Referido", "Cartel", "Guardia oficina", "Otro"];
export const ZONAS = ["Castelar", "Leloir", "Ramos Mejía", "CABA", "Barrio privado zona oeste", "Otra"];
export const TIPOS_PROP = ["Casa", "Departamento", "PH", "Casa en barrio privado", "Terreno", "Local u oficina", "Otro"];
export const PAGOS = ["Contado", "Crédito hipotecario", "Permuta", "A definir"];
export const CANALES = ["Llamada", "WhatsApp", "Visita", "Email", "Oficina"];
export const RESULTADOS = ["Contestó", "No contestó", "Mensaje enviado"];

export interface Cliente {
  id: string;
  tipo: TipoCliente;
  nombre: string;
  tel: string;
  email: string;
  origen: string;
  etapa: string;
  zona: string;
  tipoProp: string;
  presupuesto: number | null; // USD
  pago: string;
  direccion: string; // propiedad del propietario o la que compró
  precio: number | null; // USD
  fechaOp: string; // fecha en que compró
  finContrato?: string; // inquilinos: cuándo le vence el alquiler
  proximoPaso: string;
  proximaFecha: string; // AAAA-MM-DD
  ultimoContacto: string;
  notas: string;
  alta: string;
  creado: string;
}

export interface Seguimiento {
  id: string;
  cliente: string;
  fecha: string;
  canal: string;
  resultado: string;
  texto: string;
  creado: string;
}

/** Metas personales que fija cada asesor. 0 = sin meta. */
export interface Objetivos {
  ventasAnio: number; // operaciones cerradas en el año
  volumenAnio: number; // USD vendidos en el año
  llamadasSemana: number;
  captacionesMes: number; // propietarios nuevos por mes
}
export const objetivosVacios = (): Objetivos => ({ ventasAnio: 0, volumenAnio: 0, llamadasSemana: 0, captacionesMes: 0 });

/** Datos de un asesor. Cada asesor tiene los suyos guardados aparte. */
export interface Cartera {
  clientes: Cliente[];
  seguimientos: Seguimiento[];
  objetivos?: Objetivos;
}
export const carteraVacia = (): Cartera => ({ clientes: [], seguimientos: [] });

/* ---------- Fechas (hora de Argentina) ---------- */

export const hoyAR = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
export const esFecha = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`));

export function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(desde: string, hasta: string) {
  return Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 864e5);
}

export function fmtFecha(f: string) {
  if (!esFecha(f)) return "";
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}

/** Fecha sugerida para el próximo llamado según el tipo de cliente. */
export const proximaSugerida = (tipo: TipoCliente, desde: string) => sumarDias(desde, TIPOS[tipo].dias);

/* ---------- Agenda ---------- */

export type EstadoLlamada = "vencido" | "hoy" | "proximo" | "sin_fecha";

export function estadoLlamada(c: Pick<Cliente, "proximaFecha">, hoy: string): EstadoLlamada {
  if (!esFecha(c.proximaFecha)) return "sin_fecha";
  if (c.proximaFecha < hoy) return "vencido";
  if (c.proximaFecha === hoy) return "hoy";
  return "proximo";
}

/** Clientes para llamar: vencidos y de hoy, del más atrasado al más nuevo. Los perdidos no se llaman. */
export function paraLlamar(clientes: Cliente[], hoy: string) {
  return clientes
    .filter((c) => c.etapa !== "Perdido" && ["vencido", "hoy"].includes(estadoLlamada(c, hoy)))
    .sort((a, b) => a.proximaFecha.localeCompare(b.proximaFecha) || a.nombre.localeCompare(b.nombre));
}

export function proximosDias(clientes: Cliente[], hoy: string, dias = 7) {
  const hasta = sumarDias(hoy, dias);
  return clientes
    .filter((c) => c.etapa !== "Perdido" && estadoLlamada(c, hoy) === "proximo" && c.proximaFecha <= hasta)
    .sort((a, b) => a.proximaFecha.localeCompare(b.proximaFecha));
}

/* ---------- Resumen para la dirección ---------- */

export interface Resumen {
  consultas: number;
  propietarios: number;
  inquilinos: number;
  vendidos: number;
  llamadas30: number;
  vencidos: number;
  ultimoContacto: string;
}

export function resumen(c: Cartera, hoy: string): Resumen {
  const desde = sumarDias(hoy, -30);
  const ultimo = c.seguimientos.reduce((m, s) => (s.fecha > m ? s.fecha : m), "");
  return {
    consultas: c.clientes.filter((x) => x.tipo === "consulta").length,
    propietarios: c.clientes.filter((x) => x.tipo === "propietario").length,
    inquilinos: c.clientes.filter((x) => x.tipo === "inquilino").length,
    vendidos: c.clientes.filter((x) => x.tipo === "vendido").length,
    llamadas30: c.seguimientos.filter((s) => s.fecha >= desde && s.fecha <= hoy).length,
    vencidos: c.clientes.filter((x) => x.etapa !== "Perdido" && estadoLlamada(x, hoy) === "vencido").length,
    ultimoContacto: ultimo,
  };
}

/* ---------- Búsqueda y formato ---------- */

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function buscar(clientes: Cliente[], q: string) {
  const t = norm(q.trim());
  if (!t) return clientes;
  return clientes.filter((c) => norm([c.nombre, c.tel, c.email, c.zona, c.direccion, c.notas, c.origen].join(" ")).includes(t));
}

export const fmtUSD = (n: number | null) => (n == null ? "" : `USD ${n.toLocaleString("es-AR")}`);

/** Link de WhatsApp. Si el número parece argentino sin código de país, le agrega 549. */
export function linkWhatsApp(tel: string) {
  let d = tel.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = `549${d}`;
  return `https://wa.me/${d}`;
}

/** Convierte un monto escrito por una persona ("120.000", "USD 95000") en número, o null. */
export function leerMonto(s: string): number | null {
  const d = s.replace(/[^\d]/g, "");
  if (!d) return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
}

/* ---------- Estadísticas personales ---------- */

export interface Estadisticas {
  anio: string;
  ventasAnio: number;
  volumenAnio: number;
  ventasMes: number;
  captacionesMes: number;
  consultasMes: number;
  llamadasSemana: number;
  contestaron30: number;
  llamadas30: number;
  /** Llamadas de las últimas 8 semanas, de la más vieja a la actual. */
  semanas: { desde: string; llamadas: number }[];
  /** Ventas por mes del año en curso (enero a diciembre). */
  ventasPorMes: number[];
  /** De qué canal llegan los clientes, de mayor a menor. */
  origenes: { origen: string; clientes: number; ventas: number }[];
  /** Porcentaje de consultas que terminaron en venta (consultas + ventas que cargaste). */
  conversion: number | null;
}

/** Lunes de la semana de una fecha. */
export function lunes(fecha: string) {
  const d = new Date(`${fecha}T12:00:00Z`);
  const dia = (d.getUTCDay() + 6) % 7;
  return sumarDias(fecha, -dia);
}

export function estadisticas(c: Cartera, hoy: string): Estadisticas {
  const anio = hoy.slice(0, 4);
  const mes = hoy.slice(0, 7);
  const ventas = c.clientes.filter((x) => x.tipo === "vendido" && esFecha(x.fechaOp));
  const delAnio = ventas.filter((x) => x.fechaOp.startsWith(anio) && x.fechaOp <= hoy);
  const inicioSemana = lunes(hoy);
  const semanas = Array.from({ length: 8 }, (_, i) => {
    const desde = sumarDias(inicioSemana, -7 * (7 - i));
    const hasta = sumarDias(desde, 6);
    return { desde, llamadas: c.seguimientos.filter((s) => s.fecha >= desde && s.fecha <= hasta).length };
  });
  const desde30 = sumarDias(hoy, -30);
  const s30 = c.seguimientos.filter((s) => s.fecha >= desde30 && s.fecha <= hoy);
  const porOrigen = new Map<string, { clientes: number; ventas: number }>();
  for (const x of c.clientes) {
    const o = x.origen || "Sin dato";
    const v = porOrigen.get(o) ?? { clientes: 0, ventas: 0 };
    v.clientes++;
    if (x.tipo === "vendido") v.ventas++;
    porOrigen.set(o, v);
  }
  const compradores = c.clientes.filter((x) => x.tipo === "consulta" || x.tipo === "vendido").length;
  return {
    anio,
    ventasAnio: delAnio.length,
    volumenAnio: delAnio.reduce((t, x) => t + (x.precio ?? 0), 0),
    ventasMes: delAnio.filter((x) => x.fechaOp.startsWith(mes)).length,
    captacionesMes: c.clientes.filter((x) => x.tipo === "propietario" && x.alta.startsWith(mes)).length,
    consultasMes: c.clientes.filter((x) => x.tipo === "consulta" && x.alta.startsWith(mes)).length,
    llamadasSemana: semanas[7].llamadas,
    contestaron30: s30.filter((s) => s.resultado === "Contestó").length,
    llamadas30: s30.length,
    semanas,
    ventasPorMes: Array.from({ length: 12 }, (_, i) => delAnio.filter((x) => Number(x.fechaOp.slice(5, 7)) === i + 1).length),
    origenes: [...porOrigen].map(([origen, v]) => ({ origen, ...v })).sort((a, b) => b.clientes - a.clientes),
    conversion: compradores ? Math.round((ventas.length / compradores) * 100) : null,
  };
}

/** Avance hacia una meta, de 0 a 100. Null si no hay meta. */
export const avance = (valor: number, meta: number) => (meta > 0 ? Math.min(100, Math.round((valor / meta) * 100)) : null);
