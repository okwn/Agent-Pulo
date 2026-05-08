# PostgreSQL Backup Guide

Backup and restore strategies for PULO's PostgreSQL database.

## Backup Methods

### 1. Docker Volume Backup

```bash
# Create backup tarball
docker run --rm \
  -v pulo_postgres_data:/var/lib/postgresql/data \
  -v $(pwd):/backup \
  ubuntu \
  tar czf /backup/pulo_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  -C /var/lib/postgresql/data .
```

### 2. pg_dump (Recommended)

```bash
# Dump to file
pg_dump -h localhost -p 5432 -U pulo -d pulo -Fc -f pulo_backup.dump

# Compressed dump
pg_dump -h localhost -p 5432 -U pulo -d pulo | gzip > pulo_backup_$(date +%Y%m%d).sql.gz
```

### 3. Docker Exec

```bash
# Inside container
docker compose exec postgres pg_dump -U pulo -d pulo -Fc > pulo_backup.dump

# With compression
docker compose exec postgres pg_dump -U pulo -d pulo | gzip > backup_$(date +%Y%m%d).sql.gz
```

## Restore

### Restore from pg_dump

```bash
# Restore (drop existing tables first for clean restore)
pg_restore -h localhost -p 5432 -U pulo -d pulo -c pulo_backup.dump
```

### Restore from Docker volume backup

```bash
# Stop postgres
docker compose stop postgres

# Extract backup
docker run --rm \
  -v pulo_postgres_data:/var/lib/postgresql/data \
  -v $(pwd):/backup \
  ubuntu \
  tar xzf /backup/pulo_backup_20260101_120000.tar.gz \
  -C /var/lib/postgresql/data

# Start postgres
docker compose start postgres
```

### Restore from SQL dump

```bash
# Gunzip and restore
gunzip -c pulo_backup_20260101.sql.gz | psql -h localhost -p 5432 -U pulo -d pulo
```

## Automated Backup Script

Create `/opt/pulo/backup.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/opt/pulo/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/pulo_${DATE}.dump.gz"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Run backup
docker compose exec -T postgres pg_dump -U pulo -d pulo | gzip > ${BACKUP_FILE}

# Keep only last 7 backups
cd ${BACKUP_DIR}
ls -t pulo_*.dump.gz | tail -n +8 | xargs -r rm

echo "Backup saved: ${BACKUP_FILE}"
```

Make executable:
```bash
chmod +x /opt/pulo/backup.sh
```

## Cron Setup

```bash
# Edit crontab
crontab -e

# Add backup job (daily at 2 AM)
0 2 * * * /opt/pulo/backup.sh >> /opt/pulo/logs/backup.log 2>&1
```

## Docker Volume Backup with Restic

### Install Restic

```bash
apt install -y restic
```

### Initialize Repository

```bash
export RESTIC_PASSWORD="your-backup-password"
restic init --repo /opt/pulo/backups/restic
```

### Backup Script with Restic

```bash
#!/bin/bash
set -e
export RESTIC_PASSWORD="your-backup-password"

BACKUP_DIR="/opt/pulo/backups/restic"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
docker run --rm \
  -v pulo_postgres_data:/var/lib/postgresql/data \
  -v /opt/pulo/backups:/backup \
  ubuntu \
  tar czf /tmp/pulo_data.tar.gz -C /var/lib/postgresql/data .

restic backup /tmp/pulo_data.tar.gz --repo ${BACKUP_DIR}
rm /tmp/pulo_data.tar.gz

# Prune old backups (keep last 7)
restic forget --repo ${BACKUP_DIR} --keep-last 7 --prune

echo "Backup completed: ${DATE}"
```

## Backup Verification

Test your backups regularly:

```bash
# Verify dump is valid
pg_restore -h localhost -U pulo --db-template=template0 -l pulo_backup.dump

# Restore to test database
createdb pulo_test
pg_restore -h localhost -U pulo -d pulo_test pulo_backup.dump
psql -h localhost -U pulo -d pulo_test -c "SELECT COUNT(*) FROM users;"
dropdb pulo_test
```

## Cloud Backup

### S3-Compatible Storage

```bash
# Install AWS CLI or rclone
apt install rclone

# Configure rclone (interactive)
rclone config

# Backup to S3
rclone copy pulo_backup.dump.gz s3:my-bucket/pulo-backups/
```

### Restic with S3

```bash
export RESTIC_PASSWORD="your-backup-password"
restic init --repo s3:s3.amazonaws.com/my-bucket/pulo-backups

# Backup
restic backup /path/to/backup.dump.gz --repo s3:s3.amazonaws.com/my-bucket/pulo-backups
```

## Point-in-Time Recovery

PostgreSQL supports PITR with WAL archiving.

### Enable WAL Archiving

```bash
# In postgres container or postgresql.conf
wal_level = archive
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/data/wal_archive/%f'
```

### Restore to Specific Point

```bash
# Get backup base + WAL files
pg_restore -h localhost -U pulo -d pulo pulo_base_backup.dump

# Apply WAL up to point in time
psql -h localhost -U pulo -d pulo -c "SELECT pg_xlog_replay_resume();"
```

## Health Checks

```bash
# Verify database integrity
docker compose exec postgres psql -U pulo -d pulo -c "CHECKPOINT;"

# Check table sizes
docker compose exec postgres psql -U pulo -d pulo -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relname)) FROM pg_catalog.pg_tables WHERE schemaname = 'public';"
```

## Retention Policy

| Backup Type | Retention | Location |
|-------------|-----------|----------|
| Daily dumps | 7 days | Local |
| Weekly dumps | 4 weeks | Local |
| Monthly dumps | 12 months | Cold storage / S3 |
| WAL archives | 7 days | Local |

## Emergency Restore Procedure

If database is corrupted or lost:

1. Stop all services:
   ```bash
   docker compose stop api worker
   ```

2. Remove corrupted volume:
   ```bash
   docker volume rm pulo_postgres_data
   docker volume create pulo_postgres_data
   ```

3. Restore from latest backup:
   ```bash
   docker compose run --rm postgres bash -c "gunzip -c /backup/latest.sql.gz | psql -U pulo -d pulo"
   ```

4. Start services:
   ```bash
   docker compose start postgres
   docker compose up -d api worker
   ```
