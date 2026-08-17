# House Delivery Look Book template

The Look Book is a reusable presentation layer over the existing home configurator. It does not maintain a second set of selection values.

## Data flow

`HomeConfiguration` stores confirmed option IDs, flooring-zone option IDs, review status and optional Look Book personalization. `HomeLookBook` resolves each displayed name, image, description and Premium/Signature level from those IDs and the active `HomeConfiguratorDefinition`.

The customer name, generated date and display-only reference are added to `lookBookPersonalization` when the customer completes the short name form. They remain in the same client configuration while selections are edited.

## Define a Look Book

Each home definition supplies a `lookBook` object containing:

- `home`: verified home metadata and approved architectural images.
- `sections`: ordered, optional `selections` or `editorial` sections.
- `projectCoordinatedItems`: optional details confirmed during project review.
- `nextStageSteps`: the House Delivery review pathway.
- `preliminaryNotice`: the non-specification notice shown on the final page.

A selection section references stable `categoryId` and optional `zoneId` values. It never copies option content. Use `presentation` only to control editorial hierarchy. A simpler home can provide fewer sections without changing the shared component.

## Personalization and editing

The Look Book appears only after all required categories are confirmed. First name is required; last name is optional. `Edit selection` returns to the referenced configurator category without resetting other selections or personalization. Reconfirming returns to the updated Look Book.

## Print / Save as PDF

`Save My Look Book` calls `window.print()`. The print rules in `src/app/globals.css` isolate `#home-look-book`, hide navigation and controls, use A4 portrait pages, preserve brand colours and imagery, and prevent selection cards from splitting across pages. This is browser print-to-PDF; no server-generated PDF is implied.
