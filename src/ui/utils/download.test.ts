import { describe, it, expect } from "vitest";
import { slugify } from "./download";

describe("slugify", () => {
  it("elimina la extensión y normaliza el nombre", () => {
    expect(slugify("Corazón.svg")).toBe("corazon");
    expect(slugify("Mi Letrero LED.svg")).toBe("mi-letrero-led");
  });

  it("devuelve un valor seguro si el nombre es vacío o solo extensión", () => {
    expect(slugify(".svg")).toBe("ledsign3d");
    expect(slugify("")).toBe("ledsign3d");
  });
});
