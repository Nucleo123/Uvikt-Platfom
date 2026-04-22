# UVIKT — Property Intelligence Platform

> **Dispara. Valida. Personaliza. Envía.**
>
> Multi-tenant property intelligence for Mexican real-estate brokers and investors.
> Upload a georeferenced photo from mobile or a validated address from desktop,
> enrich via SEPOMEX / SEDUVI / INEGI / commercial sources, and generate a branded
> client-facing commercial sheet — shareable online and exportable as PDF.

---

## Stack

| Layer       | Tech                                                            |
| ----------- | --------------------------------------------------------------- |
| Frontend    | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS     |
| Auth        | `iron-session` cookies + bcrypt (tenant- and role-aware)        |
| DB + ORM    | Prisma — SQLite for dev, PostgreSQL for production              |
| Jobs        | Pluggable queue (`inline` by default, BullMQ-ready)             |
| Maps        | Leaflet + OpenStreetMap tiles, Nominatim geocoder               |
| Storage     | Local filesystem in dev, pluggable S3 driver for production     |
| PDF export  | Puppeteer (headless Chromium) with graceful HTML fallback       |

---

## Quickstart

```bash
# 1. Install deps
npm install

# 2. Copy env
cp .env.example .env
#   The defaults use SQLite + inline queue + local storage — no extra services needed.

# 3. Create the database and seed the demo org
npx prisma db push
npm run db:seed

# 4. Start the dev server
npm run dev
```

Open http://localhost:3000 and log in with:

| Role       | Email                    | Password    |
| ---------- | ------------------------ | ----------- |
| Admin      | admin@demo.uvikt.mx      | demo12345   |
| Broker     | broker@demo.uvikt.mx     | demo12345   |
| Investor   | investor@demo.uvikt.mx   | demo12345   |

The seed creates a fully-enriched demo property (Av. Calz. Las Águilas 1280,
Álvaro Obregón, CDMX) and a public shareable report. After logging in, open
**Propiedades → Local comercial esquina** to see the final product.

---

## Architecture

```
uvikt-platform/
├── prisma/
│   ├── schema.prisma         ← multi-tenant schema (organizations, users, properties, ...)
│   └── seed.ts               ← demo data + demo property + demo report
├── src/
│   ├── app/
│   │   ├── (app)/            ← authenticated dashboard routes
│   │   │   ├── dashboard/
│   │   │   ├── properties/   ← list, new wizard, detail, edit
│   │   │   ├── pipeline/     ← investor Kanban
│   │   │   └── admin/        ← branding, sources, users, market
│   │   ├── r/[token]/        ← public shareable report + /pdf endpoint
│   │   ├── api/              ← route handlers (auth, properties, upload, geocode, admin)
│   │   ├── login/ register/  ← auth pages
│   │   └── page.tsx          ← landing
│   ├── components/           ← React components (PropertyWizard, MapView, ReportView, …)
│   ├── lib/                  ← db, auth, rbac, tenant helpers
│   └── server/
│       ├── connectors/       ← SEPOMEX / SEDUVI / INEGI / commercial connector interfaces + stubs
│       ├── jobs/             ← queue abstraction + enrichment pipeline + standalone worker
│       └── services/         ← property, report, storage, audit, kmz domain services
└── README.md
```

### Core domain flow

```
             ┌─────────────────────────────────────────────────────────┐
             │                     Property Wizard                     │
             │   (mobile photo  OR  desktop validated address form)    │
             └─────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                         POST /api/properties
                                       │
                                       ▼
                  services/property.ts  ──▶  Prisma write
                  (address + location + media + audit)
                                       │
                                       ▼
                      jobs/queue.ts::enqueue("enrich_property")
                                       │
                                       ▼
          ┌──────────── jobs/enrichment.ts::enrichProperty ────────────┐
          │   SEPOMEX ─────▶ PropertySourceRecord + PropertyAddress    │
          │   SEDUVI  ─────▶ landUse + polygonGeoJson + fichaUrl       │
          │   INEGI   ─────▶ PropertyDemographics (per radius)         │
          │   commerc ─────▶ PropertyCommercialContext (per radius)    │
          └────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                   Property.status ▶ validated / enriched / report_ready
                                       │
                                       ▼
                      services/report.ts::generateReport
                                       │
                                       ▼
                  GeneratedReport (snapshotJson + shareToken)
                     ├──▶ /r/[token]       (public branded HTML)
                     ├──▶ /r/[token]/pdf   (Puppeteer-rendered PDF)
                     └──▶ /api/properties/[id]/kmz (KMZ export)
```

---

## Business rules enforced in code

- **Report-ready gate:** a property cannot move to `report_ready` until it has a
  primary address (validated by SEPOMEX with `success` or `partial` confidence)
  and at least one enrichment hit from SEDUVI + INEGI.
- **Immutable original coordinates:** geophoto EXIF coords are stored as
  `PropertyLocation.kind = "original"` and never mutated. Pin corrections
  create a second record with `kind = "corrected"`.
- **Broker vs. source fields:** `PropertySourceRecord` preserves every raw +
  normalized connector payload. The typed `Property.*` columns store the
  _preferred_ value, and broker input always wins over source data.
- **Partial enrichment:** each source runs independently; a failure in one
  does not block the others. The report UI renders only the sections it has data
  for and does not expose "missing" placeholders to the end client.
- **Configurable radii:** `Organization.demographicRadiiMeters` is a CSV
  (default `500,1000,5000`). The brief's mock used `250,500` while the process
  description used `500,1000,5000`; the admin Branding page lets each tenant
  pick their own.
- **Tokenized share links:** public reports use a `nanoid(24)` token, optional
  expiry date, and a `publicAllowed` flag. Revocation is a single column update.
- **Tenant isolation:** every tenant-scoped API handler calls `requireContext()`
  + `assertOwnsProperty()` before reading or mutating data.

---

## Environment variables

See [.env.example](.env.example) for the full list. Key groups:

| Group       | Variables                                                       |
| ----------- | --------------------------------------------------------------- |
| Core        | `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`                           |
| Auth        | `AUTH_SECRET` (32+ chars)                                       |
| Storage     | `STORAGE_DRIVER`, `STORAGE_LOCAL_DIR`, `S3_*`                   |
| Maps        | `GEOCODER_PROVIDER`, `NOMINATIM_BASE_URL`, `MAPBOX_ACCESS_TOKEN`, `GOOGLE_MAPS_API_KEY` |
| Connectors  | `SEPOMEX_*`, `SEDUVI_*`, `INEGI_*`, `COMMERCIAL_*`              |
| Queue       | `QUEUE_DRIVER`, `REDIS_URL`                                     |
| PDF         | `PDF_DRIVER`                                                    |

---

## Implemented modules (Phase 1 MVP)

- [x] Auth + multi-tenancy (organizations, users, memberships, roles)
- [x] RBAC — `admin` / `broker` / `investor`
- [x] Property ingestion wizard (mobile photo + desktop address)
- [x] Geolocation capture and reverse geocoding
- [x] Address validation scaffolding (SEPOMEX connector)
- [x] Enrichment engine with typed source records
- [x] SEPOMEX / SEDUVI / INEGI / commercial connector interfaces
- [x] Inline job queue + standalone worker script
- [x] Property detail page (facts, map, demographics, commercial, land use)
- [x] Portfolio list + filters + map view
- [x] Investor pipeline (Kanban)
- [x] Branded HTML report + PDF export + tokenized share link
- [x] KMZ export endpoint
- [x] Admin: branding, sources, users, aggregate market
- [x] Audit log for sensitive actions
- [x] Demo seed with one fully-enriched property and a pre-generated report

---

## Mocked integrations (swap to production)

All connectors live in `src/server/connectors/*.ts` behind a typed interface
(`ConnectorResult<T>`). The MVP ships deterministic stubs so the pipeline runs
end-to-end without external dependencies.

| Connector    | Stub behavior                                                  | Production hookup                                                       |
| ------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| SEPOMEX      | Known CPs → neighborhoods; unknown → `partial` status          | Copomex API, SepoMex.io, or direct Correos de México feed              |
| SEDUVI       | Synthesized polygon around coords + heuristic land-use code    | CDMX SEDUVI "Ficha de uso de suelo" service + catastro parcel API      |
| INEGI        | Deterministic pseudo-random demographics keyed off coords      | INEGI WSC + censo geostats with AGEB/manzana buffer intersection       |
| Commercial   | Synthetic brand/category counts with realistic density curves  | DENUE-paid, bank BIN feeds, automotive dealer networks, etc.           |
| Geocoder     | Nominatim (OSM) — rate-limited, requires polite User-Agent     | Mapbox, Google Maps, Azure Maps — add a new driver in `geocoder.ts`    |

Every connector obeys the same contract:

```ts
ConnectorResult<T> = {
  source: string;
  status: "success" | "partial" | "failed";
  confidence?: number;
  fetchedAt: string;
  raw: unknown;
  normalized: T;
  error?: string;
}
```

This means a paid SEDUVI feed replaces the stub without the report UI, job
pipeline, or audit logging needing to change.

---

## Next steps to production

### Immediate
- [ ] Migrate `schema.prisma` datasource from SQLite to PostgreSQL (`provider = "postgresql"`).
- [ ] Swap `STORAGE_DRIVER` to `s3` and implement the uploader.
- [ ] Swap `QUEUE_DRIVER` to `bullmq`; run `npm run worker` in a separate container.
- [ ] Move PDF rendering to a dedicated Chromium instance (Browserless / @sparticuz/chromium on Lambda).
- [ ] Generate a strong `AUTH_SECRET` and rotate periodically.
- [ ] Add rate limiting to `/api/auth/*` and `/api/upload`.
- [ ] Add Sentry / OpenTelemetry for observability.
- [ ] Wire a real SEDUVI + SEPOMEX + INEGI feed.

### Phase 2
- [ ] Investor RTZ (radio de influencia) visualization on the map — isochrones instead of fixed circles.
- [ ] Aggregate national market intelligence (cross-org dashboard with anonymized metrics).
- [ ] Paid commercial data connectors (DENUE-paid, bank coverage, automotive).
- [ ] Improved parcel/polygon handling (real catastral joins instead of synthetic squares).
- [ ] Proper KMZ (zipped KML + embedded hero photo + styled placemarks).
- [ ] Analytics dashboard (time-on-market, price/m², CapEx by zone, etc.).
- [ ] Broker invitations + SSO (SCIM / SAML).
- [ ] Public report password protection + viewer analytics.

---

## Scripts

| Script              | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Next.js dev server                                  |
| `npm run build`     | Prisma generate + production build                  |
| `npm run start`     | Production Next.js server                           |
| `npm run db:push`   | Push schema to DB without a migration               |
| `npm run db:migrate`| Create a new migration                              |
| `npm run db:seed`   | Seed demo org + users + property + report          |
| `npm run db:reset`  | **Destructive:** wipe and re-seed                  |
| `npm run worker`    | Standalone job worker (for `QUEUE_DRIVER=bullmq`)   |

---

## License

Proprietary — all rights reserved.
