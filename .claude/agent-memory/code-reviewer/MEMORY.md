# Code Reviewer Memory

- [Auth route CSV multi-subcase trap](project_auth-route-csv-multi-subcase.md) — auth-route-inventory.csv proposed_guard is wrong for `?type=`-branching routes; verify against source before promoting a guard
- [MNY-2 async caller gap](project_mny2-async-caller-gap.md) — sync→async migration left two wired production callers (admin revenue route + affiliate webhook) without `await`; tsc does not catch this
- [MNY-3 validateReferralCode null-cap flaw](project_mny3-validate-null-cap-flaw.md) — bare `&&` at affiliate-service.ts:278 is semantically wrong for max_uses=0 but not fixed by MNY-3 (pre-existing, out of scope); RPC is authoritative
- [MNY-5 commission trust-boundary fix](project_mny5-commission-trust-boundary.md) — f7535c9 approved; conversion→purchase cpl-zero risk is correct by design; await gap from MNY-2 was fixed in prior commit dcccea8
- [MNY-6 Money/Cents type + FND-029 fix](project_mny6-money-cents-type.md) — bb3d0c6 approved; calculateFees fee-unit ambiguity is pre-existing (not MNY-6); fromDollars NaN/Infinity gap is LOW; buildReport float accumulation deferred
- [CMP-4 ModelRouter execution boundary](project_cmp4-model-router-execution.md) — da6f8a5 approved; lazy dynamic import guards against AIMLService constructor throw on missing env var; CMP-5 caveats noted
- [CMP-5 ModelRouter migration + lint rule](project_cmp5-model-router-migration.md) — 55f792e+a58c115 approved; 18 engines migrated; lint rule live via --rulesdir; 2 CMP-6-deferred violations remain (chat+voice routes)
- [CMP-6 chat/voice model lock](project_cmp6-chat-voice-model-lock.md) — 7ea417c approved; ai/chat client model ignored; voice TTS whitelist before service call; voice exempt is legitimate (ModelRouter.complete is chat-only)
- [NTF-3 DB persistence + enum reconciliation](project_ntf3-db-persistence.md) — 6589add approved; enum agrees across all 3 defs; data field/mapToNotification lie + markAllAsRead any-cast deferred to pre-NTF-5
- [NTF-4 preferences persistence + RLS model](project_ntf4-preferences-persistence.md) — 7c83542 approved; service-role client → .eq("user_id") is IDOR control (not RLS); missing REVOKE template + body.channels type guard are MEDIUM follow-ons
- [NTF-5 email XSS escape fix](project_ntf5-email-xss-fix.md) — 56c5071 approved; shareUrl (line 442) lands in href unescaped → HIGH open; senderName in subject is plain-text safe; disputeId is internal-only LOW
- [ADM-1 dispute PATCH field whitelist](project_adm1-dispute-whitelist.md) — c7a786e approved; pick-by-key whitelist is airtight; status/outcome enum divergence vs credit_repair_schema is MEDIUM pre-existing
- [ADM-2 de-mock admin analytics + metrics](project_adm2-de-mock-analytics.md) — 60e21d1 approved; disputes mock fallback is out-of-scope (TASK-MOK-03); topFeatures zeros are honest; parseInt NaN gap is LOW
- [ADM-3 query clamp + role-gate verification](project_adm3-query-clamp.md) — b9779b9 approved; NaN handled via explicit isNaN before Math.min/max; affiliate/revenue NaN gap is pre-existing LOW (out of scope)
- [vitalityScoreService de-mock review](project_vitality-score-de-mock.md) — 533f6e4 not clean; renormalization/FICO/null-propagation correct, but saveScoreToHistory uncaught write failure can still launder overall into a fabricated healthScore:0 via route.ts's pre-existing fallback (HIGH)
