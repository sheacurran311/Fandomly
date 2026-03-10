#!/bin/bash
set -e

echo "Pushing database schema..."
npm run db:push

echo "Building application..."
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=4096"
npm run build

echo "Build complete."
