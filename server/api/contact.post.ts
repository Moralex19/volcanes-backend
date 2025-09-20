import { defineEventHandler, readBody, setResponseStatus, setHeader, getMethod } from 'h3'
import nodemailer from 'nodemailer'

export default defineEventHandler(async (event) => {
  const {
    allowedOrigin,   // ALLOWED_ORIGIN = https://<tu-sitio>.netlify.app
    mailHost,        // MAIL_HOST
    mailPort,        // MAIL_PORT 465 o 587
    mailUser,        // MAIL_USER (tu gmail)
    mailPass,        // MAIL_PASS (App Password de Gmail)
    mailFrom         // MAIL_FROM (opcional, ideal = MAIL_USER)
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

  // Body
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

  // Transporter
  const portNum = Number(mailPort || 587)
  const transporter = nodemailer.createTransport({
    host: mailHost,
    port: portNum,
    secure: portNum === 465,  // SSL puro en 465; STARTTLS en 587
    auth: { user: mailUser, pass: mailPass }
  })

  const html = `
    <h2>Nuevo mensaje de contacto</h2>
    <p><b>Nombre:</b> ${nombre || '-'}</p>
    <p><b>Email:</b> ${email}</p>
    <p><b>Teléfono:</b> ${telefono || '-'}</p>
    <p><b>Mensaje:</b><br>${(mensaje || '').replace(/\n/g, '<br>')}</p>
  `

  try {
    await transporter.sendMail({
      from: mailFrom || mailUser,           // <- por si no pones MAIL_FROM
      to: process.env.CONTACT_TO || (mailFrom || mailUser),
      replyTo: email,
      subject: `Contacto: ${nombre || email}`,
      html
    })
    return { ok: true }
  } catch (err: any) {
    // Deja el detalle en logs (útil: Invalid login / From not allowed / etc.)
    console.error('Mailer error:', err?.response || err?.message || err)
    setResponseStatus(event, 500)
    return { ok: false, error: 'No se pudo enviar el correo' }
  }
})
