<script setup>
const { fetchCms } = useCms()

const query = `
query {
  navigation {
    items { label url target icon }
  }
}
`
const response = await fetchCms(query)
const items = response?.data?.navigation?.items ?? []

const open = ref(false)
const activeIdx = ref(0)

function handleClick(e, url) {
  open.value = false
  if (!url.startsWith('#')) return
  e.preventDefault()
  const el = document.querySelector(url)
  if (!el) return
  const lenis = useNuxtApp().$lenis
  // smooth-scroll through Lenis so it doesn't fight the native scrollIntoView
  lenis ? lenis.scrollTo(el, { offset: -24 }) : el.scrollIntoView({ behavior: 'smooth' })
}

let io = null
onMounted(() => {
  // scroll-spy: highlight the rail item whose target section is centered
  const hashItems = items
    .map((it, i) => ({ i, el: it.url?.startsWith('#') ? document.querySelector(it.url) : null }))
    .filter(x => x.el)
  if (!hashItems.length) return

  io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      const found = hashItems.find(h => h.el === entry.target)
      if (found) activeIdx.value = found.i
    })
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 })
  hashItems.forEach(h => io.observe(h.el))
})
onUnmounted(() => io?.disconnect())

const pad = n => String(n + 1).padStart(2, '0')
</script>

<template>
  <aside class="rail" :class="{ 'is-open': open }">
    <div class="rail__top">
      <NuxtLink to="/" class="rail__brand" @click="open = false">mello<span>&reg;</span></NuxtLink>
      <button class="rail__burger" :aria-expanded="open" aria-label="Menu" @click="open = !open">
        <span></span><span></span>
      </button>
    </div>

    <nav class="rail__nav">
      <NuxtLink v-for="(item, i) in items" :key="i" :to="item.url"
        :target="item.url.startsWith('#') ? '_self' : item.target"
        @click="handleClick($event, item.url)"
        class="rail__link" :class="{ 'is-active': i === activeIdx }">
        <span class="rail__num">{{ pad(i) }}</span>
        <span class="rail__label">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="rail__bottom">
      <a href="#contact" class="btn btn-primary rail__cta" @click="handleClick($event, '#contact')">
        Start a project
      </a>
      <p class="rail__avail"><span class="rail__dot"></span> Available for work</p>
    </div>
  </aside>
</template>
