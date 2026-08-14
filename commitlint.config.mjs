// Conventional Commits enforcement (matches the style already used in this repo:
// `fix(ci): ...`, `chore(expo): ...`, `feat(backend): ...`).
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 100],
    "subject-empty": [2, "never"],
  },
};
