#!/usr/bin/env sh
# Generate a changelog (schema dump) from the SOURCE database.
# Run after applying seed to source: docker compose run --rm liquibase sh -c "./scripts/01-generate-dump.sh"

set -e
SOURCE_URL="${LIQUIBASE_SOURCE_URL:-jdbc:mysql://mysql:3306/source_db}"
USER="${LIQUIBASE_USERNAME:-liquibase}"
PASS="${LIQUIBASE_PASSWORD:-liquibase}"

liquibase generate-changelog \
  --changelog-file=changelog/schema-dump.xml \
  --url="$SOURCE_URL" \
  --username="$USER" \
  --password="$PASS" \
  --driver=com.mysql.cj.jdbc.Driver \
  --overwrite-output-file=true

echo "Schema dump written to changelog/schema-dump.xml"
