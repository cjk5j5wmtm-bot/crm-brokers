"use client";

import { useState } from "react";
import { ETAPAS, ORIGENES, PAGOS, TIPOS, TIPO_KEYS, TIPOS_PROP, ZONAS, type Cliente, type TipoCliente } from "@/lib/domain/crm";

export const Sel = ({ name, label, opts, value, empty = "Elegí" }: { name: string; label: string; opts: string[]; value?: string; empty?: string }) => (
  <label className="field">{label}
    <select name={name} defaultValue={value ?? ""}>
      <option value="">{empty}</option>
      {value && !opts.includes(value) && <option>{value}</option>}
      {opts.map((o) => <option key={o}>{o}</option>)}
    </select>
  </label>
);
export const Txt = ({ name, label, value, type = "text", ...rest }: { name: string; label: string; value?: string | number | null; type?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value">) => (
  <label className="field">{label}<input name={name} type={type} defaultValue={value ?? ""} {...rest} /></label>
);

/** Campos del cliente. Arriba se elige el apartado (consulta, propietario, inquilino o ya compró) y abajo aparecen sus campos. */
export function ClienteCampos({ c, tipo }: { c?: Cliente; tipo: TipoCliente }) {
  const [t, setT] = useState<TipoCliente>(tipo);
  return (
    <>
      <fieldset className="tipo-pick">
        <legend>¿En qué apartado va?</legend>
        <div className="tipo-opts">
          {TIPO_KEYS.map((k) => (
            <label key={k} className={`tipo-opt ${t === k ? "on" : ""}`}>
              <input type="radio" name="tipo" value={k} checked={t === k} onChange={() => setT(k)} />
              <b>{TIPOS[k].nombre}</b>
              <span>Llamar cada {TIPOS[k].dias} días</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="row">
        <Txt name="nombre" label="Nombre y apellido" value={c?.nombre} required autoComplete="off" />
        <Txt name="tel" label="Teléfono / WhatsApp" value={c?.tel} type="tel" inputMode="tel" />
      </div>
      <div className="row">
        <Txt name="email" label="Mail (opcional)" value={c?.email} type="email" />
        <Sel name="origen" label="¿Cómo llegó?" opts={ORIGENES} value={c?.origen} />
      </div>
      {t === "consulta" && (
        <>
          <div className="row">
            <Sel name="zona" label="Zona que busca" opts={ZONAS} value={c?.zona} />
            <Sel name="tipoProp" label="Qué busca" opts={TIPOS_PROP} value={c?.tipoProp} />
          </div>
          <div className="row">
            <Txt name="presupuesto" label="Presupuesto (USD)" value={c?.presupuesto} inputMode="numeric" placeholder="Ej: 150000" />
            <Sel name="pago" label="Forma de pago" opts={PAGOS} value={c?.pago} />
          </div>
          <Sel name="etapa" label="Etapa" opts={ETAPAS} value={c?.etapa ?? "Nuevo"} empty="Nuevo" />
        </>
      )}
      {t === "propietario" && (
        <>
          <Txt name="direccion" label="Dirección de su propiedad" value={c?.direccion} />
          <div className="row">
            <Sel name="tipoProp" label="Tipo de propiedad" opts={TIPOS_PROP} value={c?.tipoProp} />
            <Sel name="zona" label="Zona" opts={ZONAS} value={c?.zona} />
            <Txt name="precio" label="Precio publicado (USD)" value={c?.precio} inputMode="numeric" />
          </div>
        </>
      )}
      {t === "inquilino" && (
        <>
          <Txt name="direccion" label="Dónde alquila" value={c?.direccion} />
          <div className="row">
            <Sel name="zona" label="Zona" opts={ZONAS} value={c?.zona} />
            <Txt name="finContrato" label="Le vence el contrato" value={c?.finContrato} type="date" />
            <Txt name="presupuesto" label="Si comprara: presupuesto (USD)" value={c?.presupuesto} inputMode="numeric" />
          </div>
        </>
      )}
      {t === "vendido" && (
        <div className="row">
          <Txt name="direccion" label="Propiedad que compró" value={c?.direccion} />
          <Txt name="fechaOp" label="Fecha de compra" value={c?.fechaOp} type="date" />
          <Txt name="precio" label="Precio de venta (USD)" value={c?.precio} inputMode="numeric" />
        </div>
      )}
      <div className="row">
        <Txt name="proximaFecha" label={`Próximo llamado (si lo dejás vacío: en ${TIPOS[t].dias} días)`} value={c?.proximaFecha} type="date" />
        <Txt name="proximoPaso" label="Próximo paso" value={c?.proximoPaso} placeholder="Ej: mandarle 3 casas en Castelar" />
      </div>
      <label className="field">Notas<textarea name="notas" rows={3} defaultValue={c?.notas ?? ""} /></label>
    </>
  );
}
