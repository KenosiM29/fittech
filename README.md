# FitTech — README

This README explains how to run the project locally, the key architectural decisions (especially around the booking logic), and trade-offs / possible improvements.

## Quick start — requirements

- Node.js (16+ recommended)
- pnpm (workspace-aware)
- Expo CLI (for the mobile client) — optional if running the mobile app

## Install dependencies

From the repository root:

```bash
pnpm install
```

This installs workspace dependencies for both `apps/api` and `apps/mobile`.

## Run the services

API (backend)

1. Open a terminal and run:

```bash
cd apps/api
pnpm install
pnpm start
```

(If `pnpm start` is not defined for your environment, run the backend entry directly, for example: `node src/index.js` or `pnpm run dev` depending on your setup.)

Mobile (Expo)

1. Open a terminal and run:

```bash
cd apps/mobile
pnpm install
pnpm start
```

2. Open the Expo developer tools to run on a simulator or a physical device.

Notes

- If you prefer workspace commands, you can run from the repo root:

```bash
pnpm -w -F mobile start
pnpm -w -F api start
```

- Install `@react-native-async-storage/async-storage` if you want persisted booking lock across restarts (the client will attempt to use it when present):

```bash
cd apps/mobile
pnpm add @react-native-async-storage/async-storage
```

## Run tests

Backend tests (if any):

```bash
cd apps/api
pnpm test
```

## What I changed / where to look

Key files to inspect:

- `apps/mobile/src/api/client.ts` — API client and response normalization (safe parsing of arrays/objects, slot label formatting, percent clamping)
- `apps/mobile/src/hooks/useGym.ts` — Booking hook and single-gym booking lock (in-memory + optional AsyncStorage persistence)
- `apps/mobile/src/screens/GymCapacityScreen.tsx` — Main UI screen (single fixed view for Fit Tech Sandton, slot picker, booking button, themed colors)
- `apps/mobile/src/components/CapacityRing.tsx` — Capacity ring visual (shows percentage and a clear "NN% full" label)

## Key architectural decisions

1. Booking logic lives in a small hook (`useGym`) as the single source of booking behavior.
   - Rationale: keeping booking state and side-effects (fetching slots, making a booking, tracking booking state) in a hook helps reuse the behavior across screens and keeps UI components focused on rendering only.
   - Single-gym booking lock: to prevent users from holding bookings at multiple gyms (a product decision), a global lock is enforced in the hook. This is stored in-memory and optionally persisted to AsyncStorage if the library is installed.
     - Why here? It's simple and fast to enforce on the client. The server should also enforce booking rules for security and correctness — client-side locking is primarily a UX safeguard.
   - Error states and error messages are surfaced via the hook (`bookingState`, `bookingError`) so the UI can react accordingly.

2. Defensive API client (`apps/mobile/src/api/client.ts`)
   - The mobile client normalizes varied API shapes (arrays, objects with `gyms` or `slots` keys, keyed objects). This prevents runtime errors such as `raw.map is not a function` when the server returns a different shape.
   - Slot labels are formatted on the client (e.g., `1pm`, `2pm`) when the server returns ISO timestamps and no explicit label is provided.
   - Percentages are clamped and rounded client-side so the UI always shows a consistent `0–100` integer value.

3. UI choices
   - The main screen is a fixed, non-scrolling layout per your request. A modal is used for longer content (it still scrolls inside itself).
   - Components are small and focused: `CapacityRing` shows a visual ring and a textual percent label; `SlotPicker` renders slots and handles disabled state; `GymCard` displays summary information.

## Trade-offs and what I'd improve with more time

1. Server-side validation and authoritative state
   - Trade-off: currently the client enforces a single-gym booking lock. This is a UX convenience but not a security boundary.
   - Improvement: implement server-side checks to enforce booking limits and return clear error codes. Add an endpoint to query active booking(s) per user.

2. Better type-safety and stricter contracts
   - Trade-off: the API client performs defensive parsing to handle flexible responses; this helps robustness but can hide server contract violations.
   - Improvement: define a strict OpenAPI/TypeScript contract for the backend responses and validate responses (or fail loudly) during development.

3. State management for larger scale
   - Trade-off: hooks + local state are simple and appropriate for this app size.
   - Improvement: if the app grows, add a central store (Redux/Context/MobX) or use react-query for server caching, background updates, and optimistic updates.

4. Real-time updates
   - Trade-off: polling or manual reload currently used for freshness.
   - Improvement: use WebSockets or server-sent events so capacity updates arrive in real time and bookings update live across devices.

5. Testing and CI
   - Trade-off: limited unit/integration tests in the current snapshot.
   - Improvement: add unit tests for the API normalization logic, hook tests for booking state transitions, and end-to-end tests (Detox or Playwright) for booking flows.

6. UX polish and accessibility
   - Trade-off: initial UI focused on functionality and requested palette.
   - Improvement: typography, spacing, accessibility labels, keyboard/voice-over support, and a design system for consistent spacing and components.

## Assumptions

- The API provides gym data (id/name/address/capacity/currentCount/percentFull/isFull) and slot data (slotTime, label, available). The mobile client normalizes and tolerates minor differences (e.g., `slot_time` or `time` for slotTime).
- Authentication is out of scope for this snapshot; the demo uses a placeholder user id (`user-demo-123`). Replace with real auth integration in production.

## Where to go from here (suggested next steps)

- Add server-side booking enforcement and a small integration test that runs a book/unbook sequence.
- Add unit tests for mapping functions in `apps/mobile/src/api/client.ts`.
- Tweak the UI further to your visual spec (shadows, spacing, fonts). I can apply a design polish pass.

If you want, I can also add a short developer helper script (Makefile or npm scripts) in the root to start both API and mobile concurrently.

---

If you'd like, I can commit a small `Makefile` or `scripts` to the repo that starts the API + Expo in parallel and a tiny test harness to validate the mapping logic.
