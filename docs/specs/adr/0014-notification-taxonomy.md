# ADR-0014 — One notification taxonomy

- **Status:** Proposed — needs an owner decision before the mobile save is wired
- **Date:** 2026-08-17
- **Blocks:** `PATCH /notifications/preferences` and `POST /notifications/preferences` in `mobile-app/scripts/api-calls-baseline.json`
- **Related:** task #70, [ADR-0013](0013-credit-freeze-and-identity-theft-storage.md)

## Context

Saving notification preferences on mobile answers 405: the route exports `GET`
and `PUT`, the client sends `PATCH` (`src/services/api/user.ts:682`) and `POST`
(`app/settings/notification-preferences.tsx:210`).

Changing the verb is a one-line fix and it would make things **worse**. The same
shape was measured live on the budgets route earlier today:

```
PATCH {"amount": 750}          200 OK  ->  amount unchanged at 500.00
PATCH {"budgetedAmount": 750}  200 OK  ->  amount 750.00
```

A 200 that writes nothing is worse than a 405, because the 405 is visible. Here
the client and server disagree about more than the field name.

## What is actually there

Five different notification taxonomies, measured from source on 2026-08-17:

| # | Where | Keys |
|---|---|---|
| 1 | `src/lib/notifications/push-notification-service.ts` | `dispute_update`, `score_change`, `payment_reminder`, `document_processed`, `recommendation`, `system`, `promotion` |
| 2 | `web-push-service.ts` + `notification-scheduler.ts` | `payment_reminder`, `payment_success`, `payment_failed`, `security_alert`, `new_account`, `document_uploaded`, `bill_reminder`, `score_change`, `goal_milestone`, `subscription_renewal`, `general` |
| 3 | `/api/notifications/preferences` (what gets WRITTEN) | same seven as #1 |
| 4 | `mobile-app/src/services/api/types.ts` | `disputes`, `scoreChanges`, `alerts`, `recommendations`, `payments`, `marketing` |
| 5 | `mobile-app/app/settings/notification-preferences.tsx` | `credit_alerts`, `dispute_updates`, `bill_reminders`, `goal_milestones`, `trading_signals`, `security_alerts` |

Only `score_change` and `payment_reminder` appear in more than two of them.
`dispute_update` exists in #1 and #3 but not in #2, so the web-push path cannot
express a dispute update at all.

**The preference check is broken at the taxonomy level, not the transport
level.** `notification-scheduler.ts:461` gates delivery on
`preferences.channels[channelKey]` using taxonomy #2's keys, while the
preferences route writes taxonomy #1's keys. A preference saved through the
working web `PUT` would be looked up under a key that was never written.

```
select count(*) from notification_preferences;  ->  0
```

Nobody has ever saved a notification preference. That is consistent with the
save being broken on mobile and unexercised on web, and it means there is no
stored data to migrate — the cheapest moment to fix this is now.

## The decisions

### D1 — Which taxonomy is canonical? (blocking)

Taxonomies #4 and #5 are not renamings of #1. Mobile offers `goal_milestones`
and `trading_signals`; #1 has no counterpart for either. #1 has
`document_processed`, `recommendation` and `promotion`; mobile offers no toggle
for any of them.

So a mapping cannot be written without deciding what the product's notification
categories ARE. Three options:

1. **Adopt #2 (the 11-key set) as canonical.** It is the widest, it is what the
   scheduler already gates on, and it already contains `goal_milestone`. #1 and
   #3 move to it; `dispute_update` and `recommendation` are added to it since
   they exist in the product and #2 cannot currently express them.
2. Adopt #1 (the seven-key set). Smaller, but the scheduler must be rewritten and
   `goal_milestone` disappears.
3. Design a fresh set. Most work, no obvious benefit over 1.

**Recommendation: option 1**, with `dispute_update` and `recommendation` added.
It is the only set the delivery path already understands, so it needs the fewest
changes on the side that actually sends notifications.

### D2 — Is the per-category channel matrix a real feature? (blocking)

The mobile screen models preferences two-dimensionally: each category has its
own `{email, push, sms}` toggles. The server models them one-dimensionally —
three global booleans (`push_enabled`, `email_enabled`, `sms_enabled`) plus a
flat per-type map.

These are different products, not different encodings. "Email me about disputes
but only push me about payments" is expressible in the mobile UI and cannot be
stored by the current schema at all.

1. **Keep it one-dimensional.** The mobile screen loses its per-category channel
   toggles and keeps a single enable/disable per category. No migration.
2. Make the schema two-dimensional — `channels` becomes
   `{ [type]: { email, push, sms } }`. The UI already implies this; it is a
   jsonb shape change plus scheduler changes, and with zero stored rows the
   migration cost is nil today.

**Recommendation: option 2**, precisely because the table is empty. The UI was
built for it, and this is the last moment it is free. If the answer is 1, the
mobile screen must lose the per-channel toggles rather than keep showing
controls that cannot be saved.

### D3 — Whose `quietHours` shape wins?

Server: `{ enabled, start: string, end: string }`.
Mobile: `{ enabled, startHour, startMinute, endHour, endMinute }`.

**Recommendation: the server's**, with `"HH:mm"` strings. The mobile screen can
split them for its pickers. Four integers where two strings will do is a wider
surface for an invalid state (`startMinute: 61`), and the string form is what is
already stored.

## Consequences

- Until D1 and D2 are answered, both mobile calls stay in the baseline as tracked
  405s with these reasons attached. The screen renders and saves nothing, which
  is the honest state; wiring the verb would make it save *some* of what the user
  toggled and silently discard the rest.
- Whatever is chosen, ONE type union should be exported from a single module and
  imported by the scheduler, both push services, the preferences route and the
  mobile client. Five hand-maintained copies is how this happened.
- A test should assert the stored keys and the scheduler's lookup keys are the
  same set. Nothing catches that today, which is why a preference could be
  written under one name and read under another.

## Revisit when

- Anyone adds a notification type — it must go in the canonical union, not a
  sixth list.
- `notification_preferences` gains its first row. After that D2 stops being free.
