# File Manager iOS

A premium local-first iOS file manager that makes files easier to find, organize, preview, and act on.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/file-manager-ios/app/(tabs)/` — mobile screens for Home, Files, Recent, Tools, and Settings
- `artifacts/file-manager-ios/constants/colors.ts` — shared light/dark visual tokens
- `artifacts/file-manager-ios/assets/images/icon.png` — generated Sift app icon
- `artifacts/api-server/` — shared Express API scaffold for future server-backed features

## Architecture decisions

- Phase 1 is local-first and uses AsyncStorage for device preferences; cloud and server-backed features can be added without blocking core file workflows.
- The first navigation surface uses five focused areas: Home, Files, Recent, Tools, and Settings.
- Files defaults to a visual grid and persists the user’s grid/list preference locally.
- Inter is loaded from the branded splash through every app screen for a polished, consistent product voice.
- Imported files are copied into Sift-managed local storage and classified by extension/MIME type; iOS does not permit third-party apps to become the universal system save default.

## Product

Home provides a storage overview, quick actions, recent files, favorites, and cleanup suggestions. Files provides search, type filters, sorting, grid/list views, and favorite controls. Tools and Settings establish the next feature areas for scanner, PDF, vault, and Pro flows.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
