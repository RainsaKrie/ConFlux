# Security

Conflux is a local-first application. All user data, including notes and AI configuration, is stored exclusively in the browser's `localStorage`.

## BYOK (Bring Your Own Key)

Your API key is stored in `localStorage` under the key `flux_ai_config`. It is never transmitted to any server other than the AI endpoint you configure.

**Important**: This storage mechanism is suitable for personal devices. If you use Conflux on a shared or public computer, please clear your browser data after each session to protect your API key.

## Reporting Vulnerabilities

If you discover a security issue, please open a GitHub Issue or contact the maintainer directly. We take all reports seriously.
