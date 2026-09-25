# Google Maps in Road

Road uses the Google Maps JavaScript API for its basemaps through
`leaflet.gridlayer.googlemutant`. Leaflet still manages property pins, popups,
viewport filtering, distance circles, and custom area drawing. The search map,
property location map, project map, and admin coordinate picker share the same
Google layer. Street, satellite (hybrid with labels), and terrain views use Google.

## Configuration

Enable Maps JavaScript API on the Road Google Cloud project (`road-502800`)
and link its billing account. Restrict the browser key to Maps JavaScript API
and the following HTTP referrers:

- `http://localhost:3000/*`
- `http://127.0.0.1:3000/*`
- `https://roadfacing.com/*`
- `https://www.roadfacing.com/*`
- `https://roadd-three.vercel.app/*`

In `.env.local`, set:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_key
```

Restart the development server after editing the key. Never commit `.env.local`.
Browser keys are visible in browser requests; website/API restrictions protect them.

## Vercel

In the Road Vercel project, open Settings > Environment Variables. Add
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` with the same restricted browser key to the
intended environments, then redeploy. Next.js embeds NEXT_PUBLIC values at build
time; changing Vercel settings alone does not update an existing deployment.
Add individual preview domains to the referrer allowlist when testing previews.

## Usage and troubleshooting

This integration uses Dynamic Maps billing, not Map Tiles API billing. A map
mount creates a Google map; changing basemap mode currently creates another map
and may count as another load. Ordinary marker updates do not recreate the layer.
The loader shares one JavaScript API script across maps. Google attribution and
logo must remain visible; the property privacy message sits below the map.

Address lookups still use Road's existing providers. No Google Places, Routes,
or Geocoding API has been enabled or added by this migration.

If the map cannot load, check browser connectivity, Maps JavaScript API activation,
billing, and the exact referrer host/port. Google reports authentication details in
the browser console. Never share logs containing the key. Missing keys, blocked
scripts, authentication failures, and loading timeouts show an error with a reload
button rather than a silently blank background.

Useful links:
- https://developers.google.com/maps/documentation/javascript/get-api-key
- https://developers.google.com/maps/api-security-best-practices
- https://developers.google.com/maps/billing-and-pricing/pricing-india

Budget alerts notify; they do not impose a hard spending cap. Review supported
API quotas in Google Cloud for your testing limits.

## Verification

With Road running on the allowed port 3000, run the focused browser checks:

```powershell
$env:PLAYWRIGHT_BASE_URL="http://localhost:3000"
node node_modules/@playwright/test/cli.js test tests/e2e/google-maps.spec.ts --project=desktop-chromium --workers=1
```

The live map test needs a valid key and network access. The default Playwright
port 3100 requires an additional referrer entry if used instead of port 3000.
