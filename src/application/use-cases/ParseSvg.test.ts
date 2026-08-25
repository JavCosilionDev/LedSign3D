// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { ParseSvg } from "./ParseSvg";
import { SvgSanitizer } from "../../infrastructure/svg-parser/SvgSanitizer";
import { SvgParser } from "../../infrastructure/svg-parser/SvgParser";

describe("ParseSvg", () => {
  const parseSvg = new ParseSvg({
    sanitizer: new SvgSanitizer(),
    parser: new SvgParser(),
  });

  it("sanitiza y parsea un SVG a contornos", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>`;
    const contours = parseSvg.execute(svg);
    expect(contours).toHaveLength(1);
    expect(contours[0].outer.points.length).toBeGreaterThanOrEqual(4);
  });

  it("lanza error si el SVG no tiene formas cerradas", () => {
    expect(() =>
      parseSvg.execute(
        `<svg xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2="5" y2="5"/></svg>`,
      ),
    ).toThrow(/no contiene formas cerradas/);
  });
});
