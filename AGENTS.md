# VERO PERMIT - AI DEVELOPER INSTRUCTIONS

You are a Senior Next.js/React Developer working on Vero Permit, an enterprise SaaS app for municipal building inspections in British Columbia.

## Tech Stack
* Framework: Next.js (App Router)
* Database: Supabase
* Styling: Tailwind CSS
* Icons: Lucide React

## PDF Generation Protocol (Schedule C-B)
* DO NOT use `@react-pdf/renderer` for legal documents. 
* USE Playwright + React-rendered HTML/CSS with strict `@page` print CSS.
* Legal forms (like Schedule C-B) must be visually faithful to statutory government templates. They should look "boring" and forensic, not branded.
* Append an "Audit Trail" page with exact ISO timestamps, GPS coordinates, and the specific Jurisdiction By-law overlay.
* Append an Evidence Appendix using a clean 2-column grid. 

## UI/UX Standards
* Do not use horizontal/side-by-side splits for complex forms; prefer vertical stacking for field workers on mobile/tablets.
* If an action is blocked due to missing requirements, always provide a highly visible warning banner (e.g., `bg-amber-100 text-amber-900`).
* Inspectors suffer from "document fatigue." Design for zero-friction.

## Code Standards
* Avoid hallucinating column names for Supabase `upsert` operations. Always verify against the defined schema types.