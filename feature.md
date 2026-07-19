# Feature Documentation: Email Thread Privacy & Client ID Masking

## Overview
This feature enforces total privacy in the Safemailz email thread UI. **No real client email address is ever exposed anywhere in the email thread view.** All real email addresses are replaced by their generated client identity (e.g., `<Jessica- Client - 34427>`).

---

## Privacy Requirements & Rules

### 1. Top Thread Header
- Displays only the generated client ID and client name (e.g. `34427 - Jessica Williams`).
- Real client email addresses are never rendered in the top header.

### 2. `To:` Line in Message Cards
- Shows the client name on the `To:` line.
- Directly below it, displays the generated client ID tag (e.g. `<Jessica- Client - 34427>`).
- Real client email addresses are strictly masked.

### 3. Full Thread Privacy Rule
- Sender rows, `To:` lines, `cc:` lines, replies, and quoted history use masked client tags.
- Message bodies and preview cards pass through `maskAllEmailsInText()` so any embedded raw email addresses are masked.

### 4. Centralized Masking Utilities
- `getClientMaskedIdentity(emailStr, fallbackName)`: Resolves any email address into `{ name, clientId, tag, fullTag }`.
- `maskAllEmailsInText(text)`: Replaces all email addresses in text or HTML with generated Client ID tags (`<Name- Client - Number>`).

---

## Architecture & Data Flow

```
Raw Email Input -> getClientMaskedIdentity() / maskAllEmailsInText() -> Masked Tag (<Jessica- Client - 34427>) -> Rendered UI
```
