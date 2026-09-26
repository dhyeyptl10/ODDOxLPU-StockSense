# CoreInventory / StockSense

The existing website layout and style are preserved. Updates focus on authentication, OTP delivery, missing workflow controls and inventory correctness.

## Run

Requires Node.js 22.13+ (tested with Node 24.12).

```powershell
npm install
npm --prefix backend install
# Only for an EMPTY demo database; existing records are preserved:
npm --prefix backend run seed
npm run dev:all
```

Open http://localhost:5173. Restart an already-running backend after code/config changes. The normal development API is http://localhost:5000/api; health is http://localhost:5000/health.

Existing demo accounts still work. Login IDs: `admin01`, `manager01`, `staff01`; their existing email/password combinations also work. Existing user passwords are preserved. New signup/password changes require 9+ characters, lowercase, uppercase and a special character. Public signup always creates warehouse staff; only an administrator assigns elevated roles.

## OTP delivery setup (required for real messages)

**No delivery credentials are present in this project.** The code supports real email and WhatsApp providers, but real inbox/phone delivery has not been verified. Missing/failed configuration returns a clear error. OTPs never appear in the browser response, toast or server logs.

### Email

Fill the SMTP settings in `backend/.env` using `backend/.env.example` as the reference. Do not overwrite an existing `.env` or put secrets into frontend variables.

For a Gmail sender:

1. Enable Google 2-Step Verification, then create an App Password where available. Use that App Password as `SMTP_PASS`, and the full sending address as `SMTP_USER`.
2. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`. TLS certificate checks remain enabled. Set `EMAIL_FROM` to the authorized sending address, e.g. `CoreInventory <your-address@gmail.com>`.
3. Restart the backend. Sign up with your real recipient email, then use Forgot Password → Email. Check inbox and spam. The demo addresses are examples and cannot receive your messages.

Official setup: [Google App Passwords](https://support.google.com/accounts/answer/185833?hl=en), [Google SMTP settings](https://support.google.com/mail/answer/7104828?hl=en-GB). Account/organization policies may restrict App Password availability.

### WhatsApp

1. Create/configure a Twilio account, an approved WhatsApp sender and an approved authentication template. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM=whatsapp:+...`, and `TWILIO_OTP_CONTENT_SID=HX...`. Template variable `1` carries the code.
2. Restart the backend. Sign in → Profile → WhatsApp password recovery. Enter your number in international format (`+91...`), confirm your current password, request the code and verify it.
3. Forgot Password → WhatsApp accepts that verified number. A typed, unverified phone number cannot reset another account.

Official setup: [Twilio authentication templates](https://www.twilio.com/docs/content/whatsappauthentication), [sending approved templates](https://www.twilio.com/docs/content/send-templates-created-with-the-content-template-builder). Provider acceptance means queued/sent to the provider, not guaranteed handset delivery; review Twilio delivery logs for failures. Provider accounts, template approval and any charges are managed by the owner.

### OTP protections

Codes expire in 10 minutes, are HMAC-hashed at rest, allow at most five attempts, and have a 60-second resend cooldown plus endpoint rate limits. Verification and password reset cannot be replayed. Reset tokens are scoped to password reset and tied to one verified challenge; a password reset revokes previous sessions. Phone linking requires both the current password and proof of phone ownership.

## Workflow additions in the original interface

- Receipt: Draft → To Do / Ready → Receive → Done. Stock changes only on validation; Print appears after Done.
- Delivery: Draft → Ready or Waiting for stock → Pick → Pack → Dispatch → Done. Ready orders reserve stock; Free To Use excludes reservations. Shortage details appear on rows.
- Transfer: Draft → Ready or Waiting → Transfer → Done; source decreases and destination increases in one transaction.
- Adjustment: a counted quantity updates stock and records its signed difference in the ledger.
- Operation list remains the default. Optional Kanban, contact search, responsible user, cancellation and print controls were added without replacing the original table layout.
- Warehouses support stable short codes and child locations/racks, selectable in the same operation forms.
- Products show unit cost, On Hand and Free To Use; Update Stock opens the Adjustment workflow.
- Dashboard charts use ledger data. If the latest movement is historical, the displayed date range reflects those real dates rather than fabricated recent activity.
- Late means an unfinished document scheduled before the inventory business date. Waiting summary includes future schedules or stock shortages. Future scheduling does not itself prevent early receipt/dispatch.

## Existing data and migration

Normal startup applies additive, repeatable migrations. Before the first migration of an existing legacy database, it saves a snapshot under `backend/db/backups/` (or a `backups` directory beside a custom DB). No user records are cleared. Legacy references are converted to warehouse-based references (`WH/IN/0001`, `WH/OUT/0001`, `WH/INT/0001`, `WH/ADJ/0001`) and matching ledger references are updated together. Numeric sequences survive draft deletion and rollover beyond 9999. Warehouse short codes are permanent once created.

Existing users receive unique Login IDs, exposed in Profile. Existing receipt `waiting` records migrate to `ready` because incoming receipts do not depend on available outgoing stock. New demo seeds use relative dates; existing historical dates are never rewritten. Seeding skips any nonempty database and refuses production mode.

Inventory is whole-unit quantity based, matching the current project schema. Decimal/fractional quantities are not supported. Outgoing reservations are allocated by scheduled date, creation time and reference across deliveries and transfers. Validation, movement logging and all stock changes roll back together on failure. Completed/canceled records cannot be reopened through edit requests.

## Verification

```powershell
npm run build
npm --prefix backend test
```

19 automated checks currently pass, covering health/login, signup rules and roles, draft/ready/done rules, duplicate product aggregation, insufficient stock, reservations, pick/pack, receipt/delivery stock, transfer totals, adjustments, rollback on a ledger failure, simultaneous validation, reference rollover/deletion, historical trends, migration preservation, OTP expiry/one-time use, session revocation, verified phone linking, mocked SMTP/WhatsApp providers, CORS and missing production JWT configuration.

Tests create a separate temporary database and use mocked message providers; they do not send real messages or modify the user database. Browser checks cover login, multi-line receipt save/ready/validation, print preview and list/kanban controls. The frontend build has a non-fatal chart bundle size warning.

## Production

Set `NODE_ENV=production`, a private `JWT_SECRET` of at least 32 characters, and the exact `FRONTEND_URL`. Build the frontend, then `npm --prefix backend start`; Express serves `dist` and `/api` from the same origin. Use HTTPS and persistent disk for the SQLite database. Keep database backups and `.env` outside source control. Remove/deactivate demo accounts before public use. This is a single-service SQLite application, not a deployment benchmark or a guarantee of zero defects. Real OTP delivery remains pending provider setup and end-to-end verification.
