export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const data = await $fetch('http://127.0.0.1:1337/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.public.strapiApiToken}`
    },
    body
  })

  return data
})
