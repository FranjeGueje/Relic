# HISTORY_ADD.md

Este archivo registra cada funcionalidad nueva o modificación respecto a Heroic
que se añada a Relic.

El objetivo es mantener trazabilidad de los cambios respecto al padre.

---

## v0.2.0

| Fecha | Archivo | Cambio |
|---|---|---|
| 2026-07-17 | `AGENTS.md` | Añadida sección "Estructura del código": convención de subdirectorios `relic/` para código nuevo |
| 2026-07-17 | `AGENTS.md` | Añadido Zoom Platform y Sideload al Alcance |
| 2026-07-17 | `AGENTS.md` | Aclarado que Relic es Linux-only (sin macOS ni Windows) |
| 2026-07-17 | `AGENTS.md` | Añadida mención de ConsoleMode en Interfaz |
| 2026-07-17 | `AGENTS.md` | Actualizada sección Historial con referencias a HISTORY_REMOVE.md y HISTORY_ADD.md |
| 2026-07-17 | `package.json` | Version bump 0.1.0 → 0.2.0 |
| 2026-07-17 | `package.json` | Eliminados scripts `release:mac` y `release:linux` (Linux-only) |
| 2026-07-17 | `src/backend/logger/constants.ts` | Añadido LogPrefix.Relic para logs de módulos nuevos |
| 2026-07-17 | `src/backend/relic/steam_shortcuts/` | Nuevo módulo `addGameToSteam()` que usa protocolo `steam://addnonsteamgame` |
