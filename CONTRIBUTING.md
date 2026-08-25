# Contribuyendo a LEDSign3D

Gracias por tu interés en contribuir. Este documento resume cómo colaborar de
forma efectiva manteniendo la calidad del proyecto.

## Código de conducta

Sé respetuoso, constructivo y orientado a los detalles. La calidad del código
es la prioridad.

## Cómo empezar

1. Haz un fork del repositorio.
2. Crea una rama descriptiva: `feat/nombre`, `fix/nombre`, `docs/nombre`.
3. Instala dependencias: `npm install`.
4. Asegúrate de que todo está verde antes de abrir un PR:
   `npm run typecheck`, `npm run lint`, `npm test`.

## Estándares

- **Tipado estricto** (sin `any` innecesarios), nombres claros, funciones
  pequeñas con responsabilidad única.
- **Toda lógica nueva incluye tests** (unitario o integración según
  corresponda). Si algo es difícil de testear, es señal de que el diseño
  necesita ajustarse.
- La **arquitectura en capas** se respeta: `domain` y `application` no importan
  Three.js ni el DOM. Las librerías viven en `infrastructure`.
- Estados de carga, error y vacío siempre contemplados en la UI; accesibilidad
  básica (contraste, foco, labels).
- Sin código muerto ni comentarios obsoletos.

## Pruebas

- **Unitarias / integración:** `npm test`
- **Cobertura:** `npm run test:coverage` (umbrales: ≥80 % statements/lines,
  ≥75 % branches, ≥80 % functions).
- **E2E (Playwright):** `npx playwright install chromium && npm run test:e2e`

## Documentación

- Cambios de comportamiento o decisiones técnicas se reflejan en los **ADRs**
  (`docs/adr/`) y en el `README.md` si afectan a instalación/uso.
- Usa JSDoc para las APIs públicas.

## Proceso de PR

1. Mantén la rama al día con `main`.
2. Escribe un mensaje de commit descriptivo y conciso.
3. Abre el PR con una descripción clara: qué cambia, por qué y cómo se probó.
4. El CI ejecuta typecheck, lint, tests unitarios, build y e2e; debe pasar.

## Estructura del proyecto

Ver la sección "Arquitectura" del [README.md](README.md).
