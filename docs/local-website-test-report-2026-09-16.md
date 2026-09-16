# ROAD Facing local website test report

Tested on 16 September 2026 using a fresh production build at http://127.0.0.1:3104, desktop Chromium and mobile Chromium (Pixel 5; selected CTA cases use 390 × 844).

## Results

- Production build, including TypeScript: passed.
- Core logic tests: 33 passed.
- Browser and HTTP integration cases: 182 distinct cases, 177 passed and 5 failed after targeted reruns. Counts use the latest result for each case/device, not the total number of executions.
- ESLint: 1 error and 994 warnings.
- Read-only database readiness: `listing_action_leads`, `user_saved_listings`, `project_site_visits`, and `builder_profiles` all responded successfully. This verifies table availability, not every constraint or delivery integration.

## Findings requiring attention

1. **Admin login raises an unhandled runtime error (both devices).** Opening `/admin/login` anonymously triggers `Could not load schedules. Please retry.` The admin layout calls `fetchSchedules()` before checking whether the page is the login page, and does not handle rejection. The protected endpoint correctly denies anonymous access. Gate this fetch on an authenticated admin session and handle failures. Evidence: `src/app/admin/layout.tsx:122`, `src/stores/schedules-store.ts:72`. The login form renders; this is an unhandled error, not evidence that login itself is broken.
2. **Text contrast fails accessibility checks (three cases).** Homepage category subtitles use light slate text on white (2.63:1). The mobile active navigation text uses amber on a pale background (Search measured 1.76:1). These small labels need 4.5:1 in the axe checks. Darken the text while retaining the brand accent for non-text decoration. Relevant components: `src/components/home/hero-section.tsx:2332`, `src/components/layout/mobile-bottom-nav.tsx:359`.
3. **Admin WhatsApp delivery is not configured locally.** Neither `ADMIN_WHATSAPP_PHONE` nor `NEXT_PUBLIC_ADMIN_WHATSAPP_PHONE` is set. The scheduling code therefore cannot send its admin WhatsApp notification. Configure the intended admin number and then perform an authorized delivery test. This does not imply that saved leads or builder notifications are broken.
4. **Lint does not pass.** `src/components/map/property-map.tsx:1525` uses `let propType` without reassignment (`prefer-const`). There are also 994 warnings to triage separately.
5. **Minor anonymous console noise.** The global favorites read returns an expected 401 for signed-out visitors. This does not break browsing; deferring the read until login would avoid unnecessary requests and console errors.

## Verified coverage

- Public page rendering, visible-image checks and horizontal overflow on home, search, properties, map, compare, about, contact, blog, mortgage calculator, privacy and terms: all 22 device cases passed.
- Additional routes: projects, login, register, forgot password, builder login, list-with-us, cookies, disclaimer, grievance, and a seeded property detail. Admin login exposed the error above.
- Header category changes, counts, active state, browser history and refresh, using distinct listing fixtures including complete CRDA verification evidence.
- Search query routing, rent/new-launch filters, location URL persistence, map/grid switching, and live read-only search API city/type/approval/pagination requests.
- Public project browsing; explicit reveal for signed-in users; cancelled OTP submits nothing; successful OTP resumes the selected action.
- Both project and property mobile WhatsApp actions request OTP and submit the intended action with consent. Schedule Visit requests OTP, opens the form, and submits only after confirmation. Delivery responses were intercepted.
- Static project map pane remains stable after settling and after geolocation updates. This is a focused regression check, not a guarantee against every map movement scenario.
- Sixteen admin screens rendered with isolated empty API data on both devices: dashboard, properties, projects, both creation forms, builders, inquiries, schedules, users, locations, banners, content, homepage, settings, support and broadcasts.
- Builder login request payload, project save failure retention, and request shortcut failures with fixtures.
- Anonymous API restrictions, protected navigation, invalid webhook/OTP input and forged legacy cookies.
- Core unit checks for plot specifications, search filtering, listing-action consent/identity/deduplication, private-field removal and builder isolation.

## Scope and limitations

No real OTPs, WhatsApp messages, listings, appointments or lead submissions were created by the new audit cases. Authenticated admin rendering used signed fixture sessions and intercepted data; it does not establish real account CRUD correctness. Notification delivery, real OTP receipt, document upload, populated admin dashboards, all listing variants, load testing, other browsers and physical devices remain outside this run. Existing security requests exercised rejected anonymous actions.

The first server was network-restricted and database requests failed with EACCES. Those search checks were rerun successfully against the network-enabled local server. Older tests were updated for public project access, the current listing API and complete CRDA evidence. Expected anonymous session/favorites 401 responses are excluded from smoke-test console failures; unrelated failures remain visible.

Application code was not changed during this audit. Added `tests/e2e/local-audit.spec.ts` and corrected existing test assumptions.

## Evidence

- Initial suite: `test-results/local-audit-existing.json`.
- Additional audit and search API results: `test-results/reports/local-extra-results.json`.
- Category/accessibility results: `test-results/reports/local-public-results.json`.
- Login rerun: `test-results/reports/local-login-results.json`.
- Final public smoke checks: `test-results/reports/local-public-final-results.json`.
- HTML reports: corresponding `playwright-report-local-*` directories inside `test-results/reports/`.
- Failure screenshots/traces: `test-results/local-public/` and `test-results/local-login/`.

Test artifacts are local and ignored by Git. The five remaining failing cases are retained to reproduce the admin runtime and accessibility defects.
