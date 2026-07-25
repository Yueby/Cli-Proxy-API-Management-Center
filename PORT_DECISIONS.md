# PORT_DECISIONS — candidate/nonpromo-upstream-port-20260725

Check time: 2026-07-25 03:45 UTC
Baseline origin/main: `ac6e74d5cf35fdff1a4936a408fdf3673ebbb85c`
Upstream/main at audit: (see audit t_223429ef); current upstream tip: `7793321b189be64e23326c6e140b07ee4689a337`
Candidate HEAD: `4bfa6a6f3bfb1314bf9ee7329b69062116980859`
Branch: `candidate/nonpromo-upstream-port-20260725`
Method: reuse verified `d1bf918` + `preview/providers-dev-20260723` stack, then selective ports of remaining C7/C1/C3-events.

Policy sources:
- `/root/.hermes/policies/cli-proxy-upstream-audit.md`
- selective-fork-upstream-sync / ui-enhanced-fork-policy
- Default-include all non-promotional upstream; preserve Fork UI; exclude sponsor/affiliate/promo only.

---

## Integrated (by batch)

### C4 — concurrency / aggregation / cache / connection isolation
- **Sources:** `d1bf918`, `898a5eb` (preview safety)
- **What:** `useQuotaStore` generation guards; provider list concurrency (`applyProviderListAddition` / replace-by-identity); multi-protocol aggregation safety + mutation recovery; recent-requests cache isolation by connection scope; inline quota commit guards; auth-file/oauth dirty/load guards; sourceIndex preservation helpers; model-alias validation
- **Method:** cherry-pick `-n` / full preview safety commit
- **Why:** core data-race and stale-response correctness; default-include
- **UI:** no page/SCSS overwrite

### C3 — Auth Files protocol / guards / events
- **Sources:** `d1bf918` (guards/helpers), `898a5eb` (OAuth load-guard UI wiring on existing cards), `4d081359` (event bus only)
- **What:** OAuth excluded/alias load-failure disables writes + retry; dirty-state helpers; `authFilesEvents` + `notifyAuthFilesChanged` on upload/delete/batch/OAuth complete/Vertex import (Fork AuthFilesOAuthDialog, not upstream OAuthPage)
- **Excluded from same upstream commit:** MainLayout sidebar tooltips/badge SCSS, OAuthPage Kimi sign-up button
- **Why:** event bus is non-promotional product behavior; layout is Fork-authoritative

### C7 — API error envelope
- **Source:** `e677a68c`
- **What:** `src/services/api/apiError.ts` `parseApiErrorResponse`; `ApiError.apiCode`; client `handleError` prefers human `message` while keeping machine code
- **Preserved:** Fork CPA/home version + plugin capability header interceptor
- **Tests:** `tests/apiError.test.ts` (5)

### C2 — Plugin dynamic OAuth / compat
- **Sources:** `d1bf918` (+ earlier plugin commits already on main lineage where applicable)
- **What:** `pluginConfigDraft` helpers + tests (touched-field patch semantics); plugin OAuth callback allowlist for dynamic plugins; trust/version selection tests already present
- **Note:** Fork `PluginsPage` keeps its richer array list editor and full-config save path; extracted draft helpers are available and unit-tested but not forced into the page (would regress Fork array UX). Reachability of dynamic OAuth callback paths remains via Auth Files OAuth dialog / plugin providers.

### C1 — Quota / Codex / xAI / Kimi logic (no page/SCSS overwrite)
- **Sources:** `d1bf918`, `898a5eb`, `3447a0bd`, prior main xAI paid path
- **What:** Codex additional window classification; xAI paid OAuth quota fallback (`xaiPaid.ts`); Kimi row order limits-before-summary; reset-credits plumbing already in Fork `quotaConfigs` retained/extended; using_api auth-file helpers
- **Excluded:** Quota page layout/SCSS replacements

### C5 / C6 — Dashboard Redis + Visual Config
- **Sources:** `d1bf918` (+ visual config commits in stack)
- **What:** dashboard model-count failure vs empty distinction; visual config concurrency (dirty fields on latest YAML); disable-image-generation passthrough; Redis usage retention validation
- **Deferred full UI adapt:** upstream `configSearchIndex` + FieldAnchor jump-to-field search (large VisualConfigEditor structural merge). Helpers/behavior already improved; global search index not ported as page rewrite.

### A1 — Normal providers into Provider Workbench
- **Sources:** `21eace1`, `fb6dfa7`, `53981c1`, `2eaa592`, `952946e`, `196d304`, form polish `5c110e4`/`cdc4050`, safety `898a5eb`
- **What:** xAI API-key, Kimi multi-protocol, ClaudeAPI, Code0, FennoAI, Qiniu Cloud as normal workbench providers; multi-protocol form + soft-surface SCSS (Fork design); i18n all locales; original provider order preserved (new brands appended)
- **Naming note:** internal types still use legacy `Sponsor*` names for multi-protocol raw shapes (`SponsorProviderRaw`, `getSponsorProviderDefinition`) — these are **not** affiliate UI; no SponsorQuickStart / APIKEY.FUN / recommended cards
- **Promo scan:** clean for affiliate/sign-up/recommended-provider strings

### A2 — CI
- **Source:** already on branch via `d1bf918` / prior `4af4cf4`
- **What:** `.github/workflows/ci.yml` bun test + type-check + lint + build on PR/push main+dev
- **Compatible:** yes; retained

### D1 — a11y / theme
- **Decision:** **do not** overwrite Fork `MainLayout.tsx` / `layout.scss` with upstream tooltip/badge redesign from `4d081359`
- **Ported related:** multi-protocol form soft-surface alignment only (provider forms)
- **Why:** Fork UI is authoritative for shell chrome; upstream a11y/tooltips mixed with badge count chrome that would fight Fork sidebar

---

## Excluded (policy)

| Upstream artifact | Reason |
|---|---|
| `SponsorQuickStartPanel`, `SponsorProviderForm`, `useSponsorUsageCheck`, `sponsor.ts`, `sponsorMutationRecovery`, `apikey-fun.png` | Sponsor/affiliate/recommended-provider promotional UI |
| Kimi/APIKEY sign-up buttons / affiliate links | Promotional |
| Upstream `OAuthPage.tsx` as page shell | Fork uses Auth Files OAuth dialog + `/oauth` → `/auth-files` redirect; behavior ported there |
| MainLayout / layout.scss from `4d081359` | Fork UI authority |
| Quota page/SCSS wholesale | Fork UI authority; logic-only C1 |
| VisualConfig FieldAnchor search index full rewrite | Large UI structure; deferred (see remaining) |

---

## Remaining / optional follow-ups (not release blockers for this candidate)

1. Wire `pluginConfigDraft` into PluginsPage **or** extend helpers to support Fork array-list UX while keeping touched patches.
2. Semantic adapt of VisualConfig jump-to-field search (`configSearchIndex`) without replacing Fork editor chrome.
3. Extract `useApiKeysForModels` (DRY) — Fork already has equivalent inline resolvers on Dashboard/System.
4. Optional rename of internal `Sponsor*` multi-protocol type aliases to `MultiProtocol*` (no behavior change).
5. D1 sidebar tooltip/a11y if product wants it adapted into Fork shell (not copy-paste upstream).

---

## Commit map (candidate branch)

```
4bfa6a6 [candidate] emit auth-files-changed events on mutate (C3)
4adf96c [candidate] reorder Kimi quota rows limits-before-summary (C1)
0b78fbe [candidate] port API error envelope parsing (C7)
58b8606 [preview] align multi-protocol form with soft surface design
88519c8 [preview] refine multi-protocol provider form layout
22fd9c0 [preview] add upstream safety and quota protections
1d7a7dd [preview] complete provider i18n coverage
8a8f9cd [preview] align multi-protocol form styling
4eab8b6 [preview] preserve provider order and complete i18n
e583e78 [preview] integrate provider candidates
66ea636 [candidate] add ClaudeAPI and Code0 providers
6567f93 [candidate] add xAI and Kimi providers
1daba80 [candidate] port upstream non-UI data protections (C2/C3/C4/C5/C6/A2)
```
