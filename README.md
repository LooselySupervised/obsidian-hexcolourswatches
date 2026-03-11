# HexColourSwatches

> This is a fork of [Benjamin-Park/obsidian-hexvision](https://github.com/Benjamin-Park/obsidian-hexvision).

An [Obsidian](https://obsidian.md) plugin that renders inline colour swatches next to hex colour codes in your notes — automatically, as you type, in both editing and reading views.

## What it does

Whenever HexColourSwatches sees a 6-digit hex colour code (e.g. `#ff5733`) in a note, it places a small coloured square immediately before it. The hex code itself is styled using your theme's muted monospace colour so it stays readable without competing with the swatch.

This works the same way Bear and Claude render hex codes — no special syntax, no code blocks required.

**Before**

```
The brand primary is #1a73e8 and the accent is #ff5733.
```

**After** *(as rendered in Obsidian)*

```
The brand primary is 🟦 #1a73e8 and the accent is 🟧 #ff5733.
```
*(rendered as actual colour squares, not emoji)*

## Features

- **Always-on** — activates on every note automatically; no opt-in syntax needed
- **Live as you type** — swatches appear the moment a valid 6-digit hex code is complete in the editor
- **Reading view + Live Preview** — works in both rendering modes
- **Tag conflict prevention** — Obsidian normally interprets letter-leading hex codes like `#ff0000` as vault tags; HexColourSwatches intercepts these and renders them as colour swatches instead
- **Code blocks respected** — hex codes inside inline code spans (`` `#ff0000` ``) and fenced code blocks are left untouched
- **Theme-aware** — swatch border and text colour adapt to your current Obsidian theme via CSS variables
- **Mobile compatible** — no desktop-only APIs used

## Supported formats

| Format | Example | Supported |
|--------|---------|-----------|
| 6-digit lowercase | `#ff0000` | ✅ |
| 6-digit uppercase | `#FF0000` | ✅ |
| 6-digit mixed case | `#Ff0000` | ✅ |
| 3-digit shorthand | `#f00` | ❌ |
| 8-digit with alpha | `#ff0000ff` | ❌ |
| Named colours | `red`, `coral` | ❌ |
| RGB / HSL functions | `rgb(255,0,0)` | ❌ |

## Installation

### From the Obsidian community plugin list *(once published)*

1. Open **Settings → Community plugins**
2. Search for **HexColourSwatches**
3. Click **Install**, then **Enable**

### Manual installation

1. Clone or download this repository
2. In the project directory, run:
   ```bash
   npm install
   npm run build
   ```
   This compiles `main.ts` into `main.js`.
3. Copy `main.js`, `styles.css`, and `manifest.json` into:
   `<your vault>/.obsidian/plugins/hex-colour-swatches/`
4. Reload Obsidian and enable the plugin under **Settings → Community plugins**

## Development

### Prerequisites

- Node.js 16 or later
- npm

### Build

```bash
npm install
npm run build
```

### Watch mode (rebuilds on save)

```bash
npm run dev
```

### Tests

The test suite uses Node's built-in `node:test` runner — no additional installation required.

```bash
npm test
```

Unit tests cover the hex colour detection utilities (`hex-utils.ts`). Manual test scenarios are provided in [`tests/fixtures/test-note.md`](tests/fixtures/test-note.md) — open that file in Obsidian with the plugin enabled to visually validate all rendering cases.

### Project structure

```
hex-colour-swatches/
├── main.ts                        # Plugin entry point
├── hex-utils.ts                   # Pure hex colour utilities (regex, validation)
├── styles.css                     # Swatch and code text styles
├── tests/
│   ├── hex-utils.test.ts          # Unit tests
│   └── fixtures/
│       └── test-note.md           # Manual test scenarios
├── manifest.json                  # Obsidian plugin manifest
└── package.json
```

## Compatibility

- **Minimum Obsidian version:** 0.15.0
- **Desktop:** ✅
- **Mobile:** ✅

## Author

[LooselySupervised](https://github.com/LooselySupervised)

## Licence

MIT
