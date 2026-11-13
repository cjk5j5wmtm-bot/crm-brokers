"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type FormState } from "./actions";

const Err = ({ s }: { s: FormState | null }) => (s?.error ? <p className="msg err" role="alert">{s.error}</p> : null);

export function LoginForm() {
  const [s, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="auth-form">
      <label className="field">Mail<input name="email" type="email" autoComplete="email" required defaultValue={s?.email} /></label>
      <label className="field">Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>
      <Err s={s} />
      <button className="btn big" disabled={pending}>{pending ? "Ingresando…" : "Ingresar"}</button>
      <p className="small muted">¿Sos asesor y no tenés cuenta? <Link href="/registro">Creala acá</Link></p>
      <p className="small muted">¿Te olvidaste la contraseña? Pedile a la dirección una contraseña temporal.</p>
    </form>
  );
}

export function RegisterForm({ oficinas }: { oficinas: string[] }) {
  const [s, action, pending] = useActionState(registerAction, null);
  return (
    <form action={action} className="auth-form">
      <label className="field">Nombre y apellido<input name="nombre" required autoComplete="name" /></label>
      <label className="field">Oficina
        {oficinas.length ? (
          <select name="oficina" required defaultValue=""><option value="" disabled>Elegí tu oficina</option>{oficinas.map((o) => <option key={o}>{o}</option>)}</select>
        ) : <input name="oficina" required />}
      </label>
      <label className="field">Mail<input name="email" type="email" autoComplete="email" required defaultValue={s?.email} /></label>
      <label className="field">Contraseña (mínimo 8 caracteres)<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
      <label className="field">Código de registro<input name="codigo" required autoComplete="off" autoCapitalize="characters" /></label>
      <Err s={s} />
      <button className="btn big" disabled={pending}>{pending ? "Creando…" : "Crear mi cuenta"}</button>
      <p className="small muted">¿Ya tenés cuenta? <Link href="/ingresar">Ingresá</Link></p>
    </form>
  );
}
