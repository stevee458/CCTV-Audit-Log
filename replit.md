# Digital Inspection App

Responsive web app for recording CCTV review outcomes from bus depots. Two roles:
- **Inspector** (mobile-first): create inspections, add findings (violation / no-violation), complete.
- **Admin** (desktop-first): monitor KPIs, filter inspections, view detail, export CSV, manage users.

## Stack
- pnpm monorepo, TypeScript everywhere
- Backend: Express 5, drizzle-orm + Postgres, cookie-session auth (bcryptjs), Zod validation generated from OpenAPI
- Frontend: React + Vite + wouter + TanStack Query + shadcn/ui (Tailwind v4)
- Codegen: `lib/api-spec/openapi.yaml` -> Orval -> `@workspace/api-client-react`

## Auth
- POST `/api/auth/login` sets httpOnly `inspection_session` cookie (32-byte token, 30d).
- Demo accounts (seeded): `admin@demo.local / admin123`, `inspector@demo.local / inspector123`.
- Backend middlewares: `requireAuth`, `requireAdmin`. Inspectors are restricted server-side to their own inspections/findings.

## Data Model (`lib/db/src/schema/index.ts`)
- `users`, `sessions`, `depots`, `venues` (with `nextClipNumber` per venue), `violation_categories`, `violation_sub_categories`, `inspections`, `findings`.
- Reference data (depots, venues, violations) is hard-coded and seeded on boot (`artifacts/api-server/src/lib/seed.ts`); not admin-editable.

## Clip naming
- Format: `P_<VenueCode>_NNN` (e.g. `P_PU01_001`).
- Generated atomically inside a transaction in `routes/findings.ts` using `UPDATE venues SET next_clip_number = next_clip_number + 1 RETURNING`.

## Frontend routing (`artifacts/inspection-app/src/App.tsx`)
- Public: `/login`
- Inspector: `/inspector`, `/inspector/new`, `/inspector/inspection/:id`
- Admin: `/admin`, `/admin/inspections`, `/admin/inspections/:id`, `/admin/users`
- `AuthProvider` + `ProtectedRoute` in `src/lib/auth.tsx`.

## CSV export
- Client-side, in `pages/admin/InspectionsList.tsx` — exports the currently filtered list with header + UTF-8 BOM.

## Workflows
- `artifacts/api-server: API Server` (port 8080)
- `artifacts/inspection-app: web` (Vite, served via path `/`)
- `artifacts/mockup-sandbox: Component Preview Server`

## Notes / Gotchas
- Admin filter `Select` components use sentinel values `"all"` / `"none"` for "any"; query layer in `InspectionsList.tsx` strips them.
- `NewInspection.tsx` coerces `depotId` from the Select string to number before looking up venues.
- Cookie is `secure: false` for dev — must be flipped for production HTTPS.
