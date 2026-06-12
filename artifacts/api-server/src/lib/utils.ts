/** Pure utility functions — no DB or HTTP dependencies, fully unit-testable. */

import { randomBytes } from "node:crypto";

export function calcDaysOverdue(startedAt: Date | null, days: number): number | null {
  if (!startedAt) return null;
  const dueMs = startedAt.getTime() + days * 864e5;
  const now = Date.now();
  if (now <= dueMs) return null;
  return Math.floor((now - dueMs) / 864e5);
}

export function generateShortId(): string {
  return randomBytes(2).toString("hex");
}

export function seedingWeight(
  fullTrays: number,
  halfTrays: number,
  seedWeightTray: string | null,
): number {
  return Number(seedWeightTray ?? 0) * (fullTrays + halfTrays * 0.5);
}
