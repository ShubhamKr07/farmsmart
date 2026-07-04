/**
 * Hand-computed expected values for the golden-fixture seed (fixtures/seed.sql).
 * Every value is derivable by hand from the seed rows; the test asserts the
 * template output matches. Update both files together when the seed changes.
 */
export const expected = {
  // scalarAgg: SUM harvested_qty for completed, non-deleted cycles → 1000 + 2000
  yieldAlltime: 3000,

  // groupBy cycles by status (non-deleted): completed 2, germination 1, fertigation 1
  cyclesByStatus: [
    { label: "completed", value: 2 },
    { label: "germination", value: 1 },
    { label: "fertigation", value: 1 },
  ],

  // timeBucket yield by month (completed): 2026-06 → 3000 (May/July empty)
  yieldByMonth: [
    { label: "2026-05", value: 0 },
    { label: "2026-06", value: 3000 },
    { label: "2026-07", value: 0 },
  ],

  // groupBy alerts by severity where status=current: critical 1, warning 1
  alertsBySeverity: [
    { label: "critical", value: 1 },
    { label: "warning", value: 1 },
  ],

  // groupBy tasks by status: done 1, in_progress 1
  tasksByStatus: [
    { label: "done", value: 1 },
    { label: "in_progress", value: 1 },
  ],

  // groupBy bad_tray_entries by severity: high 1, low 1
  badBySeverity: [
    { label: "high", value: 1 },
    { label: "low", value: 1 },
  ],

  // ratio pricePerKg: (500 + 300) / (10 + 5) = 800 / 15
  pricePerKg: 800 / 15,

  // groupBy stock_movements by reason: purchase 2, consume 1, adjust 1
  movementsByReason: [
    { label: "purchase", value: 2 },
    { label: "adjust", value: 1 },
    { label: "consume", value: 1 },
  ],
} as const;
