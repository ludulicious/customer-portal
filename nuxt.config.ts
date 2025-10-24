// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/content',
    '@vueuse/nuxt',
    'nuxt-og-image',
    '@nuxtjs/i18n'
  ],
  image: {
    quality: 80,
    format: ['webp', 'avif', 'jpeg'],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
    densities: [1, 2],
    presets: {
      avatar: {
        modifiers: {
          format: 'webp',
          width: 150,
          height: 150,
          quality: 80
        }
      },
      hero: {
        modifiers: {
          format: 'webp',
          width: 1200,
          height: 600,
          quality: 85
        }
      },
      thumbnail: {
        modifiers: {
          format: 'webp',
          width: 400,
          height: 300,
          quality: 75
        }
      }
    }
  },
  devtools: {
    enabled: true
  },
  devServer: {
    port: 3051,
  },
  css: ['~/assets/css/main.css'],

  compatibilityDate: '2024-07-11',

  nitro: {
    routeRules: {
      '/': { swr: 300 },
      '/en': { swr: 300 },
      '/blog/**': { swr: 600 },
      '/en/blog/**': { swr: 600 },
      '/portfolio/**': { swr: 600 },
      '/en/portfolio/**': { swr: 600 }
    },
    prerender: {
      routes: ['/', '/en', '/blog', '/en/blog', '/portfolio', '/en/portfolio', '/contact', '/en/contact'],
      crawlLinks: false,
      failOnError: false
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  i18n: {
    locales: [
      {
        code: 'en',
        name: 'English',
        file: 'en.json'
      },
      {
        code: 'nl',
        name: 'Nederlands',
        file: 'nl.json'
      }
    ],
    defaultLocale: 'nl',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: 'nl'
    },
    langDir: 'locales/'
  }
})
