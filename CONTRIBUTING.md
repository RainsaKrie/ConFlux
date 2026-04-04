# Contributing to Conflux

Thank you for your interest in contributing! Conflux is an experimental project exploring agentic knowledge management, and we welcome feedback, bug reports, and pull requests.

## Getting Started

1. Fork the repository and clone it locally.
2. Run `npm install` to set up dependencies.
3. Copy `.env.example` to `.env` and fill in your BYOK configuration.
4. Run `npm run dev` to start the development server.

## Before Submitting a PR

Please ensure the following checks pass:

- `npm run lint`
- `npm run build`
- `npm run verify:phantom` (if your changes touch recommendation, chunking, or lexicon logic)

## Code Style

- We use Tailwind CSS for styling. Please follow the existing `Zen Canvas` visual conventions (light background, white cards, low-noise interactions).
- State management is centralized in `useFluxStore.js` (Zustand). Please do not introduce additional global state stores without discussion.

## Reporting Issues

When filing a bug, please include:

- Steps to reproduce
- Expected vs. actual behavior
- Browser and OS version
