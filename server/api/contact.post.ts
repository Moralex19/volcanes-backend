// server/api/contact.post.ts
import { defineEventHandler, readBody, setResponseStatus, setHeader, getMethod } from 'h3'

export default defineEventHandler(async (event) => {
  const { allowedOrigin, mailFrom, contactTo } = useRuntimeConfig()
  const RESEND_API_KEY = process.env.RESEND_API_KEY

  if (allowedOrigin) {
    setHeader(event, 'Access-Control-Allow-Origin', allowedOrigin)
    setHeader(event, 'Access-Control-Allow-Methods', 'POST, OPTIONS')
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
  }
  if (getMethod(event) === 'OPTIONS') { setResponseStatus(event, 204); return '' }

  const body = await readBody<{ nombre?: string; email?: string; telefono?: string; mensaje?: string }>(event)
  const { nombre = '', email = '', telefono = '', mensaje = '' } = body || {}
  if (!email || !mensaje) { setResponseStatus(event, 400); return { ok:false, error:'Faltan campos requeridos' } }

  const html = `
    <h2>Nuevo mensaje de contacto</h2>
    <p><b>Nombre:</b> ${nombre || '-'}</p>
    <p><b>Email:</b> ${email}</p>
    <p><b>Teléfono:</b> ${telefono || '-'}</p>
    <p><b>Mensaje:</b><br>${mensaje.replace(/\n/g,'<br>')}</p>
  `

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: mailFrom || 'no-reply@tu-dominio.dev', // en Resend puedes usar dominio verificado o @resend.dev en pruebas
        to: [contactTo || mailFrom],
        reply_to: email,
        subject: `Contacto: ${nombre || email}`,
        html
      })
    })

    if (!resp.ok) {
      const t = await resp.text().catch(()=>'')
      console.error('Resend error:', resp.status, t)
      setResponseStatus(event, 502)
      return { ok:false, error:'No se pudo enviar el correo (API)' }
    }

    return { ok:true }
  } catch (e:any) {
    console.error('HTTP mail error:', e?.message || e)
    setResponseStatus(event, 500)
    return { ok:false, error:'No se pudo enviar el correo' }
  }
})
