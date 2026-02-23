#!/usr/bin/env sh
# Generate a diff changelog: reference = SOURCE, target = TARGET.
# Run after changing source and before applying to target.
# docker compose run --rm liquibase sh -c "./scripts/03-diff-changelog.sh"

set -e
REF_URL="${LB_SOURCE_URL:?Set LB_SOURCE_URL}"
TARGET_URL="${LB_TARGET_URL:?Set LB_TARGET_URL}"
USER="${LB_USERNAME:?Set LB_USERNAME}"
PASS="${LB_PASSWORD:?Set LB_PASSWORD}"

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
