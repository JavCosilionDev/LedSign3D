import { describe, it, expect } from "vitest";
import { assemblyKeyFor, assemblyParts } from "./Assembly";
import type { Part } from "./Part";

describe("Assembly", () => {
  it("assemblyKeyFor mapea el tipo de pieza a la clave del ensamblaje", () => {
    expect(assemblyKeyFor("base")).toBe("base");
    expect(assemblyKeyFor("tapa")).toBe("tapa");
    expect(assemblyKeyFor("panel-difusor")).toBe("panelDifusor");
  });

  it("assemblyParts devuelve solo las piezas presentes", () => {
    const base: Part = { type: "base", contourId: "c1" };
    const tapa: Part = { type: "tapa", contourId: "c1" };
    expect(assemblyParts({ contourId: "c1", base, tapa })).toEqual([base, tapa]);
    expect(assemblyParts({ contourId: "c1" })).toEqual([]);
  });
});
