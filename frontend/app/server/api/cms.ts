export default defineEventHandler(async (event) => {

  const body = await readBody(event)

  const data = await $fetch('http://127.0.0.1:1337/graphql', {
    method: 'POST',
    body
  })

  return data
})
