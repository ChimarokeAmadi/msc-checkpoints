#!/bin/sh
# Copies the files Azure needs into the Git repo you cloned from Azure's
# Deployment Center, e.g.:  sh scripts/copy-to-azure-repo.sh ../my-azure-repo
# It skips node_modules (Azure installs them itself), the React source
# (public/ already holds the built app) and config/.env (secrets go in Azure's
# Environment variables, never in Git).
set -e
target="$1"
if [ -z "$target" ] || [ ! -d "$target/.git" ]; then
  echo "Usage: sh scripts/copy-to-azure-repo.sh <folder of the cloned Azure git repo>"
  exit 1
fi
cd "$(dirname "$0")/.."
if [ ! -f public/index.html ]; then
  echo "public/index.html is missing: run 'npm run build:client' first"
  exit 1
fi
rsync -a --delete \
  --exclude .git --exclude node_modules --exclude client --exclude test \
  --exclude screenshots --exclude scripts --exclude config/.env --exclude local.js \
  --exclude .DS_Store \
  ./ "$target/"
echo "Copied. Now: cd $target && git add -A && git commit -m 'Deploy' && git push"
