# AI Formula Builder

A React + TypeScript app for writing notes and math in a Word-like workflow: edit in plain text, preview with KaTeX, paste from Microsoft Word, copy MathML back into Word, and export a Word-style PDF.

Built on a Webpack 5 + React + TypeScript stack (Jest, SCSS, Prettier).

## Features

- **Equation catalog** — searchable table of ML / math formulas (structures, calculus, linear algebra, and more)
- **Interactive matrices** — choose dimensions for matrix, addition, and multiplication templates
- **Structures** — fraction, derivative, integral, and definite integral templates with fillable placeholders
- **Word-style editor** — bold, italic, underline, super/subscript, lists, and alignment without visible markup tags
- **Symbol keyboard** — insert common math operators and special characters (including ∧ / ∨)
- **Live KaTeX preview** — matrices, fractions, and alignment match a Word-style layout
- **Word paste** — paste equations and formatted text from desktop Word into editable builder text
- **Copy for Word** — clipboard HTML/MathML that pastes as real Word equations
- **PDF export** — downloads the Word-style preview (not raw editor text)

## Prerequisites

- Node.js >= 20
- [pnpm](https://pnpm.io/) >= 9

## Getting started

```bash
git clone git@github.com:DonAdam2/ai-formula-builder.git
cd ai-formula-builder
pnpm install
pnpm start
```

The app opens at the local URL printed by the start script (typically `http://localhost:3000`).

### Docker (optional)

```bash
pnpm install
docker-compose up web-dev
```

## Available scripts

| Script | Description |
| --- | --- |
| `pnpm start` | Start the development server |
| `pnpm build` | Production Webpack build to `dist/` |
| `pnpm build:serve` | Serve the production build locally |
| `pnpm test` | Run Jest unit tests |
| `pnpm test:watch` | Jest in watch mode |
| `pnpm test:coverage` | Coverage report |
| `pnpm generate` | Plop code generator |
| `pnpm analyze-bundle` | Bundle analyzer for the production build |

## Project structure (high level)

```
src/
  components/     # Editor, preview, toolbar, table, modal, shared UI
  data/           # Equation catalog and symbol keyboard data
  hooks/          # Editor history, insertion, preview, Word interactions
  pages/          # Equation builder page
  utils/          # LaTeX, Word paste/copy, PDF, rich-text display
```

## Tech stack

- React 19 + TypeScript
- Webpack 5
- KaTeX (preview rendering)
- jsPDF + html2canvas (Word-style PDF export)
- Jest + React Testing Library
- SCSS

## License

MIT
