import { redirect } from "next/navigation";
import { session } from "@/lib/server/store";
import { LoginForm } from "../forms";

export default async function Ingresar() {
  const u = await session();
  if (u?.activo) redirect("/");
  return (
    <>
      <h1>Ingresá a tu cuenta</h1>
      <p className="muted">Tus clientes y tus llamadas del día, en un solo lugar.</p>
      <LoginForm />
    </>
  );
}
