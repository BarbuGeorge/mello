<script setup lang="ts">
import { useRoute, useAsyncData, useRuntimeConfig, createError } from '#imports'

const route = useRoute()
const slug = route.params.slug as string || 'home'
const config = useRuntimeConfig()

// Build dynamic URL for the Strapi request
const url = `${config.public.strapiUrl}/api/pages?filters[slug][$eq]=${slug}&populate[Content][populate]=*`

const { data: page, error } = await useAsyncData(`page-${slug}`, async () => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.public.strapiApiToken}`
    }
  })

  if (!res.ok) {
    throw createError({ statusCode: res.status, statusMessage: res.statusText })
  }

  const json = await res.json()
  if (!json.data || json.data.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  return json.data[0]
})
</script>

<template>
  <div v-if="error">
    <p>Error: {{ error.statusMessage || error.message }}</p>
  </div>
  <div v-else-if="!page">
    <p>Loading page...</p>
  </div>
  <div v-else>
    <h1>{{ page.Title }}</h1>
    <div>
      <ParsedContentItem
        v-for="(block, index) in page.Content"
        :key="index"
        :block="block"
      />
	  {{ page }}
    </div>
  </div>
</template>