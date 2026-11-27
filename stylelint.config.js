// Stylelint for every .css file (the prototype and the app). Run by `npm run lint:css`, and so by
// `lint:code` and `lint`.
//
// The standard set: errors plus the modern CSS conventions (space-separated colour functions, percentage
// alpha, kebab-case names). Colours go through custom properties so both themes stay in sync, which is why
// named colours are banned outright.

/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-standard"],
  ignoreFiles: [
    "**/node_modules/**",
    "**/dist/**",
    "**/coverage/**",
    "**/.angular/**",
  ],
  reportDescriptionlessDisables: true,
  reportNeedlessDisables: true,
  reportInvalidScopeDisables: true,
  rules: {
    "color-named": "never",
    "declaration-no-important": true,
    "max-nesting-depth": [
      3,
      { ignore: ["pseudo-classes", "blockless-at-rules"] },
    ],
  },
};
