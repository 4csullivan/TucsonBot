#!/usr/bin/env bash
set -euo pipefail
sha=${1:?Release SHA required}
archive=${2:?Release archive required}
[[ "$sha" =~ ^[a-f0-9]{40}$ ]]
[[ "$archive" =~ ^release-[0-9]+-[0-9]+\.tar\.gz$ ]]
cd /opt/tucsonbot
exec 9>.deploy.lock
flock -w 600 9
test -f .env
mkdir -p data releases
release=$(mktemp -d "releases/${sha}.XXXXXX")
tar -xzf "$archive" -C "$release"
rm -- "$archive"
export TUCSON_IMAGE="tucson-bot:$sha"
docker build --pull -t "$TUCSON_IMAGE" "$release"
compose=(docker compose -p tucsonbot -f "$release/docker-compose.production.yml")
# Leave the running bot untouched if the build fails. Gateway readiness gates sync.
"${compose[@]}" up -d --wait --wait-timeout 120
"${compose[@]}" run --rm --no-deps discord-bot node deploy-commands.js
printf '%s\n' "$sha" > .deployed-release.tmp
mv .deployed-release.tmp .deployed-release
echo "Deployed release $sha"
