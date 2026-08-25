# Environmental Monitor — Front-End Prototype

**ICT304 Capstone Project 2 — Assessment 2: Front-End Development and Back-End Plan**
Sydney International School of Technology & Commerce

Front-end for the Cloud-Based Environmental Data Monitoring System: room-level
temperature, humidity and air-quality readings with threshold alerting,
historical trends and an administration panel.

This prototype implements the design documentation finalised in Assessment 1
(business rules, permission matrix, design system, page inventory) and continues
the system specified in Capstone Project 1 (ICT303).

---

## Technology

| Concern         | Choice                                                |
| --------------- | ----------------------------------------------------- |
| Framework       | React 18                                              |
| Build tool      | Vite 7                                                |
| Component layer | Radix UI primitives composed in the shadcn/ui pattern |
| Variants        | class-variance-authority, tailwind-merge              |
| Styling         | Tailwind CSS 3 over a design-token layer              |
| Icons           | Lucide (ISC licence)                                  |
| Typeface        | Inter (SIL Open Font Licence)                         |
| Charts          | Hand-written SVG components                           |
| Testing         | Vitest                                                |
| Container       | Multi-stage Docker build, Nginx runtime               |
| CI              | GitHub Actions                                        |
| Hosting         | Netlify                                               |

---

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run test:run   # unit tests, single run
npm run test       # unit tests, watch mode
npm run build      # production bundle into dist/
npm run preview    # serve the production bundle locally
```

## Running the container

```bash
docker build -t environmental-monitor .
docker run -p 8080:80 environmental-monitor   # http://localhost:8080
```

Or pull the image published by CI:

```bash
docker pull ghcr.io/<owner>/<repo>:latest
```

---

## Prototype accounts

Authentication is simulated in this release. Any password of four or more
characters is accepted.

| Role          | Email                          | Sees                                                    |
| ------------- | ------------------------------ | ------------------------------------------------------- |
| Administrator | `saadebnrashid10@gmail.com`    | All locations, plus the Admin panel                     |
| Administrator | `samir.bk@sistc.nsw.edu.au`    | All locations, plus the Admin panel                     |
| End User      | `miankhizer86@gmail.com`       | Room A and Room B only                                  |
| End User      | `a.tripathi@sistc.nsw.edu.au`  | Office only                                             |
| Invited       | `p.chhantyal@sistc.nsw.edu.au` | Cannot sign in — demonstrates the disabled-account path |

---

## Screens and requirement coverage

| Screen                          | Requirement   | Assessment 1 reference |
| ------------------------------- | ------------- | ---------------------- |
| Login                           | FR7           | Figure 6               |
| Live dashboard                  | FR3, FR4, FR5 | Table 6                |
| Historical trends               | FR6           | Table 6                |
| Location comparison             | FR3           | Table 6                |
| All sensor readings             | FR2, FR6      | Table 6                |
| Admin — User management         | FR8           | Figure 7               |
| Admin — Threshold configuration | FR5, FR8      | Figure 8               |
| Admin — Data source management  | FR1, FR8      | Table 6                |

---

## Project structure

```
src/
  lib/
    data.js        Domain entities, business rules, evaluate(), visibleLocations()
    data.test.js   Unit tests for the state model and access rules
    api.js         Mock API layer — the REST contract for Assessment 3
    utils.js       cn() class merge, relativeTime()
  components/
    ui/            button, card, input, label, badge, dialog, select, switch,
                   tooltip, toast, segmented, empty-state
    charts/        Sparkline, Gauge, LineChart, BarChart, Legend
    AppShell.jsx   Identity bar, navigation, context bar, footer
    CommandPalette.jsx
  pages/           Login, Dashboard, Trends, Comparison, Readings
  pages/admin/     AdminLayout, UserManagement, ThresholdConfig, DataSourceManagement
  styles/
    index.css      Design tokens and shared component classes
```

## Component layer

The interface is built on [Radix UI](https://www.radix-ui.com) primitives
(MIT licence) composed in the pattern popularised by
[shadcn/ui](https://ui.shadcn.com): component source lives in the repository
under `src/components/ui/` rather than being consumed from a package, variants
are declared with `class-variance-authority`, and class conflicts are resolved
by `tailwind-merge`.

The primitives were adopted for behaviour rather than appearance. Radix Dialog
supplies focus trapping, focus restoration on close, Escape-to-dismiss and
`aria-modal` semantics; Radix Select supplies typeahead and roving focus;
Radix Switch renders `role="switch"` with the correct checked state. Each of
these is routinely wrong in hand-written implementations.

Every visual decision remains the team's own: the primitives ship unstyled, so
all colour, spacing, radius and typography come from the Assessment 1 design
tokens described below.

## Interface design principles

The interface was reviewed against Shneiderman's Eight Golden Rules of
Interface Design (Shneiderman et al., 2018).

| Rule                            | Applied as                                                                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strive for consistency          | Button, badge and card variants are declared once in `components/ui/` and reused, so no screen invents its own styling                                          |
| Seek universal usability        | A command palette on `Ctrl`/`Cmd`+`K` accelerates repeat use; every command it offers is also reachable by pointer                                              |
| Offer informative feedback      | Every state change raises a toast naming what happened; the context bar reports the age of the current reading                                                  |
| Design dialogs to yield closure | Threshold editing ends in an explicit save and a confirmation; the action bar states whether changes are pending                                                |
| Prevent errors                  | Threshold bands are validated live for inversion and overlap, and Save is disabled while invalid; the email field is validated on blur                          |
| Permit easy reversal            | Disabling an account, toggling a data source and saving thresholds all carry an Undo action in the confirmation toast                                           |
| Keep users in control           | Edits are held in a draft until saved; polling never moves the user or changes their selection                                                                  |
| Reduce short-term memory load   | Metric cards carry sparklines and their configured band; trend summaries state minimum, maximum and average; the threshold editor previews the resulting states |

---

## Design system

Colour and type values are carried directly from Assessment 1, Tables 4 and 5.
They are declared once as CSS custom properties in `src/styles/index.css` and
mirrored in `tailwind.config.js`, so utility classes and component classes
cannot drift apart.

| Token                | Value     | Applied to                         |
| -------------------- | --------- | ---------------------------------- |
| Surface base         | `#0F1729` | Application background             |
| Surface card         | `#151E33` | Metric cards, chart panels, tables |
| Border               | `#22304F` | Card outlines, row dividers        |
| Text primary         | `#E8ECF5` | Values, headings, table data       |
| Text secondary       | `#93A1BF` | Labels, captions, timestamps       |
| Accent — temperature | `#FF3D8B` | Temperature value and series       |
| Accent — humidity    | `#22D3EE` | Humidity value and series          |
| Accent — air quality | `#A78BFA` | Air-quality value and series       |
| Status — good        | `#34D399` | Normal state                       |
| Status — warning     | `#FBBF24` | Warning state                      |
| Status — critical    | `#F43F5E` | Critical state                     |

Air quality was not assigned an accent in Assessment 1; `#A78BFA` was added and
checked against the same 4.5:1 contrast requirement as the existing tokens.

### Accessibility

- Contrast meets WCAG 2.2 level AA against the surface colours.
- Interactive behaviour comes from Radix primitives, which supply focus
  management, keyboard interaction and ARIA semantics.
- Status is conveyed by shape and word as well as colour: a filled dot marks
  Active, an outlined dot marks Invited.
- Every interactive control has a minimum target of 44 × 44 pixels.
- All form controls are associated with visible labels.
- A visible focus ring is present on every focusable element, and a skip link
  precedes the main content.
- `prefers-reduced-motion` disables animation.
- Layouts reflow at 1200px and 768px; metric cards stack to one column.

---

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

1. **Test and build** — install dependencies, run the Vitest suite, produce a
   production bundle, upload it as an artefact.
2. **Build and publish container image** — on `main` only, after tests pass:
   build the multi-stage Dockerfile and push to GitHub Container Registry,
   tagged `latest` and with the commit SHA.

Netlify watches the same branch and publishes the hosted site independently, so
a failing test does not block the deploy and a failing deploy does not hide a
failing test.

---

## Scope boundaries

Stated plainly, because these are Assessment 3 deliverables rather than
omissions:

- All data comes from an in-browser mock API (`src/lib/api.js`) that mirrors the
  REST contract the Express back-end will expose. Substituting the real back-end
  means editing that one file; no component changes.
- Authentication is simulated. There is no password hashing, no signed JWT and
  no session persistence.
- Threshold edits and account changes are held in React state and reset on
  reload, because no database is connected yet.
- Sensor readings come from a drift generator seeded with realistic baselines,
  continuing the simulation approach used in Capstone Project 1.

---

## Team

| Member                  | Student ID | Role                                 |
| ----------------------- | ---------- | ------------------------------------ |
| Saad Ebn Rashid Mrinmoy | S20250606  | Product Owner / Technical Lead       |
| Aawash Tripathi         | S20242455  | Scrum Master                         |
| Samir B K               | S20230100  | Development Team — UI                |
| Muhammad Khizar         | S20250465  | Development Team — Business Analysis |
| Prabin Chhantyal        | S20250172  | Development Team — Quality Assurance |
