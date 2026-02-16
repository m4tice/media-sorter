# Contributing

Thanks for contributing — this file describes conventions for branches, PRs, tags, and how CI/builds work.

Branching
- `main`: production-ready branch. Merge only via PRs.
- `develop`: integration branch for ongoing work.
- Feature branches: `feature/<short-desc>` or `feat/<short-desc>`.
- Fix branches: `fix/<short-desc>` or `hotfix/<short-desc>`.

Pull Requests
- Open PRs targeting `main` (or `develop` if your change is ongoing work).
- Provide a short description, testing steps, and link issues if any.
- Wait for CI to pass and at least one approving review before merging.

Tags / Releases
- Use semantic tags with a `v` prefix: `vMAJOR.MINOR.PATCH` (e.g. `v1.2.3`).
- Tagging a commit matching `v*` triggers the release job in CI which uploads artifacts to the Release.

Build & CI
- CI is configured in `.github/workflows/build.yml` and runs on `push` to `main`/`develop`, PRs to `main`, and `v*` tags.
- To build locally (Windows):
  ```bash
  npm install
  npm run build:win
  ```
- To build locally (macOS):
  ```bash
  npm install
  npm run build:mac
  ```

Scripts & Hooks
- This repo contains optional helpers under `scripts/`. They are convenience tools for local development (watch, test, build wrappers, hooks installer).
- `npm run setup-hooks` will install simple Git hooks that run tests before commit. These hooks are optional; you can skip them.

Notes
- Keep hooks and local scripts fast to avoid blocking developer workflows. CI runs the authoritative checks in a clean environment.

If you'd like stricter enforcement (protected branches, required reviewers, required CI checks), see `.github/branch-protection-example.md` for a sample configuration and CLI commands to apply them.
