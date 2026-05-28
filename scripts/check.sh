#!/usr/bin/env bash
set -euo pipefail

npm run lint
npm run format
npm run test:run
npm run build
