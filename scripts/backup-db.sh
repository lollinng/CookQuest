#!/bin/bash
# Container-internal backup script for the Docker backup sidecar.
# Connects directly to postgres via hostname (no docker compose exec).
# For host-side backups, use scripts/backup-postgres.sh instead.
set -euo pipefail

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="cookquest_${TIMESTAMP}.sql.gz"
RETAIN_DAYS="${RETAIN_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting PostgreSQL backup..."

pg_dump \
  -h postgres \
  -U "${POSTGRES_USER}" \
  --no-owner \
  --no-privileges \
  "${POSTGRES_DB}" | gzip > "${BACKUP_DIR}/${FILENAME}"

SIZE=$(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)
echo "[$(date -Iseconds)] Backup created: ${FILENAME} (${SIZE})"

# Retain only last N days of backups
DELETED=$(find "${BACKUP_DIR}" -name "cookquest_*.sql.gz" -mtime +"${RETAIN_DAYS}" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date -Iseconds)] Cleaned up ${DELETED} old backup(s) (older than ${RETAIN_DAYS} days)"
fi

echo "[$(date -Iseconds)] Backup complete."
