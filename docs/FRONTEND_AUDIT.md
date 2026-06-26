# DarkVector Frontend Engineering Audit

**Date:** 26 June 2026  
**Scope:** `frontend/src` audited against Product Bible, Design System, Information Architecture, Component Library, Motion System, UX Writing Guide, and Frontend Implementation Guide.  
**Status:** Read-only audit — no application code was modified.

---

## Executive Summary

The current frontend is a functional prototype with strong visual ambition, but it diverges significantly from DarkVector's documented product identity. The implementation reads as a **cyber-SOC dashboard** (Splunk-adjacent) rather than the **calm AI investigation workspace** (Cursor/Raycast/Linear-adjacent) defined in the Product Bible.

The most critical gaps:

1. **Wrong product shape** — A 1,127-line `Dashboard.tsx` war room replaces Mission Control; navigation has 10 items instead of 6 workspaces.
2. **Wrong AI identity** — "Gemini Forensics Copilot" replaces **Vector**; chatbot UX replaces structured analysis panels.
3. **No engineering platform** — Missing hooks, services, routing, motion presets, and tokenized theme; business logic lives inside page components.
4. **Accessibility is effectively absent** — Zero `aria-*` or `role` attributes across the codebase.
5. **Two orphaned components** — `WorldMap` and `AnomalyChart` exist but are never rendered.

The codebase is salvageable. `ThreatExplorer`, `ThreatGraph`, `Models`, `Reports`, and `KnowledgeBase` partially adopt `DesignSystem.tsx` primitives and are closer to the target aesthetic. The phased plan at the end prioritizes identity correction before polish.

---

## 1. Current Folder Structure

### Actual structure

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── App.tsx                 # Root state + tab routing
    ├── main.tsx
    ├── index.css               # Global theme + cyber utilities
    ├── types.ts                # Shared types (flat file)
    ├── mockData.ts             # All mock data (flat file)
    ├── layouts/
    │   └── AppLayout.tsx
    ├── pages/                  # 11 page components (flat)
    │   ├── Dashboard.tsx
    │   ├── ThreatFeed.tsx
    │   ├── ThreatExplorer.tsx
    │   ├── ThreatGraph.tsx
    │   ├── Investigations.tsx
    │   ├── InvestigationWorkspace.tsx
    │   ├── LiveEvents.tsx
    │   ├── KnowledgeBase.tsx
    │   ├── Models.tsx
    │   ├── Reports.tsx
    │   └── Settings.tsx
    └── components/             # Flat + single ui/ folder
        ├── Sidebar.tsx
        ├── TopNav.tsx
        ├── CommandPalette.tsx
        ├── AiAnalystPanel.tsx
        ├── NotificationPanel.tsx
        ├── WorldMap.tsx        # ⚠ Orphaned — not imported anywhere
        ├── AnomalyChart.tsx    # ⚠ Orphaned — not imported anywhere
        └── ui/
            └── DesignSystem.tsx
```

### Expected structure (per docs)

```
src/
├── app/
├── assets/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── navigation/
│   ├── investigation/
│   ├── vector/
│   ├── graph/
│   ├── reports/
│   ├── charts/
│   ├── feedback/
│   └── common/
├── layouts/
├── pages/
├── hooks/
├── services/
├── contexts/
├── lib/
├── motion/
├── theme/
├── routes/
├── types/
├── constants/
├── utils/
└── mock/
```

### Gap analysis

| Expected | Actual | Severity |
|----------|--------|----------|
| Domain-organized components | Single flat `components/` dump | High |
| `hooks/`, `services/` layers | Business logic inside pages | High |
| `motion/` presets | Inline `motion` props everywhere | Medium |
| `theme/` tokens | Hardcoded hex in CSS + Tailwind | High |
| `routes/` + React Router | State-based tab switching in `App.tsx` | High |
| `mock/` split by domain | Single `mockData.ts` | Low |
| `lib/utils` (cn helper) | Referenced in comment, not implemented | Low |

**Note:** Documentation filename typo — `docs/design_system,.md` (comma) should be normalized to `design_system.md` for tooling and agent rules.

---

## 2. Current Routing

### Implementation

Routing is **state-driven**, not URL-driven:

```tsx
// App.tsx — activeTab string switches page content
const [activeTab, setActiveTab] = useState<string>("dashboard");

// Investigation workspace overrides all tabs
if (activeWorkspaceAlert) {
  return <InvestigationWorkspace ... />;
}
switch (activeTab) { ... }
```

| Tab ID | Renders | Doc equivalent |
|--------|---------|----------------|
| `dashboard` | `Dashboard` | **Overview / Mission Control** |
| `threats` | `ThreatFeed` | *(no direct equivalent — should merge into Investigate)* |
| `explorer` | `ThreatExplorer` | *(no direct equivalent)* |
| `graph` | `ThreatGraph` | **Graph** |
| `investigations` | `Investigations` | **Investigate** |
| `knowledge` | `KnowledgeBase` | *(not in v1 IA — reserved name)* |
| `live` | `LiveEvents` | *(no direct equivalent)* |
| `models` | `Models` | **Models** |
| `reports` | `Reports` | **Reports** |
| `settings` | `Settings` | **Settings** |

### Issues

- **`react-router-dom` is installed but unused** — no deep links, no browser back/forward, no shareable investigation URLs.
- **10 navigation destinations vs 6 documented workspaces** — cognitive load exceeds IA spec.
- **Investigation Mode** is a state overlay, not a routed workspace transform — partially correct intent, but missing sidebar compression, background dim, and 450ms morph sequence.
- **Command Palette** navigates via `onNavigate(tabId)` strings — fragile, not tied to routes.
- **No lazy loading** — all 11 pages imported synchronously in `App.tsx`.

### Recommended route map (target)

```
/                     → Overview (Mission Control)
/investigate          → Investigation list
/investigate/:id      → Investigation workspace (Focus Mode)
/graph                → Threat graph
/reports              → Reports
/models               → Models
/settings               → Settings
```

---

## 3. Reusable Components

### What exists and is reusable

| Component | Location | Used by | Quality |
|-----------|----------|---------|---------|
| `Card` | `ui/DesignSystem.tsx` | ThreatExplorer, ThreatGraph, Models, Reports, KnowledgeBase | Good base; hardcoded colors inside |
| `Button` | `ui/DesignSystem.tsx` | Same pages above | 5 variants (spec says 3); uses `font-mono` |
| `Badge` | `ui/DesignSystem.tsx` | Same pages above | 9 variants; always uppercase |
| `Table` + subcomponents | `ui/DesignSystem.tsx` | ThreatExplorer, Reports | TableHead forces uppercase |
| `TabGroup` | `ui/DesignSystem.tsx` | **Imported but unused** in ThreatExplorer | Dead import |
| `SectionHeader` | `ui/DesignSystem.tsx` | **Imported but unused** in ThreatExplorer, ThreatGraph | Dead import |
| `AppLayout` | `layouts/` | App shell | Contains non-spec footer bar |
| `Sidebar` | `components/` | AppLayout | Navigation + workspace switcher |
| `TopNav` | `components/` | AppLayout | Search trigger + notifications |
| `CommandPalette` | `components/` | App global | Functional; wrong copy/naming |
| `AiAnalystPanel` | `components/` | App global | Should become `VectorPanel` |
| `NotificationPanel` | `components/` | TopNav | Reasonable popover pattern |

### What docs specify but does not exist

- **Investigation family:** `EvidenceTimeline`, `EvidenceCard`, `LogViewer`, `ActionPanel`, `AnalystNotes`, `ProcessTree`
- **Vector family:** `VectorPanel`, `VectorSummary`, `VectorReasoning`, `ConfidenceMeter`, `CitationList`, `SuggestedActions`
- **Graph family:** `GraphNode`, `GraphEdge`, `NodeInspector`, `GraphToolbar`, `MiniMap`
- **Overview family:** `OverviewCard`, `ActivityFeed`, `QuickActionCard`, `InvestigationPreview`
- **Feedback family:** `LoadingState`, `EmptyState`, `ErrorState`, `Skeleton`
- **Shared:** `RiskBadge`, `SeverityBadge`, `Timestamp`, `CopyButton`

### Adoption split

Pages fall into two camps:

- **Partially aligned:** ThreatExplorer, ThreatGraph, Models, Reports, KnowledgeBase — compose from `DesignSystem.tsx`.
- **Legacy monoliths:** Dashboard, InvestigationWorkspace, ThreatFeed, Investigations, LiveEvents, Settings — inline styles, no shared primitives.

---

## 4. Components That Should Be Split

| File | Lines | Problem | Recommended split |
|------|-------|---------|-------------------|
| `Dashboard.tsx` | 1,127 | Entire SOC war room in one file; 15+ useState hooks | `OverviewHero`, `InvestigationPreviewList`, `ActivityFeed`, `QuickActions` — or delete and replace with Mission Control |
| `InvestigationWorkspace.tsx` | 1,016 | Timeline, evidence, SHAP, notes, logs, chat, remediation all inline | `InvestigationHeader`, `EvidenceTimeline`, `EvidencePanel`, `AnalystNotes`, `LogStream`, `ActionPanel` + compose in page |
| `AiAnalystPanel.tsx` | 328 | Chat + SHAP + metrics + actions | `VectorPanel`, `VectorSummary`, `ConfidenceMeter`, `RecommendationList` |
| `DesignSystem.tsx` | 287 | Monolithic primitive file | Split into `ui/button.tsx`, `ui/card.tsx`, `ui/badge.tsx`, etc. (shadcn-style) |
| `App.tsx` | 206 | 10+ state variables, notification seed data, routing | Extract `useWorkspaceRouter`, `NotificationProvider`, route config |
| `Sidebar.tsx` | 266 | Brand, workspace switcher, nav, theme toggle, profile | `SidebarNav`, `WorkspaceSwitcher`, `SidebarProfile` |
| `AppLayout.tsx` | 120 | Layout + bottom status bar | Extract `StatusBar` or remove entirely per design system |

**Rule violated:** Frontend Implementation Guide — maximum ~200 lines per component.

---

## 5. Duplicate Components

### Severity / risk styling (4 implementations)

| Location | Function |
|----------|----------|
| `ThreatFeed.tsx` | `getSeverityBadge()` |
| `Investigations.tsx` | `getSeverityColor()` |
| `InvestigationWorkspace.tsx` | `getSeverityStyle()` |
| `WorldMap.tsx` | `getSeverityColor()` |
| `DesignSystem.tsx` | `Badge` variants (partial overlap) |

**Fix:** Single `RiskBadge` / `SeverityBadge` in `components/common/`.

### AI chat interfaces (3 implementations)

Nearly identical chat UI (messages, typing dots, markdown, send form) in:

- `Dashboard.tsx` — "GEMINI FORENSICS COPILOT"
- `InvestigationWorkspace.tsx` — "GEMINI FORENSICS COPILOT"
- `AiAnalystPanel.tsx` — "Vector AI Security Analyst"

**Fix:** One `VectorConversation` or structured `VectorPanel` with collapsible sections (Summary, Evidence, Reasoning, Confidence, Actions).

### SHAP factor sliders (2 implementations)

- `Dashboard.tsx` (weights tab)
- `InvestigationWorkspace.tsx` (interactive SHAP section)

**Fix:** `ConfidenceMeter` / `ShapFactorList` component.

### Live log streams (3 implementations)

- `Dashboard.tsx` — simulated telemetry with interval
- `LiveEvents.tsx` — terminal stream with interval
- `InvestigationWorkspace.tsx` — category-specific logs

**Fix:** `LogViewer` component with props for data source and filter.

### Quarantine / isolation flows (4 implementations)

- `Dashboard.tsx` — `handleQuarantineNode`
- `InvestigationWorkspace.tsx` — `handleTriggerIsolation`
- `Investigations.tsx` — quarantine button with `alert()`
- `AiAnalystPanel.tsx` — `onIsolateNode` callback

**Fix:** `ActionPanel` + `useContainmentAction` hook.

### Motion patterns duplicated

`layoutId` gliding pill backgrounds appear independently in Sidebar, Dashboard, InvestigationWorkspace, DesignSystem TabGroup — same spring config copy-pasted.

**Fix:** Shared motion presets in `motion/tabs.ts`, `motion/sidebar.ts`.

### Unused imports (dead code smell)

- `ThreatExplorer.tsx` — imports `TabGroup`, `SectionHeader` but never uses them
- `Dashboard.tsx` — imports `MOCK_USER_RISKS`, accepts `isRefreshing` and `onOpenAiPanel` but never uses them

---

## 6. UI Clutter

The Product Bible states: *"Every page has ONE primary focus."* The current UI violates this repeatedly.

### Global chrome overload

| Element | Location | Issue |
|---------|----------|-------|
| Bottom status bar | `AppLayout` footer | `LIVE_DAEMON`, `INGEST_RATE`, `CHROMADB_VECTORS`, keyboard hints, username — reads as hacker OS, not calm workspace |
| Environment pills | `TopNav` | PROD / STAGE / LAB — not in IA spec for top bar |
| Duplicate workspace label | Sidebar + TopNav + footer | Same info shown 3 times |
| Health indicator | TopNav | Pulsing green "HEALTHY" badge — decorative |
| `cyber-grid` background | `AppLayout` | Grid overlay on entire app — contradicts "no hacker aesthetics" |
| Sidebar badges | Sidebar | "8", "3", "LIVE" counts — excessive badge usage |
| Brand subtitle | Sidebar | "AI SEC PLATFORM" in uppercase tracking-widest |

### Page-level clutter

**Dashboard (worst offender):**
- 3-column layout: file tree + process graph + Gemini copilot
- Breadcrumb bar with "CRITICAL INCIDENT RESPONSE BOARD" pulsing red dot
- Simultaneous: explorer tree, process ancestry map, live log stream, AI chat, sandbox, SHAP sliders
- This is a **dashboard**, not Mission Control

**InvestigationWorkspace:**
- Left outline tree, center timeline + evidence + SHAP + notes + logs, right copilot + playbooks
- Everything visible at once — violates progressive disclosure

**Investigations:**
- 4-column kanban + isolation playbook dispatcher + forensic detail panel
- Three layers of case management UI on one screen

**ThreatFeed:**
- Search + category pills + severity dropdown + expandable cards with dual action buttons per row

### Card overuse

Design System rule: *"Containers don't need cards. Whitespace is enough."*

Nearly every UI block is wrapped in `bg-[#111317] border border-[#23262F] rounded-xl`. Cards are used for layout containers, not objects.

---

## 7. Typography Inconsistencies

### Font stack

| Token | Documented | Implemented |
|-------|------------|-------------|
| Sans | Geist / Inter | Inter ✓ |
| Display | — | **Space Grotesk** (not in spec) |
| Mono | JetBrains Mono | JetBrains Mono ✓ |

Space Grotesk via `font-display` gives a tech-startup feel but is not in the design system. Geist is specified but not loaded.

### Case conventions

UX Writing Guide: **Sentence case. Always.**

Violations are pervasive:

- Sidebar: "Forensic Studio", "Vector Timeline", "Socket Terminal", "Neural Tuning"
- Section headers: `WORKSPACE EXPLORER`, `REAL-TIME HOST TELEMETRY STREAM`, `GEMINI FORENSICS COPILOT`
- Buttons: `DISPATCH CONTAINER QUARANTINE`, `RETRAIN OUTLIER FOREST`, `SAVE CONFIGURATIONS`
- Badge component: `text-[9px] uppercase` baked into base style
- TableHead: `uppercase tracking-wider` by default

### Type scale

| Level | Spec (px) | Typical usage |
|-------|-------------|---------------|
| H1 | 40 | `text-xl` (~20px) on pages |
| H2 | 30 | `text-sm` / `text-xs` for section titles |
| H3 | 22 | Rarely used |
| Body | 16 | `text-xs` (12px) dominant |
| Caption | 13 | `text-[9px]`, `text-[10px]` common |

Body text frequently renders at 9–11px — below accessible minimums for primary content.

### Font role confusion

`font-mono` is applied to navigation labels, buttons, badges, section headers, and body copy — not just code/telemetry. This creates a terminal aesthetic the Product Bible explicitly rejects.

---

## 8. Color Inconsistencies

### Token drift

`index.css` defines theme tokens, but components bypass them with hardcoded hex:

```css
/* index.css — labeled "Premium Cyberpunk Theme Colors" */
--color-bg: #09090b;        /* Spec: #090B11 */
--color-surface: #111317;   /* Spec: #11141B */
--color-primary-blue: #3b82f6;  /* Spec: #4C8DFF */
--color-secondary-purple: #8b5cf6;  /* Spec: #7B61FF */
--color-critical-red: #ef4444;  /* Spec: #FF5A5F */
```

**Hardcoded hex count:** 300+ occurrences of `bg-[#`, `text-[#`, `border-[#` patterns across source files. Frontend rules say: *"Colors never hardcoded. Use theme tokens."*

### Purple overuse

Design System: *"Only use purple for AI-related elements."*

Purple appears on: sidebar active states, tab indicators, SHAP sliders, copilot headers, workspace tabs, brand gradient, theme toggle, scrollbar hover, graph accents, investigation selection — far beyond AI contexts.

### Semantic color sprawl

Design System allows: grayscale + blue accent + purple (AI only) + red (danger) + green (success).

Implemented additionally:

- Orange/yellow for high/medium severity and warnings (throughout)
- Sky/emerald Tailwind scales for badges
- Gradient fills `from-blue-500 to-purple-500` on SHAP bars

This creates a **rainbow dashboard** — explicitly forbidden.

### Glow and cyber effects

`index.css` defines:

- `.glow-card-blue`, `.glow-card-purple`, `.glow-card-red` — glowing hover shadows
- `.cyber-grid` — scanning grid background
- `@keyframes scanline` — animated scan line
- `--animate-scanline` — used in WorldMap

Product Bible: *"Never use glowing borders."*

---

## 9. Motion Inconsistencies

### Documented motion language vs implementation

| Interaction | Spec duration | Actual |
|-------------|---------------|--------|
| Page transition | 300ms crossfade | 180ms fade + 6px y-shift in `App.tsx` |
| Investigation Mode | 450ms morph | Instant swap when `activeWorkspaceAlert` set |
| Sidebar collapse | 220ms ease | Spring `damping: 28, stiffness: 260` |
| Command palette | Scale 98%→100%, 220ms | 160ms scale — close enough |
| Card entry | Fade + slide 12px + settle | 8px y-shift, 280ms in Card |
| Hover | 120ms | Mixed 150–250ms |

### Anti-patterns present (Motion System forbids these)

| Pattern | Occurrences | Examples |
|---------|-------------|----------|
| `animate-bounce` | Dashboard, InvestigationWorkspace, AiAnalystPanel | AI typing indicator dots |
| `animate-ping` | Dashboard, WorldMap, TopNav, Sidebar | Threat nodes, live indicators |
| `animate-pulse` | 15+ locations | Sparkles icons, status dots, severity badges |
| Spring with overshoot | TabGroup, Sidebar, AiAnalystPanel | `type: "spring"` on layoutId indicators |
| Spinning icons | TopNav refresh, Models, Reports | `animate-spin` on RotateCw |

### Missing infrastructure

- No `motion/` preset directory
- No `prefers-reduced-motion` support anywhere
- No motion budget enforcement — Dashboard animates cards, logs, pings, and copilot simultaneously
- Inline `motion` props in pages violate *"Never animate={{} inside pages"*

### Signature interaction gap

The defining Investigation Mode sequence (sidebar compress → content fade → timeline expand → Vector context switch → ~450ms) is **not implemented**. Entering an investigation replaces page content with a standard crossfade.

---

## 10. Accessibility Issues

**Severity: Critical.** Zero `aria-*` attributes and zero `role` attributes were found in `frontend/src`.

### Keyboard navigation

| Area | Issue |
|------|-------|
| Command Palette | Good — arrow keys, Enter, Escape ✓ |
| Sidebar | Buttons without `aria-current` for active item |
| Threat graph SVG nodes | `<g onClick>` — not keyboard reachable |
| ThreatExplorer table rows | Click handlers on `<tr>` — no tabindex |
| Expandable alert cards | `<div onClick>` — not button semantics |
| Modal overlays | Command palette lacks `role="dialog"`, `aria-modal`, focus trap |

### Focus management

- Widespread `focus:outline-none` without `focus-visible:ring-*` replacement
- `select-none` on `AppLayout` root — prevents text selection app-wide
- No focus trap in AiAnalystPanel slide-over
- No focus return on panel close

### Screen readers

- Icon-only buttons (refresh, notifications, close tabs) lack `aria-label`
- Live log streams have no `aria-live` region — dynamic content not announced
- Severity conveyed by color only (red/orange/blue badges)
- AI typing state not announced

### Visual accessibility

- Text sizes down to 8px (`text-[8px]`) — fails WCAG target size guidance
- Gray-500 on `#111317` may fail contrast for small text
- Pulsing/flashing indicators (`animate-pulse` on red dots) — vestibular trigger
- No reduced-motion alternative

### Forms

- Settings inputs lack associated `<label htmlFor>` — labels are sibling text
- Checkboxes in Settings use visual labels but no explicit id/for pairing

---

## 11. Performance Issues

### Bundle and loading

| Issue | Impact |
|-------|--------|
| All pages eagerly imported in `App.tsx` | Large initial bundle |
| No `React.lazy()` / code splitting | Slower first paint |
| `react-router-dom`, `@tanstack/react-query`, `zustand`, `recharts` installed but **unused** | Dead weight in node_modules / potential bundle bloat if tree-shaking fails |
| `react-markdown` loaded in 3 components | Duplicate markdown parsing trees |

### Runtime performance

| Issue | Location | Impact |
|-------|----------|--------|
| `setInterval` log generation | Dashboard (3s), LiveEvents (1.8s) | Continuous re-renders even when tab not visible |
| 1,127-line Dashboard | Dashboard | Large component tree, many state updates |
| WorldMap `animate-ping` on SVG | WorldMap (orphaned) | GPU layer promotion |
| `scrollIntoView({ behavior: "smooth" })` on every log | Dashboard, LiveEvents, chat panels | Layout thrashing during streaming |
| No memoization | All pages | Unnecessary child re-renders on parent state change |
| External Unsplash images | Sidebar profile | Network dependency, no local fallback |

### Data architecture

- No TanStack Query — no caching, deduplication, or background refresh
- Mock data imported directly into components — will require wide refactor for API integration
- `Reports.tsx` uses `useState(() => { setReports(...) })` — **incorrect pattern** (passing function to useState initial value calls it as initializer, not effect); seed data may not load reliably

### Graph performance

ThreatGraph uses lightweight SVG (good), but lacks virtualization, lazy mount, or "load when visible" pattern specified in the implementation guide.

---

## 12. Components That Violate the Design System

### Identity violations (Product Bible)

| Violation | Evidence |
|-----------|----------|
| Product is a dashboard | `Dashboard.tsx` — metrics, widgets, charts, war room layout |
| AI named after vendor model | "Gemini Forensics Copilot", "SEC-AGENT-2.5", model selector showing "Gemini 2.5 Security" |
| Hacker / cyberpunk aesthetic | `cyber-grid`, scanline animation, glow cards, "DarkVector OS", "Socket Terminal" |
| Buzzword navigation | "Forensic Studio", "Neural Tuning", "Forensic Audits", "Sensor Config" |
| Matrix of badges | Sidebar badges, severity pills, status chips on every row |
| Fake terminal as hero | `LiveEvents.tsx` — full terminal chrome with daemon prompt |
| Dramatic AI copy | "🚨 CRITICAL", "MASSIVE ATTACK", emoji-prefixed markdown responses |

### Layout violations (Design System)

| Rule | Violation |
|------|-----------|
| Vector panel is part of workspace, not floating | `AiAnalystPanel` is a fixed slide-over drawer |
| Top bar: search, workspace, notifications, profile only | TopNav adds env selector, refresh, health badge |
| One hero per page | Dashboard has 3 competing heroes |
| 8px spacing grid | Arbitrary values: `p-4.5`, `gap-3.5`, `py-0.2`, `px-1.5` |
| Border radius: buttons 10px, cards 18px, panels 22px | Mixed `rounded-lg` (8px), `rounded-xl` (12px) |
| Three button types only | Button has 5 variants including `success` and `danger` |
| Cards represent objects, not containers | Cards wrap filter bars, empty states, layout sections |

### Component-specific violations

| Component | Violations |
|-----------|------------|
| `Sidebar` | 10 nav items; "Tactical Dark Mode" label; gradient logo; uppercase brand |
| `TopNav` | PROD/STAGE/LAB pills; duplicate workspace chip |
| `AppLayout` | Bottom cyber status bar; `select-none` on root |
| `Dashboard` | Entire page — contradicts Mission Control vision |
| `AiAnalystPanel` | ChatGPT-style chat; model picker exposes implementation |
| `CommandPalette` | "DarkVector Search OS v1.2"; navigates to deprecated page names |
| `WorldMap` | "ACTIVE THREAT VECTORS" uppercase; ping animations; decorative map |
| `Badge` | Always uppercase — contradicts sentence-case severity labels |
| `SectionHeader` | Always uppercase title — contradicts typography spec |

---

## 13. Opportunities to Simplify the Interface

### Navigation consolidation (10 → 6)

| Remove / merge | Into |
|----------------|------|
| Dashboard | **Overview** (Mission Control — rebuilt) |
| Threat Feed + Threat Explorer + Live Events | **Investigate** (list + entry to workspace) |
| Knowledge Base | Sub-section of Investigate or Vector citations (v1 reserved) |
| Threat Graph | **Graph** (keep, simplify) |
| Investigations | **Investigate** (case list is the entry point) |

### Dashboard → Mission Control

Replace the 3-column war room with:

```
Good morning.

2 investigations require attention.

[Continue: AL-8491 Pod shell escape]

[Open investigation]  [Ask Vector]
```

No KPI cards. No world map. No live chart. One question answered: *"What needs my attention?"*

### Vector panel restructure

Replace chat-first UI with collapsible analysis sections:

1. Summary (2 sentences max)
2. Evidence (linked artifacts)
3. Reasoning (progressive)
4. Confidence (meter, not sliders)
5. Actions (isolate, block, export)
6. References (citations)

Remove: sandbox tab, SHAP estimator sliders, emoji markdown responses.

### Remove global noise

- Delete bottom status bar entirely
- Remove environment selector from TopNav (move to Settings if needed)
- Remove health pulse indicator
- Remove `cyber-grid` background
- Remove sidebar nav badges (or replace with subtle dot for unread)

### Progressive disclosure in investigation

Default view: Timeline + Vector summary only.

Expand on demand: Evidence details, raw logs, SHAP, notes, actions.

### Unify severity display

Replace inline badge logic with:

```
Risk    81    High
```

Not: `CRITICAL` uppercase pill + orange score + pulsing red dot.

### Delete or integrate orphaned components

- `WorldMap` — delete or use only if Overview needs geographic context (spec says no)
- `AnomalyChart` — delete or replace KPI charts with single numbers ("18 critical alerts")

---

## Phased Implementation Plan

### Phase 0 — Foundation (1–2 weeks)

**Goal:** Establish the engineering platform so future work composes cleanly.

1. **Normalize documentation**
   - Rename `design_system,.md` → `design_system.md`
   - Align agent rules to corrected filename

2. **Create folder scaffold**
   - Add `theme/tokens.css`, `lib/utils.ts` (cn helper), `motion/presets.ts`
   - Add empty `hooks/`, `services/`, `routes/`

3. **Replace hardcoded colors with tokens**
   - Map spec colors to CSS variables: `bg-surface`, `text-primary`, `text-muted`, `border-default`, `accent-blue`, `accent-purple`, `danger`, `success`
   - Remove `.glow-card-*`, `.cyber-grid`, scanline keyframes from `index.css`

4. **Split `DesignSystem.tsx`**
   - Extract `Button`, `Card`, `Badge`, `Table`, `TabGroup` into `components/ui/`
   - Create `SeverityBadge` with sentence-case labels
   - Reduce Button to 3 variants: primary, secondary, ghost

5. **Introduce React Router**
   - `/`, `/investigate`, `/investigate/:id`, `/graph`, `/reports`, `/models`, `/settings`
   - Lazy-load page components

6. **Extract shared hooks**
   - `useNotifications`, `useCommandPalette`, `useInvestigationTabs`

**Exit criteria:** New engineer can locate components in <60 seconds; no new hardcoded hex in changed files.

---

### Phase 1 — Identity correction (2–3 weeks)

**Goal:** Make the product feel like DarkVector, not a cyber dashboard.

1. **Rebuild navigation (6 workspaces)**
   - Sidebar labels: Overview, Investigate, Graph, Reports, Models, Settings
   - Update Command Palette commands to match
   - Remove Live Events, Threat Feed, Threat Explorer, Knowledge Base from top nav (relocate content)

2. **Replace Dashboard with Mission Control (Overview)**
   - Delete current `Dashboard.tsx` content
   - Build: greeting, attention count, investigation previews, primary CTAs
   - Wire "Continue investigation" → `/investigate/:id`

3. **Rename AI to Vector everywhere**
   - `AiAnalystPanel` → `VectorPanel`
   - Remove Gemini/model selector UI
   - Rewrite copy per UX Writing Guide (no emoji, no panic, max 20 words per sentence)

4. **Simplify global chrome**
   - Remove AppLayout footer status bar
   - Strip TopNav to: search, notifications, profile (workspace stays in sidebar)
   - Remove environment pills and health badge

5. **Typography pass**
   - Load Geist; remove Space Grotesk
   - Global find-replace: uppercase section headers → sentence case
   - Enforce type scale: page titles at 30–40px, body at 16px, minimum 12px for secondary text

**Exit criteria:** A new user understands the product in under 60 seconds; navigation matches IA doc exactly.

---

### Phase 2 — Investigation workspace (3–4 weeks)

**Goal:** Ship the signature interaction — Investigation Mode.

1. **Decompose monoliths**
   - Split `InvestigationWorkspace.tsx` into investigation component family
   - Split shared chat into `VectorPanel` sections (not chat bubbles)

2. **Implement Focus Mode motion**
   - Sidebar compress animation (220ms)
   - Background dim
   - Content morph (450ms total sequence)
   - `prefers-reduced-motion` fallback

3. **Merge investigation entry points**
   - ThreatFeed expandable cards → Investigate list items
   - Investigations kanban → simplified case list with status filter
   - Single route: `/investigate/:id`

4. **Build core investigation components**
   - `EvidenceTimeline`, `EvidenceCard`, `LogViewer`, `AnalystNotes`, `ActionPanel`

5. **Consolidate duplicate logic**
   - One `LogViewer`, one `SeverityBadge`, one containment action flow

**Exit criteria:** User reaches investigation in 2 clicks; Focus Mode feels like entering deep work, not opening a page.

---

### Phase 3 — Polish and platform (2–3 weeks)

**Goal:** Accessibility, performance, and API readiness.

1. **Accessibility audit remediation**
   - Add `aria-*`, `role`, focus traps, `aria-live` for streams
   - Replace `div onClick` with `button` or add keyboard handlers
   - Focus-visible rings on all interactives
   - Remove global `select-none`

2. **Performance**
   - Lazy routes (verify bundle split)
   - Pause log intervals when tab inactive
   - Memoize heavy lists
   - Remove unused dependencies (or integrate TanStack Query properly)

3. **API layer**
   - `services/alerts.ts`, `services/investigations.ts`
   - `hooks/useAlerts.ts`, `hooks/useInvestigation.ts`
   - Move mock data to `mock/` split files
   - Components receive data via hooks only

4. **Motion system compliance**
   - Centralize all presets in `motion/`
   - Remove bounce, ping, pulse from non-critical elements
   - Align durations to spec table

5. **Remaining pages alignment**
   - Graph: add toolbar, improve keyboard node selection
   - Reports: document-style layout, not dashboard cards
   - Models: analyst-facing transparency, simplify tuning UI
   - Settings: minimal, sentence case, no alert() for save

**Exit criteria:** Lighthouse accessibility score >90; mock swappable for API without UI changes; motion passes Motion System checklist.

---

### Phase 4 — Refinement (ongoing)

1. Integrate Knowledge Base as Vector citation depth (not standalone nav item)
2. Add skeleton loading states (not spinners) for all data views
3. Add empty states that teach next action (per UX Writing Guide)
4. Graph engine upgrade (virtualization, smooth camera) when backend supports it
5. Theme support (dark only for v1, but token architecture ready for light)

---

## Appendix A — File Size Reference

| File | Lines | Status |
|------|-------|--------|
| `Dashboard.tsx` | 1,127 | 🔴 Split / replace |
| `InvestigationWorkspace.tsx` | 1,016 | 🔴 Split |
| `ThreatGraph.tsx` | 357 | 🟡 OK, needs graph components |
| `Investigations.tsx` | 338 | 🟡 Simplify |
| `AiAnalystPanel.tsx` | 328 | 🟡 Rename + restructure |
| `ThreatFeed.tsx` | 326 | 🟡 Merge into Investigate |
| `ThreatExplorer.tsx` | 312 | 🟢 Closest to spec |
| `CommandPalette.tsx` | 294 | 🟡 Update copy/routes |
| `DesignSystem.tsx` | 287 | 🟡 Split into ui/ |
| `Sidebar.tsx` | 266 | 🟡 Simplify nav |
| `Models.tsx` | 256 | 🟢 Reasonable |
| `LiveEvents.tsx` | 248 | 🔴 Remove or demote |
| `KnowledgeBase.tsx` | 243 | 🟡 Defer to Phase 4 |
| `AnomalyChart.tsx` | 210 | ⚠ Orphaned |
| `WorldMap.tsx` | 188 | ⚠ Orphaned |

## Appendix B — Dependency Utilization

| Package | In package.json | Used in code |
|---------|-----------------|--------------|
| react | ✓ | ✓ |
| motion | ✓ | ✓ |
| lucide-react | ✓ | ✓ |
| react-markdown | ✓ | ✓ (3 files) |
| tailwind-merge | ✓ | ✗ (cn not wired) |
| class-variance-authority | ✓ | ✗ |
| react-router-dom | ✓ | ✗ |
| @tanstack/react-query | ✓ | ✗ |
| zustand | ✓ | ✗ |
| recharts | ✓ | ✗ |
| react-hook-form | ✓ | ✗ |
| zod | ✓ | ✗ |
| @google/genai | ✓ | ✗ |

---

## Summary Scorecard

| Area | Score | Notes |
|------|-------|-------|
| Folder architecture | 2/10 | Flat structure, missing layers |
| Routing | 3/10 | State-based, no URLs, 10 tabs |
| Component reuse | 4/10 | DesignSystem started but inconsistently adopted |
| Design system compliance | 2/10 | Cyberpunk identity, wrong AI naming |
| Typography | 3/10 | Uppercase, too small, wrong fonts |
| Color system | 2/10 | Hardcoded, purple overload, glow effects |
| Motion | 4/10 | Some good easing; wrong patterns dominate |
| Accessibility | 1/10 | No ARIA, focus issues, small text |
| Performance | 5/10 | Fine for prototype; not production-ready |
| Product alignment | 2/10 | Dashboard-centric, not investigation-centric |

**Overall:** The frontend is a rich prototype that proves visual craft is possible, but it requires a deliberate identity reset — not incremental polish — to become DarkVector as documented.

---

*End of audit.*
