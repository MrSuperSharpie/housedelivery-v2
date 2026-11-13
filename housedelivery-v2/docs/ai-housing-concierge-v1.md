# House Delivery AI Housing Concierge | V1 Build Brief
Date: 2026-11-13
Status: Implementation brief. Preview only. No production approval.

## Business objective
Convert House Delivery website visitors into qualified, permission-based housing inquiries and guide them to relevant home designs, delivery information, inclusions, and a real project-review conversation. This is a sales and project-development assistant, not a novelty chatbot.

## Source of truth and placement
- Repository: MrSuperSharpie/housedelivery-v2
- Actual Next.js site is in `housedelivery-v2/`, not the unrelated root-level Vero Permit app.
- Feature branch `feature/ai-housing-concierge-20261113` starts from the verified live deployment commit `b1b6fd39d74a89e9db4c87e4409f6a8cb0f8ffd8`.
- Current production is `www.housedelivery.ca`. Work only on this feature branch and a protected Vercel preview. Never promote/merge without Edgar's explicit approval.
- Inspect existing `src/app/api/inquiries`, `src/app/api/build-your-home-inquiries`, relevant components, typography, navigation, analytics and privacy before editing. Reuse the current verified lead-submission infrastructure where possible.

## MVP
1. A clear but refined site-wide launcher labelled **Ask House Delivery**, accessible on desktop and mobile, visually aligned with current design. Avoid obstructing CTAs, navigation, content and mobile sticky elements.
2. Polished conversational drawer/panel: greeting e.g. "Planning a housing project? I can help you find a starting point." Four prompt suggestions:
   - Plan a multi-home development
   - Housing for a First Nation or community
   - Explore home designs and customization
   - Understand costs, inclusions and delivery
   Also answer free-text questions naturally, with links to relevant real website pages.
3. Understand visitor context without forcing a long form. Segment municipalities, First Nations/Indigenous communities, developers/non-profits/institutions, and individuals. Qualify: visitor/project organization, municipality/province, project type, approximate number of homes (1, 20, 50, 100, 500+ as possibilities, not commitments), land/site status, timing, and key objective. Ask progressively and only relevant questions.
4. When appropriate, ask for name, email, optional telephone, and express permission to share the summary with House Delivery. Submit a validated lead through existing server-side infrastructure, tagged `ai-concierge`, and clearly confirm only after successful submission. No fake success. Preserve the existing project-review form as an alternative.
5. Genuine AI chat through a server-only model call (prefer the project's Vercel-compatible AI SDK / Gateway, after inspecting installed versions and current documentation). Never expose credentials to the client. Configure models via environment; no hard-coded deprecated models.
6. Ground answers in approved House Delivery site content and a curated knowledge module; hyperlink the original site pages. Don't invent project capacity, contracted developments, Canadian regulatory approvals, prices, guaranteed timing, discounts, financing eligibility, or supplier commitments. Pricing is project-specific and not a firm quote. Pre-reviewed designs require relevant local adaptation and approvals. Clearly state the assistant is automated and offer a human follow-up.
7. Privacy and quality: explicit opt-in before sending personally identifying lead details, accessible link to Privacy policy, no unsolicited email, rate limits, payload size caps, input validation, output handling, abuse/bot mitigation, minimal PII in logs, graceful error states, and no public publishing of visitor chat transcripts.
8. Accessibility: keyboard, focus management, labels, dismissible controls, responsive sizes, readable type, reduced-motion support, and no clipped typography.

## Scope boundaries
- V1: text assistant, contextual suggestions, project qualification, live lead submission, preview tests.
- V1.1 only after V1 works: microphone and AI voice assistant; start with push-to-talk, permission prompt, captions/transcript visibility and a clear stop button. No auto-playing voice or always-on microphone. Voice must use the same safe knowledge and lead intake.
- No unrelated edits to hero video, images, fonts, existing pages, landing pages, forms, pricing calculator, or routing. Don't carry in-progress optimization or clipping changes into this branch.
- No production deployment or domain changes without Edgar's written approval.

## Acceptance criteria
- A real visitor can open the assistant, ask a question, receive a grounded answer with a useful link, select a project type, and submit consented project details. Edgar receives the lead in the existing inquiry workflow.
- Without AI credentials the interface explains that the automated assistant is temporarily unavailable and routes to existing project-review form, never pretending the AI works.
- Test on desktop and mobile widths: homepage, two landing pages, a home detail page, project-review form. No visual regressions, no overlays blocking calls to action.
- Add targeted tests for knowledge scope/guardrails, lead qualification and submission. Run lint, typecheck, tests, build. Provide a Vercel PREVIEW URL, changed files, tested scenarios, blockers and rollback instructions.
- Produce a concise review-ready summary, and stop before merging or promoting.
