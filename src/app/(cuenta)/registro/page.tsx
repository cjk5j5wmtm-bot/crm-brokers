import { redirect } from "next/navigation";
import { registroAbierto } from "@/lib/server/auth";
import { session } from "@/lib/server/store";
import { oficinas } from "@/lib/oficinas";
import { RegisterForm } from "../forms";

export default async function Registro() {
  if ((await session())?.activo) redirect("/");
  return (
    <>
      <h1>Creá tu cuenta de asesor</h1>
      <p className="muted">Pedile el código de registro a la dirección. Solo vas a ver tus propios clientes.</p>
      {registroAbierto() ? <RegisterForm oficinas={oficinas()} /> : <p className="msg err" role="alert">La dirección todavía no habilitó el registro.</p>}
    </>
  );
}
