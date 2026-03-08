#!/bin/bash
# CookQuest API health check script.
# Usage: ./scripts/health-check.sh [URL]
# Default URL: http://localhost:3003/ready
#
# Exit codes:
#   0 — healthy
#   1 — unhealthy or unreachable
#
# Can be used with cron for external monitoring:
#   */5 * * * * /opt/cookquest/scripts/health-check.sh https://cookquest.app/ready

set -euo pipefail

HEALTH_URL="${1:-http://localhost:3003/ready}"

STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")

if [ "$STATUS" = "200" ]; then
  echo "OK: CookQuest API healthy (HTTP $STATUS) — $HEALTH_URL"
  exit 0
else
  echo "ALERT: CookQuest API unhealthy (HTTP $STATUS) — $HEALTH_URL"
  # Optionally send webhook notification:
  # curl -s -X POST "$WEBHOOK_URL" -H 'Content-Type: application/json' \
  #   -d "{\"text\": \"CookQuest API unhealthy (HTTP $STATUS)\"}"
  exit 1
fi
