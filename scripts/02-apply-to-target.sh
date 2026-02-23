#!/usr/bin/env sh
# Apply the generated schema dump to the TARGET database.
# Run after 01-generate-dump.sh: docker compose run --rm liquibase sh -c "./scripts/02-apply-to-target.sh"
# Optional: pass overrides, e.g. ./scripts/02-apply-to-target.sh -Dconfig.default_env=staging

set -e
TARGET_URL="${LIQUIBASE_TARGET_URL:-jdbc:mysql://mysql:3306/target_db}"
USER="${LIQUIBASE_USERNAME:-liquibase}"
PASS="${LIQUIBASE_PASSWORD:-liquibase}"

liquibase update \
  --changelog-file=changelog/schema-dump.xml \
  --url="$TARGET_URL" \
  --username="$USER" \
  --password="$PASS" \
  --driver=com.mysql.cj.jdbc.Driver \
  "$@"

echo "Applied schema-dump.xml to target. Check DATABASECHANGELOG in target_db for transaction history."
