// Receives a project request from the contact form and records it in Strapi.
//
// This goes through the server (like /api/cms) on purpose: the Strapi token is
// write-capable, so it must never reach the browser. It also means the payload
// is validated once more here — anything posted straight at this endpoint gets
// the same treatment as the form's own checks.
const MAX = { short: 200, long: 5000 }

const str = (v: unknown, limit = MAX.short) =>
  typeof v === 'string' ? v.trim().slice(0, limit) : ''

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const contact = body?.contact ?? {}

  const firstName = str(contact.firstName)
  const email = str(contact.email)
  const description = str(body?.description, MAX.long)

  if (!firstName || !email || !description) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email' })
  }

  const data = {
    FirstName: firstName,
    LastName: str(contact.lastName),
    Email: email,
    Phone: str(contact.phone),
    Link: str(contact.link),
    Company: str(body?.company),
    Industry: str(body?.industry),
    // joined into one readable line — as JSON this rendered in the Strapi
    // admin as a full-height raw code editor just to show a word or two
    Services: Array.isArray(body?.services)
      ? body.services.slice(0, 20).map((s: unknown) => str(s, 60)).filter(Boolean).join(', ')
      : '',
    Description: description,
    Budget: str(body?.budget),
    Timeline: str(body?.timeline),
    Status: 'new',
  }

  try {
    await $fetch(`${config.public.strapiUrl}/api/inquiries`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.strapiApiToken}` },
      body: { data },
    })
  } catch (err: any) {
    // log the real reason server-side, hand the visitor something generic
    console.error('[mello] inquiry -> Strapi failed:', err?.data ?? err?.message ?? err)
    throw createError({ statusCode: 502, statusMessage: 'Could not record the request' })
  }

  return { ok: true }
})
