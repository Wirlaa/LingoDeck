#!/bin/bash
set -e

echo "🃏 LingoDeck setup"
echo "------------------"

# Root .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created .env from .env.example"
else
  echo "· .env already exists, skipping"
fi

# backend/.env
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "✓ Created backend/.env from backend/.env.example"
else
  echo "· backend/.env already exists, skipping"
fi

echo ""
echo "✓ All done. Run:  docker compose up --build"
