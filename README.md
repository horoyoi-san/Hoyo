# Kafka SrTools

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**Kafka SrTools** is a modern toolkit for Honkai: Star Rail, built with **Next.js** and **Bun.js**.

---

## Live Sites

The application is deployed and available at the following URLs:

| Role | URL |
| :--- | :--- |
| **Main Site** | [srtools.punklorde.org](https://srtools.punklorde.org) |

---

## Key Features

* **Optimized Performance:** Leveraging Bun for dependency management, scripting, and development server speed.
* **Next.js App Router:** Modern routing and data fetching using the latest Next.js architecture.
* **Server-Side Rendering (SSR):** Enhanced SEO and faster initial load times for improved user experience.
* **Robust Type Safety:** Built with TypeScript for reliable and maintainable code.
* **Modular Design:** Clean separation of concerns with reusable components and utilities.

## Technology Stack

* **Frontend Framework:** [Next.js 15](https://nextjs.org/) (React)
* **Runtime & Package Manager:** [Bun](https://bun.sh/)
* **Language:** TypeScript
* **Styling:** (Tailwind CSS, DaisyUI)
* **State Management:** (Zustand)

---

## Prerequisites

Ensure you have **Bun** installed on your system.

Install Bun (macOS, WSL, Linux):

```bash
curl -fsSL [https://bun.sh/install](https://bun.sh/install) | bash
```

## Development

```bash
bun install
```

```bash
bun run dev
```

```bash
bun run build
bun run start
```

## Data transport

`/api/data/:name` serves the brotli files in `data/` as they are; nothing is split or
packed here. `data/` is a copy of `full/brotli/` from srtools-converter (see its README), which
already writes the views the first screen needs: `metadata_core` and `metadata_stage` (the
battle-only `Stage` records), `avatar_index` (the avatar list without skills, eidolons or full
skill trees) and one `avatar_detail/<id>` per avatar. A file in a subfolder is served as
`<folder>_<file>`, so `avatar_detail/1001.json.br` is `/api/data/avatar_detail_1001`.

To update the data: run the converter, then copy `convert/full/brotli/` over `data/`
(keep `changelog.json`) and delete `avatar.json.br` and `metadata.json.br`: the whole documents
are only the source of the views, and the client never requests them.

Data responses revalidate using content ETags instead of timestamp cache-busting.
In development the original files are served and changes are checked per dataset.

Run `bun run test` for lightweight data/battle/persistence regression tests.

## Maintaining battle rules

* `src/helper/battleConfig.ts`: pure, typed rules, with one entry point per mode:
  `deriveMocConfig`, `derivePfConfig`, `deriveAsConfig`, `derivePeakConfig`, and
  `fillTheoryCraftHP`. Change a mode's rules in its function; shared helpers only
  handle side selection, stage-to-monster mapping, and unchanged-result checks.
* `src/lib/battleConfigSync.ts`: store subscriptions and one explicit case per
  mode. Add a new mode's config/data dependency, calculator, and setter here.
  Do not put buffs, cycle limits, or enemy calculation in this file or the modal.
* `bun test tests/battleConfig.test.mjs`: focused regressions, no browser needed.
