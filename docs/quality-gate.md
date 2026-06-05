# Quality Gate

AtrVisu has an automated quality gate for pull requests and pushes to `main`.

## Local Commands

```text
npm.cmd run build
npm.cmd run test
npm.cmd run test:e2e
```

In environments where `npm.cmd` is not on `PATH`, use the installed npm executable directly or run the underlying Node entrypoints from `package.json`.

## Coverage

The v0.1 gate covers:

- TypeScript and Vite production build.
- Unit conversion helpers.
- Coordinate conversion helpers.
- Library validation and compatibility normalization.
- Taxonomy validation and fallback behavior.
- Layout export/import normalization.
- Basic browser smoke flow through the app, Library Manager, and Taxonomy Manager.
- Browser console/page errors during the smoke flow.

## Not Covered Yet

- Visual snapshot testing.
- Pixel-perfect UI regression.
- Full 3D geometry correctness.
- Collision envelope correctness.
- GLB visual fidelity.
- Complex drag/transform workflows.

Those areas still need manual review for now.

## CI Behavior

The GitHub Actions workflow is:

```text
.github/workflows/quality-gate.yml
```

It runs on `pull_request` and pushes to `main`:

1. `npm ci`
2. `npm run build`
3. `npm run test`
4. `npx playwright install --with-deps chromium`
5. `npm run test:e2e`

Unsafe PRs should be blocked when build, unit tests, or the smoke test fail.
