---
name: ntf3-db-persistence
description: NTF-3 (6589add) approved — route fully on notificationServiceDB, enum reconciled across all 3 defs; data field lie and markAllAsRead any-cast are pre-existing deferred issues
metadata:
  type: project
---

NTF-3 (`6589add`) approved. Route re-wire and 3-way enum reconciliation are correct.

**Why:** FND-047 — in-memory Map caused cold-start data loss. DB service (NTF-2) is now the sole CRUD owner for `notifications/route.ts`.

**Key facts:**
- Enum agrees across all 3 definitions (DB-service union, `types.ts` Row/Insert/Update, `002_production_enhancements.sql` CHECK constraint) — same 11 values, no production 500 risk on POST.
- All 4 verbs (GET/POST/PATCH/DELETE) call `notificationServiceDB`; PATCH/DELETE pass `(notificationId, user.id)` matching DB service arg order.
- `notification-service.ts` re-exports `NotificationType`/`Notification` from the DB service — UI components (`NotificationItem.tsx`, `NotificationCenter.tsx`) import from `notification-service` and resolve to the canonical types correctly.
- Deleted 6 describe blocks from `notification-service.test.ts` = legitimate (tested deleted Map CRUD, not weakening).

**Deferred issues (file follow-on tasks before NTF-5):**
1. `notification-service-db.ts:333-345` — `mapToNotification` never populates `data`; `Notification.data` interface is a lie; `NotificationItem.tsx:101-104` deep-links on `notification.data?.disputeId/.documentId` will silently never fire. DB schema has no `data` column. Fix: drop the field or add the column.
2. `notification-service-db.ts:155-161` — `markAllAsRead` casts `query2 as any` to chain `.select()`; suppresses TS on return shape. Fix: remove cast.
3. `notification-service-db.ts:104` — `data as NotificationRow` in `createNotification` skips null guard on `.single()` result.
4. `route.ts:11-23` — `CANONICAL_TYPES` Set duplicates the union; drift risk if a type is added to one but not the other.

**How to apply:** When reviewing NTF-5 or any caller that passes a `data` payload to `createNotification`, flag that it will be silently dropped until finding #1 is resolved.
