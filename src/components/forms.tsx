import { CANALES, RESULTADOS, TIPOS, hoyAR, type Cliente, type TipoCliente } from "@/lib/domain/crm";
import { ActionForm } from "@/app/ui";
import { ClienteCampos, Txt } from "./cliente-campos";
import { crearClienteAction, editarClienteAction, registrarLlamadaAction } from "@/app/actions";

/** Formulario de cliente. Sirve para crear y para editar; los campos cambian según el apartado elegido. */
export function ClienteForm({ c, tipo }: { c?: Cliente; tipo: TipoCliente }) {
  return (
    <ActionForm action={c ? editarClienteAction : crearClienteAction} submit={c ? "Guardar cambios" : "Guardar cliente"} className="stack client-form">
      {c && <input type="hidden" name="id" value={c.id} />}
      <ClienteCampos c={c} tipo={c?.tipo ?? tipo} />
    </ActionForm>
  );
}

/** Anotar una llamada en pocos toques. */
export function LlamadaForm({ c, compacto = false }: { c: Cliente; compacto?: boolean }) {
  return (
    <ActionForm action={registrarLlamadaAction} submit="Guardar llamada" className="stack" reset>
      <input type="hidden" name="cliente" value={c.id} />
      <div className="row">
        <label className="field">Resultado
          <select name="resultado" defaultValue="Contestó">{RESULTADOS.map((r) => <option key={r}>{r}</option>)}</select>
        </label>
        {!compacto && (
          <label className="field">Por dónde
            <select name="canal" defaultValue="Llamada">{CANALES.map((r) => <option key={r}>{r}</option>)}</select>
          </label>
        )}
        {!compacto && <Txt name="fecha" label="Fecha" type="date" value={hoyAR()} max={hoyAR()} />}
      </div>
      <label className="field">¿Qué hablaron?<input name="texto" placeholder="Ej: quiere ver la casa de Leloir el sábado" autoComplete="off" /></label>
      <label className="field">Próximo llamado (opcional)<input name="proximaFecha" type="date" /></label>
    </ActionForm>
  );
}
