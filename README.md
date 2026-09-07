# Career Canvas

A private, self-hosted career evidence bank that generates focused medical, leadership and technical CVs from one master record.

## Start it

```bash
docker compose up -d --build
```

Open <http://localhost:3080>. The port is bound to localhost by default, so the application is not exposed to the wider network.

## How it works

1. Complete **Your career evidence** with your identity and individual records.
2. Tag records using terms such as `clinical`, `leadership`, `education`, `qi`, `technical` and `digital`.
3. Configure each **CV profile** with priority tags and its own professional summary.
4. Open **Preview**, select a profile, add the target role or organisation, and choose **Generate PDF**.
5. In the browser print window, choose **Save as PDF**, A4 paper, 100% scale, and disable browser headers and footers.

All records are stored in the Docker volume `career_canvas_data`. Use **Backup** regularly to download a portable JSON copy.

## Updating and stopping

```bash
docker compose down
docker compose up -d --build
```

`docker compose down` keeps the named data volume. Do not add `-v` unless you intentionally want to delete the stored career data.

## Network access

To make the app available elsewhere on a trusted private network, change the port mapping in `compose.yaml` from `127.0.0.1:3080:3000` to `3080:3000`. If it will ever be internet-accessible, place it behind authentication and HTTPS first.

## Data model

- **Profile:** identity, contact details and a reusable master summary.
- **Evidence:** roles, achievements, projects, qualifications, publications, presentations and skills.
- **CV profiles:** audience-specific titles, summaries, colours and priority tags.
- **Ranking:** explicit relevance, matching tags and key-evidence status determine the order in each CV.

No third-party service, analytics package or external font is used.
