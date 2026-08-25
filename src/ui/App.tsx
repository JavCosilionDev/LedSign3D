/**
 * Placeholder temporal de la UI (Fase 1 construirá la interfaz completa:
 * visor 3D, panel lateral con parámetros y vista previa 2D).
 */
export function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>LEDSign3D</h1>
      <p>
        Convierte un SVG monocromático en modelos 3D (STL) para letreros LED.
      </p>
      <p style={{ color: "#666" }}>
        Fase 0 completada: motor de geometría (offset + extrusión) validado con
        28 tests. La interfaz se construye en la Fase 1.
      </p>
    </main>
  );
}
