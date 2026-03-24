---
name: anti-design
description: Use when changing UI appearance, colors, typography, layout, or component styling in this project. Covers global CSS variables, Tailwind usage, and page-level design patterns.
---

# Anti Design System

Use this skill when you need to:
- change colors, fonts, spacing, or layout
- improve readability or accessibility
- add or restyle UI components
- ensure visual consistency across pages

## Key Files

- `frontend/src/index.css` — global CSS variables, base styles, component classes
- `frontend/src/App.css` — app-level styles (usually minimal)
- All pages under `frontend/src/pages/` use Tailwind utility classes inline

## Color Palette

### CSS Variables (index.css :root)
- `--bg-obsidian` — main page background
- `--surface-glass` — card/panel background (rgba white overlay)
- `--primary-peach` — `#FF8C69` — brand accent, buttons, highlights
- `--primary-peach-hover` — `#ff7b52` — hover state
- `--primary-peach-glow` — `rgba(255,140,105,0.15)` — glow effects
- `--border-glass` — border color for glass surfaces
- `--text-dim` — muted/secondary text color

### Usage Pattern
- Backgrounds: use `var(--bg-obsidian)` or Tailwind `bg-zinc-900/bg-slate-900`
- Cards: use `.glass-card` class or `var(--surface-glass)`
- Accent: always use `--primary-peach` (#FF8C69) for primary actions
- Text: `text-white` / `text-slate-300` / `var(--text-dim)` hierarchy

## Typography

- Font stack: `'Inter', 'Pretendard', sans-serif`
- Base size: set in `body` in index.css
- Heading sizes: use Tailwind `text-xl`, `text-2xl`, `text-3xl`
- Body text: minimum `text-sm` (14px) — prefer `text-base` (16px) for readability
- Muted text: `text-slate-400` or `var(--text-dim)`

## Component Classes

- `.glass-card` — frosted glass card with border and shadow
- `.peach-button` — primary CTA button
- `.unified-header` — page header bar
- `.page-container` — full-height scrollable page wrapper
- `.bento-grid` — responsive card grid layout
- `.custom-scrollbar` — styled scrollbar
- `.animate-slide-up` — entrance animation

## Design Principles

1. Dark background with peach accent — maintain this identity
2. Glass morphism surfaces (low opacity white backgrounds, blur)
3. Readability first — minimum 15px body text, sufficient contrast
4. Consistent spacing: `p-4`, `gap-4` as base units
5. Rounded corners: `rounded-2xl` for cards, `rounded-xl` for inputs
6. Smooth transitions: `transition-all duration-200`

## Making Changes

### To change background brightness:
Edit `--bg-obsidian` in `index.css :root`

### To change font size globally:
Add/edit `font-size` on `body` in `index.css`

### To restyle a specific page:
Find the page in `frontend/src/pages/` and edit Tailwind classes inline.

### To add a new component class:
Add it in the `@layer components` block in `index.css`.

## Known Issues / Gotchas

- Pages use many inline Tailwind classes — global CSS variable changes cascade automatically
- Some hardcoded colors like `bg-zinc-900`, `bg-slate-800` exist inline in pages — these don't respond to CSS variable changes
- `--text-dim` controls secondary text but many places use Tailwind `text-slate-400` directly
- When in doubt, change both the CSS variable AND search for hardcoded Tailwind equivalents
