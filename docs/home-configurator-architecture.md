# House Delivery configurator architecture

Saturna and Solace are canonical references for the shared House Delivery
residential configurator. Runtime UI remains shared; home and package content
remain data.

## Canonical customer journey

1. Kitchen Look & Feel
2. Primary Ensuite Look & Feel
3. Primary Wardrobe
4. Interior Doors & Details
5. Exterior Arrival & Openings
6. Whole-Home Flooring & Stairs
7. Window Coverings
8. My Home / Review / Save as PDF

Custom Homes use all seven design chapters by default. Laneway / Carriage and
Pre-Approved homes use the same supported chapter contract, but their approved
home data may disable chapters that are genuinely inappropriate. The registry
does not activate a configurator until its package content and imagery are
approved.

Design selection is limited to finishes and package direction. Fixed
architecture, floor plans, technical/code information and permitting remain on
the applicable product page and project-review path; configurator choices do
not imply structural freedom.

## Current registration inventory

- Custom Homes: 15 registered with active configurator data. Saturna and Solace
  are canonical; Langley, Timberline, Profile, Laurentian, Dalton,
  South Bay, Boreal, Canmore, Cascade, Maplewood, Cedarview, Summit and Aurora
  retain their existing legacy experience until approved seven-chapter content
  and assets are ready.
- Laneway / Carriage Homes: 6 registered and awaiting approved configurator
  content — Willow Nook, Lantern House, Courtyard Cottage, Heritage Mews,
  Limetree House and Moonlight House.
- Pre-Approved Homes: 7 registered and awaiting approved configurator content —
  The Micro, The Mini, BC Duplex, BC Fourplex 1, BC Fourplex 2, BC Rowhouse and
  Sixplex Courtyard.

## Design package library

`home-design-package-library.ts` resolves package references in per-home data.
A package is explicitly either shared or restricted to one home. Shared entries
may also restrict compatible product families. Resolution checks the target
home, family and canonical chapter before returning the existing runtime option
shape, so the shared UI needs no package-specific branch.

Only architecture-neutral approved material packages should enter the shared
library. Recognizable exteriors, floor plans and model-specific rooms remain
home-specific. Existing assets are not moved or consolidated by this
architecture pass.

## Project Coordinated

Project Coordinated categories and Look Book items are non-core. They remain
visible but are excluded from required chapter completion. Supplier and model
details are added only after confirmation; no placeholder appliance or
technical packages are required.

## Image master standard

Future design-board master artwork should preferably be `2880 x 2160 px` at a
4:3 ratio. Existing approved `1448 x 1086 px` Saturna and Solace boards remain
valid and must not be regenerated solely to meet the future standard. Solace's
four approved Exterior Arrival boards are `1672 x 941 px`; they remain
uncropped in the same design-board presentation.
