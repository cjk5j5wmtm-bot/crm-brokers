import { describe, expect, it } from "vitest";
import { buscar, estadoLlamada, leerMonto, linkWhatsApp, paraLlamar, proximaSugerida, resumen, sumarDias, type Cliente } from "@/lib/domain/crm";

const cli = (p: Partial<Cliente>): Cliente => ({
  id: "c", tipo: "consulta", nombre: "Ana", tel: "", email: "", origen: "", etapa: "Nuevo", zona: "", tipoProp: "", presupuesto: null, pago: "",
  direccion: "", precio: null, fechaOp: "", proximoPaso: "", proximaFecha: "", ultimoContacto: "", notas: "", alta: "2026-11-01", creado: "", ...p,
});

describe("plazos de llamada", () => {
  it("consulta a 2 días, propietario a 30 y ya compró a 60", () => {
    expect(proximaSugerida("consulta", "2026-11-13")).toBe("2026-11-15");
    expect(proximaSugerida("propietario", "2026-11-13")).toBe("2026-12-13");
    expect(proximaSugerida("vendido", "2026-11-13")).toBe("2027-01-12");
  });
  it("cruza fin de mes y de año", () => expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01"));
});

describe("agenda", () => {
  const hoy = "2026-11-13";
  it("clasifica vencido, hoy y próximo", () => {
    expect(estadoLlamada({ proximaFecha: "2026-11-10" }, hoy)).toBe("vencido");
    expect(estadoLlamada({ proximaFecha: hoy }, hoy)).toBe("hoy");
    expect(estadoLlamada({ proximaFecha: "2026-11-20" }, hoy)).toBe("proximo");
    expect(estadoLlamada({ proximaFecha: "" }, hoy)).toBe("sin_fecha");
  });
  it("lista primero los más atrasados y saca los perdidos", () => {
    const l = paraLlamar([
      cli({ id: "a", proximaFecha: hoy }), cli({ id: "b", proximaFecha: "2026-11-01" }),
      cli({ id: "c", proximaFecha: "2026-11-02", etapa: "Perdido" }), cli({ id: "d", proximaFecha: "2026-11-30" }),
    ], hoy);
    expect(l.map((x) => x.id)).toEqual(["b", "a"]);
  });
  it("resume la actividad de un asesor", () => {
    const r = resumen({
      clientes: [cli({ tipo: "consulta", proximaFecha: "2026-11-01" }), cli({ tipo: "propietario", proximaFecha: "2026-12-01" })],
      seguimientos: [{ id: "s", cliente: "c", fecha: "2026-11-10", canal: "Llamada", resultado: "", texto: "x", creado: "" }, { id: "t", cliente: "c", fecha: "2026-09-01", canal: "Llamada", resultado: "", texto: "x", creado: "" }],
    }, hoy);
    expect(r).toEqual({ consultas: 1, propietarios: 1, vendidos: 0, llamadas30: 1, vencidos: 1, ultimoContacto: "2026-11-10" });
  });
});

describe("formato", () => {
  it("arma links de WhatsApp argentinos", () => {
    expect(linkWhatsApp("011 1534567890".replace("15", ""))).toBe("https://wa.me/5491134567890");
    expect(linkWhatsApp("+54 9 11 3456-7890")).toBe("https://wa.me/5491134567890");
    expect(linkWhatsApp("")).toBe("");
  });
  it("lee montos escritos a mano", () => {
    expect(leerMonto("USD 150.000")).toBe(150000);
    expect(leerMonto("")).toBeNull();
  });
  it("busca sin importar acentos", () => expect(buscar([cli({ zona: "Ramos Mejía" })], "mejia")).toHaveLength(1));
});
