# Security Policy

## Supported Versions

Konvo does not currently maintain multiple release branches — active development happens on `main`, and that is the only version supported with security fixes. If tagged releases are introduced in the future, this table will be updated to reflect which versions receive patches.

| Version        | Supported          |
| -------------- | ------------------- |
| `main` (latest) | :white_check_mark: |
| Older commits / forks | :x:           |

If you're running a self-hosted instance, please stay up to date with `main` to ensure you receive security fixes.

## Reporting a Vulnerability

If you discover a security vulnerability in Konvo, please **do not open a public GitHub issue**. Instead, report it privately using one of the methods below:

- **Preferred:** [GitHub Security Advisories](https://github.com/dauntflash/konvo/security/advisories/new) — use the "Report a vulnerability" button on this repo. This keeps the report private between you and the maintainer while it's investigated.
- **Alternative:** Email **[your email here]** with details of the issue.

When reporting, please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code or requests, if applicable)
- Any affected component (e.g. PocketBase schema/rules, Next.js API routes, client-side handling of messages/media)

### What to expect

- **Acknowledgment:** within 3–5 days of your report.
- **Status updates:** at least every 7–10 days while the issue is investigated.
- **If accepted:** a fix will be developed and released as soon as possible; you'll be credited in the release notes unless you prefer to remain anonymous. Coordinated disclosure timing can be discussed.
- **If declined:** you'll receive an explanation of why the report was not considered a valid security issue (e.g. it's a general bug, or expected behavior).

### Scope

Given Konvo's architecture, reports involving the following are especially welcome:
- PocketBase collection rules / access control (e.g. unauthorized access to `messages`, `users`, `blocks`, or `reports` collections)
- Authentication and session handling
- File/media upload handling (images, video, audio, documents)
- Cross-user data exposure (e.g. bypassing blocks, reading private messages, forged read receipts)

Thank you for helping keep Konvo and its users safe.
