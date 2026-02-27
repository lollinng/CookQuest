#!/bin/bash
set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo "Example: $0 ./backups/cookquest_backup_20260227_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will overwrite the current database!"
read -p "Are you sure? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Restoring from: $BACKUP_FILE"

gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql \
  -U "${POSTGRES_USER:-cookquest}" \
  "${POSTGRES_DB:-cookquest}"

echo "Restore complete."
