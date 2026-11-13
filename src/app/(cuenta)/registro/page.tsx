import { redirect } from "next/navigation";
import { pideCodigo } from "@/lib/server/auth";
import { session } from "@/lib/server/store";
import { oficinas } from "@/lib/oficinas";
import { RegisterForm } from "../forms";

export default async function Registro() {
  if ((await session())?.activo) redirect("/");
  return (
    <>
      <h1>Creá tu cuenta</h1>
      <p className="muted">{pideCodigo() ? "Pedile el código de registro a la dirección. " : ""}Solo vas a ver tus propios clientes.</p>
      <RegisterForm oficinas={oficinas()} conCodigo={pideCodigo()} />
    </>
  );
}
