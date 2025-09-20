// nuxt.config.ts (backend)
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  nitro: { preset: 'node-server' },
  runtimeConfig: {
    mailHost: process.env.MAIL_HOST,
    mailPort: process.env.MAIL_PORT,
    mailUser: process.env.MAIL_USER,
    mailPass: process.env.MAIL_PASS,
    mailFrom: process.env.MAIL_FROM,
    contactTo: process.env.CONTACT_TO,     // <-- añade esto si lo usarás
    allowedOrigin: process.env.ALLOWED_ORIGIN
  }
})
