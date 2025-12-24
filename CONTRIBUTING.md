# Contributing to create-stackr

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/create-stackr.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Lint code
npm run lint

# Type check
npm run typecheck

# Format code
npm run format
```

## Code Quality

Before submitting a PR, ensure:

- [ ] All tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Code is formatted (`npm run format`)
- [ ] Test coverage remains >80%

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all quality checks pass
4. Update CHANGELOG.md under "Unreleased" section
5. Submit PR with clear description of changes

## Commit Messages

Follow conventional commits format:

- `feat: add new feature`
- `fix: bug fix`
- `docs: documentation changes`
- `test: add tests`
- `refactor: code refactoring`
- `chore: maintenance tasks`

## Testing

- Write unit tests for utilities and helpers
- Write integration tests for CLI commands
- Write E2E tests for full project generation
- Maintain >80% code coverage

## Questions?

Open a discussion on GitHub or submit an issue.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.
