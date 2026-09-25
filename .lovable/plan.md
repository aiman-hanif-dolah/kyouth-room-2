# Tech Ventura — AI Startup Project Workspace

One website that doubles as the group's working space for the 8-hour plan and as the 40-minute presentation. Everything shown in presentation mode is read live from the same saved project content, so editing a field updates the presentation automatically.

Visual style follows the uploaded style reference: dark "control room" look, near-black canvas, hairline borders, light 400-weight headlines, blue as the only accent, off-white pill buttons, Inter type scale, and the provided spacing/radius/shadow values.

## Seeded fictional startup

The workspace ships populated (not empty, no filler text) with a clearly fictional Malaysian citizen-facing digital idea: **Tech Ventura — "Jalanku"**, a community road-hazard and street-lighting reporting app for Malaysian city councils. Every section uses this same company and product, and all people, market, and money figures are labelled "Fictional" or "Assumption". Costs and projections in RM.

## Navigation

Dashboard, Company, Business Plan, Product, Customers, Marketing, Prompt Library, Presentation, plus a Review checklist.

## Sections

1. **Dashboard** — five editable member names, the eight hour-blocks with objective, tasks, deliverables, suggested timebox, assignment to one or more members, status (Not started, In progress, Ready for review, Complete), reviewer notes, and overall plus per-section progress. Timeboxes are advisory only.
2. **Company** — 10 brainstormed ideas with pros/cons, chosen idea and rationale, name, tagline, mission, vision, values, brand palette, logo and mood board slots (image upload or URL) with copyable image prompts.
3. **Business Plan** — problem, solution, market analysis, competitor matrix, SWOT, revenue model, cost structure, and a 1 to 3 year RM projection table with validated numbers and live recalculated totals. Assumptions flagged inline.
4. **Product** — concept, features, benefits, differentiators, mockup gallery (upload or URL plus captions and prompts), and a working clickable Jalanku demo: report a hazard, pick a category, drop a location, track status through a council queue.
5. **Customers** — demographic segmentation (age, gender, income, Malaysian location, interests, needs, behaviours), 3 persona cards marked as composites, and a journey map with stages, actions, questions, pain points, touchpoints, opportunities.
6. **Marketing** — strategy, content pillars, posting schedule, influencer and paid ads strategy, plus editable samples: 5 Instagram posts, 3 TikTok scripts, 3 Facebook ads, 2 LinkedIn posts, shown as mockup cards with image prompts and upload slots.
7. **Prompt Library** — 30 seeded prompts across Ideation, Analysis, Marketing, Image generation, Technical. Each has title, category, purpose, full text, linked section, input variables, improvement notes, and an explicit "actually used by <member>" flag that is off until someone records it. Add, edit, delete, reorder.
8. **Presentation** — slide-style viewer compiled from the saved content in the required order (company intro, business plan, product demo, marketing, demographics, AI prompt engineering as the technical highlight), with opening, transitions, conclusion, Q&A. Per-part speaker, duration, editable speaker notes, keyboard and full-screen navigation, a rehearsal timer, a print view, a "last updated" stamp, and empty fields shown as clearly marked "Not completed yet".
9. **Review checklist** — flags missing deliverables, missing content quantities, unlabelled assumptions, and a presentation total that is not exactly 40 minutes.

Also included: a reset-to-demo-data control with confirmation, and no dead buttons (anything unavailable is visibly disabled with a reason).

## Saving your work

Content is saved in the browser on your own device, and the app states that plainly, so a refresh keeps your edits. Sharing one live workspace across five people's devices needs a database; I can add that in a follow-up if you want it.

AI drafting is not wired up in this build. All content is seeded and fully editable, and any AI action is shown as clearly unavailable rather than faked.

## Technical notes

- Single source of truth: one typed project-state store persisted to localStorage, exposed through a context provider. Presentation slides are pure selectors over that state, never copied text.
- Route files per section under `src/routes`, with a shared shell layout and per-route head metadata.
- Design tokens from the uploaded `theme_2.css` mapped into `src/styles.css` as the semantic dark theme, plus Inter loaded via a link tag in the root route.
- Images stored as data URLs (upload) or plain URLs; validated numeric inputs for financials with derived totals.
