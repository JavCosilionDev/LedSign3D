import { useCallback, useEffect, useMemo, useState } from "react";
import type { Contour } from "../../domain/entities/Contour";
import type { ProjectSettings } from "../../domain/value-objects/ProjectSettings";
import { applySvgScale } from "../../domain/value-objects/SvgScale";
import type { IGeometryGateway } from "../../application/ports/IGeometryGateway";
import { ParseSvg } from "../../application/use-cases/ParseSvg";
import { SvgParser } from "../../infrastructure/svg-parser/SvgParser";
import { SvgSanitizer } from "../../infrastructure/svg-parser/SvgSanitizer";
import { useProjectStore } from "./projectStore";
import { useSettingsStore } from "./settingsStore";

/**
 * Orquesta el flujo de generación del modelo:
 *  1. Al cargar un SVG → sanitiza y parsea en el hilo principal → contornos.
 *  2. Escala los contornos (hilo principal) según "Configurar SVG".
 *  3. Envía los contornos escalados + parámetros al worker → ensamblajes.
 *  4. Ante cambios de parámetros → regenera (debounced 250 ms).
 */
export function useModelPipeline(gateway: IGeometryGateway): void {
  const svgSource = useProjectStore((s) => s.svgSource);
  const setContours = useProjectStore((s) => s.setContours);
  const setAssemblies = useProjectStore((s) => s.setAssemblies);
  const setStatus = useProjectStore((s) => s.setStatus);
  const settings = useSettingsStore((s) => s.settings);

  const parseSvg = useMemo(
    () => new ParseSvg({ sanitizer: new SvgSanitizer(), parser: new SvgParser() }),
    [],
  );

  const generate = useCallback(
    async (contours: readonly Contour[], config: ProjectSettings) => {
      setStatus("generating");
      try {
        // Escalar en el hilo principal evita reenviar el SVG al cambiar solo el tamaño.
        const { contours: scaled } = applySvgScale(contours, config.get("svgMaxDimension"));
        const assemblies = await gateway.generateAssemblies(scaled, config);
        setAssemblies(assemblies);
      } catch (err) {
        setStatus("error", toErrorMessage(err));
      }
    },
    [gateway, setStatus, setAssemblies],
  );

  // Nuevo SVG: parsear (hilo principal) y generar.
  useEffect(() => {
    if (!svgSource) return;
    try {
      const contours = parseSvg.execute(svgSource);
      setContours(contours);
      void generate(contours, settings);
    } catch (err) {
      setStatus("error", toErrorMessage(err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgSource]);

  // Cambios de parámetros: regenerar con debounce.
  const debouncedSettings = useDebouncedValue(settings, 250);
  useEffect(() => {
    const contours = useProjectStore.getState().contours;
    if (contours.length > 0) void generate(contours, debouncedSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSettings]);
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Devuelve el valor tras `delay` ms sin cambios. */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
