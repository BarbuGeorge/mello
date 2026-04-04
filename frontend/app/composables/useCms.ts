export function useCms() {

  const fetchCms = async (query: string) => {
    return await $fetch('/api/cms', {
      method: 'POST',
      body: { query }
    })
  }

  return { fetchCms }
}
