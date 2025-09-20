// server/api/contact.post.ts
import { readBody, setHeader, defineEventHandler } from 'h3'
import nodemailer from 'nodemailer'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig()

  // CORS preflight
  if (event.method === 'OPTIONS') {
    setHeader(event, 'Access-Control-Allow-Origin', cfg.allowedOrigin || '*')
    setHeader(event, 'Access-Control-Allow-Methods', 'POST, OPTIONS')
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
    setHeader(event, 'Access-Control-Max-Age', '86400')
    event.node.res.statusCode = 204
    return ''
  }
  setHeader(event, 'Access-Control-Allow-Origin', cfg.allowedOrigin || '*')

  try {
    const { nombre, email, telefono, mensaje } = await readBody(event) || {}
    if (!nombre || !email || !mensaje) {
      return { ok: false, error: 'Faltan campos obligatorios' }
    }

    const host = cfg.mailHost
    const port = Number(cfg.mailPort) || 465
    const user = cfg.mailUser
    const pass = cfg.mailPass
    const from = cfg.mailFrom || user
    const to   = process.env.CONTACT_TO || cfg.contactTo || user  // <- usa CONTACT_TO

    if (!host || !user || !pass || !to) {
      return { ok: false, error: 'Config SMTP incompleta (host/user/pass/to)' }
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true para 465
      auth: { user, pass }
    })

    // Verifica conexión SMTP (útil para detectar credenciales inválidas)
    await transporter.verify()

    const info = await transporter.sendMail({
      from,
      to,
      subject: `Nuevo mensaje de contacto: ${nombre}`,
      replyTo: email,
      text: `Nombre: ${nombre}\nEmail: ${email}\nTeléfono: ${telefono}\n\n${mensaje}`,
      html: `<p><b>Nombre:</b> ${nombre}</p>
             <p><b>Email:</b> ${email}</p>
             <p><b>Teléfono:</b> ${telefono || '-'}</p>
             <p><b>Mensaje:</b><br>${mensaje.replace(/\n/g, '<br>')}</p>`
    })

    return { ok: true, id: info.messageId }
  } catch (err: any) {
    // LOG al server para que lo veas en Railway
    console.error('MAIL_ERROR:', err?.message, err)
    return { ok: false, error: err?.message || 'No se pudo enviar el correo' }
  }
})
