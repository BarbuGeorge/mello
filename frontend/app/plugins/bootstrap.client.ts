// plugins/bootstrap.client.ts
export default defineNuxtPlugin(() => {
  if (process.client) {
    // Dynamically import only in the browser
    import('bootstrap/dist/js/bootstrap.bundle.min.js')
  }
})
