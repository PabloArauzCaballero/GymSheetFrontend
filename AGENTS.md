# Reglas del Proyecto GymSheet para Agentes de Gemini / Antigravity

Este archivo establece las directrices maestras para todos los agentes de Gemini que trabajan en este repositorio y sus ramas/worktrees.

## 1. Diseño y UI (CRÍTICO)
Consulta siempre el documento central de coordinación: [`COORDINACION_AGENTES_GEMINI.md`](file:///Users/pablo/Documents/GitHub/GymSheet/COORDINACION_AGENTES_GEMINI.md).

- **Cuidado con `colors.voltDim`:** En este proyecto `colors.voltDim` NO es transparente (es `#2E8B7B`, el mismo valor que `volt`). NUNCA colocar `color: colors.volt` dentro de `backgroundColor: colors.voltDim`.
- **Fondos con tinte:** Usar siempre `alpha(colors.volt, 0.12)` o `alpha(colors.volt, 0.16)`.
- **Tarjetas y selección:** Mantener `colors.surfaceHigh` o `alpha(colors.volt, 0.1)`. No pintar tarjetas enteras con verde sólido. Título siempre con `colors.text` (`#F5F8FA`).
- **Contraste WCAG 2.2 AA:** Mínimo 4.5:1 para texto normal. Textos dentro de rellenos `colors.volt` deben llevar `color: '#000000'` o `accentContrast()`.
- **Adaptabilidad móvil:** En componentes horizontales usar `flex: 1` en descripciones para no aplastar botones. Proteger la botonera inferior con `paddingBottom: spacing.md`.

## 2. Validación de Código
Antes de dar cualquier tarea por completada en la app móvil:
```bash
yarn workspace @gymsheet/mobile type-check
```
Garantizar que no se introduzcan regresiones de TypeScript ni errores de lint.
