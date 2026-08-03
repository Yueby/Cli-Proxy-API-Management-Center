# VERIFICATION — candidate/nonpromo-upstream-port-20260725

Check time: 2026-07-25
Candidate pre-release tree: `candidate/nonpromo-upstream-port-20260725`
Baseline: `ac6e74d5cf35fdff1a4936a408fdf3673ebbb85c` (`origin/main`)
Upstream tip audited: `458e5e144bb9422a270c7df30e7b36d206839fa2` (`upstream/main`, upstream tag `v1.19.2`)
Planned Fork release: `v1.19.3`

## Gates

| Gate | Command | Result |
|---|---|---|
| Unit tests | `bun test tests/` | **101 pass / 0 fail** (38 files, 451 expects) |
| Type-check | `bun run type-check` | **exit 0** |
| Lint | `bun run lint` | **0 errors**, 7 existing `no-explicit-any` warnings |
| Production build | `bun run build` | **exit 0** — single-file `dist/index.html`, 2,560.90 kB (gzip 829.10 kB) |
| Whitespace | `git diff --check` | **clean** |
| Policy / secret scan | diff grep for affiliate/promo/secret markers and deleted pages | **PASS** |
| Preview reachability | `curl http://127.0.0.1:32333/` and public reverse proxy | **HTTP 200 / HTTP 200** |

## Final semantic ports

- ClaudeAPI defaults to `https://gw.apito.ai` and recognizes legacy `https://gw.claudeapi.com`; no affiliate endpoint added.
- Kimi Auth Files icons use the existing Fork theme surface in cards and category filters.
- OAuth Auth Files support manual credential refresh by expiring the supported credential fields and reloading data.
- PluginsPage now sends only touched fields through `PATCH`, preserving unknown backend fields and the Fork array-list editor.
- Visual Config adds translated field search, conditional field reveal, anchors and jump positioning without replacing the Fork editor/drawer UI.
- Plugin Store card header uses a resilient grid for long titles and badges.
- Dashboard/System share `useApiKeysForModels`, retaining cache invalidation and force-refresh behavior.

## Policy review

- Excluded: APIKEY.FUN, affiliate/referral links, Sponsor Quick Start, recommendation cards/badges, quick-registration CTAs.
- Not restored: `ProviderCategoryList`, standalone `OAuthPage`, Ampcode historical pages.
- Preserved: Fork provider order, Provider Workbench, mobile drawer behavior, array editing UX, and `codex.identity-confuse` support.
- No credentials or private key material detected in the release diff.

## Upstream state

`upstream/main` remained at `458e5e1` during final verification; there were no commits after the audited tip to port.

## Visual limitation

The Vite preview and reverse proxy returned HTTP 200. Automated screenshot inspection was unavailable because the Camofox browser service was not running; functional UI contracts are covered by focused regression tests and the production build.
