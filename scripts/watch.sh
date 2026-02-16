#!/bin/bash

# Development watch script
# Auto-rebuilds on file changes

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting watch mode...${NC}"
echo -e "${YELLOW}Changes to .js, .html, .css will trigger rebuild${NC}"
echo ""

# Install nodemon if not present
if ! command -v nodemon &> /dev/null; then
  echo -e "${YELLOW}Installing nodemon...${NC}"
  npm install --save-dev nodemon
fi

# Watch for changes
nodemon \
  --exec "clear && npm start" \
  --watch . \
  --ext js,html,css,json \
  --ignore node_modules \
  --ignore dist \
  --ignore "*.log"
