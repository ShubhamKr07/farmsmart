---
name: FarmEasy DB array columns
description: Drizzle ORM pg array columns — how to handle defaults safely.
---

For `text().array().notNull()` columns in Drizzle PG (e.g. `seedLotQrCodes`, `photoUrls`):

**Why:** Using `.default([])` creates a JavaScript-level default that doesn't translate cleanly to a DB-level SQL default for arrays. Providing values explicitly in insert calls avoids any ambiguity.

**How to apply:** Always pass `[]` explicitly in insert:
```ts
await db.insert(cyclesTable).values({
  seedLotQrCodes: seedLotQrCodes ?? [],
  // ...
})
```
Never rely on `.default([])` in the schema for array columns.
