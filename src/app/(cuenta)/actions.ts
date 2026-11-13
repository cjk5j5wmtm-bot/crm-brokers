"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { checkPassword, codigoValido, createUser, endSession, findUser, startSession } from "@/lib/server/auth";

export interface FormState {
  error?: string;
  email?: string;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function registerAction(_: FormState | null, f: FormData): Promise<FormState> {
  const nombre = str(f, "nombre");
  const oficina = str(f, "oficina");
  const email = str(f, "email");
  const password = String(f.get("password") ?? "");
  if (!codigoValido(str(f, "codigo"))) return { error: "El código de registro no es correcto. Pedíselo a la dirección.", email };
  if (!nombre) return { error: "Escribí tu nombre y apellido.", email };
  if (!oficina) return { error: "Elegí tu oficina.", email };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Ese mail no parece válido.", email };
  if (password.length < 8) return { error: "La contraseña tiene que tener al menos 8 caracteres.", email };
  try {
    const user = await createUser({ id: `as_${randomBytes(8).toString("hex")}`, email, nombre, oficina, createdAt: new Date().toISOString() }, password);
    await startSession(user);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear la cuenta.", email };
  }
  redirect("/");
}

export async function loginAction(_: FormState | null, f: FormData): Promise<FormState> {
  const email = str(f, "email");
  const user = await findUser(email);
  // Mismo mensaje si el mail no existe o la contraseña es incorrecta: no revela qué cuentas existen.
  if (!user || !checkPassword(String(f.get("password") ?? ""), user)) return { error: "El mail o la contraseña no coinciden.", email };
  if (!user.activo) return { error: "Tu cuenta está dada de baja. Hablá con la dirección.", email };
  await startSession(user);
  redirect("/");
}

export async function logoutAction() {
  await endSession();
  redirect("/ingresar");
}
