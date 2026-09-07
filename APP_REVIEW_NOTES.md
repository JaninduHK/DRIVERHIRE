# App Store Review — response pack

App: **Car With Driver** (driver app) · Bundle ID `lk.carwithdriver.driver` · v1.0.1
Keep this file updated and reuse it for every future submission.

---

## ⚠️ READ FIRST — two things must be true before you send this reply

**1. Report + Block do not exist in the app yet.**
Apple's item 1 asks you to demonstrate "any user-generated content, including the
**required** content reporting and blocking mechanisms." This app does have
user-generated content — travellers' chat messages and their free-text tour briefs are
both shown to drivers, and drivers upload photos. But there is no report or block
anywhere in the codebase (no model, no endpoint, no UI). Guideline 1.2 requires both.

This pack is written for the app **with** Report and Block in the conversation header
(⋯ menu). Those passages appear in item 1, item 3 and the Notes block, and they are
**not true today**. Either build the feature and re-record that part of the video, or
delete those passages before sending — but if you delete them, expect a 1.2 rejection,
because Apple has explicitly asked to see the mechanisms.

**2. Replace the demo credential placeholders** — `<<DEMO_EMAIL>>` and
`<<DEMO_PASSWORD>>` — and sign in with them on a real device first. A reviewer who
cannot sign in is an automatic rejection, and the account must be **approved** and
**email-verified**, or they will only see the "pending approval" screen.

---

## PART A — Reply to paste into App Store Connect

### 1. Screen recording

A screen recording captured on a physical iPhone running the latest iOS is attached.
It begins at app launch and shows, in order: registration, email verification, sign-in,
the driver dashboard, browsing traveller tour briefs, sending a price quote, the
traveller conversation, reporting and blocking a traveller from that conversation,
My Earnings, and finally account deletion from Profile → Delete account.

There is no paid content or feature anywhere in the app. Nothing is purchasable,
and no payment is taken inside the app — see item 4 below.

### 2. Purpose of the app and target audience

**Car With Driver** is the driver-side companion app for carwithdriver.lk, a marketplace
that connects visitors to Sri Lanka with local, independently licensed car-with-driver
operators (chauffeur guides) for multi-day private tours.

**Target audience:** professional Sri Lankan chauffeur-guides and small car-hire
operators who own or operate their own vehicle and drive tourists on private,
multi-day itineraries. It is a business tool for a small, specific professional
audience — it is not a consumer ride-hailing app, and it has no taxi-style
dispatch or on-demand hailing.

**Problem it solves:** Sri Lankan drivers have historically had no direct channel to
travellers. Work reaches them through inbound tour agencies and overseas booking
platforms that take a large cut, dictate the price, and keep the customer
relationship. Drivers cannot set their own rates, cannot decline unsuitable trips,
and rarely know who they are driving until the day of the tour.

**Value it provides:** the app gives a driver a direct, free channel to travellers.
Travellers post a trip request ("tour brief"); drivers see it, quote their own price,
and negotiate directly with the traveller in chat. The driver decides which trips to
take and what to charge. The app also holds their vehicle listings, confirmed
bookings, calendar availability, and a monthly earnings summary. Joining is free;
a commission is only owed on trips that were actually completed.

**Business model:** the driver keeps 100% of the trip fare, which the traveller pays
the driver directly, in person. We invoice the driver a percentage commission at the
end of each month, for completed tours only, and the driver settles it by bank
transfer outside the app. No money moves through the app, so there is no digital
content or service to sell via in-app purchase.

### 3. Setting up and accessing the app's main features

**Demo account (already approved and ready to use):**

- Email: `<<DEMO_EMAIL>>`
- Password: `<<DEMO_PASSWORD>>`

**Important — please use the demo account above to review the app.** Driver accounts
are manually vetted. A brand-new account created through the in-app sign-up form is
placed in a "pending approval" state and, until our admin team approves it, sees only
a status screen — none of the app's features are reachable. The demo account above is
already approved and email-verified, so it opens straight into the full app. The
sign-up flow itself is fully demonstrated in the screen recording.

The demo account has sample vehicles, bookings, conversations and earnings data
preloaded, so every screen shows real content rather than an empty state. No sample
files or uploads are needed.

**How to reach each feature.** Sign in, then tap the menu button at the top-left of the
dashboard to open the navigation drawer. It contains:

| Menu item | What it does |
|---|---|
| **Overview** | Dashboard: today's trips, unread messages, this month's earnings |
| **My Vehicles** | Add / edit a vehicle: photos, seats, features, daily rate, per-km rate |
| **My Bookings** | Confirmed trips, with traveller details and the agreed price |
| **Messages** | One-to-one chat with travellers; send a formal price offer from here |
| **Tour Briefs** | Open trip requests posted by travellers — tap one to send a quote |
| **My Earnings** | Completed trips, commission due for the month, upload a bank transfer slip |
| **My Availability** | Block out dates when the driver is unavailable |
| **My Profile** | Edit profile and photo, change password, notification settings, **Delete account** |

**Account deletion** is at **My Profile → Delete account**. It asks for the account
password, shows a final confirmation, and then permanently erases the driver's
personal data. It is fully self-service and requires no email or phone call.

**Suggested review path:** sign in → Tour Briefs → open any brief → send a quote →
Messages → open a conversation → use the ⋯ menu in the conversation header to report
or block the traveller → My Earnings → My Profile → Delete account.

### 4. External services, tools and platforms used

| Service | Provider | What it is used for |
|---|---|---|
| Application API | Our own Node.js / Express backend, self-hosted on our own VPS (`https://carwithdriver.lk/api`) | All app data and business logic. The app talks to no other backend. |
| Database | MongoDB, self-hosted on the same VPS | Stores accounts, vehicles, bookings, messages |
| Image hosting / CDN | Cloudinary | Stores and serves vehicle photos and profile photos uploaded by drivers |
| Transactional email | Brevo (formerly Sendinblue) | Email verification, password reset, booking and message notifications |
| Push notifications | Expo Push Notification Service → Apple Push Notification service (APNs) | New message, new tour brief and booking alerts |
| Build tooling | Expo / React Native | Framework the app is built with. Not a runtime service. |

**Authentication** is handled entirely by our own backend: email and password, with
JWT access tokens and rotating refresh tokens. The iOS app uses **no** third-party or
social sign-in, so App Store Review Guideline 4.8 (Sign in with Apple) does not apply.

**Payment processors: none.** There is no in-app purchase, no subscription, no card
entry, and no payment SDK of any kind in the app. Travellers pay their driver directly,
in person, at the start of the trip. Drivers pay their monthly commission by bank
transfer outside the app and simply upload a photo of the transfer slip for our
records. No funds are ever collected or held by the app.

**AI services: none.** The app contains no AI, machine-learning or generative feature,
and sends no data to any AI provider.

**Analytics / advertising SDKs: none.** The app contains no analytics, attribution,
advertising or tracking SDK, and does not use the AppTrackingTransparency framework
because it performs no tracking.

**Maps:** the iOS app does not embed a map. It uses Core Location (foreground only,
while the app is open) so that a traveller with a confirmed booking can see their
driver's approximate position on our website on the day of the trip, and so nearby
trip requests can be surfaced. The map itself is on our website and uses OpenStreetMap
tiles under the ODbL licence, with the required attribution displayed.

### 5. Regional differences

**The app behaves identically in every region.** There is no geo-gating, no
region-locked content, no regional pricing, and no feature that is enabled or disabled
based on the user's country or App Store storefront. Every user, in every region, sees
the same build with the same functionality.

The only thing that is inherently regional is the subject matter, not the software:
all tours take place in Sri Lanka, and our drivers are based in Sri Lanka. A user in
any country can download the app, create an account and use every feature. All prices
are shown in USD everywhere, and the app is English-only in all regions.

### 6. Regulated industry and third-party material

**We are not a transport operator, and we are not a regulated carrier.** Car With
Driver is a listings and messaging marketplace. We do not own vehicles, do not employ
drivers, do not dispatch trips, do not set fares, and do not carry passengers. Each
driver on the platform is an independent business who contracts directly with the
traveller, sets their own price, and is solely responsible for the transport service.
This is set out in our Terms of Service at https://carwithdriver.lk/terms and in the
separate driver terms at https://carwithdriver.lk/driver-terms.

**Driver vetting.** Before any driver account is approved and made visible to
travellers, our admin team manually reviews documents the driver submits: their
Sri Lankan **driving licence**, their **national identity card**, and the **vehicle
registration certificate** for each vehicle they list. Drivers must warrant, under our
driver terms, that they hold valid licences, valid insurance, and a roadworthy vehicle,
and that they hold any tourist-transport registration required for their activity.
Accounts that fail this check are rejected and cannot access the app. We are happy to
provide sample approved-driver documentation on request.

**Protected third-party material: none.** All photographs in the app are uploaded by
the drivers themselves, of their own vehicles and of themselves, and our terms require
them to warrant that they own or are licensed to use what they upload. The app contains
no third-party trademarks, no licensed imagery, no music, no video, and no other
protected material. The only third-party content anywhere in the product is the
OpenStreetMap tile layer on our website (not in the app), used under the ODbL licence
with the required attribution shown.

---

## PART B — Condensed text for the App Review Information → Notes field

> App Store Connect limits the Notes field to 4,000 characters. Paste the block below.

```
CAR WITH DRIVER — DRIVER APP · REVIEW NOTES

DEMO ACCOUNT (approved & verified — please use this)
Email: <<DEMO_EMAIL>>
Password: <<DEMO_PASSWORD>>

IMPORTANT: driver accounts are manually vetted. A newly created account sits in a "pending approval" state and shows only a status screen until our admin approves it. The demo account above is already approved and opens straight into the full app with sample vehicles, bookings, messages and earnings.

WHAT THE APP IS
Driver-side companion app for carwithdriver.lk, a marketplace connecting visitors to Sri Lanka with independent, licensed car-with-driver operators (chauffeur guides) for multi-day private tours. Audience: professional Sri Lankan chauffeur-guides who own their vehicle. A business tool, not a consumer ride-hailing app — no on-demand hailing or dispatch.

PROBLEM & VALUE
Sri Lankan drivers normally get work through agencies and overseas platforms that take a large cut and set the price. This app gives them a direct, free channel: travellers post a trip request, drivers quote their own price and negotiate in chat, and choose which trips to accept. It also holds their vehicles, bookings, availability and monthly earnings.

WHERE THINGS ARE
Sign in, then tap the menu at the top-left. Menu items: Overview · My Vehicles · My Bookings · Messages · Tour Briefs · My Earnings · My Availability · My Profile.
- Send a quote: Tour Briefs → open a brief → Send offer
- Chat with a traveller: Messages → open a conversation
- Report or block a traveller: the ⋯ menu in the conversation header
- Delete account: My Profile → Delete account (password + confirmation, fully self-service)

PAYMENTS — NONE IN APP
No in-app purchase, subscription, card entry or payment SDK. Travellers pay their driver directly in person. Drivers settle a monthly commission (completed trips only) by bank transfer outside the app and upload a photo of the slip. No funds are collected or held by the app.

EXTERNAL SERVICES
- Our own Node/Express API on our own VPS (https://carwithdriver.lk/api) — all app data
- MongoDB, self-hosted on the same VPS — data storage
- Cloudinary — hosting driver-uploaded vehicle and profile photos
- Brevo (Sendinblue) — transactional email (verification, password reset, notifications)
- Expo Push Notification Service → APNs — push notifications
No payment processor, AI service, analytics, attribution, advertising or tracking SDK. Auth is our own backend (email + password, JWT); no third-party or social sign-in, so Guideline 4.8 does not apply. Core Location is foreground-only, so a traveller with a confirmed booking can see their driver's position on the day of the trip. The app embeds no map.

USER-GENERATED CONTENT
Drivers exchange text and images with travellers in one-to-one chat and read trip requests travellers post. Every conversation header has a ⋯ menu with Report and Block. Reports reach our admin queue and are actioned within 24 hours; blocking is immediate. Our terms prohibit objectionable content and we remove violators' accounts.

REGIONAL DIFFERENCES — NONE
No geo-gating, region-locked content, regional pricing or feature flags. Identical build and functionality in every region. All tours physically take place in Sri Lanka, prices are in USD, and the app is English-only everywhere.

REGULATED INDUSTRY / THIRD-PARTY MATERIAL
We are a listings and messaging marketplace, not a transport operator or regulated carrier. We do not own vehicles, employ drivers, dispatch trips, set fares or carry passengers; drivers are independent businesses contracting directly with the traveller (see https://carwithdriver.lk/terms and /driver-terms). Before approval we manually verify each driver's driving licence, national ID and vehicle registration; they must warrant valid licensing and insurance. No protected third-party material: all photos are driver-uploaded and warranted as theirs. Sample documentation available on request.

CONTACT: support@carwithdriver.lk
```
