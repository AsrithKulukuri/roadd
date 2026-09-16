# Review of the supplied end-to-end manual

Reviewed against the local ROAD application on 16 September 2026. This supplements `local-website-test-report-2026-09-16.md`; it does not claim every step in the supplied manual was executed.

## New executable checks

Added `tests/e2e/manual-audit.spec.ts`. The 16 device cases produced 8 passes and 8 failures, representing four passing scenarios and four failing scenarios repeated across desktop/mobile projects. Five scenarios exercise pure search functions, while three use a browser.

Passed:

- Exact query `3 BHK flats in Benz Circle under 1.5 Cr`: extracts apartment, 3 BHK, Benz Circle and maximum 15,000,000.
- All five mobile property-category buttons measure 112 × 86 pixels.
- Denied GPS displays feedback and leaves the map visible.
- Street map requests Esri World Street Map tiles rather than Carto tiles. This does not verify every tile's image content or successful loading under poor connectivity.

Failed:

- `bens circle 2bhk` does not match the test Benz Circle apartment. Fuzzy matching promised by the manual is not satisfied.
- A property with unknown facing passes the East filter.
- A property with unknown furnishing passes the furnished filter.
- A south-east property passes the East/North-East filter because facing uses substring matching. Use normalized exact direction matching.

The missing-value checks intentionally test incomplete runtime records despite required TypeScript fields. Project facing also allows unknown configuration facings through according to source review; that additional project case was not executed.

## Corrections to the manual and implementation gaps

| Manual section | Observed implementation / test status |
| --- | --- |
| 1.1 Search | Exact parser scenario passes; typo scenario fails. |
| 1.2 Near Me | Code applies a 20 km radius. Denial feedback passes, with different wording. Distance-first sorting is not present in the search result comparator; do not promise it. GPS distance-chip accuracy remains untested. |
| 1.3 Entity tabs | Existing fixture tests cover category results/counts/history. This is not a complete test of every tab with production records. |
| 1.4 Sort | Code supports ascending/descending price and date. Default ranking uses featured/recommended status and date, not RERA verification. All sort orders were not exercised with controlled price fixtures in this extension. |
| 2 Filter sheet | There are 15 desktop sections, not 11. Changes are held in `localFilters` until Apply. Clear All resets that draft; it does not immediately update the URL. Mobile sizes pass. Budget synchronization, every multi-select combination and reset/apply semantics still need dedicated browser cases. |
| 2.8–2.9 Facing/furnishing | The four filter/search failures above need fixes. Furnishing is a stored classification, not a check that every listed appliance is present. |
| 2.10 RERA | Properties require a nonempty ID; projects accept the approval flag OR an ID. The code does not verify authenticity of registration numbers against a government source. |
| 3.1 Base map | Esri is the current fallback, but environment variables can override the tile source. Disabling custom landmark markers cannot remove symbols baked into raster tiles. |
| 3.2–3.5 Map interactions | Prior map stability check passed. Polygon filtering and default-off landmarks exist in source. Polygon completion, all popup variants, landmark filtering, share/save behavior and touch gestures were not exhaustively exercised. |
| 4 Property detail | Existing public property rendering and specification unit checks passed. The sample slug in the manual must be replaced with an existing fixture. Gallery keyboard navigation, video, floor-plan zoom and calculators remain untested by this extension. Stamp-duty percentages in the manual have not been validated as current legal rates. |
| 5 Project detail | CRDA verification requires complete evidence plus approved review; geographic location alone is insufficient. Configuration switching, UDS, floor plans and all phase variants need dedicated populated fixtures. |
| 6.1 Lead schema | Actual table: `listing_action_leads`; action: `reveal_phone`; time: `created_at`; notification flags: `builder_notified` and `admin_notified`. There is no guarantee of Sent: provider failure leaves a saved lead with Not sent. Reveal waits for the protected action response. |
| 6.2 WhatsApp | The shared contact component prefills a generic listing-link message, not the promised selected configuration. Lead rows do not contain selected configuration. Daily duplicate suppression was covered in the earlier unit suite. A click is not proof the buyer sent a message. |
| 6.3 Brochure | Actual action is `brochure_download`, not `brochure_request`. The request is logged; this is not evidence that the download completed. Previously public PDF URLs remain publicly reachable if known. |
| 6.4 Visits | Actual table: `project_site_visits`. Existing tests cover identity/consent and submit-after-confirmation. Real persistence-to-dashboard and outbound receipt were not exercised here. |
| 7.1 Builder | Overview route is `/builder`. Do not assume `/builder/dashboard` exists. Prior isolation tests use controlled data, not two real builder accounts. |
| 7.2 / 8.1 Lead inbox | Current contact-lead panel shows the latest 200 requests and notification flags, with Refresh. It has no date/city/action filters, selected-configuration column, Contacted workflow or Call/WhatsApp buttons. Other inquiry tables are separate. It is not a realtime subscription. |
| 7.3 Builder schedules | Supported statuses are scheduled/completed/cancelled. PATCH updates status only. Confirmed status, slot rescheduling and automatic confirmation messaging described by the manual are not implemented in that API. A separate WhatsApp link exists. |
| 7.4 Project editing | Existing fixtures cover save requests and retention after failure. Real uploads, publishing and appearance in public search/map were not performed. Use an isolated test project/database for this chain. |
| 8.2–8.3 Admin | Sixteen screens rendered with isolated data in the earlier run. Publication toggles, cache invalidation and homepage reorder-to-incognito propagation were not tested with real mutations. |
| 9 Device/network | Chromium desktop/mobile rendering was checked. Physical iPhone/Safari, full touch-target measurement, pinch gestures, Slow 4G/offline, broken-image recovery and zero-result reset still need targeted cases. |

## Existing findings still open

The earlier report's admin-login schedules rejection, low-contrast labels, absent local admin WhatsApp recipient and lint error remain open. No application behavior was changed during this test extension.

## Evidence and next verification stage

Results: `test-results/reports/manual-results.json`; HTML: `test-results/reports/manual-html/index.html`; traces: `test-results/manual-audit/`. These are local ignored artifacts.

Before declaring complete end-to-end coverage, use isolated buyer/builder accounts and a test database to verify a persisted lead and visit appear only in the owning builder inbox and in admin. Test notification receipt using intended test recipients, then run project create/upload/publish/unpublish and homepage-order propagation. None of those external side effects were performed in this audit.
