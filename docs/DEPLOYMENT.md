# Vercel deployment

Living Ark is a static Vite application. The simulation, ArkScript interpreter, validation worker, dynamic WebMCP registration, and canonical state all run in the browser. Deployment requires no backend, database, environment variable, API key, or server function.

## Production contract

`vercel.json` selects the Vite adapter, runs `npm run build`, serves `dist`, applies long-lived immutable caching only to hashed assets, and adds baseline security headers. `.vercelignore` keeps research and local probe material out of the upload. Fonts and the production sprite atlas are bundled; the live experience has no external asset dependency.

## Release sequence

1. Run `npm run check` against the exact source to be deployed.
2. Create a Vercel preview deployment and test the complete agent mission over its HTTPS URL.
3. Confirm the validator Web Worker loads from the same origin and all eight initial native WebMCP tools are discoverable in a compatible browser host.
4. Run the weak-policy falsification, two visibly different 64-world suite fingerprints, dynamic ninth-tool birth, the 16-world invocation canary, canonical recovery, and idempotent second invocation once on the preview.
5. Confirm the successful invocation returns a frozen canary receipt and that the catalog/HUD show `16/16` before or alongside recovery.
6. Run the automated forced-canary-failure test and confirm it removes the born tool while canonical revision/hash remain unchanged.
7. Promote that exact verified deployment to production.

The production URL being HTTPS is necessary but not sufficient for native WebMCP: the judging browser must expose `document.modelContext`. In an ordinary browser the same build intentionally remains a complete visual preview and labels Site Tools as unavailable.
