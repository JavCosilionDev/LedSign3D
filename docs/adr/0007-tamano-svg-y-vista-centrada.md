# ADR-0007: Tamaño del letrero ("Configurar SVG") y vista 3D centrada

## Estado

Aceptado (v0.1.1).

## Contexto

Al importar un SVG pequeño (p. ej. un icono), el letrero resultante es
demasiado pequeño para ser imprimible o funcional. Además, la cuadrícula del
visor era fija y el modelo no quedaba centrado sobre ella.

## Decisiones

1. **Parámetro `svgMaxDimension` (grupo "Configurar SVG")**: representa la
   dimensión más larga deseada del bounding box del SVG **después de escalar**,
   en mm, con mínimo 50 y máximo 1000.
2. **Regla de escala (nunca encoge el original)**: el factor es
   `max(svgMaxDimension, dimensionOriginal) / dimensionOriginal`. Si el SVG ya
   supera el valor configurado, se mantiene su tamaño (escala 1); si es menor,
   se amplía hasta el valor configurado. La escala es uniforme y se aplica a
   todos los contornos y agujeros.
3. **La escala se aplica en el hilo principal** (función pura
   `applySvgScale` en dominio) justo antes de enviar los contornos al worker.
   Así, al cambiar solo el tamaño no se reenvía el SVG original; se regenera
   desde los contornos parseados almacenados.
4. **Vista 3D**: el modelo (todos los ensamblajes, distribuidos en una fila
   horizontal sin solaparse) se centra horizontalmente sobre el origen; la
   cuadrícula se redimensiona al bounding box del conjunto con ~30 % de margen
   y se coloca justo bajo la base del modelo. La cámara apunta al centro del
   modelo.

## Consecuencias

- Un SVG de 10×10 se muestra y genera a 50×50 mm por defecto; el usuario puede
  aumentarlo hasta 1000 mm, nunca por debajo de 50.
- La UI muestra en tiempo real "Ancho / Alto" del resultado escalado.
- La escala se refleja en la geometría generada y, por tanto, en los STL
  exportados.
- El layout y el cálculo de escala son funciones puras y testeables; el visor
  solo consume sus resultados.
