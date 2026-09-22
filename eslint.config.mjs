import next from "eslint-config-next/core-web-vitals";

/**
 * ESLint, flat configuration.
 *
 * Next 16 removed `next lint` and the `eslint` key in `next.config.ts` along with it, so linting is
 * the project's own command again: `npm run lint`. CI never ran a linter and still does not - it runs
 * typecheck, the check suites, a production build and the bundle budget - so this file exists to keep
 * the command working rather than to gate anything.
 *
 * `eslint-config-next/core-web-vitals` is already a flat-config array in v16, which is why this is a
 * spread rather than the `extends` of the old config format.
 */
export default [
  ...next,
  {
    // Generated, vendored or data files: .next is build output, public/ is assets, data/ is generated
    // JSON, scripts/ are plain Node ESM with a different dialect, supabase/ is SQL.
    ignores: [".next/**", "node_modules/**", "public/**", "data/**", "scripts/**", "supabase/**", "*.config.*"],
  },
];
