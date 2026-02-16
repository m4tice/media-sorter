#!/bin/bash

# Setup Git Hooks for automatci CI/CD
# This script configures pre-commit and pre-push hooks

set -e

HOOKS_DIR=".git/hooks"
SCRIPT_DIR="scripts"

echo "Setting up Git hooks..."

# Create pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
# Pre-commit hook: runs tests before commit

echo "Running pre-commit checks..."
sh scripts/test.sh

if [ $? -ne 0 ]; then
  echo "Pre-commit checks failed. Commit aborted."
  exit 1
fi

echo "Pre-commit checks passed ✓"
EOF

chmod +x "$HOOKS_DIR/pre-commit"
echo "✓ Pre-commit hook installed"

# Create pre-push hook
cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash
# Pre-push hook: logs build timestamp and size

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Pushing branch: $BRANCH"

# Optional: Show git log
git log -1 --oneline

echo "Push allowed ✓"
EOF

chmod +x "$HOOKS_DIR/pre-push"
echo "✓ Pre-push hook installed"

echo "Git hooks setup complete!"
echo ""
echo "Hooks installed:"
echo "  - pre-commit: runs tests before commit"
echo "  - pre-push: logs commit info before push"
