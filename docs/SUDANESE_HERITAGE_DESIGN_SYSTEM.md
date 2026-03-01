# Sudanese Heritage — UNESCO-Inspired Design System

**Role:** Senior UX/UI Architect, Cultural Heritage Designer, Full-Stack System Planner  
**Goal:** Modern, elegant, scalable layout combining SaaS-style UI with authentic Sudanese cultural identity, inspired by Nubian architecture and UNESCO heritage sites.

---

## 1. Cultural Inspiration (Icons, Shapes, Backgrounds)

| Source | Use |
|--------|-----|
| **Nubian pyramids (Meroe)** | Hero silhouette, nav icons, card caps, dividers |
| **Jebel Barkal (sacred mountain)** | Section silhouettes, icon shapes, badge outlines |
| **Sanganeb Marine Park (coral)** | Coral-style patterns, secondary borders, reef motifs |
| **Nile + desert dunes** | Flowing dividers, sand texture, river curves in tree branches |
| **Kushite symbols / hieroglyph-inspired** | Geometric shapes, seal-style node treatment, decorative borders |
| **Traditional Sudanese textiles** | Repeating patterns, section backgrounds, subtle borders |

---

## 2. Color Palette (Sudan-Inspired)

### Primary
- **Desert gold** `#CFAE70` — CTAs, highlights, warm accents
- **Nubian sandstone** `#B87A3B` — Primary buttons, key UI, heritage gradient start
- **Nile blue** `#1E5F74` — Links, trust, water/heritage map

### Secondary
- **Coral red** `#C94C4C` — Alerts, marriage/spouse accent, Sanganeb accent
- **Palm green** `#4E7C59` — Success, nature, community growth
- **Ancient bronze** `#8C6239` — Secondary buttons, borders, depth

### Neutrals (Sand & Stone)
- Sand 50–950 for backgrounds and text hierarchy
- Stone/grey for borders and disabled states

### Usage
- **Hero / dark sections:** Sandstone → bronze gradient; desert gold for text and badges
- **Cards / dashboard:** White or sand-50 with sandstone/gold accents and Nile blue for links
- **Family tree:** Nile blue for branches; desert gold for nodes; coral for spouse links
- **Community:** Palm green and coral for avatars and tribe symbols

---

## 3. Typography

- **Titles / display:** Elegant serif (e.g. Amiri, Playfair Display) — “Ancient manuscript” feel
- **UI / body:** Clean sans-serif (Cairo for Arabic, Inter for Latin) — readability and scalability
- **Hybrid:** Arabic-first; RTL/LTR support; serif for hero and section titles, sans for nav, cards, and forms

---

## 4. Layout Structure by Area

### 4.1 Landing Page
- **Hero:** Full-width; desert + pyramid silhouette (Meroe/Jebel Barkal–inspired) as background; layered sand texture; subtle animated sand drift and Nile flow (CSS).
- **Nav:** Minimal; icons inspired by pyramid/temple shapes; desert gold / sandstone on scroll.
- **Sections:** Clear hierarchy; Nile river–style flowing divider between major sections; geometric Nubian pattern as optional background.
- **Features / How it works:** Card grid; each card with a soft column-like vertical accent (temple column); icons flat, geometric (pyramid, coral, Nile curve).

### 4.2 Dashboard
- **Shell:** Sidebar + top bar; sidebar with pyramid/column-inspired icon treatment; cards in a clean grid.
- **Cards:** Temple-column feel — vertical edge accent or soft shadow suggesting depth; desert gold / sandstone for primary actions; Nile blue for secondary links.
- **Background:** Subtle sand texture or very light Nubian geometric pattern.

### 4.3 Heritage Map (Future)
- **Map:** Interactive Sudan map; markers use custom icons (pyramid, mountain, coral) for site types.
- **Markers:** Gentle pulse animation for heritage sites; tooltip style consistent with card component.

### 4.4 Family Tree / Heritage Explorer
- **Branches:** Styled like Nile tributaries — soft curves, Nile blue stroke; optional gradient (sandstone → Nile).
- **Nodes:** Kushite seal–inspired — rounded, bordered, optional hieroglyphic-style corner marks; desert gold and Nile blue.
- **Spouse links:** Coral red dash or thin line; consistent with palette.

### 4.5 Knowledge Library (Future)
- **Scroll / manuscript feel:** Parchment-like background (sand-50 + subtle texture); serif for titles; columned text layout; icons inspired by Sudanese pottery (simple geometric shapes).

### 4.6 Community
- **Layout:** Modern social feed; cards with tribe/cultural avatars; palm green and coral for accents; optional geometric border inspired by textiles.

---

## 5. Background & Pattern Style

- **Sand texture:** Subtle grain (noise or SVG) on hero and optional dashboard background.
- **Nubian geometric:** Low-contrast repeating pattern (triangles, diamonds) for section backgrounds.
- **Pyramid silhouettes:** Hero only; simple triangular shapes suggesting Meroe; optional glow on hover for nav or CTA.

---

## 6. Icon Style

- **Style:** Flat, minimal, consistent stroke.
- **Inspiration:** Pyramids, temples, coral shapes, African geometric art.
- **Usage:** Nav, feature cards, stats, map markers, tree node decor; same stroke weight and corner radius across the product.

---

## 7. Animations

- **Sand drift:** Slow horizontal or diagonal movement on hero sand layer (CSS keyframes).
- **Nile flow:** Flowing divider or river strip (gradient animation or SVG stroke-dashoffset).
- **Pyramid glow:** Hover state on hero pyramid or nav icon (box-shadow / filter transition).
- **Heritage marker pulse:** Soft scale + opacity pulse on map markers (future).
- **Card hover:** Slight lift + sandstone/gold shadow (existing pattern, tuned to new palette).

---

## 8. Component Tokens (Implementation)

- **Buttons:** Primary = desert gold / Nubian sandstone; secondary = ancient bronze outline; danger = coral red.
- **Cards:** White or sand-50; border sandstone/bronze; shadow with warm tint; optional left/right “column” accent.
- **Inputs:** Sand border; focus ring desert gold or Nile blue.
- **Badges:** Desert gold, Nile blue, palm green, coral for semantic states.
- **Nav:** Sidebar background white or sand-50; active state sandstone/gold; icons pyramid/column style.

---

## 9. Responsive & Accessibility

- All layouts responsive (mobile-first); sidebar collapses to drawer on small screens.
- Contrast ratios meet WCAG AA for body and UI text on sand/white backgrounds.
- Touch targets ≥ 44px; focus visible for keyboard and reduced motion respected (prefer-reduced-motion).

---

## 10. File & Code Mapping

- **Design tokens:** `tailwind.config.ts` (colors, shadows, animation); `globals.css` (CSS variables, patterns, keyframes).
- **Landing:** `src/app/page.tsx` — hero, nav, sections, footer.
- **Dashboard shell:** `src/app/(dashboard)/layout.tsx`, `Sidebar.tsx`, `TopBar.tsx`.
- **Dashboard home:** `src/app/(dashboard)/dashboard/page.tsx` — stat cards, quick actions.
- **Family tree:** Existing canvas and cards; restyle strokes and nodes per above.
- **Shared:** Buttons, cards, inputs, badges in `globals.css` and components use new tokens.

This document is the single source of truth for the Sudanese UNESCO heritage redesign. Implementation applies these tokens and patterns across the platform for a consistent, modern, and culturally grounded experience.
