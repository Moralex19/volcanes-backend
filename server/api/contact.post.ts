// server/api/contact.post.ts
import { defineEventHandler, readBody, setResponseStatus, setHeader, getMethod } from 'h3'
import nodemailer from 'nodemailer'

export default defineEventHandler(async (event) => {
  // ENV de Railway (Project → Variables)
  const {
    allowedOrigin,   // ALLOWED_ORIGIN = https://tu-sitio.netlify.app
    mailHost,        // MAIL_HOST = smtp.gmail.com
    mailPort,        // MAIL_PORT = 465 (recomendado) o 587
    mailUser,        // MAIL_USER = tu_gmail@gmail.com
    mailPass,        // MAIL_PASS = App Password de Gmail
    mailFrom         // MAIL_FROM (opcional, usualmente igual a MAIL_USER)
  } = useRuntimeConfig()

  // CORS: permite solo tu frontend
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
    nombre?: string
    email?: string
    telefono?: string
    mensaje?: string
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
    host: mailHost,                 // ej: smtp.gmail.com
    port: portNum,                  // 465 => secure true (SSL)
    secure: portNum === 465,        // true si 465; false si 587 (STARTTLS)
    auth: { user: mailUser, pass: mailPass },
    // Opcional, ayuda en algunos proveedores/redes:
    tls: { servername: mailHost }
  })

  // Contenido del correo
  const html = `
    <h2>Nuevo mensaje de contacto</h2>
    <p><b>Nombre:</b> ${nombre || '-'}</p>
    <p><b>Email:</b> ${email}</p>
    <p><b>Teléfono:</b> ${telefono || '-'}</p>
    <p><b>Mensaje:</b><br>${(mensaje || '').replace(/\n/g, '<br>')}</p>
  `

  try {
    // Verifica conexión SMTP (útil para detectar credenciales erróneas)
    await transporter.verify()

    await transporter.sendMail({
      from: mailFrom || mailUser,                           // remitente
      to: process.env.CONTACT_TO || (mailFrom || mailUser), // destinatario
      replyTo: email,
      subject: `Contacto: ${nombre || email}`,
      html
    })

    return { ok: true }
  } catch (err: any) {
    console.error('Mailer error:', err?.response || err?.message || err)
    setResponseStatus(event, 500)
    return { ok: false, error: 'No se pudo enviar el correo' }
  }
})
