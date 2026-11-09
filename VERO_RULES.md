# Vero Project Governance

## Project Identity
- **Name:** Vero (formerly SiteLine). Ensure all UI and logs use "Vero".
- **Mission:** High-fidelity construction site inspection marketplace.

## Technical Standards
- **Imports:** NEVER include `.ts` or `.tsx` extensions in import statements (e.g., use './file' not './file.ts').
- **Styling:** Maintain high-contrast, clean layouts. Avoid "squashed" or "impeccable" style logic. 
- **Database:** Uses Supabase. Always verify schema before making logic changes.

## Verification Rules
- Before finishing a task, run `npm run build` to ensure no regression.