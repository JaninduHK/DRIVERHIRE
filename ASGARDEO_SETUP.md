# Asgardeo setup (traveller SSO)

Traveller sign-in runs through [Asgardeo](https://wso2.com/asgardeo/) — WSO2's
managed cloud identity service. There's no local infrastructure to run for
this (no Docker container, no database); it's entirely console + env vars.

## 1. Create your Asgardeo organization

Sign up at https://asgardeo.io if you don't already have a tenant. Your
tenant's base URL will be `https://api.asgardeo.io/t/<your-org-name>` —
that's what goes in `ASGARDEO_ISSUER_URL`.

## 2. Register the traveller web app

Console → **Applications** → **New Application** → **Traditional Web
Application** → OpenID Connect:

- Grant type: **Code** (Authorization Code)
- PKCE: **Mandatory**
- Authorized redirect URLs — register **both**:
  - `https://carwithdriver.lk/api/auth/sso/callback` (production)
  - `http://localhost:3000/api/auth/sso/callback` (local dev)
- Scopes: `openid email profile`
- Allowed post-logout redirect URLs: `https://carwithdriver.lk/` and `http://localhost:5173/`

Copy the generated **Client ID** and **Client Secret**.

## 3. Backend env vars

In `backend/.env` (production) and your local dev `.env`:

```
ASGARDEO_ISSUER_URL=https://api.asgardeo.io/t/<your-org-name>
ASGARDEO_CLIENT_ID=<from step 2>
ASGARDEO_CLIENT_SECRET=<from step 2>
ASGARDEO_REDIRECT_URI=https://carwithdriver.lk/api/auth/sso/callback              # or the localhost one for dev
ASGARDEO_POST_LOGOUT_REDIRECT_URI=https://carwithdriver.lk/      # or the localhost one for dev
```

`ASGARDEO_REDIRECT_URI` must be our **backend's** callback route (as
registered above), not the frontend origin — a common mix-up.

No TLS workarounds needed this time — Asgardeo uses a real, publicly-trusted
certificate, so `NODE_TLS_REJECT_UNAUTHORIZED=0` (previously required for
the self-hosted instance's self-signed cert during local testing) is no
longer necessary.

**Discovery quirk**: despite being built on WSO2's platform, Asgardeo's
issuer URL looks spec-standard but its discovery document is actually
served at `<issuer>/oauth2/token/.well-known/openid-configuration`, not the
bare `<issuer>/.well-known/openid-configuration` — confirmed directly
against a live tenant. `backend/utils/asgardeoClient.js` already accounts
for this (fetches that path manually rather than relying on
`openid-client`'s automatic discovery URL construction); nothing to
configure here, just noting it in case discovery ever needs debugging.

## 4. Self-registration + login settings

Mirrors what was configured on the self-hosted instance, now in the
Asgardeo console:

- **Login & Registration → Self Registration** (or the equivalent governance
  connector) — enable it so travellers can create their own accounts.
- **Email as a login identifier** — enable **Multi Attribute Login**
  (Account Management section) with `email` added as an allowed attribute,
  so travellers can sign in with their email instead of a separate
  username.
- Confirm the **Email** attribute is required/collected on the
  registration form (should be the default).
- Decide on **email verification** — recommended on for a real tenant
  (unlike the local sandbox, Asgardeo can actually send verification
  emails).

If you set up an Asgardeo **M2M application** with the relevant management
scopes (e.g. for identity governance / application configuration) and give
me its client credentials, I can help configure these directly via
Asgardeo's Management API — same approach used to configure the self-hosted
instance's settings via its admin REST API earlier.

## 5. Federate Google and Facebook

Console → **Identity Providers** (or **Connections**) → add Google and
Facebook using the same OAuth app credentials already in use, repointing
their authorized redirect URI to Asgardeo's shared callback endpoint (shown
in the console when you add the connection). Then enable them as sign-in
options on the traveller application.

## 6. Local testing

Much simpler than the self-hosted setup:
1. Make sure `http://localhost:3000/api/auth/sso/callback` is registered as
   a redirect URL on the app (step 2).
2. Point local `backend/.env` at your Asgardeo tenant with the localhost
   redirect/post-logout URIs.
3. Run the backend (`npm run dev`, no special TLS flag needed) and frontend
   (`npm run dev`) as normal.
4. Visit `http://localhost:5173/` and click "Login"/"Register" in the nav bar
   (or any other sign-in-gated action, e.g. `/get-quotes`) to walk the flow —
   there's no dedicated sign-in page anymore, every entry point goes straight
   to Asgardeo's hosted login/registration.
