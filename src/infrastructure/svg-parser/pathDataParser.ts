import type { Point2D } from "../../domain/value-objects/Point2D";
import type { Polygon2D } from "../../domain/value-objects/Polygon2D";
import {
  sampleCubicBezier,
  sampleQuadraticBezier,
  sampleArc,
} from "../geometry/curveSampler";

/**
 * Parser mínimo del atributo `d` de SVG a polilíneas cerradas (contornos).
 * Soporta M/L/H/V/C/S/Q/T/A/Z (absolutos y relativos) con repetición
 * implícita de argumentos, y aplica tolerancia de muestreo a las curvas.
 *
 * En Fase 2 se integrará con el parseo del SVG completo (transformaciones,
 * fill-rule, grupos) y la sanitización.
 */

type Token = { kind: "cmd"; value: string } | { kind: "num"; value: number };

export function flattenPathData(d: string, tolerance = 0.1): Polygon2D[] {
  const tokens = tokenize(d);
  let i = 0;
  const polygons: Polygon2D[] = [];

  let currentPoly: Point2D[] | null = null;
  let current: Point2D = { x: 0, y: 0 };
  let subpathStart: Point2D = { x: 0, y: 0 };
  let lastCmd = "";
  let lastCtrl: Point2D | null = null;

  const peek = (): Token | undefined => tokens[i];
  const readNum = (): number => {
    const t = tokens[i];
    if (!t || t.kind !== "num") {
      throw new Error("Faltan argumentos numéricos en el atributo d");
    }
    i++;
    return t.value;
  };
  const readCoordPair = (): Point2D => ({ x: readNum(), y: readNum() });

  const target = (p: Point2D, rel: boolean): Point2D =>
    rel ? { x: p.x + current.x, y: p.y + current.y } : p;

  const reflect = (p: Point2D, m: Point2D): Point2D => ({
    x: 2 * m.x - p.x,
    y: 2 * m.y - p.y,
  });

  const closePolygon = (): void => {
    if (!currentPoly) return;
    if (currentPoly.length > 0) {
      const first = currentPoly[0];
      const last = currentPoly[currentPoly.length - 1];
      if (first.x !== last.x || first.y !== last.y) currentPoly.push(first);
    }
    polygons.push({ points: currentPoly, isClosed: true });
    currentPoly = null;
  };

  const pushPoint = (p: Point2D): void => {
    if (currentPoly) currentPoly.push(p);
    current = p;
  };

  const emitCubic = (c1: Point2D, c2: Point2D, c3: Point2D): void => {
    const pts = sampleCubicBezier(current, c1, c2, c3, tolerance);
    if (currentPoly) currentPoly.push(...pts.slice(1));
    current = c3;
    lastCtrl = c2;
  };

  const emitQuadratic = (c1: Point2D, c2: Point2D): void => {
    const pts = sampleQuadraticBezier(current, c1, c2, tolerance);
    if (currentPoly) currentPoly.push(...pts.slice(1));
    current = c2;
    lastCtrl = c1;
  };

  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.kind !== "cmd") {
      throw new Error("Se esperaba un comando de path");
    }
    i++;
    const cmd = tok.value.toUpperCase();
    const rel = tok.value !== cmd;

    switch (cmd) {
      case "Z": {
        if (currentPoly) closePolygon();
        current = subpathStart;
        lastCmd = "Z";
        lastCtrl = null;
        break;
      }
      case "M": {
        closePolygon();
        const p0 = target(readCoordPair(), rel);
        currentPoly = [{ x: p0.x, y: p0.y }];
        subpathStart = { x: p0.x, y: p0.y };
        current = { x: p0.x, y: p0.y };
        lastCtrl = null;
        lastCmd = "M";
        while (peek()?.kind === "num") {
          pushPoint(target(readCoordPair(), rel));
        }
        break;
      }
      case "L": {
        while (peek()?.kind === "num") {
          pushPoint(target(readCoordPair(), rel));
        }
        lastCmd = "L";
        lastCtrl = null;
        break;
      }
      case "H": {
        while (peek()?.kind === "num") {
          pushPoint({ x: readNum() + (rel ? current.x : 0), y: current.y });
        }
        lastCmd = "H";
        lastCtrl = null;
        break;
      }
      case "V": {
        while (peek()?.kind === "num") {
          pushPoint({ x: current.x, y: readNum() + (rel ? current.y : 0) });
        }
        lastCmd = "V";
        lastCtrl = null;
        break;
      }
      case "C": {
        while (peek()?.kind === "num") {
          const c1 = target(readCoordPair(), rel);
          const c2 = target(readCoordPair(), rel);
          const c3 = target(readCoordPair(), rel);
          emitCubic(c1, c2, c3);
        }
        lastCmd = "C";
        break;
      }
      case "S": {
        while (peek()?.kind === "num") {
          const c1 =
            (lastCmd === "C" || lastCmd === "S") && lastCtrl
              ? reflect(lastCtrl, current)
              : current;
          const c2 = target(readCoordPair(), rel);
          const c3 = target(readCoordPair(), rel);
          emitCubic(c1, c2, c3);
        }
        lastCmd = "S";
        break;
      }
      case "Q": {
        while (peek()?.kind === "num") {
          const c1 = target(readCoordPair(), rel);
          const c2 = target(readCoordPair(), rel);
          emitQuadratic(c1, c2);
        }
        lastCmd = "Q";
        break;
      }
      case "T": {
        while (peek()?.kind === "num") {
          const c1 =
            (lastCmd === "Q" || lastCmd === "T") && lastCtrl
              ? reflect(lastCtrl, current)
              : current;
          const c2 = target(readCoordPair(), rel);
          emitQuadratic(c1, c2);
        }
        lastCmd = "T";
        break;
      }
      case "A": {
        while (peek()?.kind === "num") {
          const rx = readNum();
          const ry = readNum();
          const rot = readNum();
          const large = readNum() !== 0;
          const sweep = readNum() !== 0;
          const end = target(readCoordPair(), rel);
          const pts = sampleArc(
            current,
            end,
            rx,
            ry,
            rot,
            large,
            sweep,
            tolerance,
          );
          if (currentPoly) currentPoly.push(...pts.slice(1));
          current = end;
        }
        lastCmd = "A";
        lastCtrl = null;
        break;
      }
      default:
        throw new Error(`Comando de path no soportado: ${tok.value}`);
    }
  }

  closePolygon();
  return polygons;
}

function tokenize(d: string): Token[] {
  const tokens: Token[] = [];
  const re =
    /([a-zA-Z])|([+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    if (m[1] !== undefined) {
      tokens.push({ kind: "cmd", value: m[1] });
    } else {
      tokens.push({ kind: "num", value: parseFloat(m[2]) });
    }
  }
  return tokens;
}
