---
name: ntf5-email-xss-fix
description: NTF-5 / FND-045 XSS escape review — 3 unescaped user-controlled interpolations remain open (shareUrl, senderName in subject, disputeId in hrefs); approved with follow-on HIGH items
metadata:
  type: project
---

56c5071 fixes escaping in 5 email template methods but leaves 3 open issues:

1. **HIGH** — `shareUrl` (notification-service.ts:442) is passed directly from the caller into an `href="..."` attribute without escaping or URL validation. A `javascript:` URL value from a caller would execute in the recipient's mail client. `sanitizeUrl()` exists in the same `sanitize.ts` module; it should be applied here.
2. **MEDIUM** — `senderName` at line 432 appears *unescaped* in the email `subject:` field. Subject lines are plain-text so HTML-escaping is wrong there, but the raw value is also used unescaped in the body (it was written before the fix; `safeSenderName` is used in body correctly). Subject is safe for XSS (mail clients don't render HTML in subjects), but the inconsistency is worth noting.
3. **LOW** — `disputeId` at lines 109/115/151/157 is interpolated raw into both body text and `href` attributes. It originates from the internal DB, so it is not directly user-controlled, but it is worth confirming callers never pass a user-supplied string there.

**Why:** shareUrl is clearly caller-supplied and lands in an href="" attribute — that is a stored-XSS vector via `javascript:` URI injection. The existing `sanitizeUrl()` helper already blocks `javascript:` URIs.
**How to apply:** Flag `shareUrl` as HIGH in any future NTF-5 follow-on; require `sanitizeUrl(shareUrl)` with null-guard before building the href.

Verdict on 56c5071: APPROVED with HIGH follow-on for shareUrl.
