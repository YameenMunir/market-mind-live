# Market Mind Live — Design System

Source of truth for visual foundations. Token values live in `src/styles/globals.css`
(`:root` = dark theme, `.light` = light theme) and are exposed to Tailwind via
`tailwind.config.ts`. This file explains *why* the values are what they are; the CSS
is the implementation.

## Direction

The identity is a **precision instrument panel**, not a generic SaaS dashboard: the
product's own premise is transparent, rule-based signal (not a black-box ML hype
product), so the visual language favors calibrated data readouts, tabular alignment,
and a disciplined accent color over decorative gradients or glassmorphism. Near-black
canvas + warm amber accent + teal/rose bull/bear, set in Sora (display/UI) and
JetBrains Mono (numeric data).

## Color

Every semantic color is a CSS custom property (`--color-*`), consumed via Tailwind's
`rgb(var(--color-x) / <alpha-value>)` pattern so opacity modifiers (`bg-brand/10`,
`text-warn/80`) keep working. **Every color below is verified to hit >=4.5:1 contrast
as text against both `canvas` and `surface`, in its own theme** — recomputed with a
standard WCAG relative-luminance formula, not eyeballed:

| Token | Role | Dark (text on canvas) | Light (text on canvas) |
|---|---|---|---|
| `ink` | primary text | 17.17:1 | 16.40:1 |
| `ink-muted` | secondary text | 7.97:1 | 5.82:1 |
| `ink-faint` | tertiary text/captions | 4.84:1 | 4.52:1 |
| `brand` | primary action, live state, focus | 9.83:1 | 4.73:1 |
| `warn` | warning state | 9.37:1 | 4.76:1 |
| `bull` | positive movement | 10.70:1 | 4.57:1 |
| `bear` | negative movement, destructive | 5.42:1 | 4.57:1 |

`brand` and `warn` are additionally separated by hue (~18-22deg apart, not just a
different luminance) — they were previously ~11-17deg apart and read as nearly the
same color at a glance, which mattered because Badge/StatusBanner use both as
independent semantic signals. Hue is the right lens for "are these two colors
distinguishable" — contrast ratio measures luminance difference only, and two
hues can have very different appearance at the same luminance.

`border` remains a low-contrast structural token (not text) - used for card/input
boundaries at roughly 1.2-1.3:1 against canvas, which is intentional (a divider
line, not a component users need to read).

Never rely on these colors alone to communicate meaning - every use in the app pairs
color with an icon and/or text label (e.g. a bear-colored value always sits next to a
down-arrow icon or "-" sign, never color alone).

## Typography

- **Sora** (`--font-sora`) — UI text and headings. Geometric, slightly technical,
  reads as precision instrumentation rather than a generic humanist sans.
- **JetBrains Mono** (`--font-jetbrains-mono`) — numeric/data values via the `.numeric`
  utility class (`font-variant-numeric: tabular-nums`) so prices, percentages, and
  table columns align on their decimal points instead of jittering as digits change.

## Spacing & layout

Tailwind's default 4px-based spacing scale is the spacing system - not overridden,
since it already satisfies an 8px/4px rhythm. Container/breakpoint behavior uses
Tailwind's default breakpoints (`sm`/`md`/`lg`/`xl`/`2xl`); the app shell switches
sidebar navigation to a mobile top bar below `lg`.

## Radius

- `rounded-lg` (8px) — buttons, inputs, small interactive controls.
- `rounded-xl` (12px) / `rounded-2xl` (16px) — cards, panels, dialogs.
- `rounded-full` — pills, avatars, the FAB.

## Elevation (shadow)

Two tiers, deliberately not more:

- `shadow-panel` — persistent page sections: cards, drawers, the fullscreen chart.
- `shadow-popover` — transient floating UI: dropdown menus, tooltips. Tighter
  blur/spread than `panel` so a small popover doesn't cast as heavy a shadow as a
  full page section.

## Z-index scale

Documented here rather than renamed into utility tokens, since the existing values
(observed via repo-wide audit) already form a coherent, unbroken scale:

| Layer | z-index | Used by |
|---|---|---|
| Sticky in-content headers | 10 | table headers, chart tooltips |
| Inline popovers (tooltips) | 20 | `InfoTooltip` |
| Floating action button | 30 | AI Insights button |
| Sticky nav / dropdown scrims | 40 | `Navbar`, dropdown/drawer backdrops |
| Dropdowns, drawers, standard modals | 50 | `CurrencySelector`, `AlertsPanel`, `AIInsightsPanel`, `MobileNav`, `FullscreenChartModal` |
| Toasts | 60 | `AlertToastStack` |
| Fullscreen dashboard mode | 70 | dashboard fullscreen wrapper |
| Blocking setup dialog | 60/70 | `GeminiKeySetupModal` scrim/panel |
| Onboarding tour spotlight | 80/81 | `OnboardingTour` |

## Motion

- Micro-interactions (hover, dropdown open): 120-200ms, `ease-out`.
- `prefers-reduced-motion: reduce` is honored globally (see `globals.css`) - all
  durations collapse to ~0 for users who request it.

## Components

Shared primitives live in `src/components/`. Reach for these instead of hand-rolling
new chrome:

- `Panel` — the standard card container (eyebrow/title/action header slots).
- `Button` — `primary`/`secondary`/`ghost`/`danger` variants, `sm`/`md`/`lg`/`icon`/`icon-sm` sizes.
- `Input` / `Textarea` / `Select` — form fields sharing `FIELD_BASE_CLASSES`, including
  a `error` prop wiring `aria-invalid` + a bear-colored border + associated message.
- `Dialog` — centered/edge dialog primitive (focus trap, `role="dialog"`,
  `aria-modal`, Escape, return-focus-on-close, consistent scrim). Used by
  `FullscreenChartModal`, `AlertsPanel`, `AIInsightsPanel`, `GeminiKeySetupModal`.
- `Dropdown` — floating menu primitive (open/close, outside-click, Escape,
  positioning). Used by `CurrencySelector`, `DashboardViewMenu`.
- `Badge` / `StatusBanner` — semantic tone chips/banners (`neutral`/`bull`/`bear`/`warn`/`brand`).
