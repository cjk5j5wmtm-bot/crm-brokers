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

/** El código de registro se configura en Netlify (variable REGISTRO_CODIGO). Sin código, nadie puede registrarse. */
export function registroAbierto() {
  return !!process.env.REGISTRO_CODIGO?.trim();
}
export function codigoValido(codigo: string) {
  const ok = process.env.REGISTRO_CODIGO?.trim();
  return !!ok && safeEqual(codigo.trim().toUpperCase(), ok.toUpperCase());
}

/** Mails de la dirección (variable DIRECCION_EMAILS, separados por coma). Siempre tienen rol dirección. */
const emailsDireccion = () => (process.env.DIRECCION_EMAILS ?? "").split(",").map(normalizeEmail).filter(Boolean);
const conRol = (u: User): User => (emailsDireccion().includes(u.email) ? { ...u, rol: "direccion" } : u);

async function secret(): Promise<string> {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const saved = await kvGet<{ value: string }>("config/session-secret");
  if (saved) return saved.value;
  const value = randomBytes(32).toString("hex");
  await kvSet("config/session-secret", { value });
  return value;
}

export async function findUser(email: string) {
  const u = await kvGet<User>(emailKey(email));
  return u ? conRol(u) : null;
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
  const user: User = { ...u, email: normalizeEmail(u.email), rol: "asesor", activo: true, ...hashPassword(password) };
  await saveUser(user);
  return conRol(user);
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
