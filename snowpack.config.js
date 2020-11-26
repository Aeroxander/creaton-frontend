/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  extends: "@snowpack/app-scripts-svelte",
  mount: {
    public: "/",
    src: "/_dist_",
  },
  plugins: [
    "@snowpack/plugin-svelte",
    "@snowpack/plugin-dotenv",
    ["@snowpack/plugin-typescript", "--allowJs"]
  ],
  install: [
    /* ... */
  ],
  installOptions: {
    installTypes: true,
    polyfillNode: true,
    /* ... */
  },
  devOptions: {
    fallback: "index.ts",
    hmr: false
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
  proxy: {
    /* ... */
  },
  alias: {
    /* ... */
  },
};
