// Backend/nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  ssr: true,
  nitro: { preset: 'node-server' },

  runtimeConfig: {
    // privadas (solo servidor)
    resendApiKey: process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM,
    contactTo: process.env.CONTACT_TO,
    allowedOrigin: process.env.ALLOWED_ORIGIN
  }
})
