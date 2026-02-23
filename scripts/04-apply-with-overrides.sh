#!/usr/bin/env sh
# Apply a changelog (e.g. diff.xml or schema-dump.xml) to TARGET with value overrides.
# Example: docker compose run --rm liquibase sh -c "./scripts/04-apply-with-overrides.sh"
# Or with overrides: docker compose run --rm liquibase sh -c \"./scripts/04-apply-with-overrides.sh -Dconfig.default_env=staging -Dapp.schema=target_db\"

set -e
CHANGELOG="${1:-changelog/diff.xml}"
TARGET_URL="${LB_TARGET_URL:?Set LB_TARGET_URL}"
USER="${LB_USERNAME:?Set LB_USERNAME}"
PASS="${LB_PASSWORD:?Set LB_PASSWORD}"
liquibase update \
  --changelog-file="$CHANGELOG" \
  --url="$TARGET_URL" \
  --username="$USER" \
  --password="$PASS" \
  --driver=com.mysql.cj.jdbc.Driver \
  -Dconfig.default_env="${CONFIG_DEFAULT_ENV:-staging}" \
  -Dapp.schema="${APP_SCHEMA:-target_db}" \
  "$@"

echo "Applied $CHANGELOG with overrides. Query DATABASECHANGELOG / DATABASECHANGELOGLOCK in target for tracking."
