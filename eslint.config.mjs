// @ts-check
// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Your custom configs here
  {
    rules: {
      'comma-dangle': 'off',
      'semi': ['error', 'never'],
      '@typescript-eslint/semi': ['error', 'never']
    }
  }
)
