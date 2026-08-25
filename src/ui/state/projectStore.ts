import { create } from "zustand";
import type { Contour } from "../../domain/entities/Contour";
import type { Assembly } from "../../domain/entities/Assembly";

/** Estado del proyecto según el ciclo de vida del SVG. */
export type ProjectStatus = "empty" | "parsing" | "generating" | "ready" | "error";

interface ProjectState {
  status: ProjectStatus;
  /** Nombre del archivo SVG cargado. */
  fileName: string | null;
  /** Contenido fuente del SVG (sin sanitizar aún; se sanitiza al procesar). */
  svgSource: string | null;
  /** Contornos extraídos del SVG. */
  contours: Contour[];
  /** Ensamblajes generados (uno por contorno). */
  assemblies: Assembly[];
  /** Mensaje de error si status === "error". */
  error: string | null;

  setSvgSource: (svg: string, fileName: string) => void;
  setStatus: (status: ProjectStatus, error?: string) => void;
  setContours: (contours: Contour[]) => void;
  setAssemblies: (assemblies: Assembly[]) => void;
  clear: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  status: "empty",
  fileName: null,
  svgSource: null,
  contours: [],
  assemblies: [],
  error: null,

  setSvgSource: (svgSource, fileName) =>
    set({ svgSource, fileName, status: "parsing", error: null }),

  setStatus: (status, error) => set((state) => ({ status, error: error ?? state.error })),

  setContours: (contours) =>
    set((state) => ({
      contours,
      status: contours.length > 0 ? state.status : "error",
    })),

  setAssemblies: (assemblies) =>
    set((state) => ({
      assemblies,
      status: assemblies.length > 0 ? "ready" : state.status,
    })),

  clear: () =>
    set({
      status: "empty",
      fileName: null,
      svgSource: null,
      contours: [],
      assemblies: [],
      error: null,
    }),
}));
