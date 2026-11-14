import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { carteraVacia, type Cartera } from "../domain/crm";
import { currentUser, duenoId, listUsers, type User } from "./auth";
import { kvGet, kvSet } from "./kv";

/** Cada asesor tiene su cartera guardada aparte. Las pantallas solo leen la del asesor con sesión iniciada. */
const carteraKey = (userId: string) => `carteras/${userId}`;

export async function loadCartera(userId: string): Promise<Cartera> {
  return (await kvGet<Cartera>(carteraKey(userId))) ?? carteraVacia();
}

export async function saveCartera(userId: string, c: Cartera) {
  await kvSet(carteraKey(userId), c);
}

export type SessionUser = User & { dueno: boolean };

export const session = cache(async (): Promise<SessionUser | null> => {
  const u = await currentUser();
  if (!u) return null;
  return { ...u, dueno: (await duenoId()) === u.id };
});

/** Exige sesión y cuenta activa. */
export async function requireUser(): Promise<SessionUser> {
  const user = await session();
  if (!user) redirect("/ingresar");
  if (!user.activo) redirect("/baja");
  return user;
}

/** Exige ser la cuenta Dueño. Cualquier otra cuenta vuelve al inicio. */
export async function requireDueno(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.dueno) redirect("/");
  return user;
}

/** Todos los asesores con sus carteras. Solo para la vista General del Dueño. */
export async function loadTodo() {
  const users = await listUsers();
  return Promise.all(users.map(async (u) => ({ u, c: await loadCartera(u.id) })));
}
