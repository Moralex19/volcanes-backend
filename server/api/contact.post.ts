// server/api/contact.post.ts
import { defineEventHandler, readBody, setResponseStatus, setHeader, getMethod } from 'h3'
import nodemailer from 'nodemailer'

export default defineEventHandler(async (event) => {
  // 🔒 Variables privadas desde runtimeConfig (local .env o Railway)
  const {
    allowedOrigin,         // ALLOWED_ORIGIN
    mailHost,              // MAIL_HOST
    mailPort,              // MAIL_PORT (465 o 587)
    mailUser,              // MAIL_USER
    mailPass,              // MAIL_PASS (App Password si es Gmail)
    mailFrom,              // MAIL_FROM
    contactTo              // CONTACT_TO
  } = useRuntimeConfig()

  // CORS (solo tu frontend)
  if (allowedOrigin) {
    setHeader(event, 'Access-Control-Allow-Origin', allowedOrigin)
    setHeader(event, 'Access-Control-Allow-Methods', 'POST, OPTIONS')
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
  }
  if (getMethod(event) === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }

  const body = await readBody<{
    nombre?: string; email?: string; telefono?: string; mensaje?: string;
  }>(event)

  const nombre   = body?.nombre   || ''
  const email    = body?.email    || ''
  const telefono = body?.telefono || ''
  const mensaje  = body?.mensaje  || ''

  if (!email || !mensaje) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Faltan campos requeridos' }
  }

  const portNum = Number(mailPort || 587)

  const transporter = nodemailer.createTransport({
    host: mailHost,
    port: portNum,
    secure: portNum === 465,                 // 465 = SSL; 587 = STARTTLS
    auth: { user: mailUser, pass: mailPass },
    // ayuda cuando el host resuelve a IPv6 o hay SNI estricto:
    tls: { servername: mailHost }
  })

  const html = `
    <h2>Nuevo mensaje de contacto</h2>
    <p><b>Nombre:</b> ${nombre || '-'}</p>
    <p><b>Email:</b> ${email}</p>
    <p><b>Teléfono:</b> ${telefono || '-'}</p>
    <p><b>Mensaje:</b><br>${(mensaje || '').replace(/\n/g, '<br>')}</p>
  `

  try {
    // Útil para ver errores de credenciales/puerto antes de enviar
    await transporter.verify()

    await transporter.sendMail({
      from: mailFrom || mailUser,
      to: contactTo || mailFrom || mailUser,   // ✅ sin process.env
      replyTo: email,
      subject: `Contacto: ${nombre || email}`,
      html
    })

    return { ok: true }
  } catch (err: any) {
    console.error('Mailer error:', err?.code, err?.response?.toString?.() || err?.message)
    setResponseStatus(event, 500)
    return { ok: false, error: 'No se pudo enviar el correo' }
  }
})
