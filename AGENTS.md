# Repository Instructions

## Project and commands

- This is a standalone Angular 22 application. Do not introduce NgModules for new work.
- Use npm (the repository declares `npm@11.17.0`).
- Use the existing scripts:
  - `npm run start` — local development server
  - `npm run build` — production build
  - `npm run test` — unit tests
  - `npm run lint` — ESLint checks
- Before handing off a code change, run the relevant checks. Run at least `npm run lint`; also run `npm run build` when a change can affect compilation, templates, routes, or app configuration.
- Follow the repository configuration over examples in documentation. In particular, Prettier uses single quotes and a 100-character print width.

## Angular implementation

- Build new UI as standalone components and set `changeDetection: ChangeDetectionStrategy.OnPush`.
- Use `inject()` for dependencies. Prefer signals (`signal`, `computed`, `input`, `output`) for component state and APIs; use `computed()` rather than synchronizing derived state manually.
- Keep asynchronous service APIs in RxJS Observables. Use `toSignal()` at the component boundary when a signal is the appropriate view-facing representation.
- Update collections immutably: create a new array, object, `Set`, or `Map` before setting the signal.
- Use `effect()` only for genuine side effects. Clean up subscriptions, timers, `ResizeObserver`s, and other external resources in effects or component teardown.
- Use `@if` and `@for` control flow in templates, and always give lists stable tracking keys.
- Keep templates accessible: use semantic controls, explicit labels, and suitable ARIA attributes. Decorative images/icons must use `alt=""` and `aria-hidden="true"`; specify SVG icon dimensions.
- Avoid `console.log` in production code. Use the project logging service where one exists.

## Structure and naming

- Keep feature-specific code within its feature directory. Use `core/` for singleton services, guards, and cross-cutting application concerns; use `common/` for reusable components, pipes, utilities, models, constants, and styles.
- Typical feature layout: `components/`, `services/`, `models/`, `constants/`, and feature routes as needed.
- Use kebab-case file names and established Angular suffixes:
  - components: `feature-name.component.ts` (with matching `.html` and `.scss`)
  - services: `feature-name.service.ts`
  - models: `feature-name.model.ts`
  - utilities: `feature-name.util.ts`
  - routes: `feature-name.routes.ts`
- Prefer focused, typed interfaces and type guards over `any`. Put shared constants in `common/constants` and feature-only constants in the feature.
- Use lazy `loadComponent`/feature routes where appropriate. Authentication and authorization belong in guards, not only in UI conditionals.

## Services, data, and security

- Services own API, GraphQL, cache, and authentication interactions; components should coordinate presentation state rather than contain transport logic.
- Type API results and handle failures deliberately. Do not expose raw failures to users without converting them to an appropriate message.
- Do not hardcode credentials, access tokens, AWS configuration secrets, or environment-specific values. Use the established configuration/environment mechanism.
- When using browser storage, account for non-browser execution and malformed or unavailable storage. Store typed values behind a small service rather than duplicating storage logic.

## Styling and assets

- Use component SCSS and BEM-style class names (for example, `.product-card`, `.product-card__title`, `.product-card--selected`).
- Reuse CSS custom properties/design tokens from global styles instead of introducing repeated raw color, sizing, or overlay values.
- Put shared SCSS utilities and mixins in the shared styles area; keep feature styles local.
- Store SVG icons under `src/assets/icons/`, name them `ic_<name>.svg`, and reference them consistently through `assets/icons/...`.

## Formatting, linting, and hooks

- Format changed TypeScript, HTML, SCSS, and JSON with Prettier before committing. Respect `.prettierrc`; do not hand-format against it.
- Fix lint errors rather than suppressing or bypassing them without a clear, reviewed reason.
- Husky validates commit messages with commitlint. Do not use `git commit --no-verify` to bypass repository hooks.
- If hooks fail, fix the reported issue, stage the corrected file, and commit again. Ensure hooks are installed by running `npm install` (or `npm run prepare`) after a fresh checkout.

## Commits, branches, and pull requests

- Use Conventional Commits: `<type>(<scope>): <subject>`.
  - Allowed common types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, and `style`.
  - Keep scopes lowercase and hyphenated; use an imperative, lowercase subject with no trailing period. Keep the subject line within 100 characters.
  - Example: `feat(auth): add password visibility toggle`.
- Branch from the integration branch and use a clear prefix: `feature/`, `bugfix/`, or `hotfix/`. Treat production (`prod`/`main`) and integration (`staging`/`develop`) branches as protected: never push to them directly.
- Keep pull requests small and focused. Self-review the diff, describe both what changed and why, and avoid unrelated cleanup.
- Before requesting review, ensure relevant build and lint checks pass. PRs require at least one approval before merge.
- Review Angular changes for component responsibilities, signal/RxJS lifecycle cleanup, accessibility, and state management. Review backend-facing changes for secure API use, correct environment configuration, no credentials, and efficient payloads.
- Merges to the integration branch deploy to development/staging; production merges require final sanity checks before automated deployment.
