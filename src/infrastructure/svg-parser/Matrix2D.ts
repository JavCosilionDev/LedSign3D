import type { Point2D } from "../../domain/value-objects/Point2D";

/**
 * Matriz afín 2D en representación SVG `matrix(a, b, c, d, e, f)`:
 *
 *   | a  c  e |
 *   | b  d  f |
 *   | 0  0  1 |
 *
 * Inmutable. `apply(p)` = a·x + c·y + e, b·x + d·y + f.
 */
export class Matrix2D {
  constructor(
    readonly a: number,
    readonly b: number,
    readonly c: number,
    readonly d: number,
    readonly e: number,
    readonly f: number,
  ) {}

  static identity(): Matrix2D {
    return new Matrix2D(1, 0, 0, 1, 0, 0);
  }

  static translate(tx: number, ty: number): Matrix2D {
    return new Matrix2D(1, 0, 0, 1, tx, ty);
  }

  static scale(sx: number, sy: number): Matrix2D {
    return new Matrix2D(sx, 0, 0, sy, 0, 0);
  }

  /** Rotación en grados (sentido horario en SVG, eje Y hacia abajo). */
  static rotate(degrees: number): Matrix2D {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // En coordenadas SVG (Y hacia abajo), el ángulo positivo rota en el
    // sentido de las agujas del reloj visualmente; la matriz es la estándar
    // con la convención matemática de Y hacia arriba.
    return new Matrix2D(cos, sin, -sin, cos, 0, 0);
  }

  static skewX(degrees: number): Matrix2D {
    return new Matrix2D(1, 0, Math.tan((degrees * Math.PI) / 180), 1, 0, 0);
  }

  static skewY(degrees: number): Matrix2D {
    return new Matrix2D(1, Math.tan((degrees * Math.PI) / 180), 0, 1, 0, 0);
  }

  /**
   * Producto matricial `this × other`. Al aplicar el resultado a un punto,
   * primero se aplica `other` y después `this` (convención SVG: el último
   * transform de la lista se aplica primero al punto).
   */
  multiply(other: Matrix2D): Matrix2D {
    return new Matrix2D(
      this.a * other.a + this.c * other.b,
      this.b * other.a + this.d * other.b,
      this.a * other.c + this.c * other.d,
      this.b * other.c + this.d * other.d,
      this.a * other.e + this.c * other.f + this.e,
      this.b * other.e + this.d * other.f + this.f,
    );
  }

  apply(p: Point2D): Point2D {
    return {
      x: this.a * p.x + this.c * p.y + this.e,
      y: this.b * p.x + this.d * p.y + this.f,
    };
  }
}

/**
 * Parsea el atributo `transform` de SVG en una Matrix2D.
 * Soporta translate, scale, rotate, skewX, skewY y matrix (aplicados en orden).
 */
export function parseTransform(transform: string | null | undefined): Matrix2D {
  if (!transform || transform.trim() === "") return Matrix2D.identity();
  let result = Matrix2D.identity();
  const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(transform)) !== null) {
    const name = match[1].trim();
    const args = match[2]
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    const op = buildOperation(name, args);
    result = result.multiply(op);
  }
  return result;
}

function buildOperation(name: string, args: number[]): Matrix2D {
  switch (name) {
    case "translate":
      return Matrix2D.translate(args[0] ?? 0, args[1] ?? 0);
    case "scale": {
      if (args.length < 2) return Matrix2D.scale(args[0] ?? 1, args[0] ?? 1);
      return Matrix2D.scale(args[0], args[1]);
    }
    case "rotate": {
      if (args.length >= 3) {
        // rotate(angle, cx, cy): trasladar, rotar, deshacer traslación.
        const t1 = Matrix2D.translate(args[1], args[2]);
        const rot = Matrix2D.rotate(args[0]);
        const t2 = Matrix2D.translate(-args[1], -args[2]);
        return t1.multiply(rot).multiply(t2);
      }
      return Matrix2D.rotate(args[0] ?? 0);
    }
    case "skewX":
      return Matrix2D.skewX(args[0] ?? 0);
    case "skewY":
      return Matrix2D.skewY(args[0] ?? 0);
    case "matrix":
      return new Matrix2D(args[0], args[1], args[2], args[3], args[4], args[5]);
    default:
      return Matrix2D.identity();
  }
}
