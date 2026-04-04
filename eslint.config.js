export default [
  {
    files: ["docs/js/**/*.js", "worker/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        document: "readonly",
        window: "readonly",
        navigator: "readonly",
        sessionStorage: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        URL: "readonly",
        Blob: "readonly",
        FileReader: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        console: "readonly",
        self: "readonly",
        caches: "readonly",
        Response: "readonly",
        L: "readonly",
      },
    },
    rules: {
      "eqeqeq": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
