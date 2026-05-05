// ESLint flat config (ESLint 10+)
// @typescript-eslint/parser handles TS/TSX syntax so ESLint can walk the AST.
// no-restricted-syntax is a core ESLint rule — no additional plugins needed.

const tsParser = require('@typescript-eslint/parser');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: ['.expo/**', 'node_modules/**', 'dist/**', 'coverage/**', '**/*.d.ts'],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // Match: TemplateLiteral starting with literal `@` followed by an
          // expression that accesses `.username`. Forces consumers through
          // the formatHandle() helper so handle rendering stays consistent.
          // See apps/mobile/utils/formatHandle.ts.
          selector:
            "TemplateLiteral[quasis.0.value.cooked=/^@/] > MemberExpression[property.name='username']",
          message:
            'Use formatHandle(username) instead of `@${...username}` template literals — see apps/mobile/utils/formatHandle.ts.',
        },
      ],
    },
  },
];
