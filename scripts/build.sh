#!/bin/bash

# Electron Boilerplate Build Script
# Offline CI/CD - builds app for current platform

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Electron App Build Script${NC}"
echo -e "${YELLOW}========================================${NC}"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
fi

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  PLATFORM="macOS"
  BUILD_CMD="npm run build -- --mac"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
  PLATFORM="Windows"
  BUILD_CMD="npm run build -- --win"
else
  PLATFORM="Linux"
  BUILD_CMD="npm run build -- --linux"
fi

echo -e "${GREEN}Platform detected: $PLATFORM${NC}"
echo -e "${YELLOW}Building application...${NC}"

# Run build
if $BUILD_CMD; then
  echo -e "${GREEN}✓ Build successful!${NC}"
  echo -e "${GREEN}Output: ./dist${NC}"
  ls -lah dist/
else
  echo -e "${RED}✗ Build failed!${NC}"
  exit 1
fi
