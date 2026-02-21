/** @type {import("prettier").Config} */
export default {
  singleQuote: true,
  plugins: [
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
    'prettier-plugin-classnames',
    'prettier-plugin-merge',
  ],
  // @trivago/prettier-plugin-sort-imports
  importOrder: ['<THIRD_PARTY_MODULES>', '^@/(.*)$', '^[./]'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  // prettier-plugin-classnames
  customFunctions: ['cn', 'clsx', 'cva'],
  // prettier-plugin-tailwindcss
  tailwindFunctions: ['cn', 'clsx', 'cva'],
};
