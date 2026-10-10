# SkinNear design system

Primary reference: `concept.png`, generated with the built-in Image Gen tool.

Poppins 400/500/600/700, self-hosted. Background #f4f2f8; surface #ffffff; plum #272138; lavender #e4daf6; accent #7959c7. Open page composition, flat surfaces, no borders or shadows. Focus uses visible outlines for keyboard accessibility.

Primary screen: simple wordmark/navigation, editorial headline, three-step indicator, white scan panel, arched portrait, three open feature columns. Reusable component families: pill buttons, numbered steps, flat input surfaces, report score rows, open routine rows, native seller dialog. Mobile prioritizes the scan and hides the decorative portrait.

Intentional concept deviations: privacy copy reflects actual consent/provider handling; availability copy avoids claiming local inventory; upload icon added to action; step connector strokes omitted to respect the user's border-free direction. Downstream screens extend the same typography, spacing, and flat palette for required forms, report, and shopping workflow.

Portrait asset generated using the concept as an edit reference: only the matching natural-skin portrait, without baked-in UI or text. Stored as a WebP in public/images.

Routine reference: `routine-concept.png`. The repaired routine screen follows its report/budget sidebar, flat product rows, pastel numbered swatches, purple seller actions, and separated retailer chips. The actual flow retains three steps rather than introducing four concept-only stages. Ordinals use Poppins, scores use /100, and divider strokes are omitted. Product copy and pricing state reflect the curated data rather than generated illustrative claims. Country-aware destinations replace Indian retailer chips outside India. Mobile stacks the summary and product rows with wrapping actions and no horizontal overflow.

Preference refinement: the form now uses a white card with inset input surfaces. Country and currency use a shared searchable listbox with keyboard selection, Escape, outside-click dismissal, and an explicit empty state. Custom checkbox visuals preserve native checked/disabled/focus behavior. Budget and owned-product choices use pressed buttons with selected checkmarks; asynchronous primary actions expose busy state. The budget prefix participates in flex layout rather than overlapping a fixed input inset. Feature columns are now three flat icon cards, stacked on mobile. No new UI package dependencies were required.

Worldwide defaults: a new session starts with country/currency unselected. Country selection or an IP suggestion populates local currency; budget amounts, presets, routine totals, and downloads follow that explicit currency. Country/currency controls precede the budget, and budget input stays disabled until a currency is chosen. The country mapping comes from country-to-currency, replacing the original partial India-oriented default table. Blinkit and Zepto remain scoped to India.

Multi-brand catalog: product packaging replaces numbered swatches, with a stable image area and text fallback. Short brand-described benefit chips link to the official source. Expandable alternative cards show brand, image, size, estimate, and a direct choice action. Alternatives fit the current basket budget; selecting one preserves the other steps. The layout stays flat and responsive with no borders or shadows.

Feature-card motion: IntersectionObserver triggers one staggered rise/fade when the cards enter the viewport. The transitions-dev text-reveal snippet supplies the shared motion tokens; desktop hover adds a small content lift and icon rotation. Reduced-motion users and browsers without IntersectionObserver see the cards immediately. No extra motion dependencies, borders, or shadows.
