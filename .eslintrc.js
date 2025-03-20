module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "prettier", "api-consistency"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "api-consistency/method-naming": "warn",
    "api-consistency/option-objects": "warn",
    "api-consistency/access-modifiers": "warn"
  },
  env: {
    browser: true,
    es6: true,
    node: true
  },
  // Import plugins from local files
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"]
      }
    }
  },
  // Define plugin paths
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      settings: {
        "eslint-plugin-api-consistency": require("./scripts/eslint-api-consistency.js")
      }
    }
  ]
}
