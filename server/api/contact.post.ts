import { defineEventHandler, readBody, setResponseStatus, setHeader, getMethod } from 'h3'
import nodemailer from 'nodemailer'

export default defineEventHandler(async (event) => {
  // Variables de entorno (Railway → Variables)
  const {
    allowedOrigin,
    mailHost,
    mailPort,
    mailUser,
    mailPass,
    mailFrom
  } = useRuntimeConfig()

  // CORS: permite solo tu dominio de Netlify
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

  const nombre = body?.nombre || ''
  const email = body?.email || ''
  const telefono = body?.telefono || ''
  const mensaje = body?.mensaje || ''

  if (!email || !mensaje) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Faltan campos requeridos' }
  }

  // Transporter
  const transporter = nodemailer.createTransport({
    host: mailHost,
    port: Number(mailPort || 587),
    secure: Number(mailPort) === 465, // true si usas 465
    auth: { user: mailUser, pass: mailPass }
  })

  // HTML del correo (OJO: backticks bien cerrados)
  const html = `
    <h2>Nuevo mensaje de contacto</h2>
    <p><b>Nombre:</b> ${nombre || '-'}</p>
    <p><b>Email:</b> ${email}</p>
    <p><b>Teléfono:</b> ${telefono || '-'}</p>
    <p><b>Mensaje:</b><br>${(mensaje || '').replace(/\n/g, '<br>')}</p>
  `

  try {
    await transporter.sendMail({
      from: mailFrom,
      to: mailFrom,          // envíatelo a ti mismo
      replyTo: email,
      subject: `Contacto: ${nombre || email}`, // <-- template string cerrada correctamente
      html
    })

    return { ok: true }
  } catch (err) {
    console.error('Mailer error:', err)
    setResponseStatus(event, 500)
    return { ok: false, error: 'No se pudo enviar el correo' }
  }
})
