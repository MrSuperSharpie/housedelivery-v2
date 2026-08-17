# House Delivery Look Book template

The Look Book is a reusable presentation layer over the existing home configurator. It does not maintain a second set of selection values.

## Data flow

`HomeConfiguration` stores confirmed option IDs, flooring-zone option IDs, review status and optional Look Book personalization. `HomeLookBook` resolves each displayed name, image, description and Premium/Signature level from those IDs and the active `HomeConfiguratorDefinition`.

The customer name, generated date and display-only reference are added to `lookBookPersonalization` when the customer completes the short name form. They remain in the same client configuration while selections are edited.

## Define a Look Book

Each home definition supplies a `lookBook` object containing:

- `home`: verified home metadata and approved architectural images.
- `sections`: ordered editorial sections that reference configuration categories.
- `projectCoordinatedItems`: optional details confirmed during project review.
- `nextStageSteps`: the House Delivery review pathway.
- `preliminaryNotice`: the non-specification notice shown on the final page.

A section references stable `categoryId` and optional `zoneId` values. It never copies option content. Its `layout` selects one of the shared editorial rhythms: cinematic hero, material palette, asymmetric composition, editorial split, detail story or architectural arrival. Cover and finale are shared bookends. A simpler home can provide fewer sections without changing the shared component.

Each option may provide structured `editorial` metadata: deterministic descriptors, short story fragments and an optional material role. The Design Story is assembled only from metadata attached to the customer’s actual selections. This keeps the narrative reproducible and avoids a second, disconnected source of selection truth.

## Personalization and editing

The Look Book appears only after all required categories are confirmed. First name is required; last name is optional. `Edit selection` returns to the referenced configurator category without resetting other selections or personalization. Reconfirming returns to the updated Look Book.

## Print / Save as PDF

`Save / Print PDF` calls `window.print()`. The print rules in `src/app/globals.css` isolate `#home-look-book`, hide navigation and controls, use an intentional A4 portrait sequence, and preserve brand colours and imagery. This is browser print-to-PDF; no server-generated PDF is implied.
