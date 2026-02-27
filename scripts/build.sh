#!/bin/bash
set -e

echo "Pushing database schema..."
npm run db:push

echo "Building application..."
npm run build

echo "Build complete."
