# Vero Project Master Instructions

Last updated: April 2026

## 1. Project Identity

- Project name: Vero.
- Former name: SiteLine.
- Use “Vero” in all UI text, logs, labels, comments, documentation, and user-facing descriptions.
- Do not reintroduce “SiteLine” unless explicitly working on legacy references.

## 2. Technical Stack

- Framework: Next.js App Router.
- Language: TypeScript.
- Styling: Tailwind CSS.
- Backend/database: Supabase.
- Product domain: municipal-grade permitting, inspections, holds, compliance packages, and Schedule C-B generation.

## 3. Critical Build Rules

- Never include `.ts` or `.tsx` extensions in import statements.
  - Correct: `import { x } from './file'`
  - Incorrect: `import { x } from './file.ts'`
  - Incorrect: `import Component from './Component.tsx'`

- Before changing imports, inspect the surrounding file and preserve the existing import style.

- Do not make broad formatting changes while fixing build issues.

## 4. Protected Files and Logic

- Treat `src/app/admin/builders/page.tsx` as protected.
- Do not refactor, reorganize, “clean up,” rename, or simplify this file unless the user explicitly asks.
- If a task appears to require touching this file, stop and explain why before making changes.
- The purpose is to preserve working core logic, not to improve aesthetics.

## 5. Vero Product Logic That Must Be Preserved

- Vero uses a staged inspection model.
- The inspection engine is based on a sequential 15-stage municipal framework.
- Trade visibility must remain compartmentalized: users should only see stages and requirements relevant to their role or assignment.
- Final approval must respect seal/lock logic.
- A sealed inspection must not be casually editable.
- Open holds, incomplete stages, or unresolved compliance requirements should block final completion.
- Admin-facing checklist/version logic must preserve historical integrity.

## 6. Hold Logic Principles

- Holds are not generic notes. They are operational stop conditions.
- A hold should remain connected to:
  - the project or assignment
  - the inspection stage
  - the responsible user/role
  - status
  - timestamps
  - resolution pathway where available

- Multiple holds may exist across different stages.
- Resolving one hold must not automatically resolve another.
- Final seal/completion must be blocked while any required hold remains unresolved.

## 7. Styling and UI Discipline

- Maintain Vero’s clean, premium, high-contrast layout.
- Do not compress layouts, remove spacing, or create cramped “squashed” interfaces.
- Preserve strong typography, readable spacing, and professional municipal-grade presentation.
- Do not introduce decorative styling that makes the product feel like a generic AI-generated SaaS template.
- Match the existing visual system unless explicitly asked to redesign.

## 8. Behaviour When Coding

- Make surgical changes only.
- Touch the minimum number of files required.
- Do not refactor unrelated code.
- Do not delete unrelated code.
- Do not rename files, routes, database columns, or functions unless explicitly instructed.
- Match existing naming, formatting, and project patterns.
- Remove only the unused imports, variables, or functions created by your own change.

## 9. Verification Discipline

Before claiming completion:

- Run the relevant build, lint, typecheck, or test command available in the project.
- If a command fails, report the exact failure and the likely cause.
- Do not say something is fixed unless it has been verified.
- For bug fixes, prefer:
  1. reproduce the issue
  2. identify the smallest cause
  3. make the smallest fix
  4. verify with a command or test

## 10. Communication Style

- Be direct and specific.
- State assumptions before making meaningful changes.
- If there are multiple safe approaches, briefly explain the tradeoff.
- For read-only audits, do not ask for permission; inspect and report.
- For destructive or broad changes, stop and ask before proceeding.