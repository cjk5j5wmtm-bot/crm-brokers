"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { ActionResult } from "./actions";

type Action = (prev: ActionResult | null, f: FormData) => Promise<ActionResult>;

/** Formulario que muestra el resultado real del servidor y evita el doble envío (igual que en AlDia). */
export function ActionForm({ action, children, submit, variant = "primary", className, confirm, reset }: {
  action: Action;
  children?: ReactNode;
  submit: string;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  confirm?: string;
  /** Vacía el formulario después de guardar bien (por ejemplo, el de nueva llamada). */
  reset?: boolean;
}) {
  const [state, formAction, pending] = useActionState(async (p: ActionResult | null, f: FormData) => {
    const r = await action(p, f);
    return r;
  }, null);
  const [asking, setAsking] = useState(false);
  return (
    <form action={formAction} className={`aform ${className ?? ""}`} key={reset && state?.ok ? state.at : undefined} onSubmit={(e) => {
      if (confirm && !asking) { e.preventDefault(); setAsking(true); }
    }}>
      {children}
      {asking && confirm ? (
        <div className="confirm" role="alertdialog" aria-label="Confirmar acción">
          <span>{confirm}</span>
          <button type="submit" className={`btn ${variant}`} disabled={pending} onClick={() => setTimeout(() => setAsking(false), 0)}>Sí, confirmar</button>
          <button type="button" className="btn ghost" onClick={() => setAsking(false)}>Cancelar</button>
        </div>
      ) : (
        <button type="submit" className={`btn ${variant}`} disabled={pending}>{pending ? "Guardando…" : submit}</button>
      )}
      {state && (
        <p className={state.ok ? "msg ok" : "msg err"} role={state.ok ? "status" : "alert"}>
          {state.ok ? "Listo. " : "No se guardó. "}{state.message}
        </p>
      )}
    </form>
  );
}
