import { describe, it, expect } from "vitest";
import { SvgSanitizer } from "./SvgSanitizer";

describe("SvgSanitizer", () => {
  const sanitizer = new SvgSanitizer();

  it("conserva las formas válidas (path/rect)", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/><path d="M0 0 L5 5"/></svg>';
    const clean = sanitizer.sanitize(svg);
    expect(clean).toContain("rect");
    expect(clean).toContain("path");
    expect(clean).toContain("svg");
  });

  it("elimina etiquetas <script>", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>';
    const clean = sanitizer.sanitize(svg);
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("alert");
  });

  it("elimina manejadores de eventos (on*)", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" onclick="evil()"/></svg>';
    const clean = sanitizer.sanitize(svg);
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("evil");
  });

  it("elimina <image> y <foreignObject>", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://x/y.png"/><foreignObject><div>html</div></foreignObject></svg>';
    const clean = sanitizer.sanitize(svg);
    expect(clean).not.toContain("image");
    expect(clean).not.toContain("foreignObject");
  });

  it("elimina <use> y atributos href (referencias externas)", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil/x.svg"/><a href="https://x">y</a></svg>';
    const clean = sanitizer.sanitize(svg);
    expect(clean).not.toContain("<use");
    expect(clean).not.toContain("href");
    expect(clean).not.toContain("<a");
  });

  it("lanza error si el resultado queda vacío", () => {
    expect(() => sanitizer.sanitize("<script>alert(1)</script>")).toThrow();
  });
});
