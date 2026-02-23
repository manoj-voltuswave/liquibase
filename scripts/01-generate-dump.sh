#!/usr/bin/env sh
# Generate a changelog (schema dump) from the SOURCE database.
# Run after applying seed to source: docker compose run --rm liquibase sh -c "./scripts/01-generate-dump.sh"

set -e
SOURCE_URL="${LB_SOURCE_URL:?Set LB_SOURCE_URL (e.g. in .env)}"
USER="${LB_USERNAME:?Set LB_USERNAME}"
PASS="${LB_PASSWORD:?Set LB_PASSWORD}"

liquibase generate-changelog \
  --changelog-file=changelog/schema-dump.xml \
  --url="$SOURCE_URL" \
  --username="$USER" \
  --password="$PASS" \
  --driver=com.mysql.cj.jdbc.Driver \
  --overwrite-output-file=true

echo "Schema dump written to changelog/schema-dump.xml"
