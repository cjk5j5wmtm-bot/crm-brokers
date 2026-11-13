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

import { avance, estadisticas, lunes } from "@/lib/domain/crm";
describe("estadísticas", () => {
  const hoy = "2026-11-12"; // jueves
  it("calcula el lunes de la semana", () => expect(lunes(hoy)).toBe("2026-11-09"));
  it("cuenta ventas, volumen, captaciones y llamadas", () => {
    const e = estadisticas({
      clientes: [
        cli({ id: "v1", tipo: "vendido", fechaOp: "2026-11-02", precio: 150000, origen: "Zonaprop" }),
        cli({ id: "v2", tipo: "vendido", fechaOp: "2026-03-10", precio: 90000, origen: "Referido" }),
        cli({ id: "v3", tipo: "vendido", fechaOp: "2025-12-10", precio: 80000 }),
        cli({ id: "p1", tipo: "propietario", alta: "2026-11-05" }),
        cli({ id: "c1", tipo: "consulta", alta: "2026-11-06", origen: "Zonaprop" }),
      ],
      seguimientos: [
        { id: "a", cliente: "c1", fecha: "2026-11-10", canal: "Llamada", resultado: "Contestó", texto: "x", creado: "" },
        { id: "b", cliente: "c1", fecha: "2026-11-03", canal: "Llamada", resultado: "No contestó", texto: "x", creado: "" },
      ],
    }, hoy);
    expect([e.ventasAnio, e.volumenAnio, e.ventasMes, e.captacionesMes, e.consultasMes, e.llamadasSemana]).toEqual([2, 240000, 1, 1, 1, 1]);
    expect(e.ventasPorMes[2]).toBe(1);
    expect(e.origenes[0]).toEqual({ origen: "Zonaprop", clientes: 2, ventas: 1 });
    expect(e.conversion).toBe(75);
    expect([e.contestaron30, e.llamadas30]).toEqual([1, 2]);
  });
  it("avance con y sin meta", () => {
    expect(avance(3, 12)).toBe(25);
    expect(avance(20, 12)).toBe(100);
    expect(avance(3, 0)).toBeNull();
  });
});
