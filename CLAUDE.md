# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project is a Chrome extension reading list application using Lit Web Components and TypeScript. It uses Vite as a build tool with Bun package manager.

## Essential Commands

### Development

```bash
bun dev          # Start development server
bun run build    # Production build after TypeScript check
bun preview      # Preview built app
```

### Code Quality

```bash
bun check             # Format and lint check with Biome (with auto-fix)
bun format            # Code formatting
bun lint              # Check lint errors
bun lint:fix          # Safe auto-fix of lint errors
bun lint:fix:unsafe   # Auto-fix including unsafe fixes for lint errors
bun check-types       # TypeScript type check (--noEmit)
```

### Testing

```bash
bun run test         # Run Vitest tests
bun run test:watch   # Run tests in watch mode
bun run test:ui      # Start Vitest UI
bun run test:coverage # Run tests with coverage report
```

## Architecture and Code Conventions

### Lit Component Structure

- Custom elements use `@customElement` decorator
- Properties are defined with `@property` decorator
- Styles are defined with `static styles`
- Always add types to HTMLElementTagNameMap with `declare global`

### Coding Conventions

- Biome configuration: tab indentation, double quotes
- TypeScript strict mode enabled
- Note special configuration for experimentalDecorators and useDefineForClassFields
- Auto-format on pre-commit with Lefthook
- Avoid using `any` type (to maintain type safety)
- Avoid silencing Biome errors or warnings with ignore comments as much as possible (to maintain code quality)

### Test Environment

- Testing in browser environment with Vitest + Playwright
- Use page object from `@vitest/browser/context`
- Test components by mounting directly to document.body

### Important Configuration

- Force Bun usage with preinstall script in package.json
- Git hooks managed with Lefthook (pre-commit/pre-push)
- ES module-based development environment with Vite

### Commit Message Convention

Follow Conventional Commits format:

```
<type>(<scope>): <explanation>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
