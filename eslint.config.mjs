// @ts-check
import withNuxt, { defineFlatConfigs } from './.nuxt/eslint.config.mjs'

export default defineFlatConfigs(
  withNuxt(
    // Your custom configs here
    {
      rules: {
        'comma-dangle': 'off',
        'semi': ['error', 'never'],
        'vue/html-indent': 'off',
        '@stylistic/comma-dangle': 'off',
        '@stylistic/no-trailing-spaces': 'off',
        'vue/max-attributes-per-line': 'off',
        'vue/block-tag-newline': 'off',
        'vue/html-closing-bracket-newline': 'off',
        'vue/html-closing-bracket-spacing': 'off',
        'vue/html-comment-content-newline': 'off',
        'vue/html-comment-content-spacing': 'off',
        'vue/html-comment-indent': 'off',
        'vue/html-end-tags': 'off',
        'vue/first-attribute-linebreak': 'off',
        'nuxt/nuxt-config-keys-order': 'off',
      }
    }
  )
)
