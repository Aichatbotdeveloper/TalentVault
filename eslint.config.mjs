import next from "eslint-config-next";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...next,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  { ignores: [".next/**", "node_modules/**", "supabase/**", "playwright-report/**", "test-results/**", "next-env.d.ts"] },
];
export default config;
