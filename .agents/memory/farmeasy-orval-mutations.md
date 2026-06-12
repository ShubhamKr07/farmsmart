---
name: FarmEasy orval mutation shape
description: How orval generates mutation hooks for path-param POST routes — args are wrapped, not flat.
---

When orval generates mutation hooks for routes like `POST /cycles/:id/fertigation`, the mutate argument is `{ id: number; data: BodyType<Request> }`, not a flat spread.

**Why:** Orval splits path params (`id`) from the request body (`data`) to match the underlying fetch function signature `fn(id, body, options)`.

**How to apply:** Always call mutations as:
```ts
mutateAsync({ id: cycleId, data: { seedLotQrCode: scannedQr } })
// NOT: mutateAsync({ id: cycleId, seedLotQrCode: scannedQr })
```

For root-level POST (no path param), e.g. `POST /cycles`:
```ts
mutateAsync({ data: { seedName, ... } })
```
