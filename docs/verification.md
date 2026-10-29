# Verification report

Run date: 2026-10-29. Environment: Node 24.19.0, npm 11.9.0, Linux Chromium.

- `npm run lint`: passed.
- `npm test`: passed, 17 tests across data validation and LP inference.
- `npm run build`: passed, TypeScript and Vite production build.
- `npm run test:e2e`: passed, 2 end-to-end scenarios against the production build (1440 × 1600 desktop; 390 × 844 mobile).
- Browser coverage: mouse drag, keyboard pickup/move/drop, CDP touch drag, infeasible preference ranking, reset, search, valid JSON import, malformed JSON rejection without destroying the dataset, model removal below minimum, demo recovery, no page errors, no mobile document horizontal overflow.
- Screenshots: `desktop.png`, `mobile.png`, `conflict.png`; visually inspected desktop and mobile. Table overflow is intentionally contained in a horizontal scroll region.
- CSV fixture import, quoted fields, null values and metadata validation covered by unit tests.
- CI workflow provided but not run remotely because repository creation was denied.

## Publication blocker

The GitHub CLI authenticated as Paulkm2006. The proposed repository `Paulkm2006/aa-ranking-lab` returned HTTP 404 before creation. The explicitly authorized command to create a public repository failed:

```text
gh repo create Paulkm2006/aa-ranking-lab --public ...
GraphQL: Resource not accessible by integration (createRepository)
```

A subsequent metadata GET still returned HTTP 404. No repository was created, no code was pushed, and no remote SHA or CI result exists. This is an integration capability/permission denial, not a code or test failure. No credential was requested, printed, or generated. No further create attempt was made after the denial.

The independent local project is ready to push once a repository is created with an authorized account/tool. Do not overwrite an existing repository. The preinstalled hustapp-client repository was not modified.

## Remaining limits

- No live AA scores, scraping or API integration; all bundled model scores are clearly marked synthetic. Local user-owned/authorized data import is supported.
- No public hosted URL; static `dist/` is generated and ready for hosting. No hosting accounts/services were provisioned.
- Chromium desktop/mobile emulation tested; physical devices, Safari and Firefox not tested.
- LP uses finite precision; optimal-face ranges are sensitivity bounds, not statistical confidence intervals.

## GitHub Pages follow-up (2026-10-29)

The repository metadata request still returned HTTP 404. The previously denied repository creation was not retried because no new permission evidence was available. No Pages settings were mutated and no push or deployment was attempted against a missing/inaccessible repository.

Prepared `.github/workflows/pages.yml`: main/manual trigger, lint/unit/build/browser checks before artifact upload, separate deployment job, `github-pages` environment, job-scoped Pages/OIDC permissions. Fixed Vite base and production browser test URLs to `/aa-ranking-lab/`.

Local verification passed again: lint, 17 unit tests, TypeScript/production build, both browser scenarios against the project subpath. Added successful download and local import of `example.csv` from that subpath, in addition to LP worker, JSON import and drag checks. Remote workflow execution and the live public URL remain unverified because the repository is still unavailable.


## Repository publication follow-up (2026-10-29)

The user supplied the now-created repository. Verified it is public, empty, and writable before pushing main normally; no existing commits were overwritten. Source and Pages workflow are now on GitHub.

Enabling Pages using `POST /repos/Paulkm2006/aa-ranking-lab/pages` with `build_type=workflow` was denied with HTTP 403 `Resource not accessible by integration`. A subsequent Pages GET returned 404. No repeated enable attempt was made after that denial. A repository administrator must select Settings → Pages → Source → GitHub Actions, then run the Deploy Pages workflow. The deployed public page remains unverified until that succeeds.
