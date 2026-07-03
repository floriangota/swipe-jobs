import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// Next 16's eslint-config-next ships native flat configs. `core-web-vitals`
// already bundles the base rules (react, react-hooks, import, jsx-a11y, @next/next)
// and the TypeScript block — so we spread it directly (no FlatCompat bridge).
const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "coverage/**",
      "next-env.d.ts",
      // Plain service worker uses worker globals; not linted as app code.
      "public/sw.js",
    ],
  },
  ...nextCoreWebVitals,
  {
    // docs/security.md: dangerouslySetInnerHTML is banned (XSS surface).
    rules: {
      "react/no-danger": "error",
    },
  },
  {
    // Encourage type-only imports for clean, tree-shakeable code.
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
];

export default eslintConfig;
