// Test stub for the `server-only` package. It exists solely to throw at build time if
// a server module is imported into a client bundle; in unit tests that guard is noise,
// so we alias it to this empty module (see vitest.config.mts).
export {};
