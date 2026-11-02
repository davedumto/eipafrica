# Prompts: port the EIP Africa landing page to Next.js + Tailwind

How to use: give the agent this whole bundle (`index.html`, `models/`, `CREDITS.md`), then paste the prompts below one at a time, in order. Start every phase with a fresh look at `index.html`; it is the source of truth. If a prompt and `index.html` disagree, `index.html` wins.

The goal is **pixel-identical output** at every scroll position, on desktop and mobile. This is a port, not a redesign. Do not "improve", re-theme, rename copy, change spacing, or swap fonts.

---

## Prompt 0: Master brief (paste first, keep in context for every phase)

```
You are porting a finished, single-file landing page (index.html) to a Next.js project. The output must look and behave exactly the same as index.html.

STACK
- Next.js (latest stable, App Router, TypeScript), React, Tailwind CSS (v4 if available, else v3), pnpm.
- three@0.160.0 (exact version, not ^). Use plain three.js imperatively inside one client component. Do NOT use react-three-fiber or drei: the scene, camera rig, shader patch and render loop must be ported line for line so the result stays identical.
- Fonts via next/font/google: Instrument Serif (400), Hanken Grotesk (400, 500, 600), JetBrains Mono (400, 500). Expose them as CSS variables and map them to Tailwind fontFamily: serif, sans, mono.
- No UI kit, no animation library, no extra dependencies beyond the above.

RULES
1. Visual fidelity beats code elegance. Where Tailwind utilities cannot express something cleanly (clamp() sizes, mixed gradients, backdrop filters, safe-area insets, the sticky pinned journey, scroll-linked camera), use Tailwind arbitrary values or a small CSS file with @layer components. Do not approximate.
2. Copy every string of text exactly. Copy every colour, size, radius, spacing and breakpoint exactly (they are all in the <style> block of index.html; translate each rule, do not guess).
3. Keep the same section order, ids (#hero, #journey, #how, #opportunities, #trust, #start) and anchor behaviour.
4. Keep the single fixed full-screen <canvas id="stage"> behind the page, the pins layer, the scrim and the loading indicator exactly as in index.html.
5. Accessibility and reduced-motion behaviour must match index.html (prefers-reduced-motion, aria attributes, focus-visible outline, 44px touch targets).
6. The 3D engine runs only on the client. Load it with next/dynamic (ssr: false) or a useEffect in a client component. The server-rendered HTML must still contain all text content.
7. Models are in /models/*.glb (meshopt) and /models/plain/*.glb (fallback). Move them to public/models/ unchanged. Keep the loader behaviour: try the compressed set, fall back to /models/plain/ if it fails. Use MeshoptDecoder from three/examples/jsm/libs/meshopt_decoder.module.js.
8. After each phase, run the app and compare against index.html (see the verification prompt). Fix every difference before moving on.
9. Do not remove or reword anything. The footer intentionally has no credits block; credits go on a separate /credits page (phase 6).

DESIGN FACTS TO PRESERVE (details are in index.html)
- Colours: ink #0a0b0e, panel #101217, text #e9e8e4, muted #a6a8af, body #b4b6bd, amber #f0b34a, bone #efede8 (second bone #e8e5de on the Opportunities section), on-bone #101114, amber-on-bone #7a4f00, card surface #f8f6f2, lines rgba(255,255,255,.12) and rgba(255,255,255,.28).
- Type: headings use Instrument Serif at regular weight (no italic, no coloured words, no bold). Body and UI use Hanken Grotesk. Mono (JetBrains Mono) only for small uppercase eyebrows, pin labels, stat captions, step numbers and notes.
- Shapes: pills (border-radius 999px) for buttons, chips, inputs, filters, type badges; 26-30px radius cards; sheets with 36px top radius (26px on mobile) that overlap the previous section by the same amount. Only light-after-dark and dark-after-light joins get the overlapping sheet; two light sections in a row join flat.
- The primary button is an amber pill with a small dark circle containing an arrow on its right.
```

---

## Prompt 1: Scaffold, tokens, fonts, global CSS

```
Using the master brief:

1. Create the Next.js project (App Router, TypeScript, Tailwind, pnpm). Pin three@0.160.0 and @types/three@0.160.x.
2. Configure fonts with next/font/google and expose CSS variables --font-serif, --font-sans, --font-mono. In Tailwind, extend fontFamily: serif, sans, mono to those variables.
3. Put the colour palette from index.html's :root into Tailwind theme colours (ink, panel, text, muted, body, amber, bone, bone2, onbone, onbonemuted, onbonefaint, amberonbone, card) and keep the raw CSS variables too, because some rules use them directly.
4. Port the global rules from index.html: box-sizing, body background/colour/font/size/line-height, antialiasing, link reset, button/input/select font inheritance, :focus-visible outline (2px amber, offset 3px), the .in container (max-width 1344px, side padding clamp(16px,4.2vw,48px) plus safe-area insets), h1/h2/h3 (serif, weight 400, text-wrap balance), p (text-wrap pretty), the .eyebrow and .mono helpers, and the prefers-reduced-motion block.
5. Add a viewport export with viewport-fit=cover and set the document title to "EIP Africa".
6. Move models into public/models and public/models/plain.

Deliver: a running empty shell with the correct background, fonts loaded, and a /credits route stub. Show me the fonts rendering (a test paragraph in each font) before continuing, then remove the test.
```

---

## Prompt 2: Static sections as React components

```
Port every static section of index.html to server components, using Tailwind utilities (arbitrary values where needed). One component per section in src/components/: Header (with mobile menu), Hero, Journey (markup only, the chapter content is filled by the client), HowItWorks, Opportunities, Trust, Audience, Cta, Footer.

Requirements:
- Header: fixed, transparent at top and solid (rgba(10,11,14,.9) + 10px blur + bottom line) after 40px of scroll. There is NO announcement bar. Logo is the amber square-with-diagonal SVG plus "EIP Africa" in the serif at 23px. Links: Sectors, Opportunities, How it works, Trust. Right side: "Log in" text link and a ghost pill "Post an opportunity". On <=900px the links and these two items hide and a menu button (44x44) toggles a dropdown with all five links.
- Hero: eyebrow pill ("ENERGY AND INFRASTRUCTURE · AFRICA"), serif H1 (clamp 44px, 5.5vw, 80px; line-height .98; letter-spacing -.025em; max-width 10.6em), lede, search form (3 fields + amber pill button), the "Or post an opportunity..." line, the scroll cue bottom-left. Mobile: the stage-gap spacer (250px) between the lede and the form, and only the Sector field shows.
- Journey: sticky 100svh panel on a 520vh section with the eyebrow, h2 ("Start from the infrastructure, then find the deal."), the four-item chapter list (Power, Water, Grid, Renewables) and an empty chapter body that the client fills. On mobile the h2 hides and the panel gets a bottom-anchored gradient.
- HowItWorks: four cards with small mono step numbers over a thin rule, serif titles, body text.
- Opportunities: header with serif h2 and a dark pill button, filter rows (Type, Sector, Size select, Search input, Reset), and a rounded table card. The table is rendered by a client component from the LISTINGS sample data (copy the array verbatim) with the same filter logic, count line and empty state. Type badges are tinted pills: Investment #f3e3bd/#5a3b00, EPC #d9e4ee/#1c3550, Tender #efd8d2/#6a2a1c, Asset sale #d6e8d9/#1f4a2a, Mandate #e2dcef/#3b2c63. Mobile turns rows into stacked cards using the same grid areas.
- Trust: dark sheet with the faint amber radial glow, lead column, and a 2x2 card grid (1 column on mobile) with amber mono tag pills.
- Audience: six soft cards with POSTS / FINDS definition lists.
- Cta: transparent section (the 3D stage shows through) with the serif h2, paragraph, amber pill button and text link. Add the no-WebGL fallback background.
- Footer: logo, one-line description, three link columns (Platform, Company, Legal), and nothing else. No credits text, no copyright line. Add a plain link to /credits in the Legal column only if I ask for it later; for now do not add one.
- Section sheets: .sec.light and .sec.dark overlap the previous section by 36px (26px mobile) with a 36px/26px top radius; the second light section (#opportunities) is flat with no radius, no overlap and no shadow.

Every section must match index.html at 1440x900 and 390x844 with the 3D disabled. Show me side-by-side screenshots (index.html vs the Next.js page) for each section and list any differences you fixed.
```

---

## Prompt 3: The 3D engine (port verbatim)

```
Port the <script type="module"> from index.html into a single client component src/components/Stage.tsx (plus helper modules if you want to split it) WITHOUT changing the logic or numbers. This is the most sensitive part. Port these pieces line for line:

- Renderer: WebGLRenderer(antialias), pixel ratio cap as in the source, ACESFilmicToneMapping with exposure 1.22, sRGB output, FogExp2 (density .0062, colour as in source), hemisphere + directional lights as in source. The canvas has CSS filter saturate(.74) contrast(1.05) and fades in when ready.
- Camera: PerspectiveCamera, fov 32 on desktop and 44 on mobile (<=900px), updated on resize. camera.setViewOffset shifts the subject away from the text column: desktop x offset = -width*0.2; mobile y offset lerps from -h*0.17 to +h*0.17 as the hero scrolls into the journey.
- Layout object L (world positions) and sizes: plant (0,0,0) size 36; dam (-64,0,-12) size 64 with the +8 z shift (DZ) applied to the model and ring, camera key computed from the unshifted box; pylon line of 3 clones at x=-126, z=[-32,-9,14], height 23, rotY pi/2, with 4 sagging wires per gap; two wind turbines at (-226,0,-40) and (-210,0,-58), heights 24 and 20, rotY -1.15 and -1.25. Clone pylons and turbine BEFORE any place()/scale call.
- softEdge(): the onBeforeCompile shader patch that discards beyond the radius and fades scans to the ground colour (#0b0c10 / vec3(0.043,0.047,0.062)) along a circle, with the exact start/brightness/shrink values used for the plant and the dam. Keep customProgramCacheKey.
- Rings: thin amber ring meshes (RingGeometry, opacity .38) under the plant, dam (scaled .78 on z) and turbines.
- Camera rig: keyframes hero/power/water/grid/ren from model bounding boxes (setKey / keyVals), per-key azimuth, elevation, pad and mobile overrides (water: mpad .95, mz 10; ren: mpad 1.45, my -3), damped interpolation (k = 1 - exp(-dt*3.4)), pointer parallax, idle orbit in the hero.
- Scroll logic: hero progress, journey progress j, chapter index from j*4, mixing to the next key from frac .6 to 1. The dam and its ring are visible only for chapter 1, chapter 2 and the last 45% of chapter 0. The frame loop skips rendering and hides pins when the journey has scrolled past (bottom < -20).
- Pins: DOM labels projected to screen each frame, flip/clamp using measured width, hidden in the hero on mobile, limited to the upper 45% of the viewport on mobile.
- Chapter panel: builds the chapter content (paragraph, chips linking to filtered Opportunities, 3-stat block, "SAMPLE DATA", "View ... opportunities" link) from the CHAPTERS array, and updates the active chapter list item and chapter body on scroll.
- Loader: fetch /models/<name>.glb with streaming progress, parse with GLTFLoader + MeshoptDecoder; on failure retry from /models/plain/. Thermal plant first, then dam, pylon, turbine in parallel. Progress text "LOADING 3D SCENE n%" and the thin amber progress bar.
- No-WebGL and reduced-motion fallbacks identical to the source (the .no3d class on the root).
- Dispose everything on unmount (geometries, materials, textures, renderer, listeners, rAF).

Wire the hero form submit, chapter chips and CTA buttons so they set the Opportunities filter state and smooth-scroll to #opportunities exactly like the source. Share the filter state with the Opportunities client component through a small store (React context or zustand) instead of module globals.

Show me the hero, the four chapters, and the CTA at 1440x900 and 390x844 next to index.html. Fix every difference (camera framing, ring placement, fade radius, pin positions, text overlap).
```

---

## Prompt 4: Visual regression and parity check

```
Build an automated parity check with Playwright (chromium, --use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist so WebGL works headless).

1. Serve the original index.html (from a static server) and the Next.js build side by side.
2. For viewports 1440x900, 1280x720, 1920x1080 and 390x844, scroll to these stops and wait 2.5s at each before the screenshot: hero (0), journey start, each of the four chapters (use the journey's offsetTop and height: chapter k centre = top + (k+0.5)/4 * (height - viewportHeight)), How it works, Opportunities (top and with the Renewables filter), Trust, Audience, CTA, footer.
3. For the test only, make camera damping instant (k = 1) in both builds so frames are deterministic. Gate this behind a ?snap=1 query flag in the Next.js build.
4. Diff each pair (pixelmatch or odiff). Report the mismatch percentage per stop. Anything above 1.5% (excluding the canvas) must be investigated and fixed. For the canvas region allow up to 4%.
5. Also assert: no console errors, no hydration warnings, no layout shift after load, no horizontal scrollbar at 390px, header turns solid after 40px, mobile menu opens, filter chips and the hero form filter the table, clicking a chapter chip scrolls to Opportunities with that sector selected.

Output the report as a markdown table and fix the failures. Do not lower thresholds to pass.
```

---

## Prompt 5: Performance and production hardening (without changing the look)

```
Without changing any visual output:
- Lazy-load Stage after first paint (requestIdleCallback or dynamic import) so the text content and header render instantly; the canvas fades in when ready, as now.
- Add long-cache headers for /models/* (immutable) and enable gzip/brotli. The .glb files are already meshopt-compressed.
- Preload the thermal plant model (first one needed) with a <link rel="preload" as="fetch" crossorigin>.
- Make sure three is code-split into the Stage chunk and not in the main bundle.
- Pause the render loop when the tab is hidden and when the journey/hero are fully out of view (the source already skips work after the journey; keep it).
- Run Lighthouse on mobile; report LCP/CLS/TBT. LCP must be the hero heading, not the canvas.
- Ensure there is a sensible fallback (static dark background + all text) when WebGL or WebAssembly is unavailable.
```

---

## Prompt 6: Credits page (licence compliance)

```
The footer intentionally shows no model credits, but the licences require attribution. Create /credits (and a "Credits" link in the footer's Legal column ONLY after I confirm) that renders the content of CREDITS.md in the same design language: dark sheet, serif h1 "Credits", mono eyebrow, a rounded card table with Model, Author, Licence columns, and links to each Sketchfab page and licence. Include the CC BY-SA 4.0 share-alike note for the wind turbine and the line saying all models were reduced for the web. Keep it statically generated. Do not add it to the main navigation.
```

---

## Final acceptance checklist (give this to the agent at the end)

- [ ] Same text, same order, same ids as `index.html`; no announcement bar; no footer credits.
- [ ] Headlines: Instrument Serif regular, one colour, no italics or highlighted words.
- [ ] Buttons, chips, inputs, search bar are pills; cards are 26-30px radius; sheets 36px (26px mobile).
- [ ] Hero: thermal plant on its soft-edged round island with ring; dam is NOT visible behind the hero text.
- [ ] Chapters scroll as a continuous leftward move: plant, dam, pylons, wind turbines (far left). No sweep back to the right.
- [ ] Water chapter: dam fully visible inside its elliptical ring, on desktop and on a 390px phone.
- [ ] Renewables chapter: two wind turbines on a ringed ground, nothing else (no solar panels, no clouds, no tower).
- [ ] Opportunities filters and the hero form work; sample data is labelled as sample.
- [ ] Parity report from Prompt 4 attached, all stops within threshold.
- [ ] `/credits` page exists and is accurate (CC BY 4.0 x3, CC BY-SA 4.0 turbine).
