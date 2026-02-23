#!/usr/bin/env sh
# Apply the generated schema dump to the TARGET database.
# Run after 01-generate-dump.sh: docker compose run --rm liquibase sh -c "./scripts/02-apply-to-target.sh"
# Optional: pass overrides, e.g. ./scripts/02-apply-to-target.sh -Dconfig.default_env=staging

set -e
TARGET_URL="${LB_TARGET_URL:?Set LB_TARGET_URL (e.g. in .env)}"
USER="${LB_USERNAME:?Set LB_USERNAME}"
PASS="${LB_PASSWORD:?Set LB_PASSWORD}"

liquibase update \
  --changelog-file=changelog/schema-dump.xml \
  --url="$TARGET_URL" \
  --username="$USER" \
  --password="$PASS" \
  --driver=com.mysql.cj.jdbc.Driver \
  "$@"

echo "Applied schema-dump.xml to target. Check DATABASECHANGELOG in target_db for transaction history."
