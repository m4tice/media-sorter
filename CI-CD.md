# CI/CD Pipeline Setup

This boilerplate includes both **online (GitHub Actions)** and **offline (local scripts)** CI/CD automation for building and testing your Electron app across platforms.

## Quick Start

### First Time Setup

```bash
# Install dependencies with build tools
npm install

# Setup Git hooks for automated pre-commit/pre-push checks
npm run setup-hooks
```

To track the generated lockfile for reproducible installs, add and push it to the repository:

```bash
git add package-lock.json
git commit -m "chore: add package-lock.json for reproducible installs"
git push
```

---

## Online CI/CD (GitHub Actions)

Automated builds triggered on push and pull requests.

### How It Works

- **Trigger:** Push to `main`/`develop` or create a tag `v*`
- **Builds:** Automatically builds for macOS and Windows on Node 18 & 20
- **Artifacts:** Built apps available as downloadable artifacts
- **Releases:** Tags create GitHub Releases with build artifacts

### GitHub Actions Workflow

File: [.github/workflows/build.yml](.github/workflows/build.yml)

**What it does:**
```
On Push/PR:
├── Build macOS app → Upload artifact
├── Build Windows app → Upload artifact
└── (Optional) Run tests

On Tag (v*.*.*):
├── Download all artifacts
└── Create GitHub Release with builds
```

### Setup Instructions

1. **Push to GitHub** (if not already):
   ```bash
   git remote add origin https://github.com/yourusername/repo.git
   git push -u origin main
   ```

2. **Enable Actions** (if private repo):
   - Go to repo → Settings → Actions → Enable

3. **(Optional) Setup Secrets for Code Signing**:
   - Settings → Secrets and variables → Actions → New repository secret
   - Add signing certificates/keys if needed

4. **Create a Release**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
   → Creates GitHub Release with builds automatically

### View Builds

- Actions tab: See build logs
- Artifacts: Download after build completes
- Releases: Finished releases with builds

---

## Offline CI/CD (Local Scripts)

Run builds locally without pushing to GitHub.

### Available Scripts

#### 1. **Build App** (Current Platform)
```bash
# macOS
sh scripts/build.sh
# or
npm run build

# Windows
scripts\build.bat
# or
npm run build
```
**Output:** `dist/` with `.dmg` (macOS) or `.exe` (Windows)

#### 2. **Build All Platforms**
```bash
npm run build:all    # Both macOS and Windows
npm run build:mac    # macOS only
npm run build:win    # Windows only
```

#### 3. **Run Tests & Checks**
```bash
npm test
# or
sh scripts/test.sh
```
**Checks:** Syntax validation, optional linting

#### 4. **Watch Mode** (Auto-rebuild on changes)
```bash
npm run watch
# or
sh scripts/watch.sh
```
Auto-restarts app when you modify `.js`, `.html`, `.css` files.

#### 5. **Setup Git Hooks** (Pre-commit automation)
```bash
npm run setup-hooks
```

**What it installs:**
- **Pre-commit hook:** Runs `npm test` before each commit
  - Prevents broken code from being committed
  - Run with: `git commit`

- **Pre-push hook:** Shows commit info before push
  - Double-check before pushing

### Make Scripts Executable (macOS/Linux)

```bash
chmod +x scripts/*.sh
```

---

## Workflow Examples

### Daily Development

```bash
# 1. Start with watch mode
npm run watch

# 2. Code changes auto-reload the app

# 3. When ready to commit
git add .
npm test          # Pre-commit hook runs automatically
git commit -m "feature: add button"

# 4. Push to GitHub
git push origin main
# → GitHub Actions automatically builds for all platforms
```

### Building for Distribution

```bash
# Build for current platform
npm run build

# Or build everything
npm run build:all

# Files in dist/ are ready to share or move to another machine
```

### Test Before Pushing

```bash
npm test
# → Checks syntax, catches errors early
```

---

## GitHub Actions Configuration

### Modify Build Platforms

Edit [.github/workflows/build.yml](.github/workflows/build.yml):

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x]  # Add/remove Node versions
```

### Add Linux Builds

Add to workflow matrix jobs:
```yaml
build-linux:
  runs-on: ubuntu-latest
  # ... same steps as others
  - run: npm run build -- --linux
```

### Skip Certain Branches

Edit workflow `on:` section:
```yaml
on:
  push:
    branches:
      - main
      - develop
    tags:
      - 'v*'
```

---

## Troubleshooting

### GitHub Actions Failing

1. Check logs: Actions tab → failed workflow
2. Common issues:
   - Missing `npm install` → auto-fixed by workflow
   - Node version incompatibility → specify Node 18+
   - `electron-builder` needs Windows/macOS runners

### Build Script Not Executable

```bash
chmod +x scripts/build.sh scripts/test.sh scripts/watch.sh
```

### Pre-commit Hook Blocking Commits

```bash
# Bypass hook if necessary (use sparingly)
git commit --no-verify -m "message"
```

### electron-builder Errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## File Structure

```
.github/
├── workflows/
│   └── build.yml          # GitHub Actions configuration

scripts/
├── build.sh               # Build script (macOS/Linux)
├── build.bat              # Build script (Windows)
├── test.sh                # Test & validation script
├── watch.sh               # Watch mode for development
└── setup-hooks.sh         # Git hooks setup

.git/
└── hooks/
    ├── pre-commit         # Auto-installed: runs tests
    └── pre-push           # Auto-installed: logs commit info
```

---

## Summary

| Task | Command | Platform | Runs |
|------|---------|----------|------|
| Dev | `npm start` | Current | Immediate |
| Watch | `npm run watch` | Current | Auto-reload |
| Test | `npm test` | Current | Checks only |
| Build | `npm run build` | Current | Offline |
| Build All | `npm run build:all` | Current | Offline |
| Auto CI | `git push` | All | GitHub Actions |
| Auto Release | `git tag v*.*.*` | All | GitHub Actions |

