import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { kvGet, kvList, kvSet } from "./kv";

export type Rol = "asesor" | "direccion";

export interface User {
  id: string;
  email: string;
  nombre: string;
  oficina: string;
  /** Campo viejo: el rol Dirección ya no se usa. El único que ve todo es el Dueño. */
  rol: Rol;
  activo: boolean;
  salt: string;
  hash: string;
  createdAt: string;
}

const COOKIE = "crm_sesion";
const DAYS = 30;

export const normalizeEmail = (e: string) => e.trim().toLowerCase();
const emailKey = (email: string) => `usuarios/${createHmac("sha256", "crm-brokers").update(normalizeEmail(email)).digest("hex")}`;
/** Índice por id: permite a la dirección listar a todo el equipo. */
const idKey = (id: string) => `equipo/${id}`;

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") };
}

export function checkPassword(password: string, u: Pick<User, "salt" | "hash">) {
  const a = Buffer.from(hashPassword(password, u.salt).hash, "hex");
  const b = Buffer.from(u.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const safeEqual = (a: string, b: string) => {
  const x = createHmac("sha256", "cmp").update(a).digest();
  const y = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(x, y);
};

/**
 * Código de registro opcional (variable REGISTRO_CODIGO en Netlify).
 * Sin código, cualquiera puede crear su cuenta. Con código, solo quien lo tenga.
 */
export function pideCodigo() {
  return !!process.env.REGISTRO_CODIGO?.trim();
}
export function codigoValido(codigo: string) {
  const ok = process.env.REGISTRO_CODIGO?.trim();
  if (!ok) return true;
  return safeEqual(codigo.trim().toUpperCase(), ok.toUpperCase());
}


async function secret(): Promise<string> {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const saved = await kvGet<{ value: string }>("config/session-secret");
  if (saved) return saved.value;
  const value = randomBytes(32).toString("hex");
  await kvSet("config/session-secret", { value });
  return value;
}

export async function findUser(email: string) {
  return kvGet<User>(emailKey(email));
}

export async function findUserById(id: string) {
  const ref = await kvGet<{ email: string }>(idKey(id));
  return ref ? findUser(ref.email) : null;
}

export async function listUsers(): Promise<User[]> {
  const keys = await kvList("equipo/");
  const users = await Promise.all(keys.map((k) => findUserById(k.slice("equipo/".length))));
  return users.filter((u): u is User => !!u).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function saveUser(u: User) {
  await kvSet(emailKey(u.email), u);
  await kvSet(idKey(u.id), { email: u.email });
}

export async function createUser(u: Omit<User, "salt" | "hash" | "rol" | "activo">, password: string) {
  if (await findUser(u.email)) throw new Error("Ya hay una cuenta con ese mail. Ingresá con tu contraseña.");
  const primera = (await kvList("equipo/")).length === 0;
  const user: User = { ...u, email: normalizeEmail(u.email), rol: "asesor", activo: true, ...hashPassword(password) };
  await saveUser(user);
  // La primera cuenta del CRM queda como Dueño.
  if (primera && !process.env.DUENO_EMAIL) await kvSet(DUENO_KEY, { id: user.id });
  return user;
}

const sign = async (payload: string) => createHmac("sha256", await secret()).update(payload).digest("base64url");

export async function startSession(user: User) {
  const exp = Date.now() + DAYS * 864e5;
  const payload = Buffer.from(JSON.stringify({ e: user.email, x: exp })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${await sign(payload)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DAYS * 86400,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = await sign(payload);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { e: string; x: number };
    if (Date.now() > x) return null;
    return await findUser(e);
  } catch {
    return null;
  }
}

/* ---------- Dueño: una sola cuenta que ve todo ---------- */

const DUENO_KEY = "config/dueno";

/**
 * Id de la cuenta Dueño. Hay una sola.
 * - Si está la variable DUENO_EMAIL en Netlify, es esa cuenta.
 * - Si no, la que quedó guardada (la primera cuenta creada).
 * - Para cuentas viejas sin dato guardado: la primera cuenta que tenía rol Dirección o, si no hay, la más antigua.
 * No se puede cambiar desde la web.
 */
export async function duenoId(): Promise<string | null> {
  const env = process.env.DUENO_EMAIL?.trim();
  if (env) return (await findUser(env))?.id ?? null;
  const saved = await kvGet<{ id: string }>(DUENO_KEY);
  if (saved) return saved.id;
  const todos = await listUsers();
  if (!todos.length) return null;
  const porFecha = (a: User, b: User) => a.createdAt.localeCompare(b.createdAt);
  const elegido = [...todos.filter((u) => u.rol === "direccion")].sort(porFecha)[0] ?? [...todos].sort(porFecha)[0];
  await kvSet(DUENO_KEY, { id: elegido.id });
  return elegido.id;
}
