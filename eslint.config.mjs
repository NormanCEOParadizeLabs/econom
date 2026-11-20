import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

// Règles du compilateur React assouplies pour trois usages volontaires et sûrs :
// lecture du stockage local après montage, horodatage dans des Server Components, écriture du thème sur <html>.
eslintConfig.push({ rules: { "react-hooks/set-state-in-effect": "off", "react-hooks/purity": "off", "react-hooks/immutability": "off" } });

export default eslintConfig;
