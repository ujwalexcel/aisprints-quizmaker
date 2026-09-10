Date created: September 10, 2026
Date last modified: September 10, 2026 (mcqs table: `question` + `created_by_user_id`)

# MCQ CRUD - Technical PRD

## Overview/Problem

Teachers using the quiz maker can register, log in, and reach a protected `/mcqs` page, but that page is only a stub. There is no way to create, view, edit, delete, or preview multiple-choice questions in the shared test bank.

This feature adds full MCQ CRUD: teachers manage questions with two to six answer choices, preview how a question appears to learners, and record attempts when a choice is selected in preview. The existing authentication flow must continue to work without regression.

**Builds on:** [`Register_login_and_logout_prd.md`](Register_login_and_logout_prd.md) — session cookies, `UserService`, D1 `DB` binding, Vitest TDD workflow, shadcn/ui patterns, and API route conventions.

---

## Hypothesis

We believe that providing authenticated MCQ create, list, update, delete, and preview capabilities will let teachers collaboratively build and maintain a shared multiple-choice test bank without leaving the application.

---

## Scope

### In Scope

- D1 migration for `mcqs`, `mcq_choices`, and `mcq_attempts` tables (local apply only unless operator requests remote)
- Schema contract module and migration tests (same pattern as `users-schema`)
- `McqService` in `src/lib/services/` for all MCQ-related D1 access
- Zod validation schemas for MCQ payloads (create, update, attempt)
- Authenticated HTTP API routes under `src/app/api/mcqs/`
- Expanded `/mcqs` list page with shadcn `Table`, actions dropdown, and **Create MCQ** button
- Shared create/edit page for MCQs (`/mcqs/new`, `/mcqs/[id]/edit`)
- Preview via shadcn `Dialog` (read-only question + choices; optional attempt recording)
- Delete confirmation via shadcn `AlertDialog`
- **Test-driven development with Vitest** — RED → GREEN → REFACTOR → VERIFY per phase
- Phase-by-phase implementation with **stop for review** after each phase
- Reuse existing session auth (`getSession`, `SESSION_COOKIE_NAME`) for route and API protection

### Out of Scope

- Student-facing quiz delivery or timed assessments
- Sharing MCQs between organizations or permission tiers per question
- MCQ versioning or audit history beyond `created_at` / `updated_at`
- Bulk import/export (CSV, QTI)
- Rich text / images in question or choice text (plain text only)
- AI-generated questions
- End-to-end browser automation (Playwright/Cypress)
- Production deploys or remote D1 migrations (operator-managed)
- Changes to register, login, or logout behavior except regression fixes

### Cut

- **Filtering list by creator** — `created_by_user_id` is stored and returned in API responses, but the list UI shows all MCQs for all teachers (shared bank). Per-user filters may be added later.
- **Updating `created_by_user_id` on edit** — Creator is set once at insert from the authenticated session; edit does not change it.
- **Separate preview route** — Preview opens in a `Dialog` from the list page rather than a dedicated `/mcqs/[id]/preview` URL, to keep navigation simple. Can add a route later if needed.
- **Server Actions for MCQ mutations** — Follow auth PRD precedent: explicit route handlers in `src/app/api/` for HTTP clarity and testability.
- **react-hook-form** — Use controlled inputs + Zod + shadcn `Field` / `FieldError`, consistent with signup/login forms.

---

## Technical Requirements

### Database Schema

Three new tables. Migration file: `migrations/0002_create_mcq_tables.sql` (exact filename from Wrangler).

Foreign keys use `ON DELETE CASCADE` so deleting an MCQ removes its choices and attempts.

```sql
-- MCQ questions
CREATE TABLE mcqs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  question TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_mcqs_created_at ON mcqs (created_at);
CREATE INDEX idx_mcqs_created_by_user_id ON mcqs (created_by_user_id);

-- Answer choices (2–6 per MCQ, enforced in application layer)
CREATE TABLE mcq_choices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  mcq_id TEXT NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mcq_id) REFERENCES mcqs (id) ON DELETE CASCADE
);

CREATE INDEX idx_mcq_choices_mcq_id ON mcq_choices (mcq_id);

-- User attempts (e.g. from preview or future quiz flow)
CREATE TABLE mcq_attempts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  mcq_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  choice_id TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mcq_id) REFERENCES mcqs (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (choice_id) REFERENCES mcq_choices (id) ON DELETE CASCADE
);

CREATE INDEX idx_mcq_attempts_mcq_id ON mcq_attempts (mcq_id);
CREATE INDEX idx_mcq_attempts_user_id ON mcq_attempts (user_id);
```

| Table | Column | Type | Notes |
|-------|--------|------|-------|
| `mcqs` | `id` | TEXT PK | Opaque identifier |
| `mcqs` | `name` | TEXT | Required; short display name for the list |
| `mcqs` | `question` | TEXT | Required; the full question text |
| `mcqs` | `created_by_user_id` | TEXT FK | References `users.id`; set from session on create |
| `mcqs` | `created_at`, `updated_at` | DATETIME | Auto-managed |
| `mcq_choices` | `id` | TEXT PK | |
| `mcq_choices` | `mcq_id` | TEXT FK | Parent MCQ |
| `mcq_choices` | `choice_text` | TEXT | Required |
| `mcq_choices` | `is_correct` | INTEGER | SQLite boolean: `0` or `1` |
| `mcq_attempts` | `id` | TEXT PK | |
| `mcq_attempts` | `mcq_id` | TEXT FK | Question attempted |
| `mcq_attempts` | `user_id` | TEXT FK | References `users.id` |
| `mcq_attempts` | `choice_id` | TEXT FK | Selected choice |
| `mcq_attempts` | `is_correct` | INTEGER | Whether selection matched correct choice |
| `mcq_attempts` | `created_at` | DATETIME | Attempt timestamp |

**Business rules (enforced in service + Zod, not DB CHECK constraints):**

- `name` and `question` must be non-empty after trim.
- `created_by_user_id` must reference an existing user; set from session on create only.
- Each MCQ must have **2–6** choices.
- Each MCQ must have **exactly one** choice marked `is_correct = 1`.
- Choice text must be non-empty after trim.

**Migration setup (local only by default):**

1. `npx wrangler d1 migrations create aisprints-quizmaker-db create_mcq_tables`
2. Place SQL above in the generated file (or sync from `src/lib/db/mcq-schema.ts` contract)
3. `npx wrangler d1 migrations apply aisprints-quizmaker-db --local`
4. **Do not** apply `--remote` unless the operator explicitly requests it

### API Endpoints

All routes require a valid session cookie. Unauthenticated requests return **401**.

Session is read from the `session` cookie via `getSession()` (see `src/lib/auth/session.ts`). Route handlers call `McqService`; they do not query D1 directly.

#### GET /api/mcqs

List all MCQs (summary rows for the table; no nested choices required for list).

**Response:**

- Success (200): `{ "mcqs": [{ "id", "name", "question", "createdByUserId", "createdAt", "updatedAt" }] }`
- Error (401): Not authenticated
- Error (500): Server error

#### POST /api/mcqs

Create an MCQ with choices.

**Request Body:**

```json
{
  "name": "Photosynthesis basics",
  "question": "Which inputs are required for photosynthesis?",
  "choices": [
    { "choiceText": "Water and CO2", "isCorrect": true },
    { "choiceText": "Only oxygen", "isCorrect": false }
  ]
}
```

`createdByUserId` is **not** accepted in the request body — it is set server-side from the authenticated session.

**Response:**

- Success (201): `{ "mcq": { "id", "name", "question", "createdByUserId", "choices": [...], "createdAt", "updatedAt" } }`
- Error (400): Validation error (choice count, no correct answer, empty fields)
- Error (401): Not authenticated
- Error (500): Server error

#### GET /api/mcqs/[id]

Get one MCQ with all choices.

**Response:**

- Success (200): `{ "mcq": { "id", "name", "question", "createdByUserId", "choices": [...], "createdAt", "updatedAt" } }`
- Error (401): Not authenticated
- Error (404): MCQ not found
- Error (500): Server error

#### PUT /api/mcqs/[id]

Update MCQ name, question, and choices (replace choices set). `createdByUserId` is not modified.

**Request Body:** Same shape as POST create.

**Response:**

- Success (200): Updated `mcq` object
- Error (400): Validation error
- Error (401): Not authenticated
- Error (404): MCQ not found
- Error (500): Server error

#### DELETE /api/mcqs/[id]

Delete an MCQ (cascades to choices and attempts).

**Response:**

- Success (200): `{ "success": true }`
- Error (401): Not authenticated
- Error (404): MCQ not found
- Error (500): Server error

#### POST /api/mcqs/[id]/attempts

Record a user attempt (e.g. when submitting an answer in preview).

**Request Body:**

```json
{
  "choiceId": "choice-uuid"
}
```

**Response:**

- Success (201): `{ "attempt": { "id", "mcqId", "userId", "choiceId", "isCorrect", "createdAt" } }`
- Error (400): Invalid choice or choice does not belong to MCQ
- Error (401): Not authenticated
- Error (404): MCQ or choice not found
- Error (500): Server error

#### GET /api/mcqs/[id]/attempts

List attempts for an MCQ (for future analytics; optional in UI for this phase).

**Response:**

- Success (200): `{ "attempts": [...] }`
- Error (401): Not authenticated
- Error (404): MCQ not found
- Error (500): Server error

### McqService

Location: `src/lib/services/mcq-service.ts`

Server-only module (`import "server-only"`). Mirrors `user-service.ts` patterns.

| Method | Purpose |
|--------|---------|
| `listMcqs()` | All MCQs, ordered by `updated_at` DESC |
| `getMcqById(id)` | MCQ + choices, or null |
| `createMcq(input, createdByUserId)` | Insert MCQ + choices; set `created_by_user_id` from session |
| `updateMcq(id, input)` | Update MCQ; replace choices |
| `deleteMcq(id)` | Delete MCQ (cascade) |
| `createAttempt(mcqId, userId, choiceId)` | Insert attempt; set `is_correct` from choice |
| `listAttemptsByMcqId(mcqId)` | All attempts for an MCQ |

Public types use camelCase (`question`, `createdByUserId`, `choiceText`, `isCorrect`, `createdAt`). D1 rows use snake_case internally.

### Validation

Location: `src/lib/validations/mcq.ts`

| Schema | Purpose |
|--------|---------|
| `mcqChoiceSchema` | `choiceText` (min 1), `isCorrect` (boolean) |
| `createMcqSchema` | `name`, `question`, `choices` (array length 2–6, exactly one `isCorrect: true`) |
| `updateMcqSchema` | Same as create |
| `createAttemptSchema` | `choiceId` (non-empty string) |

### Authentication helper

Location: `src/lib/auth/require-session.ts` (new)

Shared by API routes and optionally server pages:

```typescript
// Returns { userId } or null; routes return 401 when null
export function requireSession(cookieValue: string | undefined): { userId: string } | null
```

Wraps `getSession()` from `src/lib/auth/session.ts`.

### User Interface Requirements

#### MCQ List (`/mcqs`)

Replaces the current stub (`src/app/mcqs/page.tsx`).

- Page header: title, signed-in user context, **Logout** (keep `LogoutButton`)
- **Create MCQ** button → navigates to `/mcqs/new`
- shadcn `Table` columns:
  - **Name** — `mcq.name`
  - **Question** — `mcq.question`, truncated if long
  - **Created** — formatted `createdAt`
  - **Updated** — formatted `updatedAt`
  - **Actions** — shadcn `DropdownMenu` with ⋮ trigger (`MoreVertical` icon)
- Dropdown actions:
  - **Edit** → `/mcqs/[id]/edit`
  - **Preview** → opens `McqPreviewDialog` (client component)
  - **Delete** → opens `AlertDialog` confirmation; on confirm, `DELETE /api/mcqs/[id]` and refresh list
- Empty state when no MCQs: message + **Create MCQ** CTA
- Loading and error states for fetch failures

#### Create MCQ (`/mcqs/new`)

- Shared form component: `McqForm` (client)
- Fields: **Name** (`Input`), **Question** (`Textarea`)
- **Choices** section:
  - Default **2** choice rows on create
  - Each row: choice text (`Input`), correct marker (`RadioGroup` — one correct across all choices)
  - **Add choice** button (disabled at 6 choices)
  - **Remove choice** button per row (disabled when only 2 remain)
- **Save** → `POST /api/mcqs` → redirect to `/mcqs`
- **Cancel** → navigate to `/mcqs` without saving
- Client + server validation via Zod; errors in `FieldError`

#### Edit MCQ (`/mcqs/[id]/edit`)

- Same `McqForm` as create, pre-filled from `GET /api/mcqs/[id]`
- **Save** → `PUT /api/mcqs/[id]` → redirect to `/mcqs`
- **Cancel** → `/mcqs`
- 404 handling if MCQ missing

#### Preview (`McqPreviewDialog`)

- Triggered from list actions menu (not a separate route)
- shadcn `Dialog`: MCQ name, question text, choices as read-only list or `RadioGroup`
- User can select a choice and **Submit** (optional) → `POST /api/mcqs/[id]/attempts`
- Show whether the answer was correct after submit
- **Close** dismisses dialog

#### Shared UI conventions

- shadcn/ui Base UI, `base-nova` style, Tailwind v4 theme tokens
- Lucide icons (`Plus`, `MoreVertical`, `Pencil`, `Eye`, `Trash2`, etc.)
- Client components for interactivity; server pages for auth gate + layout
- Date formatting: consistent locale (e.g. `toLocaleDateString()` or `Intl.DateTimeFormat`)

#### shadcn components to add (not yet installed)

```bash
npx shadcn@latest add @shadcn/dropdown-menu
npx shadcn@latest add @shadcn/textarea
npx shadcn@latest add @shadcn/alert-dialog
npx shadcn@latest add @shadcn/radio-group
```

Already installed: `table`, `button`, `card`, `dialog`, `field`, `input`, `label`, `badge`, `separator`.

Ask before adding any other dependencies.

---

## Test-Driven Development Approach

Same rhythm as auth PRD:

```
RED → GREEN → REFACTOR → VERIFY
```

| Step | Action |
|------|--------|
| **RED** | Write phase tests first; `npm test` must show new failures |
| **GREEN** | Implement minimum code to pass |
| **REFACTOR** | Clean up; keep tests green |
| **VERIFY** | Phase acceptance + full suite + `npm run lint` + `npm run build` |

### Testing conventions

- Colocate tests: `mcq-service.ts` → `mcq-service.test.ts`
- Mock `getCloudflareContext()` and D1; never hit real DB in unit tests
- Mock `requireSession` / session in API route tests
- Component tests: `@testing-library/react` + `userEvent`
- Cover validation failures, 401, 404, choice min/max, exactly-one-correct rule
- Auth regression: existing 44 tests must remain green after every phase

### Phase completion gate

A phase is **done** only when:

1. Phase acceptance criteria are satisfied
2. `npm test` exits 0 (all prior + new tests)
3. `npm run lint` and `npm run build` pass
4. **Stop for user review** — do not commit, push, deploy, or apply remote migrations unless explicitly instructed

---

## Implementation Phases

### Phase 1: Database Schema Contract and Migration - COMPLETED

**Objective**: MCQ tables defined, schema contract tested, migration applied locally.

**TDD workflow**:

1. **RED** — `mcq-schema.test.ts` fails (no module/migration)
2. **GREEN** — `mcq-schema.ts`, migration SQL, local apply
3. **VERIFY** — `npm test` green; migration list shows `0002` applied locally

**Tests to write first (RED)**:

| Test file | What it proves |
|-----------|----------------|
| `src/lib/db/mcq-schema.test.ts` | Table names, columns, FK references, indexes in `MCQ_MIGRATION_SQL` |
| `src/lib/db/mcq-schema.test.ts` | Migration file matches contract |

**Tasks**:

1. Write `mcq-schema.test.ts` — confirm **RED**
2. Create `src/lib/db/mcq-schema.ts`
3. `npx wrangler d1 migrations create aisprints-quizmaker-db create_mcq_tables`
4. Add SQL to migration file
5. Apply locally: `npx wrangler d1 migrations apply aisprints-quizmaker-db --local`
6. Confirm **GREEN**

**Deliverables**:

- `src/lib/db/mcq-schema.ts` + `mcq-schema.test.ts`
- `migrations/0002_create_mcq_tables.sql`

**Phase 1 acceptance**:

- [x] `npm test` passes (50 tests: 6 schema + 44 auth)
- [x] Local migration applied; `mcqs`, `mcq_choices`, `mcq_attempts` exist
- [x] No remote migration or deploy

---

### Phase 2: McqService, Validation, and Session Helper - COMPLETED

**Objective**: Server-side MCQ CRUD, attempts, and Zod schemas — unit tested with mocked D1.

**TDD workflow**:

1. **RED** — Service, validation, `require-session` tests fail
2. **GREEN** — Implement modules
3. **VERIFY** — Phase 1 + 2 tests green

**Tests to write first (RED)**:

| Test file | What it proves |
|-----------|----------------|
| `src/lib/validations/mcq.test.ts` | Choice count 2–6; exactly one correct; reject empty name/question/choice |
| `src/lib/auth/require-session.test.ts` | Valid cookie → `userId`; invalid → null |
| `src/lib/services/mcq-service.test.ts` | `createMcq` inserts MCQ + choices; sets `created_by_user_id` |
| `src/lib/services/mcq-service.test.ts` | `listMcqs`, `getMcqById`, `updateMcq`, `deleteMcq` |
| `src/lib/services/mcq-service.test.ts` | `createAttempt` sets `is_correct`; `listAttemptsByMcqId` |

**Deliverables**:

- `src/lib/validations/mcq.ts` + `.test.ts`
- `src/lib/auth/require-session.ts` + `.test.ts`
- `src/lib/services/mcq-service.ts` + `.test.ts`

**Phase 2 acceptance**:

- [x] `npm test` passes (69 tests)
- [x] Service enforces 2–6 choices and one correct answer (Zod validation)
- [x] `createMcq` persists `created_by_user_id` from authenticated user
- [x] Attempts record `user_id` and `is_correct`

---

### Phase 3: API Route Handlers - PLANNED

**Objective**: All MCQ HTTP endpoints work; route tests pass with mocked service + session.

**TDD workflow**:

1. **RED** — Route tests fail
2. **GREEN** — Implement routes under `src/app/api/mcqs/`
3. **VERIFY** — Full test suite green

**Tests to write first (RED)**:

| Test file | What it proves |
|-----------|----------------|
| `src/app/api/mcqs/route.test.ts` | GET list 200; POST create 201; 401 without session |
| `src/app/api/mcqs/[id]/route.test.ts` | GET 200/404; PUT 200; DELETE 200; 401 |
| `src/app/api/mcqs/[id]/attempts/route.test.ts` | POST attempt 201; GET attempts 200; 400 bad choice |

**Deliverables**:

- `src/app/api/mcqs/route.ts` — GET list, POST create
- `src/app/api/mcqs/[id]/route.ts` — GET, PUT, DELETE
- `src/app/api/mcqs/[id]/attempts/route.ts` — GET, POST
- Corresponding `route.test.ts` files

**Phase 3 acceptance**:

- [ ] All MCQ endpoints return correct status codes
- [ ] All endpoints require authentication (401 without session)
- [ ] Auth API tests still pass (no regression)

---

### Phase 4: UI — List, Form, Preview, Delete - PLANNED

**Objective**: Teachers manage MCQs in the browser via shadcn components.

**TDD workflow**:

1. **RED** — Component tests fail
2. **GREEN** — Add shadcn components; build pages and client components
3. **VERIFY** — `npm test`, `npm run lint`, `npm run build`; manual smoke on `npm run preview`

**Tests to write first (RED)**:

| Test file | What it proves |
|-----------|----------------|
| `src/components/mcq/mcq-list.test.tsx` | Renders table; Create navigates; dropdown actions present |
| `src/components/mcq/mcq-form.test.tsx` | Default 2 choices; add/remove; validation; submit payload |
| `src/components/mcq/mcq-preview-dialog.test.tsx` | Renders question; submit attempt calls API |
| `src/components/mcq/delete-mcq-dialog.test.tsx` | Confirm triggers DELETE |

**Tasks**:

1. Add shadcn: `dropdown-menu`, `textarea`, `alert-dialog`, `radio-group`
2. Write component tests — **RED**
3. Build `McqList`, `McqForm`, `McqPreviewDialog`, `DeleteMcqDialog`
4. Replace `/mcqs` stub with list page
5. Add `/mcqs/new` and `/mcqs/[id]/edit` pages
6. Protect new routes (session check → redirect `/login`)
7. Confirm **GREEN**

**Deliverables**:

- `src/components/mcq/mcq-list.tsx` + tests
- `src/components/mcq/mcq-form.tsx` + tests
- `src/components/mcq/mcq-preview-dialog.tsx` + tests
- `src/components/mcq/delete-mcq-dialog.tsx` + tests
- `src/app/mcqs/page.tsx` (updated)
- `src/app/mcqs/new/page.tsx`
- `src/app/mcqs/[id]/edit/page.tsx`

**Phase 4 acceptance**:

- [ ] List shows all MCQs with actions menu
- [ ] Create and edit share one form; 2–6 choices; one correct
- [ ] Preview opens in dialog; optional attempt recording
- [ ] Delete requires confirmation
- [ ] Auth flows unchanged (register, login, logout, `/` redirect)
- [ ] `npm test`, `npm run lint`, `npm run build` pass

---

## Technical Implementation Details

### Key Files (planned)

**Schema**

- `src/lib/db/mcq-schema.ts` — Table/column contract + migration SQL
- `migrations/0002_create_mcq_tables.sql`

**Server**

- `src/lib/validations/mcq.ts`
- `src/lib/services/mcq-service.ts`
- `src/lib/auth/require-session.ts`

**API**

- `src/app/api/mcqs/route.ts`
- `src/app/api/mcqs/[id]/route.ts`
- `src/app/api/mcqs/[id]/attempts/route.ts`

**UI**

- `src/components/mcq/mcq-list.tsx`
- `src/components/mcq/mcq-form.tsx`
- `src/components/mcq/mcq-preview-dialog.tsx`
- `src/components/mcq/delete-mcq-dialog.tsx`
- `src/app/mcqs/page.tsx`
- `src/app/mcqs/new/page.tsx`
- `src/app/mcqs/[id]/edit/page.tsx`

### Implementation patterns (follow auth PRD)

**D1 access** — via `getCloudflareContext()` in service layer only:

```typescript
const { env } = await getCloudflareContext();
const db = env.DB;
```

**Prepared statements** — numbered placeholders `?1`, `?2`, …

**API auth check**:

```typescript
const session = requireSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Existing auth references** (do not break):

- Session: `src/lib/auth/session.ts`
- MCQ page guard: `src/lib/auth/mcqs-guard.ts`, `src/app/mcqs/page.tsx`
- User lookup: `src/lib/services/user-service.ts`

### Important notes

- Never apply D1 migrations to remote unless operator explicitly requests
- Never run `npm run deploy` unless explicitly requested
- Do not commit or push unless explicitly instructed
- Stop after each phase for review
- `npm run preview` for full D1 + session testing; `npm run dev` may not bind D1
- Cascade delete: removing an MCQ removes choices and attempts
- SQLite stores booleans as `0`/`1` in `is_correct` columns

---

## Acceptance Criteria

Feature ships when **all** items are checked and `npm test` exits 0.

- [ ] MCQ schema migration applied locally
- [ ] McqService and validation tests pass
- [ ] All MCQ API route tests pass; endpoints require auth
- [ ] UI component tests pass
- [ ] Teacher can list MCQs on `/mcqs`
- [ ] Teacher can create MCQ with name, question, 2–6 choices, and one correct answer
- [ ] `created_by_user_id` is set from the logged-in user on create
- [ ] Teacher can edit an existing MCQ
- [ ] Teacher can preview an MCQ in a dialog
- [ ] Teacher can delete an MCQ after confirmation
- [ ] Attempts can be recorded via API (preview submit)
- [ ] Register, login, logout, and `/` redirect still work (no regression)
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Unit test suite | 100% pass | `npm test` |
| MCQ create flow | User reaches `/mcqs` after save | Component test + manual |
| Choice validation | Rejects &lt;2, &gt;6, or ≠1 correct | `mcq.test.ts` + service tests |
| Auth regression | 44+ auth tests still green | `npm test` after each phase |
| Delete safety | No delete without confirmation | Component test |

---

## Dependencies

### External

- **Cloudflare D1** — existing `DB` binding (`aisprints-quizmaker-db`)
- **zod** — already installed; extend for MCQ schemas

### Internal

- **Auth session** — `src/lib/auth/session.ts`, `SESSION_COOKIE_NAME`
- **UserService** — `users` table for `mcqs.created_by_user_id` and `mcq_attempts.user_id` FKs
- **Vitest** — existing harness (`vitest.config.ts`, `src/test/setup.ts`)
- **shadcn/ui** — add dropdown-menu, textarea, alert-dialog, radio-group

### Environment

- `SESSION_SECRET` — required (already documented in `.dev.vars.example`)

---

## Risks and Mitigation

### Technical risks

- **Risk**: Replacing choices on update deletes old choice IDs; attempts may reference stale IDs if UI caches old data
- **Mitigation**: Preview/list always fetch fresh MCQ; attempts FK cascade on choice delete is acceptable for this phase

- **Risk**: Transaction support limited in D1 for create MCQ + choices
- **Mitigation**: Insert MCQ first, then choices; on choice failure, delete MCQ row (compensating action) or document best-effort ordering in service

- **Risk**: Auth regression while expanding `/mcqs`
- **Mitigation**: Run full test suite every phase; do not modify auth routes unless fixing bugs

### UX risks

- **Risk**: Long question text breaks table layout
- **Mitigation**: Truncate question column with tooltip or `line-clamp`

- **Risk**: Teachers forget to mark one correct choice
- **Mitigation**: Zod + clear `FieldError`: "Exactly one choice must be marked correct"

---

## Troubleshooting Guide

### MCQ API returns 401

**Problem**: All MCQ endpoints return Unauthorized

**Cause**: Missing or expired session cookie

**Solution**: Log in again; verify `SESSION_SECRET` in `.dev.vars` for preview

### MCQ API returns 500 after migration

**Problem**: Server error on list/create

**Cause**: Migration not applied locally (or remote in production)

**Solution**: `npx wrangler d1 migrations apply aisprints-quizmaker-db --local` (or `--remote` by operator)

### Choice validation errors

**Problem**: 400 on create/update

**Cause**: Fewer than 2 choices, more than 6, zero or multiple correct flags

**Solution**: Adjust form; check `createMcqSchema` messages

---

## Notes for AI Agents

When working with this PRD:

1. Read [`Register_login_and_logout_prd.md`](Register_login_and_logout_prd.md) for established patterns
2. Use Scope (In/Out/Cut) — do not build out-of-scope items
3. **TDD mandatory**: tests first, RED then GREEN
4. **Stop after each phase** for user review
5. **Do not commit, push, deploy, or remote-migrate** unless user explicitly asks
6. Update phase status markers and acceptance checkboxes as work progresses
7. Add code references under Technical Implementation Details as code is written
8. Read `.cursor/skills/testing/SKILL.md` and `.cursor/rules/d1.mdc`, `shadcn.mdc`
9. Ask before adding shadcn components or npm dependencies not listed here
10. Keep auth tests passing — run full `npm test` every phase

---

## Current Status

**Last Updated:** September 10, 2026  
**Current Phase:** Phase 3 — API Route Handlers  
**Status:** PLANNED  
**Next Steps:** Write MCQ API route tests (RED), then implement routes under `src/app/api/mcqs/`  
**Prerequisite:** Phase 2 complete (McqService, validation, require-session)
