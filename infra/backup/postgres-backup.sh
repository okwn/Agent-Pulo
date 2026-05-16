#!/bin/bash
# postgres-backup.sh — Backup PULO PostgreSQL database
# Usage: ./postgres-backup.sh [CONTAINER_NAME] [OUTPUT_DIR]
# Default: CONTAINER=pulo_postgres, OUTPUT_DIR=./backups

set -euo pipefail

CONTAINER="${1:-pulo_postgres}"
BACKUP_DIR="${2:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="pulo_backup_${TIMESTAMP}.sql.gz"
OUTPUT_PATH="${BACKUP_DIR}/${FILENAME}"

# ─── Safety: Dry run option ──────────────────────────────────────────────────
if [[ "${1:-}" == "--dry-run" ]]; then
  echo "[DRY RUN] Would run:"
  echo "  docker exec ${CONTAINER} pg_dump -U pulo pulo_dev | gzip > ${OUTPUT_PATH}"
  echo "  docker exec ${CONTAINER} pg_dump -U pulo pulo_dev | gzip > ${OUTPUT_PATH}.latest.sql.gz"
  exit 0
fi

# ─── Pre-flight checks ──────────────────────────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "ERROR: Container '${CONTAINER}' is not running."
  echo "Available containers:"
  docker ps --format '{{.Names}}' | grep pulo || echo "  (none)"
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

# ─── Backup ─────────────────────────────────────────────────────────────────
echo "Starting backup of ${CONTAINER}..."
echo "  Output: ${OUTPUT_PATH}"

docker exec "${CONTAINER}" pg_dump -U pulo pulo_dev 2>/dev/null \
  | gzip -9 \
  > "${OUTPUT_PATH}"

# Always create a "latest" symlink-friendly copy
cp "${OUTPUT_PATH}" "${BACKUP_DIR}/pulo_backup_latest.sql.gz"

echo "✅ Backup complete: ${FILENAME}"
echo "   Size: $(du -h "${OUTPUT_PATH}" | cut -f1)"

# ─── Cleanup old backups (keep last 7) ──────────────────────────────────────
cd "${BACKUP_DIR}"
ls -t pulo_backup_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
echo "   Old backups pruned (kept last 7)"