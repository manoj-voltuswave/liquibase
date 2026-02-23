#!/usr/bin/env sh
# Generate a diff changelog: reference = SOURCE, target = TARGET.
# Run after changing source and before applying to target.
# docker compose run --rm liquibase sh -c "./scripts/03-diff-changelog.sh"

set -e
REF_URL="${LIQUIBASE_SOURCE_URL:-jdbc:mysql://mysql:3306/source_db}"
TARGET_URL="${LIQUIBASE_TARGET_URL:-jdbc:mysql://mysql:3306/target_db}"
USER="${LIQUIBASE_USERNAME:-liquibase}"
PASS="${LIQUIBASE_PASSWORD:-liquibase}"

liquibase diff-changelog \
  --changelog-file=changelog/diff.xml \
  --reference-url="$REF_URL" \
  --reference-username="$USER" \
  --reference-password="$PASS" \
  --url="$TARGET_URL" \
  --username="$USER" \
  --password="$PASS" \
  --driver=com.mysql.cj.jdbc.Driver \
  --overwrite-output-file=true

echo "Diff changelog written to changelog/diff.xml"
