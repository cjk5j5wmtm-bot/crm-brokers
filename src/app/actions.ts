"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CANALES, ETAPAS, RESULTADOS, TIPOS, esFecha, esTipo, hoyAR, leerMonto, proximaSugerida,
  type Cliente, type Objetivos, type Seguimiento,
} from "@/lib/domain/crm";
import { checkPassword, findUserById, hashPassword, saveUser } from "@/lib/server/auth";
import { loadCartera, requireDireccion, requireUser, saveCartera } from "@/lib/server/store";

export interface ActionResult {
  ok: boolean;
  message: string;
  at?: number;
}

const ok = (message: string): ActionResult => ({ ok: true, message, at: Date.now() });
const err = (message: string): ActionResult => ({ ok: false, message });
const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);
const uno = (f: FormData, k: string, lista: string[]) => (lista.includes(str(f, k)) ? str(f, k) : "");
const id = (p: string) => `${p}_${randomBytes(8).toString("hex")}`;

/** Lee los campos del formulario de cliente. Devuelve un error de texto si falta algo. */
function leerCliente(f: FormData, base: Partial<Cliente>): Omit<Cliente, "id" | "alta" | "creado"> | string {
  const tipo = str(f, "tipo") || base.tipo;
  if (!esTipo(tipo)) return "Elegí el tipo de cliente.";
  const nombre = str(f, "nombre", 120);
  if (!nombre) return "Escribí el nombre del cliente.";
  const tel = str(f, "tel", 40);
  const proxima = str(f, "proximaFecha");
  if (proxima && !esFecha(proxima)) return "La fecha del próximo llamado no es válida.";
  const fechaOp = str(f, "fechaOp");
  if (fechaOp && !esFecha(fechaOp)) return "La fecha de compra no es válida.";
  const finContrato = str(f, "finContrato");
  if (finContrato && !esFecha(finContrato)) return "La fecha de vencimiento del contrato no es válida.";
  return {
    tipo,
    nombre,
    tel,
    email: str(f, "email", 120),
    origen: str(f, "origen", 60),
    etapa: uno(f, "etapa", ETAPAS) || base.etapa || "Nuevo",
    zona: str(f, "zona", 60),
    tipoProp: str(f, "tipoProp", 60),
    presupuesto: leerMonto(str(f, "presupuesto")),
    pago: str(f, "pago", 60),
    direccion: str(f, "direccion", 200),
    precio: leerMonto(str(f, "precio")),
    fechaOp,
    finContrato,
    proximoPaso: str(f, "proximoPaso", 200),
    proximaFecha: proxima || base.proximaFecha || proximaSugerida(tipo, hoyAR()),
    ultimoContacto: base.ultimoContacto ?? "",
    notas: str(f, "notas", 4000),
  };
}

export async function crearClienteAction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const datos = leerCliente(f, {});
  if (typeof datos === "string") return err(datos);
  const c = await loadCartera(user.id);
  const nuevo: Cliente = { ...datos, id: id("cl"), alta: hoyAR(), creado: new Date().toISOString() };
  c.clientes.push(nuevo);
  await saveCartera(user.id, c);
  redirect(`/clientes/${nuevo.id}?nuevo=1`);
}

export async function editarClienteAction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const c = await loadCartera(user.id);
  const actual = c.clientes.find((x) => x.id === str(f, "id"));
  if (!actual) return err("No encontré ese cliente en tu cartera.");
  const datos = leerCliente(f, actual);
  if (typeof datos === "string") return err(datos);
  Object.assign(actual, datos);
  await saveCartera(user.id, c);
  revalidatePath(`/clientes/${actual.id}`);
  return ok("Cambios guardados.");
}

/** Registra una llamada o contacto. Actualiza el último contacto y agenda el próximo. */
export async function registrarLlamadaAction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const c = await loadCartera(user.id);
  const cli = c.clientes.find((x) => x.id === str(f, "cliente"));
  if (!cli) return err("No encontré ese cliente en tu cartera.");
  const hoy = hoyAR();
  const fecha = str(f, "fecha") || hoy;
  if (!esFecha(fecha) || fecha > hoy) return err("La fecha de la llamada no puede ser futura.");
  const resultado = uno(f, "resultado", RESULTADOS);
  const texto = str(f, "texto", 2000) || resultado;
  if (!texto) return err("Contá en una línea qué pasó en la llamada.");
  const prox = str(f, "proximaFecha");
  if (prox && !esFecha(prox)) return err("La fecha del próximo llamado no es válida.");
  const s: Seguimiento = { id: id("sg"), cliente: cli.id, fecha, canal: uno(f, "canal", CANALES) || "Llamada", resultado, texto, creado: new Date().toISOString() };
  c.seguimientos.push(s);
  if (!cli.ultimoContacto || fecha >= cli.ultimoContacto) cli.ultimoContacto = fecha;
  cli.proximaFecha = prox || proximaSugerida(cli.tipo, fecha);
  const paso = str(f, "proximoPaso", 200);
  if (paso) cli.proximoPaso = paso;
  if (cli.etapa === "Nuevo" && resultado === "Contestó") cli.etapa = "Contactado";
  await saveCartera(user.id, c);
  revalidatePath("/");
  revalidatePath(`/clientes/${cli.id}`);
  return ok(`Llamada guardada. Próximo llamado: ${cli.proximaFecha.split("-").reverse().join("/")}.`);
}

/** Pasa un cliente a "Ya compró": se lo llama cada 2 meses para pedir referidos. */
export async function marcarComproAction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const c = await loadCartera(user.id);
  const cli = c.clientes.find((x) => x.id === str(f, "id"));
  if (!cli) return err("No encontré ese cliente en tu cartera.");
  const hoy = hoyAR();
  cli.tipo = "vendido";
  cli.etapa = "Cerrado";
  const fecha = str(f, "fechaOp");
  if (fecha && (!esFecha(fecha) || fecha > hoy)) return err("La fecha de la venta no es válida.");
  cli.fechaOp = fecha || cli.fechaOp || hoy;
  const precio = leerMonto(str(f, "precio"));
  if (precio != null) cli.precio = precio;
  cli.proximaFecha = proximaSugerida("vendido", hoy);
  cli.proximoPaso = "Llamar y pedir referidos";
  await saveCartera(user.id, c);
  revalidatePath(`/clientes/${cli.id}`);
  return ok(`Ahora está en "${TIPOS.vendido.plural}". Te aviso en 2 meses para pedirle referidos.`);
}

export async function borrarClienteAction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const c = await loadCartera(user.id);
  const cid = str(f, "id");
  if (!c.clientes.some((x) => x.id === cid)) return err("No encontré ese cliente en tu cartera.");
  c.clientes = c.clientes.filter((x) => x.id !== cid);
  c.seguimientos = c.seguimientos.filter((s) => s.cliente !== cid);
  await saveCartera(user.id, c);
  redirect("/clientes");
}

export async function guardarObjetivosAction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const n = (k: string) => Math.min(leerMonto(str(f, k)) ?? 0, 1e10);
  const obj: Objetivos = { ventasAnio: n("ventasAnio"), volumenAnio: n("volumenAnio"), llamadasSemana: n("llamadasSemana"), captacionesMes: n("captacionesMes") };
  const c = await loadCartera(user.id);
  c.objetivos = obj;
  await saveCartera(user.id, c);
  revalidatePath("/estadisticas");
  return ok("Objetivos guardados.");
}

export async function editarPerfilAction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const nombre = str(f, "nombre", 120);
  const oficina = str(f, "oficina", 80);
  if (!nombre || !oficina) return err("Completá tu nombre y tu oficina.");
  await saveUser({ ...user, nombre, oficina });
  revalidatePath("/", "layout");
  return ok("Datos actualizados.");
}

export async function cambiarPasswordAction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!checkPassword(String(f.get("actual") ?? ""), user)) return err("La contraseña actual no es correcta.");
  const nueva = String(f.get("nueva") ?? "");
  if (nueva.length < 8) return err("La contraseña nueva tiene que tener al menos 8 caracteres.");
  await saveUser({ ...user, ...hashPassword(nueva) });
  return ok("Contraseña cambiada.");
}

/* ---------- Dirección ---------- */

async function asesorDe(f: FormData) {
  const yo = await requireDireccion();
  const u = await findUserById(str(f, "asesor"));
  return { yo, u };
}

export async function cambiarActivoAction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  const { yo, u } = await asesorDe(f);
  if (!u) return err("No encontré a ese asesor.");
  if (u.id === yo.id) return err("No podés darte de baja a vos mismo.");
  await saveUser({ ...u, activo: !u.activo });
  revalidatePath("/direccion");
  return ok(u.activo ? `${u.nombre} quedó dado de baja. Su historial sigue guardado.` : `${u.nombre} puede volver a entrar.`);
}

export async function cambiarRolAction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  const { yo, u } = await asesorDe(f);
  if (!u) return err("No encontré a ese asesor.");
  if (u.id === yo.id) return err("No podés cambiar tu propio rol.");
  const rol = u.rol === "direccion" ? "asesor" : "direccion";
  await saveUser({ ...u, rol });
  revalidatePath("/direccion");
  return ok(rol === "direccion" ? `${u.nombre} ahora ve la actividad de todos.` : `${u.nombre} volvió a ser asesor.`);
}

/** Genera una contraseña temporal para un asesor que se la olvidó. Se muestra una sola vez. */
export async function passwordTemporalAction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  const { u } = await asesorDe(f);
  if (!u) return err("No encontré a ese asesor.");
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const temp = Array.from(randomBytes(10), (b) => abc[b % abc.length]).join("");
  await saveUser({ ...u, ...hashPassword(temp) });
  return ok(`Contraseña temporal de ${u.nombre}: ${temp} . Pasásela por privado y pedile que la cambie desde su perfil.`);
}
