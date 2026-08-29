<script setup>
const { fetchCms } = useCms()

const query = `
query {
  navigation {
    items {
      label
      url
      target
      icon
    }
  }
}
`

const response = await fetchCms(query)
const items = response?.data?.navigation?.items ?? []

const open = ref(false)

function handleClick(e, url) {
  open.value = false
  if (!url.startsWith('#')) return
  e.preventDefault()
  const el = document.querySelector(url)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <header class="site-header" :class="{ 'is-open': open }">
    <div class="site-header__bar">
      <NuxtLink to="/" class="site-header__brand" @click="open = false">mello<span>®</span></NuxtLink>

      <nav class="site-header__nav">
        <NuxtLink v-for="(item, i) in items" :key="i" :to="item.url"
          :target="item.url.startsWith('#') ? '_self' : item.target"
          @click="handleClick($event, item.url)" class="site-header__link">
          {{ item.label }}
        </NuxtLink>
      </nav>

      <a href="#contact" class="btn btn-primary site-header__cta" @click="handleClick($event, '#contact')">
        Start a project
      </a>

      <button class="site-header__burger" :aria-expanded="open" aria-label="Menu" @click="open = !open">
        <span></span><span></span>
      </button>
    </div>
  </header>
</template>
