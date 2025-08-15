# Reading List

English | [Japanese](./README.ja.md)

A Chrome extension for saving articles and web pages to read later, built with Lit Web Components and TypeScript.

![Reading List extension screenshot](https://storage.googleapis.com/zenn-user-upload/5810ad5de647-20250815.png)

## Features

- Save articles and web pages for later reading
- Quick access through browser popup
- Context menu integration
- Clean and modern UI using Lit components

## Tech Stack

- **Frontend**: Lit Web Components 3.3.1
- **Language**: TypeScript (ES2022)
- **Build Tool**: Vite
- **Package Manager**: Bun
- **Testing**: Vitest + Playwright
- **Linting**: Biome

## Installation

### Prerequisites

- [Bun](https://bun.sh/) (required)
- Chrome browser

### Setup

```bash
# Install dependencies
bun install
```

## Development

```bash
# Build for production
bun run build

# Run tests
bun run test

# Check code quality
bun check
```

## Building the Extension

```bash
bun run build
```

The built extension will be in the `dist/` directory.

## Loading in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` directory

## Scripts

| Command                 | Description                    |
| ----------------------- | ------------------------------ |
| `bun run build`         | Build for production           |
| `bun preview`           | Preview built app              |
| `bun check`             | Run format and lint checks     |
| `bun format`            | Format code                    |
| `bun lint`              | Check for lint errors          |
| `bun lint:fix`          | Auto-fix lint errors           |
| `bun check-types`       | TypeScript type checking       |
| `bun run test`          | Run tests                      |
| `bun run test:watch`    | Run tests in watch mode        |
| `bun run test:list`     | List all available tests       |
| `bun run test:ui`       | Open Vitest UI                 |
| `bun run test:coverage` | Run tests with coverage        |
| `bun run package`       | Build and create extension zip |

## License

MIT
