# 🌊 Conflux

An Experimental Agentic Knowledge Flow System (基于本地优先的聚合知识流转实验)

## Philosophy

Conflux is built on a simple working hypothesis: knowledge is often easier to navigate as a network than as a rigid tree.

Instead of folders and nested ownership, the system keeps notes in a flat local data model and lets structure emerge through dimensions, references, and runtime relationships. Large language models are used in a constrained way: they assist with local context generation, selective retagging, and revision-based write-back, but only after local prefiltering and explicit user confirmation.

## Tech Stack

- React 19
- Vite 8
- Tailwind CSS 4
- Zustand
- TipTap
- ForceGraph2D

## Key Features

- Bento and List dual views for low-friction capture and review
- Flat `fluxBlocks` store with multi-dimensional metadata (`domain / format / project / stage / source`)
- Paragraph-level local entity sniffing powered by `Entity Lexicon + Fuse.js`
- Adaptive Lens reference nodes with context-aware right-side inspection
- Assimilation write-back flow with diff preview, revision history, and rollback
- Longform semantic chunking with shared thread labels for oversized input
- Graph view with semantic zoom, search spotlight, and relation framing
- Pure front-end BYOK model configuration with no required backend relay

## Getting Started

```bash
npm install
npm run dev
```

Then open the application in the browser.

This project follows a pure front-end BYOK (Bring Your Own Key) architecture:

- all note data is stored in browser `localStorage`
- the system ships with no default backend
- users must configure an OpenAI-compatible Chat Completions endpoint from the lower-left AI settings entry in the UI
- providers such as DeepSeek and other compatible gateways can be used as long as they support the standard request shape

## Development Checks

```bash
npm run lint
npm run build
```

Regression verification for local recommendation and longform chunking:

```bash
npm run verify:phantom
```

## Status

Current project line: `v1.0 stabilization`.

The architecture is intentionally locked to a local-first React baseline for this phase. The focus is not adding speculative features, but making the current writing, recommendation, revision, and graph pipeline reliable enough for open-source distribution.
