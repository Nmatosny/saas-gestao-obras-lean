import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scratch/**",
    "seed.js",
    "*.config.js",
  ]),
  {
    rules: {
      // `any` é aceitável em boundaries de API (Prisma, req/res, JSON.parse)
      // Rebaixado para warn: não bloqueia build, mas fica visível no output
      "@typescript-eslint/no-explicit-any": "warn",

      // Variáveis não usadas: erro apenas se não começar com _
      // Padrão catch (error) → catch (_error) ou catch { } resolve sem ruído
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_|^error$",
        },
      ],

      // Entidades JSX não escapadas: warn (strings em português têm aspas frequentes)
      "react/no-unescaped-entities": "warn",

      // react-hooks: manter como warn para não bloquear, corrigido progressivamente
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
