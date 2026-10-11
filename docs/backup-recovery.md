# Universal POS Backup, Disaster Recovery & Reconciliation Runbook

## 1. RPO & RTO Objectives
- **Recovery Point Objective (RPO):** &le; 15 minutes (continuous WAL archiving).
- **Recovery Time Objective (RTO):** &le; 60 minutes (automated container provisioning and database restoration).

---

## 2. Automated PostgreSQL Backups

### Daily Logical Dump (pg_dump)
```bash
pg_dump -U pos_user -h localhost -p 5432 -F c -b -v -f "/backup/pos_backup_$(date +%Y%m%d_%H%M%S).dump" universal_pos
```

### Point-In-Time Recovery (PITR)
- Enable WAL archiving in PostgreSQL `postgresql.conf`:
  ```ini
  wal_level = replica
  archive_mode = on
  archive_command = 'test ! -f /wal_archive/%f && cp %p /wal_archive/%f'
  ```

---

## 3. Restore Drills & Transaction Re-Verification

When restoring from backup:
1. Restore database into a staging environment:
   ```bash
   pg_restore -U pos_user -h localhost -d universal_pos_restore "/backup/pos_backup.dump"
   ```
2. Re-run schema migration runner to verify all migrations are applied:
   ```bash
   npm run db:migrate
   ```
3. Run automated inventory ledger reconciliation:
   ```bash
   # Executes reconciliation across all locations and products
   POST /api/v1/businesses/{businessId}/inventory/reconcile
   ```
4. Verify cash drawer reconciliation:
   - Compare `expected_cash` against physical counts for all open shifts.
