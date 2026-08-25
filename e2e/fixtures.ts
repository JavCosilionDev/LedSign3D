/** SVG de prueba: corazón con curvas cúbicas. */
export const HEART_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-70 -40 140 120"><path d="M 0 30 C -30 -20 -60 -10 -40 15 C -25 30 -5 20 0 5 C 5 20 25 30 40 15 C 60 -10 30 -20 0 30 Z"/></svg>`;

/** SVG sin formas cerradas (solo una línea). */
export const LINE_ONLY_SVG = `<svg xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2="5" y2="5"/></svg>`;

/** Rejilla de `count` círculos para pruebas de rendimiento. */
export function gridSvg(count: number, radius = 8, gap = 24): string {
  const cols = Math.ceil(Math.sqrt(count));
  const circles: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (i % cols) * gap;
    const y = Math.floor(i / cols) * gap;
    circles.push(`<circle cx="${x}" cy="${y}" r="${radius}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg">${circles.join("")}</svg>`;
}
