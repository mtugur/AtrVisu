# Dependency Audit

## 2026-06-17

### Initial audit summary

Command:

```sh
npm audit
```

Initial result:

- 3 high severity vulnerabilities.
- Vulnerable package: `esbuild`.
- Advisory: `GHSA-gv7w-rqvm-qjhr`, missing binary integrity verification in the Deno module can enable remote code execution through `NPM_CONFIG_REGISTRY`.
- Dependency path:
  - `vite` depended on vulnerable `esbuild`.
  - `@vitejs/plugin-react` depended on vulnerable `vite`.
- Direct or transitive:
  - `vite` and `@vitejs/plugin-react` are direct dev dependencies.
  - `esbuild` was transitive through `vite`.
- Recommended npm fix:
  - `npm audit fix --force`
  - npm reported this would install `vite@8.0.16`, a breaking major upgrade.

### Remediation attempted

Command:

```sh
npm audit fix
```

Result:

- No non-breaking fix was available.
- npm still reported the same `esbuild` vulnerability and recommended the Vite 8 major upgrade.

### Action taken

The project was upgraded along the audited fix path, but as a controlled dev-toolchain update rather than a blind force upgrade.

Command:

```sh
npm install --save-dev vite@8.0.16 @vitejs/plugin-react@6.0.2 vitest@4.1.9
```

Updated packages:

- `vite`: `6.4.3` installed previously, now `8.0.16`.
- `@vitejs/plugin-react`: `4.7.0` installed previously, now `6.0.2`.
- `vitest`: `4.1.8` installed previously, now `4.1.9`.

Risk review:

- This is a major Vite and React plugin upgrade.
- Vite 8 requires Node `^20.19.0 || >=22.12.0`.
- Local validation used Node `24.16.0`.
- GitHub Actions is configured with Node 24, so the new engine requirement is compatible with CI.
- React, TypeScript, Babylon.js, Playwright, and application dependencies were not upgraded across major versions.
- The change is limited to dev/build/test tooling and lockfile updates.

### E2E runner hardening

After the Vite 8 upgrade, all Playwright E2E tests passed but Playwright did not return control when its built-in `webServer` wrapper managed the Vite dev server.

To keep `npm run test:e2e` deterministic on Windows and Linux, the E2E script now runs `scripts/run-e2e.mjs`. The script:

- starts Vite directly with Node,
- waits for `http://127.0.0.1:5173`,
- runs Playwright with the Playwright-managed web server disabled,
- terminates the Vite process after Playwright exits.

This does not change AtrVisu product behavior.

### Final audit result

Command:

```sh
npm audit
```

Result:

- `0` vulnerabilities.
- `0` high severity vulnerabilities remain.

### Validation summary

Commands run after remediation:

```sh
npm.cmd install
npm.cmd run build
npm.cmd run test
npm.cmd run test:e2e
npm audit
npm.cmd run dev
```

Results:

- Install passed: 102 packages audited, 0 vulnerabilities.
- Build passed with Vite `8.0.16`.
- Unit tests passed: 29 files, 202 tests.
- E2E passed: 10 tests.
- Final audit passed: 0 vulnerabilities.
- Dev server smoke passed: `npm.cmd run dev` served the app successfully over HTTP during the local smoke check.
