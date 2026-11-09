## 1. Executive design diagnosis
The public homepage has a strong identity: dark infrastructure-grade canvas, high-contrast type, restrained orange action moments, serious operational language, framed panels, mono-style labels, and a sense of controlled urgency.

The Builder Command Centre is functionally useful, but visually it belongs to a different product. It currently reads as a generic light SaaS dashboard: white cards, blue buttons, pale blue status pills, large empty card interiors, soft consumer shadows, and a standard top nav. The gap is not just color. The homepage communicates **“serious permit workflow infrastructure.”** The dashboard currently communicates **“generic admin app.”**

This does **not** require a full product redesign or business-logic change. It requires a backend design-system pass that translates the homepage’s visual grammar into operational components:

* Dark app shell and dark cards, not a white SaaS canvas.
* Orange as the primary action color, not blue.
* Slate, green, amber, and red used semantically for workflow state.
* Compact, information-dense cards.
* Clear “what needs attention now” hierarchy.
* Stage progress made visible, not buried in text.
* Completed/certified records treated as permanent auditable assets, not disposable items.
* Builder actions surfaced directly from live requests and Project Portfolio cards.

The goal should be: **a calm command surface for permit work**, not a decorative marketing-style dashboard.

---

## 2. Homepage visual language extraction

### Core brand feeling

The homepage is strongest when it feels like a control layer for construction compliance: dark, precise, urgent, but not flashy. It uses the language of dispatch, escrow, certification, vaulting, and professional records. That should become the product UI’s operational tone.

### Visual patterns worth carrying into the backend

#### Dark infrastructure canvas

The homepage uses a near-black background with subtle dot/grid texture. This gives the product a “system of record” feel. The backend should use the same canvas, but with tighter density.

Recommended backend translation:

* Use `#0B0E14` as the main app background.
* Add the subtle dot-grid texture behind page content.
* Use dark panels for cards, lists, forms, and modals.
* Avoid large white surfaces except where legally required for previews/PDFs.

#### Strong white typography

Homepage headings use heavy white type with tight line-height. Body copy is softer gray. This creates a clear editorial hierarchy.

Backend translation:

* Page titles should be bold and white.
* Section labels should use small uppercase letter-spaced text.
* Metadata should be secondary gray.
* Important workflow state should be visible without relying on long paragraphs.

#### Orange as action, not decoration

The homepage uses orange for the main CTA, active pricing card, links, and emphasized words. Orange is the product’s action color.

Backend translation:

* Primary actions: orange.
* Active nav state: orange-tinted.
* Current workflow stage: orange.
* “Needs builder action” state: orange or amber, depending on urgency.
* Do not use blue as the primary product action color.

#### Framed dark cards

Homepage cards have dark surfaces, rounded corners, visible borders, and subtle orange/slate glow. They feel like durable modules, not floating consumer cards.

Backend translation:

* Cards should be dark, bordered, compact, and structured.
* Use orange border emphasis only for priority items.
* Use green only for success/certified/completed states.
* Use slate for neutral waiting states.

#### Mono/eyebrow labels

The homepage repeatedly uses small uppercase labels like `WHO IT'S FOR`, `HOW IT WORKS`, `PRICING`, and `STEP 1`.

Backend translation:

Use this pattern for operational section headers:

* `NEEDS ATTENTION`
* `LIVE REQUESTS`
* `PROJECT PORTFOLIO`
* `ACTIVE APPOINTMENTS`
* `CERTIFIED / VAULT-READY`
* `NEXT INSPECTION STAGE`

#### CTA hierarchy with arrows

Homepage buttons are clear: orange primary, dark secondary, arrow affordance. Backend buttons should follow the same hierarchy.

Backend translation:

* Primary: orange filled button.
* Secondary: dark/slate outlined button.
* Tertiary: text button with orange arrow.
* Avoid bright blue filled buttons.

#### Serious workflow language

The homepage language is operational: “dispatch,” “Schedule C-B,” “Vault Archive,” “Professional Record,” “escrow-backed execution.”

Backend translation:

Avoid generic dashboard labels where possible.

Better labels:

* “Open Request”
* “Request Inspection”
* “View Appointment”
* “Open Vault Record”
* “Review Hold”
* “Upload Missing Detail”
* “View Certificate”

Less ideal:

* “Manage”
* “Details”
* “Click here”
* “Delete”
* “Archive” if it implies hiding or disposal

---

## 3. Builder Command Centre gaps

### Current divergence from homepage

#### 1. The backend uses a light SaaS surface

The current Builder Command Centre uses a pale gray/white canvas with large white cards. This removes the strongest part of the Vero Permit brand: the dark infrastructure feel.

The homepage feels proprietary. The dashboard feels template-based.

#### 2. Blue has become the backend primary color

The current dashboard uses blue for buttons, badges, and card emphasis. This conflicts with the homepage, where orange is the decisive action color and green is used for successful workflow state.

Blue should not be the main product action color.

#### 3. Cards are too empty for operational work

The live request cards have generous whitespace but low information density. They show title, address, stage text, posted date, and a generic “Manage Request” button. The cards do not yet answer:

* Is this waiting on me?
* Is this waiting on an inspector?
* What stage is this tied to?
* How old is this request?
* What is the next useful action?
* Is there an appointment scheduled?
* Is it Vault-ready?

#### 4. “Action required” is not visually dominant

The dashboard purpose says the first job is to show what needs attention now. In the screenshot, the first prominent item is “Post an Inspection Request,” followed by live requests. That is useful, but the dashboard needs a dedicated attention layer above the work lists.

The user should land and immediately see:

* “No builder action required right now,” or
* A compact list of required actions sorted by urgency.

That message should appear once, not repeated on every appointment row.

#### 5. Stage state is text-only

The screenshot shows “Stage 1 — Site Survey & Excavation” and “Stage 2 — Foundation Pour,” but there is no stage-progress component. Because the product is organized around a simplified 5-stage flow, the dashboard should visually encode stage progress.

Every active project card should show:

* Current stage.
* Completed stages.
* Upcoming stages.
* Whether a request is live for the current stage.
* Whether the builder can request the next inspection.

#### 6. Active appointments read like a generic list

The appointment rows are functional, but repetitive. “No builder action required right now” appears as a large pill on each row. That should become a quiet state indicator unless action is actually needed.

The primary row action should be contextual:

* “View Appointment”
* “Review Hold”
* “Open Inspector Record”
* “Open Vault Record”
* “Confirm Attendance” if required

#### 7. The Project Portfolio needs to become the operational core

The prompt says the Project Portfolio must remain actionable. That is correct. The dashboard should not only show live requests. It should also show each project’s current position in the permit workflow and expose the next valid action directly from that project card.

For example:

* Project has no live request and current stage is ready → `Request Inspection`
* Project has a live request → `View Live Request`
* Project has confirmed appointment → `View Appointment`
* Project has hold/modification → `Review Hold`
* Project is certified → `Open Vault Record`

#### 8. Completed/certified work needs an audit-first pattern

Completed/certified records should not be treated like removable task cards. They should move into a permanent “Certified / Vault-ready” section with audit-style actions.

Correct actions:

* View Certificate
* Open Vault Record
* Download PDF
* View Evidence Bundle

Avoid:

* Delete
* Trash
* Remove
* Archive, unless it only means “move out of the active view” and is clearly non-destructive

---

## 4. Recommended backend dashboard design system

### A. Page shell

Use the homepage shell language, but compact it for app use.

**Desktop shell**

* Background: `#0B0E14`
* Optional dot-grid texture at low opacity
* Sticky top nav, height `64px`
* White Vero Permit logo
* Center or left nav: `Dashboard`, `New Request`, `Vault`
* Right utility area: notifications, account, theme if needed
* Page container max-width: `1280px`
* Page padding: `32px desktop`, `20px tablet`, `16px mobile`

**Top nav styling**

* Inactive nav item: `#94A3B8`
* Active nav item: orange-tinted pill, not beige or blue
* Active nav background: `rgba(255,106,0,0.12)`
* Active nav text: `#FF8A3D`
* Nav border-bottom: `rgba(148,163,184,0.14)`

**Dashboard page order**

1. Command header
2. Action-required strip
3. Queue summary metrics
4. Live requests awaiting claim
5. Project Portfolio
6. Active inspection appointments
7. Certified / Vault-ready records

The homepage has large vertical drama. The backend should use the same materials, but with tighter density.

---

### B. Typography scale

Use Inter as specified, but make the hierarchy more deliberate.

| Use           | Size |  Weight | Line height | Notes                              |
| ------------- | ---: | ------: | ----------: | ---------------------------------- |
| Page eyebrow  | 11px |     700 |        14px | Uppercase, `0.16em` letter spacing |
| Page title    | 32px |     800 |        38px | White                              |
| Page subtitle | 15px | 400/500 |        22px | Slate                              |
| Section title | 20px |     800 |        26px | White                              |
| Card title    | 16px |     750 |        22px | White                              |
| Row title     | 15px |     750 |        20px | White                              |
| Body          | 14px | 400/500 |        20px | Slate-200/slate-300                |
| Metadata      | 12px |     500 |        16px | Slate-400                          |
| Badge text    | 11px |     700 |        14px | Uppercase or title case            |
| Button text   | 14px |     700 |        18px | No all-caps                        |

Avoid making dashboard cards use marketing-scale type. The dashboard should be compact and scannable.

---

### C. Card styling

Use a small family of cards rather than many one-off styles.

#### Standard panel card

Use for live requests, project cards, appointment rows, and vault records.

```css
background: #111827;
border: 1px solid rgba(148, 163, 184, 0.18);
border-radius: 18px;
box-shadow: 0 18px 40px rgba(0, 0, 0, 0.24);
padding: 20px;
```

#### Elevated action card

Use for “Post an Inspection Request” and “Needs Attention.”

```css
background:
  linear-gradient(135deg, rgba(255,106,0,0.10), rgba(17,24,39,0.96) 38%),
  #111827;
border: 1px solid rgba(255,106,0,0.34);
border-radius: 20px;
box-shadow: 0 0 0 1px rgba(255,106,0,0.04),
            0 20px 60px rgba(255,106,0,0.10);
```

#### Quiet row card

Use for active appointment rows and completed records.

```css
background: #0F1623;
border: 1px solid rgba(148, 163, 184, 0.14);
border-radius: 16px;
padding: 16px 18px;
```

#### Empty state card

Use when there are no live requests, no active appointments, or no builder action required.

```css
background: rgba(15, 22, 35, 0.72);
border: 1px dashed rgba(148, 163, 184, 0.22);
border-radius: 18px;
```

Empty states should be calm. Do not use celebratory illustrations.

---

### D. Button hierarchy

#### Primary button

For the next most important builder action.

Examples:

* `Post Inspection Request`
* `Request Inspection`
* `Review Hold`
* `Confirm Attendance`

Style:

```css
background: #FF6A00;
color: #FFFFFF;
border: 1px solid rgba(255,255,255,0.08);
border-radius: 12px;
height: 44px;
padding: 0 18px;
font-weight: 700;
```

Hover:

```css
background: #FF7A1A;
box-shadow: 0 0 24px rgba(255,106,0,0.28);
```

#### Secondary button

For viewing or opening records.

Examples:

* `View Request`
* `View Appointment`
* `Open Vault Record`

Style:

```css
background: #121A28;
color: #FFFFFF;
border: 1px solid rgba(148,163,184,0.24);
border-radius: 12px;
height: 44px;
```

#### Tertiary button

For lower-emphasis actions.

Examples:

* `View details →`
* `Open evidence bundle →`

Style:

```css
background: transparent;
color: #FF8A3D;
font-weight: 700;
```

#### Do not use

* Blue filled primary buttons
* Destructive delete/trash actions for builder records
* Generic “Manage” labels where a more specific action exists

---

### E. Status badges

Badges should be semantic and visually consistent.

| Status                         | Color role     | Use                                         |
| ------------------------------ | -------------- | ------------------------------------------- |
| `Action required`              | Orange / amber | Builder must do something                   |
| `Live`                         | Green          | Request is publicly claimable by inspectors |
| `Awaiting inspector claim`     | Slate          | Waiting state, no builder action            |
| `Claimed`                      | Teal/green     | Inspector has claimed                       |
| `Scheduled`                    | Slate/green    | Appointment is set                          |
| `Confirmed`                    | Green          | Appointment confirmed                       |
| `Hold / modification required` | Amber          | Builder or crew likely needs to act         |
| `Failed`                       | Red            | Inspection failed                           |
| `Passed`                       | Green          | Inspection passed                           |
| `Certified`                    | Green          | Legal/certified state                       |
| `Vault-ready`                  | Green/slate    | Permanent record available                  |

Badge base:

```css
display: inline-flex;
align-items: center;
gap: 6px;
height: 24px;
padding: 0 10px;
border-radius: 999px;
font-size: 11px;
font-weight: 700;
```

Suggested status colors:

```css
--status-action-bg: rgba(255,106,0,0.14);
--status-action-border: rgba(255,106,0,0.38);
--status-action-text: #FFB077;

--status-success-bg: rgba(16,185,129,0.12);
--status-success-border: rgba(16,185,129,0.34);
--status-success-text: #6EE7B7;

--status-warning-bg: rgba(245,158,11,0.13);
--status-warning-border: rgba(245,158,11,0.36);
--status-warning-text: #FCD34D;

--status-danger-bg: rgba(239,68,68,0.12);
--status-danger-border: rgba(239,68,68,0.36);
--status-danger-text: #FCA5A5;

--status-neutral-bg: rgba(148,163,184,0.10);
--status-neutral-border: rgba(148,163,184,0.22);
--status-neutral-text: #CBD5E1;
```

---

### F. Stage-progress components

The dashboard needs a reusable `StageProgress` component.

It should support the existing simplified 5-stage flow without changing the underlying workflow logic.

#### Compact stage progress

Use inside live request cards and project cards.

Structure:

```text
Stage 2 — Foundation Pour

[01 ✓]──[02 active]──[03]──[04]──[05]
```

Visual rules:

* Completed stages: green
* Current stage: orange
* Future stages: slate
* Hold/modification state: amber overlay
* Failed state: red badge near current stage, not red across the whole card
* Certified state: green final segment

Do not invent new stages in the UI. Use the existing stage names from the product. The component should render `Stage N — Stage Name` from existing stage data.

#### Project card stage behavior

Each Project Portfolio card should answer:

* Current stage
* Current inspection status
* Whether an inspection request is live
* Whether the next inspection can be requested
* Whether the final certificate is Vault-ready

Possible CTAs:

| Project state                | Primary CTA               |
| ---------------------------- | ------------------------- |
| Stage ready, no live request | `Request Inspection`      |
| Request live, awaiting claim | `View Live Request`       |
| Inspector claimed            | `View Appointment`        |
| Hold/modification required   | `Review Hold`             |
| Passed, next stage available | `Request Next Inspection` |
| Certified                    | `Open Vault Record`       |

---

### G. Action-required cards

This should be the first operational module after the page header.

#### When there are action items

Show a compact stack sorted by urgency.

Card content:

* Status badge: `Action required`
* Project name
* Stage
* Reason
* Due date or age
* Primary action

Example:

```text
ACTION REQUIRED

Hold / modification required
Full Test · Stage 2 — Foundation Pour
Inspector noted a minor correction before sign-off.

Review Hold →
```

#### When there are no action items

Show a quiet confirmation once.

```text
No builder action required right now.
Live requests, appointments, and certified records are up to date.
```

Do not repeat “No builder action required right now” on every appointment card.

---

### H. Live-request cards

Current live request cards should become denser and more branded.

Recommended card structure:

```text
[LIVE] [Awaiting inspector claim]

Full Test
123 Apple Lane, Vancouver, BC

Stage 2 — Foundation Pour
[stage progress component]

Posted May 9 · 10:23 a.m.
Standard Dispatch · Awaiting qualified inspector

[View Request] [Add Detail →]
```

Rules:

* Use orange only if builder action is required.
* Use green for live/claimable state.
* Use slate for “waiting on inspector.”
* Replace generic `Manage Request` with `View Request` unless the builder truly has a pending task.
* Keep two-column layout on desktop.
* Reduce card height by removing unnecessary blank space.
* Keep cards actionable, but do not overload each card with every possible action.

---

### I. Active appointment rows

The current appointment list is useful but should be restyled as an operational schedule.

Recommended row structure:

```text
[CONFIRMED] Tue, May 12 · 09:00–14:30

Marinaside Coffee
1288 Marinaside Crescent

Inspector: Inspector
Next checkpoint: 24-hour attendance reconfirmation · May 11, 9:00 a.m.

[View Appointment]
```

Rules:

* Use one line for status + date/time.
* Use a quiet metadata line for checkpoint.
* Only show an action-required CTA if there is actually a builder action.
* Avoid repeating large “No builder action required” pills.
* Keep rows compact enough that 5–7 appointments can be scanned on desktop.

---

### J. Completed / certified / Vault-ready sections

Completed records should be treated as permanent professional records.

Recommended section title:

```text
CERTIFIED / VAULT-READY
Completed inspections and auditable records
```

Recommended row structure:

```text
[CERTIFIED] [VAULT-READY]

Bright Jenny Coffee
Stage 5 — Final Certification
Completed May 15 · Inspector: Inspector

[Open Vault Record] [View Certificate] [Download PDF]
```

Rules:

* Never show trash/delete actions.
* Do not imply certified records can be destroyed.
* Completed records may be collapsed by default if the active dashboard is busy.
* Vault-ready should feel like a trusted record state, not an archive graveyard.
* The Vault should use similar dark record rows with strong audit metadata.

---

### K. Forms and modals

Forms should match the dark backend system.

#### New inspection request form

Use a focused panel or full-page flow rather than a generic modal where possible.

Recommended structure:

1. Site details
2. Inspection stage
3. Discipline / requirements
4. Dispatch speed
5. Review and escrow confirmation

Keep existing business logic. Only restyle and reorganize the presentation.

#### Form styling

Inputs:

```css
background: #0B1220;
border: 1px solid rgba(148,163,184,0.24);
border-radius: 12px;
height: 44px;
color: #FFFFFF;
```

Labels:

```css
font-size: 12px;
font-weight: 700;
color: #CBD5E1;
```

Helper text:

```css
font-size: 12px;
color: #94A3B8;
```

Validation:

* Required/missing: amber or orange
* Error/failed submission: red
* Completed/valid: green

Modal/panel footer:

* Sticky bottom
* Primary action right-aligned on desktop
* Full-width primary action on mobile
* Secondary action as outline or text

Avoid bright white modals floating over a dark product shell.

---

### L. Spacing and density

Use an 8px spacing system.

Recommended dashboard spacing:

| Element               |   Desktop |
| --------------------- | --------: |
| Page top padding      |      32px |
| Section gap           |      32px |
| Card grid gap         |      16px |
| Card padding          |      20px |
| Compact row padding   | 16px 18px |
| Header-to-content gap |      24px |
| Badge gap             |       8px |
| Button height         |      44px |
| Small button height   |      36px |

The homepage can be spacious. The backend should be denser. A builder should be able to scan the first screen and understand operational status without scrolling through oversized cards.

---

### M. Mobile behavior

Mobile should prioritize action and scan order.

Rules:

* Single-column layout below `900px`.
* Sticky top bar with logo and compact menu.
* Primary `Post Inspection Request` action should remain easy to reach.
* Action-required cards appear first.
* Live request cards stack vertically.
* Stage progress becomes horizontally scrollable only if needed.
* Tables convert to stacked record rows.
* Appointment rows show date/time first, then project, then CTA.
* Buttons become full-width inside cards only when space is constrained.
* Avoid hiding critical status behind hover, tooltips, or desktop-only affordances.

---

## 5. Revised `DESIGN.md`

````md
# Vero Permit Backend Design System

## Purpose

Vero Permit’s backend dashboards are operational command surfaces for builders, certified inspectors, and city-facing workflows.

The public homepage establishes the brand as serious, dark, precise, infrastructure-grade, and workflow-oriented. The backend must carry that same identity into daily product use while remaining compact, calm, and highly actionable.

This design system applies to:

- Builder Command Centre
- Project Portfolio
- Live inspection requests
- Active inspection appointments
- Certified / Vault-ready records
- New inspection request flow
- Future backend dashboards for inspectors and city/auditor views

This specification must not change business logic, database structure, record retention rules, inspection stages, escrow logic, or certification logic.

---

## Product Principles

1. The dashboard answers “what needs attention now” first.
2. Builder records are auditable assets, not disposable tasks.
3. Do not use destructive delete/trash patterns for builder inspection records.
4. Completed and certified records must remain visible through Vault-ready record patterns.
5. Project Portfolio must remain actionable.
6. Builders must be able to request inspections from eligible project states.
7. The interface should be compact, calm, and operational.
8. The product should feel like infrastructure/workflow software, not a consumer social app.
9. Orange is the primary action color.
10. Blue must not be used as the main product action color.
11. Decorative effects must never reduce scannability or workflow clarity.

---

## Visual Identity

### Brand Translation

The public homepage uses:

- Dark near-black canvas
- Subtle dotted/grid texture
- White high-weight typography
- Slate secondary text
- Orange primary actions
- Green success/check states
- Framed dark cards
- Mono-style uppercase labels
- Operational language around dispatch, certification, Schedule C-B, escrow, and Vault records

The backend should use these same materials in a denser operational layout.

---

## Design Tokens

### Color

```css
:root {
  --color-canvas: #0B0E14;
  --color-canvas-elevated: #0F1623;

  --color-panel: #111827;
  --color-panel-strong: #1A202C;
  --color-panel-muted: #151C29;

  --color-border: rgba(148, 163, 184, 0.18);
  --color-border-strong: rgba(148, 163, 184, 0.28);
  --color-border-accent: rgba(255, 106, 0, 0.36);

  --color-accent: #FF6A00;
  --color-accent-hover: #FF7A1A;
  --color-accent-soft: rgba(255, 106, 0, 0.12);

  --color-success: #10B981;
  --color-success-soft: rgba(16, 185, 129, 0.12);

  --color-warning: #F59E0B;
  --color-warning-soft: rgba(245, 158, 11, 0.13);

  --color-danger: #EF4444;
  --color-danger-soft: rgba(239, 68, 68, 0.12);

  --color-ink-primary: #FFFFFF;
  --color-ink-secondary: #CBD5E1;
  --color-ink-muted: #94A3B8;
  --color-ink-faint: #64748B;

  --color-focus: #FF6A00;
}
````

### Typography

```css
:root {
  --font-sans: Inter, system-ui, sans-serif;

  --text-eyebrow-size: 11px;
  --text-eyebrow-line: 14px;
  --text-eyebrow-tracking: 0.16em;

  --text-page-title-size: 32px;
  --text-page-title-line: 38px;

  --text-section-title-size: 20px;
  --text-section-title-line: 26px;

  --text-card-title-size: 16px;
  --text-card-title-line: 22px;

  --text-body-size: 14px;
  --text-body-line: 20px;

  --text-meta-size: 12px;
  --text-meta-line: 16px;
}
```

### Radius

```css
:root {
  --radius-card: 18px;
  --radius-card-large: 22px;
  --radius-button: 12px;
  --radius-badge: 999px;
  --radius-input: 12px;
}
```

### Spacing

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
}
```

---

## App Shell

### Desktop

The backend app shell uses a dark top navigation bar and dark page canvas.

Requirements:

* Top nav height: 64px.
* Background: `--color-canvas`.
* Bottom border: `1px solid rgba(148,163,184,0.14)`.
* Logo: white Vero Permit mark.
* Active nav item uses orange-tinted pill.
* Inactive nav items use muted slate text.
* Right side contains account, notifications, and utilities.
* Main content max-width: 1280px.
* Main content horizontal padding: 32px.

### Mobile

* Collapse nav into compact menu.
* Keep logo visible.
* Keep primary action accessible.
* Use single-column content.
* Do not hide action-required items behind menus.

---

## Page Header

The Builder Command Centre header should be operational, not decorative.

Structure:

```text
BUILDER COMMAND CENTRE

Edgar's Command Centre
Live requests, active appointments, and certified records across your projects.

[Post Inspection Request]
```

Rules:

* Eyebrow label uses uppercase, letter-spaced type.
* Title is white, bold, and compact.
* Subtitle is slate.
* Primary CTA is orange.
* Do not use large empty hero space in the backend.

---

## Dashboard Information Architecture

The Builder Command Centre renders sections in this order:

1. Action Required
2. Queue Summary
3. Live Requests Awaiting Inspector Claim
4. Project Portfolio
5. Active Inspection Appointments
6. Certified / Vault-ready Records

This order must remain consistent unless role-specific dashboards require a different workflow.

---

## Action Required

The Action Required section is the first operational section.

### When action is required

Each action card includes:

* Status badge
* Project name
* Address if useful
* Stage
* Reason action is required
* Deadline or age
* Primary action button

Allowed action examples:

* `Review Hold`
* `Upload Missing Detail`
* `Confirm Attendance`
* `Fund Escrow`
* `Open Request`

### When no action is required

Show one quiet card:

```text
No builder action required right now.
Live requests, appointments, and certified records are up to date.
```

Do not repeat this message across every appointment or project row.

---

## Queue Summary

Use compact metric cards inspired by the homepage stats strip.

Suggested metrics:

* Live Requests
* Active Appointments
* Action Required
* Certified / Vault-ready

Each metric card includes:

* Value
* Label
* Optional one-line status
* Optional link to section

Metric cards must be compact and should not dominate the page.

---

## Live Request Card

Live request cards show inspection requests that are posted and awaiting claim or already in a pre-appointment state.

### Structure

```text
[LIVE] [Awaiting inspector claim]

Project Name
Address

Stage N — Stage Name
[StageProgress]

Posted date/time
Dispatch speed or routing state

[View Request] [Add Detail →]
```

### Rules

* Use green for live/claimable state.
* Use slate for waiting states.
* Use orange only when the builder must act.
* Replace generic `Manage Request` with `View Request` unless the action is specifically task-based.
* Cards should be compact.
* Desktop uses a two-column card grid.
* Mobile uses a single-column stack.

---

## Project Portfolio Card

Project Portfolio is the operational center for active projects.

### Structure

```text
Project Name
Address

Current Stage:
Stage N — Stage Name

[StageProgress]

Current state:
Awaiting inspector claim / Appointment confirmed / Hold required / Certified

Primary CTA
Secondary CTA
```

### Primary CTA logic

Use existing business state to determine the label.

| State                                     | Primary CTA             |
| ----------------------------------------- | ----------------------- |
| No active request and stage is eligible   | Request Inspection      |
| Request is live                           | View Live Request       |
| Appointment is scheduled                  | View Appointment        |
| Hold/modification required                | Review Hold             |
| Inspection passed and next stage eligible | Request Next Inspection |
| Project certified                         | Open Vault Record       |

Do not add new workflow states. Map existing states to clearer presentation.

---

## StageProgress Component

The StageProgress component visualizes the existing 5-stage project flow.

### Requirements

* Must render exactly from existing stage data.
* Must not invent or reorder stages.
* Completed stages are green.
* Current stage is orange.
* Future stages are slate.
* Failed stage uses red badge or marker.
* Hold/modification state uses amber badge or marker.
* Certified final state uses green.
* Must expose accessible text for screen readers.

### Compact form

Used inside cards.

```text
Stage 2 — Foundation Pour
01 ✓  02 active  03  04  05
```

### Expanded form

Used on project detail pages and modals.

```text
01 Site Survey & Excavation — Complete
02 Foundation Pour — Current
03 ...
04 ...
05 ...
```

---

## Active Appointment Row

Appointment rows are compact operational records.

### Structure

```text
[CONFIRMED] Tue, May 12 · 09:00–14:30

Project Name
Address

Inspector: Name
Next checkpoint: 24-hour attendance reconfirmation · May 11, 9:00 a.m.

[View Appointment]
```

### Rules

* Do not show a large “No builder action required” pill on every row.
* If there is no builder action, show that only as muted metadata if necessary.
* If action is required, promote the card into the Action Required section.
* Primary row action is usually `View Appointment`.

---

## Certified / Vault-ready Records

Certified records are permanent auditable assets.

### Section

```text
CERTIFIED / VAULT-READY
Completed inspections and auditable records
```

### Row structure

```text
[CERTIFIED] [VAULT-READY]

Project Name
Stage / certificate type
Completed date
Inspector

[Open Vault Record] [View Certificate] [Download PDF]
```

### Rules

* Never show destructive delete or trash actions.
* Do not imply certified records can be removed from the system of record.
* Completed records may be collapsed by default on the dashboard.
* Vault remains the primary destination for audit-ready records.

---

## Buttons

### Primary

Use for the highest-value next action.

Examples:

* Post Inspection Request
* Request Inspection
* Review Hold
* Confirm Attendance

Style:

* Orange background
* White text
* 44px height
* 12px radius
* Bold label
* Optional arrow icon

### Secondary

Use for viewing existing records.

Examples:

* View Request
* View Appointment
* Open Vault Record

Style:

* Dark background
* Slate border
* White text
* 44px height

### Tertiary

Use for low-emphasis links.

Examples:

* View details →
* Open evidence bundle →

Style:

* Transparent background
* Orange text
* Arrow optional

---

## Status Badges

Badges must use semantic color.

| Badge                        | Color       |
| ---------------------------- | ----------- |
| Action required              | Orange      |
| Live                         | Green       |
| Awaiting inspector claim     | Slate       |
| Claimed                      | Green/teal  |
| Scheduled                    | Slate/green |
| Confirmed                    | Green       |
| Hold / modification required | Amber       |
| Failed                       | Red         |
| Passed                       | Green       |
| Certified                    | Green       |
| Vault-ready                  | Green/slate |

Badges must be compact and readable.

---

## Forms

Forms and modals should use the dark app surface.

### Inputs

* Dark input background
* Slate border
* White text
* 44px minimum height
* 12px radius
* Visible focus ring using orange

### Validation

* Missing required info: orange/amber
* Failed/error: red
* Valid/completed: green

### New Request Flow

The request flow should preserve existing logic and include:

1. Site details
2. Inspection stage
3. Discipline / requirements
4. Dispatch speed
5. Review and escrow confirmation

The dispatch speed selection should use the same pricing-card visual language from the homepage, but in a compact app format.

---

## Density

Dashboard density should be tighter than the public homepage.

Rules:

* Section gap: 32px
* Card grid gap: 16px
* Card padding: 20px
* Row padding: 16px 18px
* Button height: 44px
* Badge height: 24px
* Avoid large empty card interiors
* Avoid oversized hero spacing

---

## Accessibility

Requirements:

* All interactive controls keyboard-accessible.
* Visible focus states.
* Status cannot rely on color alone.
* Badges must include text.
* StageProgress must include accessible labels.
* Buttons must have descriptive labels.
* Contrast must remain readable on dark backgrounds.
* Modals must trap focus and close predictably.

---

## Prohibited Patterns

Do not use:

* Destructive delete/trash for builder inspection records.
* Blue as the main product action color.
* Generic white SaaS dashboard surfaces as the dominant backend style.
* Repeated “No action required” pills on every row.
* Decorative illustrations that reduce operational density.
* Consumer/social app patterns.
* Hidden critical actions behind hover-only controls.
* Generic `Manage` labels where a specific action is known.

---

## Implementation Scope

This design-system pass is presentation-only.

Allowed:

* Update layout structure.
* Update component styling.
* Rename button labels for clarity.
* Add stage-progress visualization using existing data.
* Reorder dashboard sections.
* Add empty states.
* Add non-destructive Vault/certified record presentation.

Not allowed:

* Database schema changes.
* Business logic changes.
* Status transition changes.
* Deleting or hiding certified records.
* Removing builder ability to request inspections from eligible project states.

````

---

## 6. Developer implementation guidance

### Recommended implementation sequence

#### Step 1: Add semantic design tokens

Create a backend token layer first. Do not continue using one-off blue utility classes for primary actions.

Minimum tokens:

```css
--color-canvas: #0B0E14;
--color-panel: #111827;
--color-panel-strong: #1A202C;
--color-accent: #FF6A00;
--color-accent-hover: #FF7A1A;
--color-success: #10B981;
--color-warning: #F59E0B;
--color-danger: #EF4444;
--color-ink-primary: #FFFFFF;
--color-ink-secondary: #CBD5E1;
--color-ink-muted: #94A3B8;
--color-border: rgba(148,163,184,0.18);
````

#### Step 2: Build the shared components

Implement these as reusable components before restyling individual pages:

* `AppShell`
* `PageHeader`
* `StatusBadge`
* `PrimaryButton`
* `SecondaryButton`
* `MetricCard`
* `ActionRequiredCard`
* `StageProgress`
* `LiveRequestCard`
* `ProjectPortfolioCard`
* `AppointmentRow`
* `VaultRecordRow`
* `EmptyState`
* `RequestFormPanel`

#### Step 3: Restyle the Builder Command Centre

Recompose the current dashboard using existing data.

Recommended section order:

```text
PageHeader
ActionRequiredSection
QueueSummary
LiveRequestsSection
ProjectPortfolioSection
ActiveAppointmentsSection
CertifiedVaultSection
```

#### Step 4: Replace generic button labels

Use state-specific labels.

Examples:

| Current                                          | Replace with                               |
| ------------------------------------------------ | ------------------------------------------ |
| Manage Request                                   | View Request                               |
| Manage Request, when builder action exists       | Review Request                             |
| No builder action required right now button/pill | Quiet metadata or single empty-state card  |
| View Appointment                                 | Keep                                       |
| Post an Inspection Request                       | Keep or shorten to Post Inspection Request |

#### Step 5: Add stage-progress visualization

Use existing project stage data. Do not alter the stage model.

The component should accept:

```ts
type StageProgressProps = {
  stages: Array<{
    number: number;
    label: string;
    status: "complete" | "current" | "future" | "hold" | "failed" | "certified";
  }>;
  compact?: boolean;
};
```

#### Step 6: Preserve all existing actions and routing

The visual pass should not change:

* API endpoints
* form submission logic
* request creation logic
* inspection claiming logic
* appointment logic
* certificate generation
* Vault storage
* status transition rules

#### Step 7: Audit for old visual language

Search the Builder Command Centre for visual patterns that should be removed or replaced:

* Blue filled primary buttons
* Light dashboard background
* Large white cards
* Pale blue badges
* Generic `Manage` labels
* Repeated no-action pills
* Trash/delete affordances on inspection records

---

## 7. Acceptance criteria

### Brand alignment

* The Builder Command Centre uses the Vero dark canvas `#0B0E14`.
* The main backend cards use dark panel surfaces, not large white SaaS cards.
* Primary actions use `#FF6A00`.
* Blue is not used as the primary action color.
* The top nav visually aligns with the homepage: dark shell, white logo, muted nav, orange active state.
* Section labels use the homepage-style uppercase/letter-spaced treatment.
* Cards use bordered dark panels with restrained shadows.

### Dashboard hierarchy

* The first operational section after the page header is `Action Required`.
* If no action is required, the dashboard shows one calm no-action message.
* “No builder action required right now” is not repeated on every appointment row.
* The dashboard shows live requests, active projects, active appointments, and certified/Vault-ready records as distinct sections.
* A builder can understand the next required action from the first screen on desktop.

### Live requests

* Live request cards show project name, address, status, stage, posted time, and next action.
* Live request cards include a compact stage-progress component.
* Waiting states are visually distinct from builder-action-required states.
* Generic `Manage Request` labels are replaced with clearer labels such as `View Request` or `Review Request`.
* Desktop live request cards render in a compact two-column grid.
* Mobile live request cards render in a single-column stack.

### Project Portfolio

* Each active project card shows the current stage.
* Each active project card shows a 5-stage progress component using existing stage data.
* Eligible projects expose `Request Inspection` directly from the Project Portfolio.
* Projects with live requests expose `View Live Request`.
* Projects with scheduled appointments expose `View Appointment`.
* Projects with holds expose `Review Hold`.
* Certified projects expose `Open Vault Record`.
* No project card uses destructive delete/trash actions.

### Stage progress

* Stage progress renders from existing workflow data.
* Completed stages are green.
* Current stage is orange.
* Future stages are slate.
* Hold/modification state is amber.
* Failed state is red.
* Certified final state is green.
* Stage progress includes accessible text and does not rely on color alone.

### Active appointments

* Appointment rows show status, date/time, project, address, inspector, checkpoint, and primary action.
* Appointment rows are compact enough to scan several at once.
* Non-action states are muted metadata, not dominant CTAs.
* Appointment actions continue to use existing routes/business logic.

### Certified / Vault-ready records

* Completed and certified records remain visible in a dedicated section.
* Certified records show audit-oriented actions: `Open Vault Record`, `View Certificate`, `Download PDF`.
* There are no delete/trash actions for completed or certified records.
* Vault-ready records are visually treated as permanent professional records.

### Forms and modals

* New request forms use dark app styling.
* Inputs have dark backgrounds, slate borders, white text, and orange focus states.
* Validation states use orange/amber for missing action, red for errors, and green for valid/completed.
* Form business logic remains unchanged.
* Dispatch speed selection visually aligns with the homepage pricing cards in a compact format.

### Spacing and density

* Dashboard uses a consistent 8px spacing system.
* Card padding is approximately 20px.
* Grid gaps are approximately 16px.
* Section gaps are approximately 32px.
* Cards do not contain large unused blank areas.
* The dashboard remains calm and compact, not decorative.

### Mobile

* Layout becomes single-column below tablet width.
* Action-required content remains first.
* Primary actions remain easy to reach.
* Stage progress remains readable.
* Tables/lists convert to stacked rows.
* No critical action is hidden behind hover-only UI.

### Regression safety

* No database changes are introduced.
* No status transition logic is changed.
* No inspection request, appointment, certificate, or Vault workflow is removed.
* Existing builder actions still submit or navigate to the same business endpoints.
* Completed/certified records remain auditable and accessible.
