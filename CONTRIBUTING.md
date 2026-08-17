# Contributing to Konvo

Thanks for your interest in contributing to Konvo! Whether it's a bug fix, a new feature, or a docs improvement, contributions are welcome.

## Before You Start

For anything beyond a small fix (typos, minor bugs), **please open an issue first** to discuss the change. This avoids duplicate work and makes sure the feature fits the project's direction before you put time into it.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/konvo.git
   cd konvo
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up PocketBase** (required to run the app locally):
   - Download the PocketBase binary from [pocketbase.io](https://pocketbase.io/docs/)
   - Run it: `./pocketbase serve --http=0.0.0.0:8090`
   - Open `http://localhost:8090/_/` and import `pb_schema.json` under **Settings → Import collections**
5. **Configure environment variables** — create `.env.local`:
   ```env
   NEXT_PUBLIC_PB_URL=http://localhost:8090
   ```
6. **Run the dev server**:
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`.

See the [README](./README.md) for more details on the full setup and project structure.

## Making Changes

1. Create a feature branch off `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   Use a descriptive prefix: `feature/`, `fix/`, `docs/`, `refactor/`, etc.

2. Make your changes. Keep commits focused — one logical change per commit where possible.

3. Follow the existing code style:
   - TypeScript throughout — avoid introducing untyped `any` where a proper type is feasible
   - Match existing component structure and naming conventions in `app/` and `lib/`
   - Use Tailwind CSS utility classes consistently with the rest of the codebase rather than introducing new styling approaches

4. If you change or add to the PocketBase schema (`pb_schema.json`), explain the change clearly in your PR — schema changes affect anyone running a local or self-hosted instance.

5. Test your changes locally against a running PocketBase instance before submitting. There is currently no automated test suite, so manual verification of affected flows (messaging, feed, notifications, etc.) is important.

## Submitting a Pull Request

1. Push your branch:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against `main`.
3. In your PR description, include:
   - What the change does and why
   - Any related issue number (e.g. `Closes #12`)
   - Screenshots or a short clip for UI changes
   - Any manual testing steps you followed
4. Be responsive to review feedback — small follow-up commits are fine.

## Reporting Bugs

Open an issue and include:
- Steps to reproduce
- Expected vs. actual behavior
- Browser/OS, Node version, and PocketBase version
- Screenshots or console errors, if relevant

## Reporting Security Issues

Please **do not** open a public issue for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for how to report these privately.

## Code of Conduct

Be respectful and constructive. Konvo is a small project maintained in spare time — patience and kindness go a long way, for maintainers and contributors alike.

---

Thanks again for helping improve Konvo! 
