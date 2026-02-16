ipcMain.handle('read-file', async (event, path) => {
# Electron Boilerplate

Minimal Electron starter. For developer-oriented details see the linked docs.

Quick Start

Prerequisites: Node.js (v14+) and npm.

Install and run:

```bash
npm install
npm start
```

Build installers

```bash
# macOS (creates .dmg)
npm run build:mac

# Windows (creates .exe/.zip)
npm run build:win
```

Docs

- CI/CD details: `CI-CD.md`
- Contribution & branching: `CONTRIBUTING.md`

Project layout (minimal):

```
src/        # app sources (main, preload, renderer)
scripts/    # optional local helpers (build/test/watch)
package.json
README.md
```

That's it — see `CI-CD.md` for advanced build/CI instructions and `CONTRIBUTING.md` for workflow rules.

