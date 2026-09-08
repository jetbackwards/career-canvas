# Career Canvas

Career Canvas is a private, self-hosted career evidence bank and CV builder. Record an achievement once, tag it by theme, and reuse it across focused medical, leadership, technical or other CV profiles.

It is intentionally small and self-contained: a Node.js server, a Vue 3 browser interface, a JSON data file and no external database, analytics service or web font dependency.

## Features

- Store roles, achievements, projects, qualifications, education, publications, presentations, committee work and skills in one evidence bank.
- Mark ongoing roles so their end date appears as **Present**.
- Create multiple CV profiles with their own title, summary, priority tags and accent colour.
- Rank evidence automatically using profile tags, explicit profile relevance and key-evidence status.
- Generate concise, balanced or detailed CVs and save them as polished PDFs using the browser print dialog.
- Choose from four layouts and eleven system-safe font stacks.
- Adjust text size, page margins, section spacing, entry spacing, paragraph spacing and line height for each CV profile.
- Import selected career records without replacing unrelated data.
- Download and restore complete JSON backups.

## Quick start with Docker

Requirements:

- Docker with the Compose plugin

Clone the repository and start the app:

```bash
git clone https://github.com/jetbackwards/career-canvas.git
cd career-canvas
docker compose up -d --build
```

Open <http://localhost:3080>.

The supplied Compose configuration binds the application to `127.0.0.1`, so it is accessible only from the host machine by default. Career data is stored in the named Docker volume `career_canvas_data`.

## Using Career Canvas

1. Add your professional identity and contact details under **Your career evidence**.
2. Add individual evidence records and tag them with relevant themes, such as `clinical`, `leadership`, `education`, `qi`, `technical` or `digital`.
3. Create or edit a **CV profile** and select the tags that matter for that audience.
4. Open **Preview**, select the profile and optionally enter a target role or organisation.
5. Adjust the detail level, layout and typography. Appearance choices are saved separately for each CV profile.
6. Select **Generate PDF**, choose **Save as PDF**, use A4 paper at 100% scale, and disable browser headers and footers.

Career Canvas applies the selected page margins throughout the document, keeps headings with the content that follows them and avoids splitting individual evidence records where the browser permits.

## Data, backups and imports

The application stores all career data in a single JSON file. In Docker this is `/data/career-canvas.json`, persisted by the `career_canvas_data` volume.

Use **Backup** to download a complete portable copy of your data. **Restore backup** replaces the current dataset with that backup.

**Import** behaves differently: it adds selected content to the existing evidence bank. Before applying an import, Career Canvas shows a summary and lets you:

- include or omit the professional identity, CV profiles and evidence records;
- keep an existing record when an ID matches; or
- replace it with the imported record.

Import files use this versioned envelope:

```json
{
  "kind": "career-canvas-import",
  "schemaVersion": 1,
  "metadata": {
    "title": "Example career history",
    "source": "Prepared from an existing CV"
  },
  "payload": {
    "profile": {},
    "cvProfiles": [],
    "entries": []
  }
}
```

Personal import files should remain outside the repository. Files ending in `*.career-canvas-import.json`, the local `data/` directory and ZIP archives are excluded by `.gitignore` as additional safeguards.

## Updating and stopping

Pull the latest code and rebuild the container:

```bash
git pull
docker compose up -d --build
```

Stop the application with:

```bash
docker compose down
```

The named data volume is retained. Do not add `-v` unless you intentionally want to delete it. Download a backup before upgrades or other significant changes.

## Running without Docker

Node.js 22 or later is required.

```bash
npm start
```

The server listens on <http://localhost:3000> and stores data in `./data/career-canvas.json` by default. Override these locations with the `PORT` and `DATA_FILE` environment variables.

## Editions and extensions

The Community edition uses replaceable adapters for authentication, storage, API routes and browser enhancements. This keeps the public application self-contained while allowing separately maintained editions to add capabilities without repeatedly changing core files.

See [Edition extension points](docs/EDITION-EXTENSIONS.md) for the adapter contracts, environment variables and recommended private-repository synchronization workflow.

## Development

There is no build step and there are no runtime package dependencies. The browser application is in `public/`, while `server.mjs` serves the static files and provides the JSON persistence API.

Run the syntax checks with:

```bash
npm run check
```

The health endpoint is available at `/api/health`.

## Security and privacy

Career Canvas has no authentication or HTTPS support of its own. The default Docker configuration is suitable for local use because it binds only to localhost.

If you expose it to a trusted private network, change the port mapping in `compose.yaml` from `127.0.0.1:3080:3000` to `3080:3000`. Before making it internet-accessible, place it behind appropriate authentication, HTTPS and access controls.

The application does not send career data to a third-party service, but anyone who can reach the application can read and modify its stored data. Treat backups and import files as sensitive documents.

## Contributing

Issues and pull requests are welcome. For substantial changes, opening an issue first is helpful so the proposed approach can be discussed. Please keep personal or identifiable career data out of commits, fixtures and screenshots.

## Author and attribution

Career Canvas was originally created by **Thomas Johnson**. If you redistribute or modify the software, retain the attribution described in [ATTRIBUTION.md](ATTRIBUTION.md), including the link to the original [Career Canvas repository](https://github.com/jetbackwards/career-canvas).

Contributors are recognised in [AUTHORS.md](AUTHORS.md). Citation metadata is provided in [CITATION.cff](CITATION.cff).

## Licence

Career Canvas is licensed under the [GNU Affero General Public License v3.0](LICENSE), with the reasonable author-attribution requirement permitted by section 7(b) and recorded in [ATTRIBUTION.md](ATTRIBUTION.md).

You may use, study, modify and redistribute the software, including commercially. Modified versions must remain under the AGPL, and users interacting with a modified version over a network must be offered its corresponding source code. The attribution requirement does not imply endorsement by the original author.
