[Chinese README](./docs/README_ZH.md) | English (Current)

# 🌱 Conflux: An Experimental Agentic Knowledge Flow

[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green)](./package.json)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)

A local-first experiment in knowledge flow design.

## Why Conflux?

Conflux is a pure front-end experiment around a simple question:

If we stop treating knowledge as a tree of folders and instead rely on orthogonal dimensions, local relationship inference, conservative longform chunking, and model-assisted contextual reduction, can personal knowledge become more fluid without becoming more chaotic?

This repository is not presented as a finished PKM product. It is a student-led engineering exploration into the boundary between local-first knowledge architecture and restrained AI-native interaction.

The current `v1.0.0 Release Candidate` stays intentionally narrow:

- flat `fluxBlocks` instead of folders or nested ownership
- local-first persistence through Zustand + browser storage
- model calls only after local prefiltering and explicit user intent
- revision-aware write-back instead of silent AI mutation

## Architecture Snapshot

The current baseline follows the architecture described in [docs/02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md):

- `React 19 + Vite 8` for the application shell
- `Zustand (persist)` for local-first state
- `TipTap` with custom node views for writing and reference insertion
- `react-force-graph-2d` for graph projection and semantic zoom
- a strict funnel of `local prefilter -> user confirmation -> precise model call`

Conflux currently runs as a browser-only system. There is no backend, no hosted relay, and no built-in sync layer in `v1.0`.

## Key Experiments

### Zero-pressure Capture & Auto-Chunking

Oversized input is intercepted locally before it can become an unreadable monolith. The current chunking pipeline performs conservative physical splitting, preserves a shared `threadId`, and injects thread-level metadata so related fragments remain traceable across Feed, Write, and Graph.

### Phantom Weaving

The recommendation layer is intentionally quiet. After `2500ms` of inactivity, Conflux only inspects the active paragraph, then runs a local `Entity Lexicon + Fuse.js` prefilter to surface likely historical context without interrupting the writing flow.

### Crystal Assimilation

Write-back is handled as a revision problem, not a blind append. New text can be merged back into an earlier note through an AI-assisted flow with diff preview, linear revision history, source tracing, and rollback.

### Zen Canvas & Semantic Zoom

The graph view is not a decorative afterthought. It uses `react-force-graph-2d` to support spotlight search, relation framing, and zoom-aware density control, making larger note clusters inspectable without turning the interface into a wall of overlapping labels.

## Tech Stack

- React 19
- Vite 8
- Zustand (Persist)
- TipTap (Custom Node View)
- Tailwind CSS 4
- Framer Motion
- Fuse.js
- react-force-graph-2d

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/RainsaKrie/Flux.git
cd Flux
npm install
```

### 2. Configure BYOK

You can configure the model endpoint in either of two ways:

1. Create a local `.env` file based on [.env.example](./.env.example)
2. Or open the app and fill the BYOK fields from the lower-left `AI Settings` entry

Example environment file:

```env
VITE_AI_BASE_URL="https://api.deepseek.com/v1"
VITE_AI_API_KEY=""
VITE_AI_MODEL="deepseek-chat"
```

The current runtime expects an OpenAI-compatible Chat Completions endpoint.

### 3. Run the app

```bash
npm run dev
```

### 4. Verification

```bash
npm run lint
npm run build
npm run verify:phantom
```

## Security Boundary

Conflux follows a local-first BYOK model:

- note data is stored in browser `localStorage`
- model credentials are stored locally in the browser unless injected through local environment variables at build time
- the project ships with no default backend and no hosted proxy
- users should treat this repository as an experimental personal tool, not a hardened enterprise system

No real API keys are included in this repository.

## Roadmap

The current roadmap is intentionally incremental and is derived from the `docs/` baseline:

- `v1.1`: embedded hybrid retrieval and intent fission for mixed-input decomposition
- `v1.2`: `IndexedDB`-backed local media support and richer longform ergonomics
- `v1.3`: whiteboard exploration and batch-oriented metadata management
- `v2.0`: `Tauri` desktop packaging, local `SQLite`, and more durable local-first storage boundaries

See also:

- [docs/01-PRD.md](./docs/01-PRD.md)
- [docs/02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md)
- [docs/04-CHANGELOG.md](./docs/04-CHANGELOG.md)

Community guidance, critique, and architectural feedback are genuinely welcome.

---

## License

[MIT License](./LICENSE)

## Security

[Security Policy](./SECURITY.md)

## Contributing

[Contributing Guide](./CONTRIBUTING.md)
