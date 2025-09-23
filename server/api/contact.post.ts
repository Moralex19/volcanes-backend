// server/api/contact.post.ts
import { defineEventHandler, readBody, setResponseStatus, setHeader, getMethod } from 'h3'
import { Resend } from 'resend'

export default defineEventHandler(async (event) => {
  const { allowedOrigin } = useRuntimeConfig()
  const resend = new Resend(process.env.RESEND_API_KEY)

  if (allowedOrigin) {
    setHeader(event, 'Access-Control-Allow-Origin', allowedOrigin)
    setHeader(event, 'Access-Control-Allow-Methods', 'POST, OPTIONS')
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
  }
  if (getMethod(event) === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }

  const { nombre = '', email = '', telefono = '', mensaje = '' } = await readBody(event) || {}
  if (!email || !mensaje) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Faltan campos requeridos' }
  }

  const html = `
    <h2>Nuevo mensaje de contacto</h2>
    <p><b>Nombre:</b> ${nombre || '-'}</p>
    <p><b>Email:</b> ${email}</p>
    <p><b>Teléfono:</b> ${telefono || '-'}</p>
    <p><b>Mensaje:</b><br>${mensaje.replace(/\n/g, '<br>')}</p>
  `

  try {
    const from = process.env.RESEND_FROM || 'onboarding@resend.dev' // <- solo para pruebas
    const to = process.env.CONTACT_TO!

    const { error } = await resend.emails.send({
      from,                  // DEBE ser @midominio.com cuando el dominio ya esté "Verified"
      to,                    // tu Gmail
      replyTo: email,        // podrás “Responder” al usuario
      subject: `Contacto: ${nombre || email}`,
      html
    })

    if (error) throw error
    return { ok: true }
  } catch (err: any) {
    console.error('Resend error:', err?.message || err)
    setResponseStatus(event, 500)
    return { ok: false, error: 'No se pudo enviar el correo' }
  }
})
