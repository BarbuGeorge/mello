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

function handleClick(e, url) {
  if (!url.startsWith('#')) return
  e.preventDefault()
  const el = document.querySelector(url)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

const navRef = ref(null)
const scrolled = ref(false)

function applyScrolledPositions(isScrolled) {
  if (!navRef.value) return
  const navItems = navRef.value.querySelectorAll('.nav-item')
  if (isScrolled) {
    const gap = 10
    const itemHeight = 54
    const total = navItems.length * itemHeight + (navItems.length - 1) * gap
    const startTop = (window.innerHeight - total) / 2
    navItems.forEach((item, i) => {
      item.style.left = '20px'
      item.style.top = `${startTop + i * (itemHeight + gap)}px`
    })
  } else {
    navItems.forEach((item) => {
      item.style.left = ''
      item.style.top = ''
    })
  }
}

let removeScrollListener

onMounted(() => {
  const handleScroll = () => {
    const isScrolled = window.scrollY > window.innerHeight * 0.3
    if (isScrolled !== scrolled.value) {
      scrolled.value = isScrolled
      applyScrolledPositions(isScrolled)
    }
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  removeScrollListener = () => window.removeEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  removeScrollListener?.()
})
</script>

<template>
  <header>
    <nav ref="navRef">
      <NuxtLink v-for="(item, i) in items" :key="i" :to="item.url"
        :target="item.url.startsWith('#') ? '_self' : item.target" @click="handleClick($event, item.url)"
        class="nav-item" :style="{ animationDelay: `${i * 0.12 + 0.1}s` }">
        <i v-if="item.icon" :class="`bi ${item.icon}`"></i>
        <span class="name">{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </header>
</template>
