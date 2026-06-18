# Connected Calendar OAuth Configuration

Connected Calendar uses provider OAuth in the browser. End users should only click **Sign in with Google** or **Sign in with Outlook / Microsoft 365**. They should not create `.env` files, set environment variables, paste OAuth IDs, or share passwords.

Google sign-in requests Calendar read access plus the minimal email identity scope so the app can label the connected account. It does not request Gmail mailbox access.

Google desktop OAuth clients require both the Google-issued desktop client ID and desktop client secret during token exchange. This is an app credential from Google Cloud, not a user's Google password. Microsoft uses the public Entra application client ID.

## End-User Behavior

In a release build, the app maintainer bundles the app OAuth values into the installer. Users only open **Connected Accounts** and sign in.

If an installed build shows "Calendar sign-in is not available in this build," that installer was built without required calendar OAuth configuration and should not be published for calendar testing.

## Resolution Order

At runtime the app resolves provider configuration from:

1. Process environment variables:
   - `GOOGLE_CALENDAR_CLIENT_ID`
   - `GOOGLE_CALENDAR_CLIENT_SECRET`
   - `MICROSOFT_CALENDAR_CLIENT_ID`
2. Bundled file `assets/generated/calendar-oauth-clients.json`, created at build time.
3. Empty configuration, which disables the affected sign-in button.

Google is considered configured only when both `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET` are present.

## Maintainer Local Development

For local development, copy `.env.example` to `.env` in the project root, paste your own app OAuth values, then start the app:

```powershell
copy .env.example .env
# Edit .env with your own app OAuth values
npm.cmd run dev
```

The main process loads `.env` on startup. `npm run dev` also regenerates `assets/generated/calendar-oauth-clients.json` from `.env`, so both env and bundled paths work. Do not include these steps in user-facing release notes.

Same-terminal alternative:

```powershell
$env:GOOGLE_CALENDAR_CLIENT_ID="your-google-desktop-client-id"
$env:GOOGLE_CALENDAR_CLIENT_SECRET="your-google-desktop-client-secret"
$env:MICROSOFT_CALENDAR_CLIENT_ID="your-microsoft-public-client-id"
npm.cmd run dev
```

Gitignored local JSON alternative: copy `assets/calendar-oauth-clients.example.json` to `assets/calendar-oauth-clients.local.json` and fill in the app OAuth values.

Restart the app after changing `.env` or local JSON. Stop `npm run dev` completely, then start it again.

## Release / QA Installer Builds

Set the variables on the build machine before `npm run release:build` so the app OAuth values are embedded in the installer:

```powershell
$env:GOOGLE_CALENDAR_CLIENT_ID="..."
$env:GOOGLE_CALENDAR_CLIENT_SECRET="..."
$env:MICROSOFT_CALENDAR_CLIENT_ID="..."
npm run release:build -- -Version 3.7.0 -SkipVersionBump -ReplaceExisting
```

`npm run build:main` runs `scripts/generate-calendar-oauth-clients.mjs`, which writes `assets/generated/calendar-oauth-clients.json`. That file is packaged via `assets/**/*` in electron-builder.

See `assets/calendar-oauth-clients.example.json` for the JSON shape.

## Provider Setup

### Google

1. Google Cloud project with **Google Calendar API** enabled.
2. OAuth consent screen configured. Add test users while in testing.
3. OAuth client type: **Desktop app**.
4. Use the client ID as `GOOGLE_CALENDAR_CLIENT_ID`.
5. Use the same desktop OAuth client's Google-issued secret as `GOOGLE_CALENDAR_CLIENT_SECRET`.
6. Data Access scopes should include Calendar events read-only and userinfo email.

### Microsoft

1. App registration in Microsoft Entra.
2. Public/native client enabled.
3. Delegated calendar read permissions used by the app.
4. Use the application client ID as `MICROSOFT_CALENDAR_CLIENT_ID`.

## Do Not Ship Without Configuration

Do not publish a release build intended for calendar QA until Connected Accounts shows no setup warning and the intended provider buttons are enabled in a normal installed build.
