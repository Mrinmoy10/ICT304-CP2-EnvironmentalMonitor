# Environmental Monitor — Cloud-Based Environmental Data Monitoring System

**ICT304 Capstone Project 2** — Sydney International School of Technology & Commerce

Room-level temperature, humidity and air-quality monitoring with threshold
alerting, historical trends and an administration panel. Continues the system
specified in Capstone Project 1 (ICT303), designed in Assessment 1 and
prototyped in Assessment 2.

## Architecture

```
Browser ──► Nginx (React build) ──/api──► Express API (Node.js) ──► MySQL 8
                                             │
                                             └── /metrics ──► Prometheus
```

| Layer        | Technology                                                             |
| ------------ | ---------------------------------------------------------------------- |
| Front end    | React 18, Vite 7, Radix UI (shadcn/ui pattern), Tailwind CSS           |
| Back end     | Node.js, Express 4, mysql2 (parameterised queries)                     |
| Database     | MySQL 8 — 8 tables in 3NF, foreign keys, CHECK constraints, indexes     |
| Security     | bcrypt password hashing, JWT sessions, role-based + object-level access, Helmet headers, login rate limiting |
| Testing      | Vitest (front end), Jest + Supertest against real MySQL (back end)     |
| DevOps       | Docker multi-stage images, Docker Compose, GitHub Actions, GHCR        |
| Monitoring   | Prometheus metrics endpoint (`/metrics`)                               |

## Run the whole stack (Docker Desktop must be running)

```bash
docker compose up --build
```

| Service    | URL                          |
| ---------- | ---------------------------- |
| Web app    | http://localhost:8080        |
| API health | http://localhost:4000/health |
| Prometheus | http://localhost:9090        |

Demo accounts (password `Demo@2026`):

| Email                          | Role          | Locations        |
| ------------------------------ | ------------- | ---------------- |
| saadebnrashid10@gmail.com      | Administrator | All              |
| miankhizer86@gmail.com         | End User      | Room A, Room B   |
| p.chhantyal@sistc.nsw.edu.au   | End User      | Lab (disabled)   |

Other commands:

```bash
docker compose --profile test run --rm api-test   # back-end unit + integration tests
docker compose exec api npm run perf              # response-time measurement
docker compose down                               # stop (add -v to reset the database)
```

## REST API

| Method | Endpoint                          | Access        | Requirement |
| ------ | --------------------------------- | ------------- | ----------- |
| POST   | /api/auth/login                   | Public        | FR7         |
| GET    | /api/auth/me                      | Signed in     | FR7         |
| GET    | /api/locations                    | Signed in     | FR4         |
| GET    | /api/sensors                      | Signed in     | FR3         |
| GET    | /api/sensors/:id/history?hours=48 | Signed in     | FR6         |
| GET    | /api/readings?limit=200           | Signed in     | FR2, FR6    |
| GET    | /api/thresholds                   | Signed in     | FR5         |
| PUT    | /api/thresholds/:locationId       | Administrator | FR5, FR8    |
| GET    | /api/alerts?status=open\|all      | Signed in     | FR5         |
| POST   | /api/alerts/:id/acknowledge       | Administrator | FR5         |
| GET    | /api/users                        | Administrator | FR8         |
| POST   | /api/users                        | Administrator | FR8         |
| PATCH  | /api/users/:id                    | Administrator | FR8         |
| GET    | /api/sources                      | Administrator | FR1, FR8    |
| PATCH  | /api/sources/:id                  | Administrator | FR1, FR8    |
| GET    | /health, /metrics                 | Public        | FR9         |

End users only ever receive data for the locations assigned to them; this is
enforced in the API's data layer, not hidden in the browser.

## Front end only (no server)

The public Netlify prototype is built with `VITE_USE_MOCK=true`, which swaps
the HTTP client for an in-browser mock with the same contract
(`src/lib/httpApi.js` vs `src/lib/mockApi.js`).

```bash
npm install
npm run dev          # http://localhost:5173, proxies /api to localhost:4000
npm run test:run     # front-end unit tests
```
