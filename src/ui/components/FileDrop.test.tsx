// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { FileDrop } from "./FileDrop";
import { useProjectStore } from "../state/projectStore";

function makeFile(name: string, type: string, content = "<svg/>"): File {
  return new File([content], name, { type });
}

describe("FileDrop", () => {
  beforeEach(() => {
    useProjectStore.setState({
      status: "empty",
      fileName: null,
      svgSource: null,
      contours: [],
      assemblies: [],
      error: null,
    });
  });

  function selectFile(file: File): void {
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
  }

  it("carga un SVG y pone el proyecto en estado parsing", async () => {
    render(<FileDrop />);
    selectFile(makeFile("corazon.svg", "image/svg+xml", "<svg><rect/></svg>"));

    await waitFor(() => expect(useProjectStore.getState().status).toBe("parsing"));
    expect(useProjectStore.getState().svgSource).toBe("<svg><rect/></svg>");
    expect(useProjectStore.getState().fileName).toBe("corazon.svg");
  });

  it("rechaza un archivo que no es SVG con mensaje de error", async () => {
    render(<FileDrop />);
    selectFile(makeFile("foto.png", "image/png"));

    await waitFor(() => expect(useProjectStore.getState().status).toBe("error"));
    expect(useProjectStore.getState().error).toMatch(/SVG/);
  });

  it("rechaza un archivo mayor a 10 MB", async () => {
    render(<FileDrop />);
    const big = new File([new Uint8Array(11 * 1024 * 1024)], "grande.svg", {
      type: "image/svg+xml",
    });
    selectFile(big);

    await waitFor(() => expect(useProjectStore.getState().status).toBe("error"));
    expect(useProjectStore.getState().error).toMatch(/10 MB/);
  });
});
