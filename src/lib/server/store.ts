import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { carteraVacia, type Cartera } from "../domain/crm";
import { currentUser, type User } from "./auth";
import { kvGet, kvSet } from "./kv";

/** Cada asesor tiene su cartera guardada aparte. Las pantallas solo leen la del asesor con sesión iniciada. */
const carteraKey = (userId: string) => `carteras/${userId}`;

export async function loadCartera(userId: string): Promise<Cartera> {
  return (await kvGet<Cartera>(carteraKey(userId))) ?? carteraVacia();
}

export async function saveCartera(userId: string, c: Cartera) {
  await kvSet(carteraKey(userId), c);
}

export const session = cache(async (): Promise<User | null> => currentUser());

/** Exige sesión y cuenta activa. */
export async function requireUser(): Promise<User> {
  const user = await session();
  if (!user) redirect("/ingresar");
  if (!user.activo) redirect("/baja");
  return user;
}

/** Exige rol de dirección. */
export async function requireDireccion(): Promise<User> {
  const user = await requireUser();
  if (user.rol !== "direccion") redirect("/");
  return user;
}
