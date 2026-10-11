# Emails sent to travellers

Every email Car With Driver sends to a traveller, with its trigger and wording.
Text in `{braces}` is filled in per email. The source is
`backend/services/emailService.js`; the schedule is in
`backend/services/quoteFollowUpService.js`.

This describes the code as of 11 Oct 2026, after the changes in "Traveller
emails: suggested changes". None of it is deployed yet. What that review asked
for and is not built is listed in [section 9](#9-not-built).

## Contents

1. [What a traveller gets for one request](#1-what-a-traveller-gets-for-one-request)
2. [Rules that apply to everything](#2-rules-that-apply-to-everything)
3. [Request and offers](#3-request-and-offers)
4. [Summaries and reminders](#4-summaries-and-reminders)
5. [Messages](#5-messages)
6. [Booking and trip](#6-booking-and-trip)
7. [Layout, footer and offer cards](#7-layout-footer-and-offer-cards)
8. [Pages opened from email links](#8-pages-opened-from-email-links)
9. [Not built](#9-not-built)

---

## 1. What a traveller gets for one request

| When | Email | Section |
|---|---|---|
| Request posted | Request received | 3.1 |
| First offer | Your first offer is in | 3.2 |
| 12 hours on, no offers | No offers yet | 4.1 |
| 3 hours after the first offer, or at 5 offers | Top picks | 4.2 |
| Later offers | New offers, at most once a day | 4.3 |
| 3 days after the top picks | Still planning? | 4.4 |
| 30 and 14 days before the trip | Trip approaching | 4.5 |
| A day before an offer expires | Offer expires tomorrow | 4.6 |
| All offers expired | Offers expired | 4.7 |
| Any time | New message from a driver | 5.1 |

Before this change a traveller got one email per offer: 17 on average and up to
28 in a day. Now only the first offer on a request is emailed straight away; the
rest arrive in the summaries.

---

## 2. Rules that apply to everything

**Email preference.** Each traveller has one of three settings, changed on the
page in [8.1](#81-email-preferences):

| Setting | What they get |
|---|---|
| Every offer as it arrives | One email per offer, plus the reminders in section 4 except 4.3 |
| A summary, at most once a day (default) | The first offer, then section 4 |
| Only messages and bookings | Nothing from sections 3.2, 3.3 and 4 |

Messages from drivers (5.1), booking emails (section 6) and the request
confirmation (3.1) are sent whatever the setting.

**One reminder a day.** A traveller gets at most one email from section 4, or
4.8, in any 20 hours, across all of their requests.

**Booked travellers get no reminders.** Any pending or confirmed upcoming
booking, with any driver, for any dates, stops section 4 and 4.8 entirely.

**Reminders also stop** when the request is booked, closed or expired, the
account is deleted, the traveller answers "I've booked something else", or an
admin switches them off in the Briefs tab.

**Sending limit.** At most 20 emails from section 4 are sent per hour, and none
when fewer than 60 Brevo sends remain for the day.

**Unsubscribing.** Offer and reminder emails carry a `List-Unsubscribe` header
and an "Email me less often" link, both pointing at our own preferences page.
A one-click unsubscribe from the mail client sets "Only messages and bookings".
It must not go through Brevo's unsubscribe, which blocks every email to that
address, driver messages and booking emails included.

**Tags.** Each email type is tagged (for example `traveller-first-offer`) so
Brevo's statistics can be split by type.

---

## 3. Request and offers

### 3.1 Request received

- **When:** immediately after a quote request is posted.
- **Subject:** Your Sri Lanka trip request is live
- **Preview:** Drivers are being notified now. Here is what happens next.
- **Heading:** Your trip request is live
- **Button:** View my request

> Hi {Traveller},
>
> Your request for **{Start} → {End}** ({start date} — {end date}, {N} adults)
> has gone to approved drivers across Sri Lanka.
>
> **What happens next**
>
> 1. Drivers send you offers, often within the first hour.
> 2. We email you the first one straight away, then a summary so your inbox
>    stays clear.
> 3. Chat with any driver, compare, and book the one you like.
>
> {reassurance box}
>
> **One quick favour:** add hello@carwithdriver.lk to your contacts, or move
> this email to your main inbox, so the offers reach you.

### 3.2 Your first offer is in

- **When:** the first offer on a quote request.
- **From:** {Driver} via Car With Driver
- **Subject:** {Driver}: ${price} for your {Start} → {End} trip
- **Preview:** {Vehicle} · {N} days · ★ {rating} from {N} reviews. More drivers are replying.
- **Heading:** Your first offer is in
- **Button:** View offer and chat (opens the offer without signing in)
- **Replies:** posted to the chat with that driver

> Hi {Traveller},
>
> {Driver} has sent the first offer for your **{Start} → {End}** trip. More
> drivers usually reply over the next few hours, and we will send you a summary
> so your inbox doesn't fill up.
>
> {offer card}
>
> > {driver's note, if any}
>
> Reply to this email to ask {Driver} a question. Your reply goes straight to
> the chat.
>
> {reassurance box}

### 3.3 Trip offer (one per offer)

- **When:** an offer sent directly in a chat, or any later offer on a request
  for a traveller who chose "Every offer as it arrives".
- **From:** {Driver} via Car With Driver
- **Subject:** {Driver}: ${price} offer for your trip
- **Heading:** New trip offer
- **Button:** View offer and chat
- **Replies:** posted to the chat with that driver

> Hi {Traveller},
>
> {Driver} sent you a trip offer about {Vehicle} on Car With Driver.
>
> > {offer summary and note}
>
> Reply to this email to answer {Driver} directly. Your reply goes straight to
> the chat.
>
> {reassurance box}

---

## 4. Summaries and reminders

All of these are checked hourly and follow the rules in section 2. 4.2 to 4.6
show offer cards ([7.3](#73-offer-card)) and accept replies, which go to our
own inbox so travellers can ask for help choosing.

### 4.1 No offers yet

- **When:** 12 hours after a request that no driver has answered. Once.
- **Subject:** No offers yet for your {Start} → {End} trip — here is what helps
- **Heading:** Still waiting on your first offer
- **Button:** View my request

> Hi {Traveller},
>
> No driver has sent an offer yet for your **{Start} → {End}** trip
> ({start date} — {end date}). Some routes and dates take longer, and your
> request stays open to every approved driver.
>
> **Two things that usually help**
>
> - Add detail: the places you want to visit, your group size and luggage, and
>   whether your dates are flexible.
> - Message us on WhatsApp at +94 76 3021 483 and we will point drivers to your
>   request.
>
> We will email you as soon as the first offer arrives.

### 4.2 Top picks

- **When:** 3 hours after the first offer, or as soon as there are 5 offers. Once.
- **Subject:** {N} drivers replied — our top 3 picks for {Start} → {End}
  (with 3 or fewer offers: "{N} drivers replied to your {Start} → {End} request")
- **Preview:** From ${lowest}. No booking fee, pay your driver on day one.
- **Heading:** {N} drivers want to show you Sri Lanka
- **Button:** Compare all {N} offers

> Hi {Traveller},
>
> {N} drivers have offered to take you on your **{Start} → {End}** trip
> ({start date} — {end date}). To save you comparing them all, here are the 3
> we would look at first.
>
> {3 labelled offer cards}
>
> See all {N} offers
>
> {reassurance box}
>
> Not sure which to choose? Reply to this email with your questions and our
> team in Sri Lanka will help you decide.

The three cards are chosen in this order:

| Label | Rule |
|---|---|
| Best value | Lowest price among drivers rated 4.5 or better |
| Top rated | Highest rating among drivers with at least 10 reviews |
| Best match | The vehicle whose seats fit the group most closely. Only given when vehicle size actually differs between offers |

Any slots left go to the cheapest remaining offers, without a label.

### 4.3 New offers

- **When:** new bookable offers have arrived since the last email about this
  request. At most once a day. Not sent to travellers who chose "Every offer".
- **Subject:** {N} new offers for your {Start} → {End} trip
- **Heading:** {N} new offers since we last wrote
- **Button:** Compare all {N} offers

> Hi {Traveller},
>
> {N} more drivers have sent an offer for your **{Start} → {End}** trip. You
> now have {total} offers you can book.
>
> {up to 3 of the new offers, as cards}

### 4.4 Still planning?

- **When:** 3 days after 4.2, if an offer is still unopened or new ones arrived. Once.
- **Subject:** Still planning your {Start} → {End} trip?
- **Heading:** Still planning your trip?
- **Button:** Compare all {N} offers

> Hi {Traveller},
>
> Your request for **{Start} → {End}** has {N} offers you can still book. If
> something is in the way, tell us and we will stop guessing.
>
> **What's holding you back?**
>
> [Prices are higher than I expected]
> [I haven't fixed my dates]
> [I can't choose a driver]
> [I've booked something else]
>
> {3 labelled offer cards}

Each answer opens the page in [8.2](#82-whats-holding-you-back).

### 4.5 Trip approaching

- **When:** 30 days and again 14 days before the start date, if the request is
  still open with bookable offers. Not for requests posted in the last 3 days.
- **Subject:** Your trip is in {N} days — your driver isn't booked yet
- **Heading:** {N} days to go, and no driver booked yet
- **Button:** Compare all {N} offers

> Hi {Traveller},
>
> Your **{Start} → {End}** trip starts on {start date}. You have {N} offers
> waiting, and booking one takes a minute.
>
> {3 labelled offer cards}

### 4.6 Offer expires tomorrow

- **When:** a day before a bookable offer expires. Once per request. Not sent
  for an offer that is less than 12 hours old.
- **Subject:** {Driver}'s ${price} offer expires tomorrow
- **Heading:** An offer expires tomorrow
- **Button:** Compare all {N} offers

> Hi {Traveller},
>
> {Driver}'s ${price} offer for your **{Start} → {End}** trip expires within a
> day. After that they would need to send a new one, and the price may change.
>
> Your dates fall in peak season, when drivers fill their calendars early.
> *(only for trips starting in December or January)*
>
> {the expiring offer, then up to 2 more picks}

### 4.7 Offers expired

- **When:** once no offer on an open request can be booked any more. Once.
- **Subject:** Your offers for {Start} → {End} have expired
- **Heading:** Your offers have expired
- **Button:** Post this request again (see [8.3](#83-post-this-request-again))

> Hi {Traveller},
>
> The offers drivers sent for your **{Start} → {End}** trip ({start date} —
> {end date}) have expired, so they can no longer be booked as they are.
>
> Still planning this trip? Post the same request again and drivers will send
> you up-to-date prices. You do not need to fill anything in.
>
> Prefer one of the drivers below? Open your messages and tap **Request new
> offer** in their chat.
>
> {up to 3 expired offers, greyed out, prices struck through, no links}

If the trip's start date has passed, the button is "Request new offers" and
opens Messages instead.

### 4.8 Offer still open

- **When:** a day after offers the traveller has not opened that were sent
  directly in a chat. One email per traveller listing all of them, never one
  per offer. Offers on a quote request are covered by 4.2 to 4.7.
- **Subject:** {Driver}'s ${price} offer for {start date} is still open
  (several: "{N} offers are still waiting for you")
- **Heading:** Your offer is still open
- **Button:** View offer

> Hi {Traveller},
>
> {Driver} sent you an offer you have not opened yet.
>
> {Driver} · ${price}
> {Vehicle} · from {start date}
> View offer
>
> {reassurance box}

---

## 5. Messages

### 5.1 New message

- **When:** about 90 seconds after a driver's message, and only if the traveller
  has not read it in the chat by then. Messages sent close together arrive as
  one email, and a conversation is emailed at most once every 10 minutes.
- **From:** {Driver} via Car With Driver
- **Subject:** {Driver}: "{first 50 characters of the message}…"
- **Preview:** Reply to this email to answer {Driver} directly.
- **Heading:** New message waiting
- **Button:** Reply in chat (needs sign-in)
- **Replies:** posted to the chat with that driver

> Hi {Traveller},
>
> {Driver} sent you a new message about {Vehicle} on Car With Driver.
>
> > {message}
> >
> > {second message, if several}
>
> Reply to this email to answer {Driver} directly. Your reply goes straight to
> the chat.

Phone numbers, email addresses and links in messages are replaced with
`[hidden]`, as they are in the chat.

---

## 6. Booking and trip

### 6.1 Booking confirmed

- **When:** the traveller books through a driver's offer.
- **Subject:** Booked: {Driver} will meet you on {start date}
- **Preview:** {Driver}'s details, what is included and how to cancel.
- **Heading:** Your trip is booked
- **Button:** View booking

> Hi {Traveller},
>
> Your booking is confirmed. **{Driver}** has been notified and will meet you
> at {pick-up} on {start date}.
>
> > {photo} **{Driver}**
> > {Vehicle}
> > **Phone:** {driver's number}
> >
> > **Dates:** {start date} — {end date}
> > **Total:** ${price}
> >
> > {inclusions as ticks and crosses}
>
> Payment will be collected by your driver on the first day of the trip.
>
> Send your driver your flight number and arrival time in the chat, so they can
> plan your pick-up.
>
> **If your plans change**
>
> - More than 2 days before your start date: free to cancel, nothing to pay.
> - Within 2 days of the start date: 50% of the total is due to the driver.
> - After the trip has started: the completed days in full, plus 50% of the
>   remaining days.
>
> Add this trip to Google Calendar

### 6.2 Booking request received

- **When:** the traveller books a vehicle directly, without an offer. The
  driver's contact details are not included.
- **Subject:** We received your booking request for {Vehicle}
- **Heading:** Booking request received
- **Button:** View booking

> Hi {Traveller},
>
> We've sent your request for {Vehicle} to the driver.
>
> **Trip dates:** {start date} — {end date}
> **Total estimate:** ${price}
> **Status:** Pending
>
> Payment will be collected by your driver on the first day of the trip.
>
> You will get an email when the driver accepts or updates the request.

### 6.3 Booking status changed

- **When:** the driver accepts or declines a direct booking request, the booking
  is cancelled, or an admin changes its status.
- **Subject:** {Vehicle} updated: {Confirmed / Rejected / Cancelled}
- **Heading:** Your trip is confirmed / Booking was declined / Booking
  cancelled / Booking updated
- **Button:** View booking

> Hi {Traveller},
>
> {Vehicle} is now **{Status}**.
>
> **Trip dates:** {start date} — {end date}
> **Total:** ${price}
>
> {note}
>
> Open the conversation if you need to follow up.

| Change | Note |
|---|---|
| Driver accepted | Your driver confirmed this booking request. |
| Driver declined | Your driver declined this booking. Start a new chat to adjust plans. |
| Cancelled | The cancellation reason that was entered |
| Admin changed the status | An administrator updated this booking status. |

### 6.4 Trip in 3 days

- **When:** 3 days before a confirmed trip starts. Once. Not sent for a booking
  made less than a day before the trip.
- **Subject:** In 3 days: {Driver} meets you at {pick-up}
- **Heading:** Your trip starts on {start date}
- **Button:** View my booking

> Hi {Traveller},
>
> Your trip with **{Driver}** is three days away.
>
> **Dates:** {start date} — {end date}
> **Pick-up:** {pick-up}
> **Vehicle:** {Vehicle}
> **Driver's phone:** {number}
> **Total:** ${price}, paid to your driver on day one
>
> **Have ready**
>
> - Your flight number ({flight}) is on the booking. Tell your driver if it changes.
> - The payment for your driver, as you agreed with them.
> - Your pick-up time and exact meeting point, confirmed with your driver.
>
> Plans changed? Cancelling more than 2 days before your start date is free.
> Within 2 days, 50% of the total is due to the driver.

### 6.5 Review request

- **When:** a day after a confirmed trip ends. Once, and not at all after a week.
- **Subject:** How was your trip with {Driver}?
- **Button:** Leave a review (opens without signing in)

> Hi {Traveller},
>
> We hope you enjoyed your trip with {Driver} ({trip dates}) in the {Vehicle}.
>
> Would you take a minute to rate your driver? Your review helps other travellers
> choose with confidence, and it means a great deal to your driver.
>
> You do not need to sign in — the button below opens your review form directly.

---

## 7. Layout, footer and offer cards

### 7.1 Layout

Used by every email the platform sends, drivers' and admins' included:

- The preview line is hidden in the email and shows only in the inbox list.
- A green band at the top with the logo (`/email-logo.png`, white on green, so
  it reads the same in light and dark mode; the alt text is the brand name).
- White card, 600px at most, built with tables and inline styles.
- One main button in brand green (`#0f7a45`, white text, 5.4:1 contrast), at
  least 44px tall, with the font set on the link itself.
- Every text element carries the font stack inline.

### 7.2 Footer

> {reply line}
>
> Questions? WhatsApp us on +94 76 3021 483 or email hello@carwithdriver.lk.
>
> Getting too many emails? Email me less often. *(offer and reminder emails only)*
>
> You are receiving this email because you have an active account on Car With Driver.
>
> © 2026 Car With Driver

The reply line is one of:

| Email | Line |
|---|---|
| 3.2, 3.3, 5.1 | Replies to this email are posted to your chat with the driver. |
| 4.1 to 4.6 | Reply to this email and our team in Sri Lanka will get back to you. |
| Everything else | This is an automated message — please don't reply to this email. |

### 7.3 Offer card

```
┌──────────────────────────────────────────────┐
│ BEST VALUE                                   │
│ [photo]  Ranjith Alwis                       │
│          ★★★★★ 5.0 · 58 reviews · 35 yrs'     │
│          Toyota KDH, 6 seats                 │
│                                              │
│ $570 total · $95 / day                       │
│ 700 km included, then $0.30 per km           │
│                                              │
│ ✓ English-speaking driver  ✓ Fuel and insurance│
│ ✕ Parking and tolls        ✓ Airport meet & greet│
│                                              │
│ [ View offer and chat ]                      │
└──────────────────────────────────────────────┘
```

- The driver's photo, or their initial in a grey circle when there is none.
- "New on the platform" replaces the rating for a driver with no reviews.
- Ticks are green, crosses grey. The list is left out for offers sent before
  inclusions existed.
- "View offer and chat" opens that offer without signing in. These links never
  expire and are not invalidated by later emails.

### 7.4 Reassurance box

> **Booking is risk-free.** No booking fee · No deposit · Pay your driver on
> day one · Free cancellation up to 2 days before your trip. The price is
> locked once you accept an offer.

These match the site's pricing and cancellation pages. Change them there and
here together.

---

## 8. Pages opened from email links

All three open without signing in. The link only shows the page; nothing
changes until the traveller presses its button, because mail scanners follow
links on their own.

### 8.1 Email preferences

"Email me less often" in the footer, and the mail client's unsubscribe button.
Three choices (see section 2), then "Save my choice".

### 8.2 What's holding you back?

From the four answers in 4.4. The answer is stored on the request and shown in
the admin funnel report.

| Answer | What happens |
|---|---|
| Prices are higher than I expected | Recorded. The page suggests asking a driver what they can do for their budget |
| I haven't fixed my dates | Reminders pause until 30 days before the trip (or for a week, if that is already close) |
| I can't choose a driver | Recorded. The page offers help by reply or WhatsApp |
| I've booked something else | The request is closed and all reminders for it stop |

### 8.3 Post this request again

From 4.7. Shows the route, dates and group, then "Post it again". The same
request goes to drivers as a new one and the old one is closed. Refused if the
start date has passed, the request is booked, or it was already posted again.

---

## 9. Not built

From "Traveller emails: suggested changes", with the reason:

- **5.1 opening the chat without sign-in.** The offer link shows one read-only
  offer; opening a chat means signing the traveller in from an email link.
  That is a security decision to make on purpose. Replying by email already
  works without sign-in.
- **"Don't remove the 8 unsubscribed travellers from Brevo's blocklist."**
  Nothing in the code touches the blocklist. They stay blocked until you remove
  them in Brevo.
- **"{Driver} is holding {start date} for you" (4.8 subject).** Drivers do not
  hold dates, so the subject says the offer is still open instead.
- **"First offers usually arrive within 30 minutes" (3.1).** Written as "often
  within the first hour", which the log supports.
- **6.2 "Most drivers reply within X hours… we'll suggest similar drivers."**
  There is no measured reply time and no suggestion feature to back it.
- **6.3 showing 3 similar drivers when a driver declines.**
- **A follow-up when "Request new offer" gets no reply after 24 hours.**
- **"Best match" for heritage-heavy itineraries.** It uses vehicle size only.
- **"Know someone heading to Sri Lanka?" on the review request.**
- **Measuring bookings within 7 days of a click.** Emails are tagged by type for
  Brevo's click statistics; matching clicks to bookings is not built.
- **Testing in Gmail, Apple Mail, Outlook and dark mode.** Checked in Chrome
  only. Send test emails to real inboxes before relying on the layout.
