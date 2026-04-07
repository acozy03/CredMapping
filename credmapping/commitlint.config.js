const commitTypes = [
  "build",
  "chore",
  "ci",
  "docs",
  "feat",
  "fix",
  "perf",
  "refactor",
  "revert",
  "style",
  "test",
];

const config = {
  extends: ["@commitlint/config-conventional"],
  parserPreset: {
    parserOpts: {
      headerPattern: new RegExp(`^(${commitTypes.join("|")}):\\s(.+)$`),
      headerCorrespondence: ["type", "subject"],
    },
  },
  rules: {
    "header-max-length": [2, "always", 100],
    "subject-empty": [2, "never"],
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],
    "type-enum": [2, "always", commitTypes],
  },
};

export default config;
