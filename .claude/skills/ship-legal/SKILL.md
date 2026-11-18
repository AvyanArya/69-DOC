---
name: ship-legal
description: Legal and compliance checklist before launching an app or site - privacy policy, terms, refund and cookie policies, consent, data minimization, third-party SDKs, dark patterns, honest claims, accessibility, business details, age and children's data, email unsubscribe, asset licences, and data deletion. Use before launching or monetizing an app, when adding sign-up, payments, analytics, email, cookies or user data, or when asked whether an app could get into legal trouble.
---

# Ship legal

Not legal advice. Laws differ by country (GDPR in the EU/UK, CCPA/CPRA in California, COPPA
for children in the US, accessibility laws like the ADA and the European Accessibility Act).
Generate drafts that match what the app *actually* does, flag anything that needs a
lawyer, and say so once. Report each item as pass / fixed / not applicable.

## 1. Know your data first

Before writing any policy, list what the app collects, why, where it's stored, who it's
shared with (every third-party service and SDK), and how long it's kept. Read the code: forms,
database schema, analytics, auth, payments, error tracking, email, ads.

## 2. Policies (linked in the footer and at sign-up/checkout)

- **Privacy policy**: built from the data map above: what, why, legal basis, sharing,
  retention, user rights, contact.
- **Terms of service**: acceptable use, accounts, payments, termination, liability limits,
  governing law.
- **Refund policy** if anything is sold: what's refundable, how, and how fast. Must match
  what Stripe/App Store settings and support actually do.
- **Cookie policy**: each cookie/tracker, its purpose and lifetime.

## 3. Consent

- **Cookie banner** where required (EU/UK): non-essential cookies and analytics load only
  after opt-in; "Reject" as easy as "Accept"; consent stored and changeable.
- **Forms**: no pre-ticked boxes for marketing; separate consent for marketing from terms;
  say what each field is for.

## 4. Collect less

- Remove fields and tracking you don't use. Less data, less risk.
- **Audit third-party SDKs and scripts**: what each sends where; remove unused ones; list
  the rest in the privacy policy.

## 5. Be honest (consumer-protection law)

- **No dark patterns**: easy cancel (as easy as sign-up), no confirm-shaming, no sneaking
  items into carts, no fake countdown timers or fake scarcity.
- **No hidden fees**: the full price, including fees, shown before checkout.
- **No fake reviews or testimonials**; label paid or incentivised ones.
- **No unsupported claims** ("#1", "10x faster", health or earnings claims) without
  evidence (see `unslop` on made-up stats).

## 6. Accessibility

- Alt text on meaningful images (`alt=""` on decorative ones).
- Text contrast ≥ 4.5:1 (3:1 for large text and UI components).
- Everything works by keyboard, with a visible focus ring and logical order; labels on all
  inputs. See `ui-craft`.

## 7. Business details

Legal business name, contact email, and address where the law requires it (e.g. EU/UK
imprint rules, emails under CAN-SPAM), in the footer or an "About/Contact" page.

## 8. Age and children's data

- Ask for age where the service isn't for children, and block or adapt below the minimum
  age (13 in the US under COPPA; 13–16 in the EU depending on the country).
- If you knowingly collect data from children, you need verifiable parental consent and
  stricter handling. Strongly prefer not collecting it; get legal advice if you must.

## 9. Email

Every marketing email has a working one-click unsubscribe, honoured promptly, plus the
sender's identity and postal address. Transactional emails (receipts, resets) stay
separate.

## 10. Licences

Fonts, images, icons, music, video and code are licensed for this use (commercial, web,
app). Keep the licence files or links; credit where the licence asks. Don't use assets
scraped from other sites.

## 11. Data rights

A clear way to request data export and **account/data deletion** (a settings button or a
documented email), that deletes from the database, backups on rotation, and third parties
where possible. App stores require in-app account deletion for apps with sign-up.
