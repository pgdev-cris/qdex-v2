import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import preferArrow from 'eslint-plugin-prefer-arrow';

export default defineConfig([
    globalIgnores(['dist']),
    {
        files: ['**/*.ts'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            prettier, // must be last — disables ESLint rules that conflict with Prettier
        ],
        plugins: {
            'prefer-arrow': preferArrow,
        },
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.node,
        },
        rules: {
            // Auto-convert function declarations/expressions to arrow functions
            'prefer-arrow/prefer-arrow-functions': [
                'warn',
                {
                    disallowPrototype: true,
                    singleReturnOnly: false,
                    classPropertiesAllowed: false,
                },
            ],
        },
    },
]);
