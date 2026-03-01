# Family Tree Visualization — Design & Redesign

This document captures the research, design decisions, and implementation alignment for the Sudan Heritage Platform family tree. It follows the seven-step brief for a **modern, scalable, easy-to-navigate** genealogy visualization.

---

## STEP 1 — Deep Research

### Platforms analysed

| Platform      | Tree types                    | Strengths                         | Weaknesses                    |
|---------------|-------------------------------|-----------------------------------|-------------------------------|
| **Ancestry**  | Vertical pedigree, fan chart  | Clear hierarchy, good zoom        | Can feel dense on large trees |
| **MyHeritage**| Vertical, subtree focus       | “View subtree” re-roots cleanly   | Many clicks for deep trees     |
| **FamilySearch** | Pedigree, fan, descendancy | Multiple views, collaboration     | UI can feel busy              |
| **Geni**      | Graph-style, profile-centric  | Relationship discovery            | Overwhelming at scale         |
| **WikiTree**  | Profile + tree strip          | Wiki-style, sources               | Tree is secondary to profile  |
| **TribalPages** | Vertical, tribal grouping   | Tribe/clan emphasis               | Dated layout                  |

### Tree structure types (summary)

1. **Traditional vertical** — Root at top, generations down. Familiar; can get very wide with many siblings.
2. **Horizontal pedigree** — Root left, generations right. Good for “ancestor trail”; less so for descendants.
3. **Radial / fan** — Generations as arcs. Compact for ancestry; harder to show full descendants.
4. **Graph network** — Nodes and edges, force-directed or hierarchical. Flexible; needs careful UX to avoid clutter.
5. **Fan charts** — Half/full circle by generation. Strong for “ancestry view”; not for full tree.
6. **Timeline** — Time on one axis, people on the other. Good for “who was alive when”; weak for structure.

### Navigation techniques

- **Zoom & pan** — Essential; infinite canvas with scale limits.
- **Node expand/collapse** — Show/hide descendants; keep depth limit to avoid overload.
- **Dynamic loading** — Load branches on expand or on viewport; critical for 1000+ nodes.
- **Focus / re-root** — “View subtree” (e.g. MyHeritage): choose a person and re-root the tree on them.
- **Generation jump** — Buttons or strip to scroll/pan to a given generation.
- **Lineage highlight** — Highlight path root ↔ selected person (future enhancement).

### Visualization tech

- **Hierarchical layout** — d3.tree or similar; one root, clear parent–child.
- **Node clustering** — Collapse “distant” branches into a single node with count.
- **Lazy loading** — API returns children on expand or by generation range.
- **Infinite canvas** — SVG or Canvas with transform; zoom/pan without page scroll.

---

## STEP 2 — Deep Thinking: Problems & Solutions

| Problem                         | Solution in this design |
|---------------------------------|-------------------------|
| Trees become too wide           | Depth limit (e.g. 8 by default); expand/collapse; “view subtree” to re-focus. |
| Hard to navigate large families | Even horizontal spacing per generation; generation strip; fit-to-view. |
| Performance                     | Single layout pass; redraw only when data/collapse/semantic zoom changes; no per-frame state. |
| Tribal structures                | Tribe on every person node; future: filter or highlight by tribe. |
| Mobile                          | Touch zoom/pan; semantic zoom (dot/compact/expanded); large tap targets. |

---

## STEP 3 — Redesign: Layout Concepts

### Concept A — Expandable vertical pedigree (primary)

- **Layout:** Root at top; generations downward; siblings in a row with **even horizontal spacing**.
- **Why primary:** Matches “ancestor above, children below”; works for large trees with depth limit and expand/collapse; stable and predictable.
- **Implementation:** d3.tree + post-process to equalise horizontal spacing per depth (avoid Reingold–Tilford uneven gaps).

### Concept B — Radial ancestry (future)

- **Layout:** Root at centre; generations as concentric rings; one sector per line.
- **Use case:** “Ancestry only” or “heritage fan” view.
- **Implementation:** d3.tree with radial transform or custom radial layout.

### Concept C — Graph network (future)

- **Layout:** Force-directed or hierarchical graph; nodes as dots/cards; edges for parent–child and marriage.
- **Use case:** Exploration and “who is connected to whom.”
- **Implementation:** d3.force or Sigma.js; lazy load and cluster for scale.

### Concept D — Timeline (future)

- **Layout:** Time (e.g. birth year) on horizontal axis; individuals as markers or short strips.
- **Use case:** “Who was alive when” and overlap of lives.
- **Implementation:** Custom time scale + bands.

### Concept E — Family cluster grouping (future)

- **Layout:** Group by nuclear family (couple + children); clusters connected by parent–child to parent clusters.
- **Use case:** Emphasise family units; good for tribal/cultural grouping.
- **Implementation:** Two-level layout: family clusters, then tree over clusters.

**Recommendation for large heritage trees:** **Concept A (expandable vertical pedigree)** as the main view, with **focus mode (subtree re-root)** and **generation jump**. Other concepts can be added as alternate views later.

---

## STEP 4 — Smart Navigation (implemented / planned)

| Feature              | Status   | Notes |
|----------------------|----------|--------|
| Infinite zoom & pan  | Done     | d3.zoom; scale extent e.g. 0.05–4. |
| Expand/collapse      | Done     | Per-node toggle; “expand all” / “collapse all”; depth limit. |
| Focus (re-root)      | Done     | Double-click → “view subtree”; breadcrumb “back to full tree”. |
| Generation jump      | Done     | Strip with generation buttons; pan to that generation’s y. |
| Fit to view          | Done     | On first load and on “fit” button. |
| Lineage highlight    | Planned  | Highlight path from root to selected node. |
| Search & jump        | Planned  | Find person by name; center and optionally select. |

---

## STEP 5 — Visual Design

### Person node (must include)

- **Name** — Primary; Arabic/Latin per language.
- **Photo** — Avatar when available; else initial.
- **Birth / death** — Year (and † if deceased).
- **Tribe or clan** — Always shown when present (critical for heritage).
- **Key icons** — Deceased (†), spouse (♥), “has children” (▼/▲).

### Family node (current scope)

- No separate “family” shape; **parent–child** and **marriage** are expressed by:
  - Connectors: parent → children (vertical + horizontal spine).
  - Spouse: shown on person card as “♥ Name” (and “+N” for multiple).

### Connectors

- **Parent–child:** Vertical line from parent bottom → horizontal spine → vertical drops to each child top. Single stroke colour; rounded caps.
- **Marriage:** No extra edge; marriage implied by spouse on card and (future) optional marriage node or ribbon.
- **Multiple spouses:** Each spouse on card; future: small side-edges to spouse cards if we add lateral layout.

### Tribal grouping

- Tribe text on every person node.
- Future: filter by tribe; optional subtle background or border by tribe.

### RTL and Arabic

- Primary UI is Arabic-first: labels, tooltips, and generation strip use Arabic.
- Container and legend use `dir="rtl"` where appropriate; names use `tatweelName` for correct Arabic display.
- Zoom/fit/generation controls are layout-stable in RTL (positioned so they remain usable).

### Accessibility

- SVG has `aria-label` (e.g. "شجرة العائلة"); connectors are `aria-hidden`.
- Zoom, fit, and generation buttons have `title` and `aria-label` for screen readers.
- Future: keyboard navigation (focusable nodes, Enter to expand/collapse, arrow keys to move).

---

## STEP 6 — Performance

| Requirement           | Approach |
|-----------------------|----------|
| Thousands of individuals | Depth limit (e.g. 8); collapse by default below that; “expand all” up to cap (e.g. 30). |
| Lazy loading          | API can return tree by depth or “children of node X”; front-end only renders visible + expanded. |
| Smooth zoom/pan       | Zoom updates transform only; redraw only when semantic mode (dot/compact/expanded) changes. |
| Fast render           | Single layout pass; even-spacing post-pass; one draw per data/collapse/mode change; no mutation of layout after use. |

---

## STEP 7 — Output Summary

### Multiple layout concepts

1. **Expandable vertical pedigree** — Primary; implemented.
2. **Radial ancestry** — Documented; future.
3. **Graph network** — Documented; future.
4. **Timeline** — Documented; future.
5. **Family cluster grouping** — Documented; future.

### UX navigation (current)

- Zoom in/out, pan, fit.
- Expand/collapse node; “expand all” / “collapse all”; “more generations”.
- Double-click → view subtree; breadcrumb → back to full tree.
- Generation strip → jump to generation.

### Visualization recommendations

- **One primary layout:** vertical pedigree with even horizontal spacing per generation.
- **Semantic zoom:** dot (far) → compact card → expanded card (near).
- **Stable layout:** no ad-hoc mutation of node positions; one layout algorithm, then connectors and nodes from the same coordinates.
- **Clear hierarchy:** parent above, children below; one horizontal spine per parent–children set.

### Best layout for large heritage trees

**Expandable vertical pedigree** with:

- Even spacing per generation (no messy variable gaps).
- Depth limit and expand/collapse.
- Subtree re-root (focus mode).
- Generation jump and fit-to-view.
- Person node: name, photo, birth/death, tribe, spouse hint, expand/collapse cue.

This document is the single source of truth for the family tree visualization.

**Implementation:** `src/components/family-tree/FamilyTreeCanvas.tsx` — expandable vertical pedigree, even horizontal spacing per generation, semantic zoom (dot/compact/expanded), parent–child connectors only, no layout mutation after d3.tree. Any new view (radial, graph, timeline) should be added as an alternative view without breaking this primary layout.
