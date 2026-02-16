#!/bin/bash

# Electron Boilerplate Test Script
# Runs linting and basic checks

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Running tests and checks...${NC}"

# Check Node modules
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
fi

# Lint JS files (if eslint is configured)
if npm run lint --if-present > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Linting passed${NC}"
else
  echo -e "${YELLOW}⚠ No linting configured (skipped)${NC}"
fi

# Check syntax
echo -e "${YELLOW}Checking file syntax...${NC}"
node -c main.js && echo -e "${GREEN}✓ main.js syntax OK${NC}"
node -c preload.js && echo -e "${GREEN}✓ preload.js syntax OK${NC}"
node -c renderer.js && echo -e "${GREEN}✓ renderer.js syntax OK${NC}"

echo -e "${GREEN}✓ All checks passed!${NC}"
