// Stands in for the `server-only` package in tests. In the app, importing a server module
// from client code fails the build; in Vitest there is no such boundary, and Next resolves
// `server-only` internally rather than from node_modules, so it is aliased here instead.
export {};
