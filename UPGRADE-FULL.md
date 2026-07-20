# UPGRADE-FULL.md — Actualización completa a versiones latest stable

## Current vs Target Versions

| Package | Current | Target | Type |
|---------|---------|--------|------|
| **Node.js** | v24.16.0 | v24.16.0 | Already latest LTS |
| **pnpm** | 10.28.0 | 10.28.0+ | Minor bump |
| **TypeScript** | 5.8.3 | **5.9.3** | Minor (NOT 7.x) |
| **Electron** | 41.9.0 | 43.1.1 | Major |
| **electron-vite** | 3.1.0 | 5.0.0 | Major |
| **electron-builder** | 26.8.1 | 26.15.3 | Minor |
| **electron-store** | 8.2.0 | 9.0.0 | Major |
| **electron-updater** | 6.8.3 | 6.8.9 | Patch |
| **React** | 18.3.1 | 19.2.7 | Major |
| **react-dom** | 18.3.1 | 19.2.7 | Major |
| **react-router-dom** | 6.30.0 | 7.18.1 | Major |
| **react-i18next** | 12.3.1 | 15.0.3 | Major |
| **@mui/material** | 5.17.1 | 9.2.0 | **4 major versions** |
| **@mui/icons-material** | 5.17.1 | 9.2.0 | **4 major versions** |
| **@emotion/react** | (missing) | 11.14.0 | New explicit dep |
| **@emotion/styled** | (missing) | 11.14.1 | New explicit dep |
| **eslint** | 9.29.0 | 9.39.5 | Minor |
| **@eslint/js** | 9.29.0 | 9.39.5 | Minor |
| **typescript-eslint** | 8.34.1 | 8.65.0 | Minor |
| **@types/node** | 22.19.3 | 26.1.1 | Major |
| **@types/react** | 18.3.20 | 19.2.17 | Major |
| **@types/react-dom** | 18.3.7 | 19.2.3 | Major |
| **@testing-library/react** | 14.3.1 | 16.3.2 | Major |
| **@testing-library/dom** | 9.3.4 | 10.4.1 | Major |
| **ts-jest** | 29.3.2 | 29.4.11 | Minor |
| **sass** | 1.87.0 | 1.101.0 | Minor |
| **zod** | 3.24.3 | 4.4.3 | Major |
| **recharts** | 2.15.3 | 3.10.0 | Major |
| **@hello-pangea/dnd** | 18.0.1 | 18.0.1 | Already latest |
| **@vitejs/plugin-react-swc** | 3.9.0 | 4.3.1 | Major |
| **@playwright/test** | 1.55.1 | 1.61.1 | Minor |
| **@types/react-router-dom** | 5.3.3 | **REMOVE** | Types bundled in v7 |

---

## Critical Constraints

1. **TypeScript CANNOT go to 7.x** — `typescript-eslint@8.x` requires `typescript <6.1.0`. Max is 5.9.3.
2. **`@emotion/react` + `@emotion/styled` must be added as explicit deps** — MUI 5→9 requires them. Current build error is caused by their absence.
3. **react-router-dom 7** uses `react-router` as core. API is largely backward-compatible in library mode (Electron app), but `@types/react-router-dom` should be removed (types bundled in v7).
4. **MUI 5→9** is the riskiest change — 39 files affected, 4 major version jumps. Basic component APIs are stable but import paths and some props may have changed.
5. **electron-store 9** is ESM-only. May require import changes.
6. **Zod 4** is a major rewrite of the API. May require code changes.
7. **`@types/node` patch** (`patches/@types__node@22.19.3.patch`) must be removed/updated when upgrading to `@types/node@26`.

---

## Phase 1: Toolchain (low risk)

- [ ] `package.json`: Change `engines.node` from `">=22"` to `">=24"`
- [ ] `shell.nix`: Change `nodejs_22` → `nodejs_24`
- [ ] `package.json`: Update `packageManager` to latest pnpm 10.x
- [ ] `package.json`: Change `--target=node21` → `--target=node24` in esbuild scripts (2 scripts)
- [ ] `.npmrc`: Remove or update `node-linker=hoisted` (deprecated in npm 10+)
- [ ] Delete `pnpm-lock.yaml` and `package-lock.json` (clean reinstall)
- [ ] Run `pnpm install` and verify

---

## Phase 2: Core framework (medium-high risk)

- [ ] `electron` → ^43.1.1
- [ ] `electron-vite` → ^5.0.0
- [ ] `electron-builder` → ^26.15.3
- [ ] `electron-store` → ^9.0.0
- [ ] `electron-updater` → ^6.8.9
- [ ] Update `electron.vite.config.ts` if electron-vite 5 has config changes
- [ ] Update electron-store imports if API changed (v9 is ESM-only)
- [ ] Verify build compiles

---

## Phase 3: React ecosystem (high risk)

- [ ] `react` → ^19.2.7
- [ ] `react-dom` → ^19.2.7
- [ ] `@types/react` → ^19.2.17
- [ ] `@types/react-dom` → ^19.2.3
- [ ] `react-router-dom` → ^7.18.1
- [ ] **REMOVE** `@types/react-router-dom` (types bundled in v7)
- [ ] `react-i18next` → ^15.0.3
- [ ] `@testing-library/react` → ^16.3.2
- [ ] `@testing-library/dom` → ^10.4.1
- [ ] Update `App.tsx` router if react-router-dom 7 API changed
- [ ] Fix React 19 breaking changes:
  - [ ] Ref as prop (no more forwardRef needed in most cases)
  - [ ] Removal of defaultProps for function components
  - [ ] Cleanup of legacy context API
  - [ ] Other deprecations
- [ ] Verify build + tests

---

## Phase 4: MUI (highest risk — 39 files)

- [ ] `@mui/material` → ^9.2.0
- [ ] `@mui/icons-material` → ^9.2.0
- [ ] **ADD** `@emotion/react` → ^11.14.0 as explicit dependency
- [ ] **ADD** `@emotion/styled` → ^11.14.1 as explicit dependency
- [ ] Update `App.tsx` theme (`createTheme` API may have changed)
- [ ] Update `Dialog.tsx` (`styled()` usage)
- [ ] Update import paths in all 39 affected files if needed
- [ ] Fix any changed component APIs (Dialog, MenuItem, Select, etc.)
- [ ] Verify build + tests

### Files affected by MUI (39):

**`@mui/material` components (22 files):**
- `src/frontend/App.tsx` — ThemeProvider, createTheme
- `src/frontend/components/UI/Dialog/Dialog.tsx` — MuiDialog, DialogContent, IconButton, Paper, styled
- `src/frontend/components/UI/Dialog/DialogHeader.tsx` — DialogTitle
- `src/frontend/components/UI/SIDLogin/index.tsx` — Paper, Typography, Button, Stack, CircularProgress, Icon
- `src/frontend/components/UI/SelectField/index.tsx` — Select, MenuItem, SelectChangeEvent
- `src/frontend/components/UI/InstallModal/index.tsx` — Box, MenuItem, SvgIcon
- `src/frontend/components/UI/WindowControls/index.tsx` — IconButton
- `src/frontend/components/UI/WebviewControls/index.tsx` — IconButton
- `src/frontend/components/UI/ContextMenu/index.tsx` — Menu, MenuItem, ListItemIcon
- `src/frontend/screens/Game/GamePage/index.tsx` — Tab, Tabs
- `src/frontend/screens/Game/GamePage/components/GameStatus.tsx` — LinearProgress
- `src/frontend/screens/Game/GamePage/components/DownloadSizeInfo.tsx` — (icons only)
- `src/frontend/screens/Game/GamePage/components/InstalledInfo.tsx` — (icons only)
- `src/frontend/screens/Game/GameSubMenu/index.tsx` — (icons only)
- `src/frontend/screens/Game/InstallButton.tsx` — (icons only)
- `src/frontend/screens/Library/components/GameCard/index.tsx` — (icons only)
- `src/frontend/screens/Library/components/InstallModal/index.tsx` — Box, MenuItem
- `src/frontend/screens/Library/components/ContextMenu/index.tsx` — (icons only)
- `src/frontend/screens/Settings/index.tsx` — (icons only)
- `src/frontend/screens/DownloadManager/components/CurrentDownload/index.tsx` — Box, LinearProgress, Typography, Badge
- `src/frontend/screens/DownloadManager/components/ProgressHeader/index.tsx` — Box, LinearProgress, Typography
- `src/frontend/screens/DownloadManager/components/ProgressDialog/index.tsx` — LinearProgress
- `src/frontend/screens/Settings/components/MaxWorkers.tsx` — MenuItem
- `src/frontend/screens/Settings/components/GameLanguageSelector.tsx` — MenuItem
- `src/frontend/screens/Settings/components/BuildSelector.tsx` — MenuItem
- `src/frontend/screens/Settings/components/BranchSelector.tsx` — MenuItem
- `src/frontend/screens/Settings/components/ClearCache.tsx` — (icons only)
- `src/frontend/screens/Settings/components/ResetRelic.tsx` — (icons only)
- `src/frontend/components/UI/CategoriesManager/index.tsx` — DialogContent
- `src/frontend/components/UI/EditGameDialog/index.tsx` — (icons only)
- `src/frontend/components/UI/PathSelectionBox/index.tsx` — (icons only)
- `src/frontend/components/UI/TwoColTableInput/index.tsx` — (icons only)
- `src/frontend/components/UI/TextWithProgress/index.tsx` — CircularProgress
- `src/frontend/components/UI/RestoreWindow.tsx` — createSvgIcon
- `src/frontend/components/UI/ErrorComponent/index.tsx` — (icons only)
- `src/frontend/components/UI/InfoBox/index.tsx` — (icons only)
- `src/frontend/screens/Login/components/LanguageSelector/index.tsx` — MenuItem
- `src/frontend/screens/Login/components/ThemeSelector/index.tsx` — MenuItem
- `src/frontend/screens/Library/components/ModifyInstallModal/GOG/index.tsx` — Tab, Tabs

---

## Phase 5: TypeScript & linting (medium risk)

- [ ] `typescript` → ^5.9.3 (NOT 7.x)
- [ ] `typescript-eslint` → ^8.65.0
- [ ] `@types/node` → ^26.1.1
- [ ] **REMOVE** `patches/@types__node@22.19.3.patch` and update `pnpm-workspace.yaml` patch config
- [ ] `ts-jest` → ^29.4.11
- [ ] Fix deprecated `globals` config in `jest.config.js` (use `transform` instead)
- [ ] Verify type checking passes

---

## Phase 6: Other dependencies (low-medium risk)

- [ ] `zod` → ^4.4.3 (major rewrite — may require API changes)
- [ ] `recharts` → ^3.10.0 (major)
- [ ] `@vitejs/plugin-react-swc` → ^4.3.1 (major)
- [ ] `@playwright/test` → ^1.61.1
- [ ] All remaining minor/patch bumps via `pnpm update`
- [ ] Run full `pnpm update` to catch everything

---

## Phase 7: Verify

- [ ] `pnpm install` — clean install, no errors
- [ ] `pnpm run codecheck` — TypeScript compiles clean
- [ ] `pnpm run test` — all tests pass
- [ ] `pnpm run lint` — no lint errors
- [ ] `pnpm run dist:linux` — full build succeeds
- [ ] Manual smoke test if possible

---

## Risk Assessment

| Phase | Risk | Effort | Files affected |
|-------|------|--------|----------------|
| Phase 1: Toolchain | Low | 5 min | 3-4 config files |
| Phase 2: Core framework | Medium | 15-30 min | Config + imports |
| Phase 3: React ecosystem | High | 30-60 min | 18 router files + React 19 migration |
| Phase 4: MUI | **Highest** | 1-3 hours | **39 files** |
| Phase 5: TS & linting | Medium | 15-30 min | Config + patch |
| Phase 6: Other deps | Low | 15 min | Minimal |
| Phase 7: Verify | Medium | 30-60 min | Fixes as needed |
