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

const DEPTHS       = [2.0, 0.5, 2.5, 0.8, 1.5]
const SCROLL_RATES = [-0.28, 0.14, -0.40, 0.10, -0.22]
const LERP_SPEEDS  = [0.03, 0.08, 0.022, 0.10, 0.045]

const mouse   = { x: 0, y: 0 }
const current = { x: 0, y: 0 }
let scrollTarget  = 0
let scrollSmooths = []
let raf = null

function tick() {
  current.x += (mouse.x - current.x) * 0.07
  current.y += (mouse.y - current.y) * 0.07

  if (navRef.value && !scrolled.value) {
    const navItems = navRef.value.querySelectorAll('.nav-item')
    navItems.forEach((item, i) => {
      if (scrollSmooths[i] === undefined) scrollSmooths[i] = 0
      scrollSmooths[i] += (scrollTarget - scrollSmooths[i]) * LERP_SPEEDS[i % LERP_SPEEDS.length]

      const d  = DEPTHS[i % DEPTHS.length]
      const tx = current.x * 28 * d
      const ty = current.y * 16 * d + scrollSmooths[i] * SCROLL_RATES[i % SCROLL_RATES.length]
      item.style.transform = `translate(${tx}px, ${ty}px)`
    })
  } else if (navRef.value && scrolled.value) {
    navRef.value.querySelectorAll('.nav-item').forEach(item => {
      item.style.transform = ''
    })
  }

  raf = requestAnimationFrame(tick)
}

let cleanupScroll

onMounted(() => {
  const handleScroll = () => {
    const isScrolled = window.scrollY > window.innerHeight * 0.3
    if (isScrolled !== scrolled.value) {
      scrolled.value = isScrolled
      applyScrolledPositions(isScrolled)
    }
  }
  window.addEventListener('scroll', () => { scrollTarget = window.scrollY }, { passive: true })
  window.addEventListener('scroll', handleScroll, { passive: true })
  cleanupScroll = () => window.removeEventListener('scroll', handleScroll)

  const handleMouse = (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5
    mouse.y = e.clientY / window.innerHeight - 0.5
  }
  window.addEventListener('mousemove', handleMouse, { passive: true })

  raf = requestAnimationFrame(tick)

  onUnmounted(() => {
    window.removeEventListener('mousemove', handleMouse)
    cancelAnimationFrame(raf)
  })
})

onUnmounted(() => {
  cleanupScroll?.()
  cancelAnimationFrame(raf)
})
</script>

<template>
  <header>
    <nav ref="navRef">
      <NuxtLink v-for="(item, i) in items" :key="i" :to="item.url"
        :target="item.url.startsWith('#') ? '_self' : item.target" @click="handleClick($event, item.url)"
        class="nav-item" :style="{ animationDelay: `${i * 0.13 + 0.9}s` }">
        <i v-if="item.icon" :class="`bi ${item.icon}`"></i>
        <div class="name">
          <span>{{ item.label }}</span>
        </div>
      </NuxtLink>
    </nav>
  </header>
</template>
