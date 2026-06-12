import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  matchesSearch,
  matchesStage,
  matchesDateRange,
  type CycleFilterable,
} from "./cycleFilters.js";

function makeCycle(overrides: Partial<CycleFilterable> = {}): CycleFilterable {
  return {
    shortId: "a1b2",
    seedName: "Toscano Kale",
    growthProfileName: "Toscano Kale (Normal)",
    seedLotQrCodes: ["LOT-3742"],
    status: "germination",
    seedingDate: "2026-05-01",
    ...overrides,
  };
}

// ── matchesSearch ─────────────────────────────────────────────────────────────

describe("matchesSearch", () => {
  it("returns true when query is empty", () => {
    assert.ok(matchesSearch(makeCycle(), ""));
    assert.ok(matchesSearch(makeCycle(), "   "));
  });

  it("matches on shortId (case-insensitive)", () => {
    assert.ok(matchesSearch(makeCycle({ shortId: "a1b2" }), "A1B2"));
    assert.ok(matchesSearch(makeCycle({ shortId: "a1b2" }), "a1"));
  });

  it("matches on seedName (case-insensitive)", () => {
    assert.ok(matchesSearch(makeCycle({ seedName: "Toscano Kale" }), "kale"));
    assert.ok(matchesSearch(makeCycle({ seedName: "Toscano Kale" }), "TOSCA"));
  });

  it("matches on growthProfileName", () => {
    assert.ok(matchesSearch(makeCycle({ growthProfileName: "Kale Normal" }), "normal"));
  });

  it("matches on seedLotQrCodes", () => {
    assert.ok(matchesSearch(makeCycle({ seedLotQrCodes: ["LOT-3742"] }), "lot-3742"));
    assert.ok(matchesSearch(makeCycle({ seedLotQrCodes: ["LOT-A", "LOT-B"] }), "lot-b"));
  });

  it("returns false when query matches nothing", () => {
    assert.ok(!matchesSearch(makeCycle(), "zzz-nomatch"));
  });

  it("returns false for partial match in wrong field", () => {
    // "xyz" not in any field
    assert.ok(!matchesSearch(makeCycle({ shortId: "abcd", seedName: "Kale" }), "xyz"));
  });
});

// ── matchesStage ──────────────────────────────────────────────────────────────

describe("matchesStage", () => {
  it("returns true when stage filter is null", () => {
    assert.ok(matchesStage(makeCycle({ status: "fertigation" }), null));
  });

  it("returns true when status matches filter", () => {
    assert.ok(matchesStage(makeCycle({ status: "germination" }), "germination"));
    assert.ok(matchesStage(makeCycle({ status: "harvest" }), "harvest"));
    assert.ok(matchesStage(makeCycle({ status: "completed" }), "completed"));
  });

  it("returns false when status does not match filter", () => {
    assert.ok(!matchesStage(makeCycle({ status: "germination" }), "fertigation"));
    assert.ok(!matchesStage(makeCycle({ status: "completed" }), "germination"));
  });
});

// ── matchesDateRange ──────────────────────────────────────────────────────────

describe("matchesDateRange", () => {
  it("returns true when both from and to are empty", () => {
    assert.ok(matchesDateRange(makeCycle({ seedingDate: "2026-05-01" }), "", ""));
  });

  it("returns true when date is within range", () => {
    assert.ok(
      matchesDateRange(makeCycle({ seedingDate: "2026-05-15" }), "2026-05-01", "2026-05-31"),
    );
  });

  it("returns true when date equals from boundary", () => {
    assert.ok(matchesDateRange(makeCycle({ seedingDate: "2026-05-01" }), "2026-05-01", ""));
  });

  it("returns true when date equals to boundary", () => {
    assert.ok(matchesDateRange(makeCycle({ seedingDate: "2026-05-31" }), "", "2026-05-31"));
  });

  it("returns false when date is before from", () => {
    assert.ok(
      !matchesDateRange(makeCycle({ seedingDate: "2026-04-30" }), "2026-05-01", ""),
    );
  });

  it("returns false when date is after to", () => {
    assert.ok(
      !matchesDateRange(makeCycle({ seedingDate: "2026-06-01" }), "", "2026-05-31"),
    );
  });

  it("returns false when date is outside both bounds", () => {
    assert.ok(
      !matchesDateRange(
        makeCycle({ seedingDate: "2026-04-01" }),
        "2026-05-01",
        "2026-05-31",
      ),
    );
  });
});
