# Mobile sample app design

**Every mobile sample is the same small app, "Focus", built the way the best-converting subscription apps were built in 2026:** a one-question-per-screen onboarding quiz, a "building your plan" moment, a plan summary, then a two-page paywall with a trial timeline. It looks like a native app Vercel would ship: white, ink, hairlines, and one gold accent.

The reference implementation is [`ios-sandbox/`](ios-sandbox). Other platforms match its screens, copy and tokens. The research behind each rule is in the company repo (`company/docs/research/paywall-onboarding-2026.md`).

## Tokens

| Token | Value | Use |
|---|---|---|
| ground | system background (white; near-black in dark mode) | Every screen |
| ink | system label (black; white in dark mode) | Text, primary button, selected border, ring arc |
| ink2 | ink at 62% | Subtitles, secondary text |
| ink3 | ink at 42% | Captions, the paywall close button, unselected rings |
| hairline | ink at 10% | Card borders, dividers, ring track |
| fill | ink at 4% | Selected card background, icon tiles, stat tiles |
| accent | `#F7B500` gold | Only: the selected dot, the ring tip, the savings badge, the first trial-timeline step, the Pro dot |
| gutter | 24 | Screen side padding |
| radius | 16 (cards), capsule (buttons) | |

- **Type:** the system font. Display titles are bold with tight tracking: 40 on welcome, 30 on questions, 34 on the paywall. Body is 17; captions are 13; ids are monospaced 13.
- **Primary button:** a full-width ink capsule, 56 tall, semibold 17 label, scales to 0.97 when pressed. When disabled it fades to 30%.
- **Option row:** a hairline card with an optional icon, a title, a subtitle and a selection ring on the right. Selected means an ink border, the fill background and the gold dot inside an ink ring.
- **Haptics:** a light tap on buttons, a selection tick on options, and a success buzz when the plan is ready and when a purchase completes.
- **No shadows, gradients or brand colours** besides the one gold. Borders are hairlines.

## Screens

1. **Welcome:** brand mark and "Focus", a large progress ring (41 of 60 min), "Do your best work, every day.", a subtitle, "Get started", and "A RevenueDot sample app".
2. **Quiz, one question per screen,** each with a back chevron, a thin progress bar and a pinned Continue that is disabled until an answer is chosen:
   - goal (Deep work, Study, Creative projects, Reading; with icons and subtitles);
   - how long the user can focus (four ranges);
   - what breaks their focus (My phone, Notifications, Putting it off, Noise around me);
   - **insight:** "A plan beats willpower." with two drawn curves, labelled as an illustration;
   - best time of day (Morning, Afternoon, Evening, Late night);
   - daily minutes (15, 30 "Most popular", 60, 90);
   - "How did you hear about us?";
   - **reminders:** asks for notification permission after explaining why, with "Not now".
3. **Building your plan:** a large percentage counting to 100, a bar, and three checks that tick at 30, 60 and 90 using the user's answers.
4. **Your plan is ready:** four stat tiles (daily minutes, sessions, start time, 14 days to a habit) and a note; the button says "Start my plan".
5. **Paywall page 1 (value):** a low-contrast X at the top left, Restore at the top right, the eyebrow "Focus Pro", a headline written from the answers ("Your plan for deep work is ready. Unlock it."), four benefit lines with icon tiles, and one real App Store review only if the app has one. Continue.
6. **Paywall page 2 (plans):** "How your free trial works" with the three-step timeline (Today, Day N−2 reminder, Day N charge), then the plan cards with annual first and pre-selected. **The billed amount ("$59.99/year") is the largest price on a card; the per-week price is smaller and below it.** The annual card carries a gold "SAVE 77%" badge computed against the shortest plan. The button says "Start my free week" for a 7-day trial. Under it: "No commitment, cancel anytime", the disclosure line ("7 days free, then $59.99/year. Auto-renews. Cancel anytime in Settings."), and Terms and Privacy links.
7. **Exit offer:** the first time the user closes the paywall with annual selected, a short sheet offers the shortest plan ("Not ready for a year?"). The second close leaves.
8. **Home:** the date and "Today", a Pro pill when subscribed, an account button, a ring card (minutes today of the daily goal), a week row of seven circles (filled ink with the gold dot when the goal was met), sessions (Classic 25 free; Deep 50 and Flow 90 locked until Pro, opening the paywall), an upgrade card for free users, and a pinned "Start a 25-minute session".
9. **Session:** a large monospaced countdown inside the ring and "Finish session". The first finished session asks for an App Store rating, never onboarding.
10. **Account sheet:** a plan card (Free plan with "See plans", or Focus Pro with the renewal date and a trial tag), Restore purchases, Manage subscription, Redo onboarding, and a collapsed **Developer** section: app user id with copy, the entitlement state, active subscriptions, the current offering, the server host, any load error, and log in or out. The footer credits RevenueDot.

## SDK behaviour every sample keeps

- Configure the RevenueCat SDK with the RevenueDot proxy URL (`https://api.revenuedot.app`) before configure, and turn off RevenueCat's response-signature check.
- Plans come from `offerings.current`. With no offering yet, the paywall shows preview plans (Yearly $59.99 with a 7-day trial and "Save 77%", Weekly $4.99) and a note to create an offering; buying is disabled.
- Save the onboarding answers as customer attributes named `onboarding_<question id>`, so RevenueDot audiences and experiments can use them.
- Pro means the `pro` entitlement is active. Listen for customer-info updates.
- Load errors show only in the Developer section, never on the paywall.
- Debug builds accept a launch argument `RDScreen` (welcome, goal, insight, reminders, building, plan, paywall, plans, home, settings) that opens that screen with sample answers, for screenshots and UI tests.

## Never

- A free-trial on/off switch (Apple rejects it under 3.1.2 since January 2026). Offer a separate plan card instead.
- A rating prompt during onboarding (5.6.3).
- Invented reviews, ratings or user counts.
- A per-week price larger than the billed amount.
