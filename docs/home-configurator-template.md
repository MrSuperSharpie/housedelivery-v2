# House configurator template

The configurator UI is shared. Each house supplies one `HomeConfiguratorDefinition`; Solace is the reference implementation in `src/data/solace-home-configurator.ts`.

## Add another house

1. Place only approved, unmodified assets in a house-specific folder under `public/images/homes/<slug>/configurator/`.
2. Create `src/data/<slug>-home-configurator.ts` and define the house metadata, architectural images, Design Directions, ordered inclusion categories, disclaimer and Look Book chapters.
3. Use `standard` categories for one-of-four Premium/Signature choices, `flooring` for independently controlled zones and `coordinated` for visible non-blocking project decisions.
4. Register the definition in `src/data/home-configurators.ts`. The existing `/homes/[slug]` page will render the shared experience automatically.

Keep option IDs stable so a future persistence layer can store `HomeConfiguration` without depending on presentation copy. The current submit action records `ready-for-review` in client application state only; CRM, supplier and project-review integrations are intentionally separate.
