# Edition extension points

Career Canvas keeps the Community edition useful and self-contained while allowing separately maintained editions to add authentication, storage and premium features with minimal changes to core files.

## Server adapters

The server loads two modules selected by environment variables:

| Variable | Community default | Required export |
| --- | --- | --- |
| `CAREER_CANVAS_EDITION_MODULE` | `./src/community-edition.mjs` | `createEdition()` |
| `CAREER_CANVAS_STORAGE_MODULE` | `./src/json-storage.mjs` | `createStorage(options)` |

Paths are resolved relative to `server.mjs`. A separately maintained edition can point these variables at modules in its own directory.

### Edition contract

`createEdition()` returns an object with:

- `id`: stable edition identifier;
- `capabilities`: public capability names;
- `publicConfig()`: JSON-safe metadata returned by `GET /api/config`;
- `authenticate(request, context)`: resolves the current actor or throws an error with an HTTP `status`;
- `handleRequest(request, context)`: handles edition-specific API routes and returns `true`, or returns `false` to continue through the core router.

The request context supplied to edition routes includes `url`, `actor`, `json` and `readBody`.

### Storage contract

`createStorage({ dataFile, emptyData })` returns:

- `load(actor)`;
- `save(actor, data)`.

The Community adapter ignores the actor and stores one JSON document. A multi-user edition can use the authenticated actor to select a tenant or account in another storage system.

Core validation still runs before a document is saved.

## Browser adapter

`public/edition.js` loads before `public/app.js` and assigns `window.CareerCanvasEdition`.

The core browser application supports two optional hooks:

- `start(context)`, called once after initial rendering;
- `afterRender(context)`, called after each core render.

The start context exposes `getData`, `setData`, `render`, `showView` and `toast`. Keep premium controls and navigation in the edition adapter rather than patching core rendering functions wherever possible.

## Keeping a private edition aligned

Create the private repository as an independent duplicate, not as a GitHub fork. In a private checkout, use the private repository as `origin` and add the public repository as `upstream`:

```bash
git remote add upstream https://github.com/jetbackwards/career-canvas.git
git fetch upstream
git merge upstream/main
```

Keep proprietary files under a dedicated directory such as `premium/`. Configure the private image with:

```dockerfile
ENV CAREER_CANVAS_EDITION_MODULE=./premium/server/edition.mjs
ENV CAREER_CANVAS_STORAGE_MODULE=./premium/server/storage.mjs
```

Avoid modifying core files for premium-only behaviour. When a generally useful extension point is missing, add that extension point to the public project first and then merge it into the private edition.

## Licensing boundary

The public repository is licensed under AGPL-3.0-only with the attribution term in `ATTRIBUTION.md`.

Only copy a contribution into a differently licensed private edition when you own its copyright or have received separate permission from its copyright holder. An AGPL contribution does not automatically grant proprietary relicensing rights.
