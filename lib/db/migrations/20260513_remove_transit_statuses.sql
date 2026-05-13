-- Migration: Remove "In Transit" drive statuses (Task #34)
-- Executed: 2026-05-13
-- Simplifies drive status model from 5 → 3 statuses:
--   In DVR | With Inspector | In Maintenance possession
--
-- These UPDATEs are idempotent — safe to re-run.

UPDATE drives
SET status = 'With Inspector'
WHERE status = 'In transit to Inspector';

UPDATE drives
SET status = 'In Maintenance possession'
WHERE status = 'In transit to Maintenance';
