# 🌊 Flux - Agentic Knowledge Flow

Flux is a local-first knowledge tool for people who think faster than folders can keep up.

## The Manifesto

Folders force you to decide too early.

They ask you to classify a thought before you have finished thinking it, then bury it behind a path you probably will not remember next week. Flux takes the opposite stance: every note is a flat knowledge block, organized by dimensions, references, and runtime relationships instead of rigid containers.

That is the core idea behind Agentic Knowledge Flow:

- capture first, structure later
- connect notes through tags, references, and local recommendation
- split longform input into usable fragments before it turns into sludge
- keep the model on a short leash: local prefilter first, explicit confirmation before write-back

## Core Features

- Zen Canvas: low-pressure writing surface with a deliberately quiet interface
- Omni Filter: multi-dimensional filtering across domain, format, project, stage, and source
- Phantom Weaving: paragraph-level local recommendation powered by lexicon matching and Fuse.js
- Crystal Assimilation: preview-first note update flow with visible diffs and revision history
- Graph View: relation map for references, overlaps, and emergent clusters
- Semantic Auto-Chunking: longform capture pipeline with shared thread labels
- Local-First + BYOK: notes stay in localStorage, model calls go directly to your configured endpoint

## Getting Started

```bash
npm install
npm run dev
```

Then open the app in your browser and configure BYOK in the lower-left settings area.

Flux expects a standard Chat Completions compatible endpoint. OpenAI, DeepSeek, SiliconFlow, and similar providers can all work as long as you provide:

- `Base URL`
- `Model`
- `API Key`

No server relay is required. Your notes remain local, and your API key is stored only in the browser.

## Development

```bash
npm run lint
npm run build
```

For regression coverage around local recommendation and longform chunking:

```bash
npm run verify:phantom
```

## Project Status

Current release line: `v1.0 stabilization`.

Flux already includes the full front-end writing loop, paragraph recommendation, diff-based note updates, longform semantic chunking, and graph projection. The next step is not adding more spectacle. It is making the current system cleaner, sharper, and more trustworthy.
