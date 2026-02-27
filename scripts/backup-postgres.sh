#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="cookquest_backup_${TIMESTAMP}.sql.gz"
RETAIN_DAYS="${RETAIN_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

echo "Starting PostgreSQL backup..."

# Dump from running Docker container
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-cookquest}" \
  --no-owner \
  --no-privileges \
  "${POSTGRES_DB:-cookquest}" | gzip > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "Backup created: $BACKUP_DIR/$FILENAME ($SIZE)"

# Retain only last N days of backups
DELETED=$(find "$BACKUP_DIR" -name "cookquest_backup_*.sql.gz" -mtime +"$RETAIN_DAYS" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "Cleaned up $DELETED old backup(s) (older than $RETAIN_DAYS days)"
fi

echo "Backup complete."
