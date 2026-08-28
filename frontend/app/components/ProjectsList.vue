<script setup>
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const props = defineProps({
  limit: { type: Number, default: null },
})

const { fetchCms } = useCms()

const query = `
query {
  projects {
    Name
    URL
    FeaturedImage {
      url
      alternativeText
    }
  }
}
`

const { public: { strapiUrl } } = useRuntimeConfig()

const response = await fetchCms(query)
const allProjects = response?.data?.projects ?? []
const projects = props.limit ? allProjects.slice(0, props.limit) : allProjects

function imgUrl(url) {
  if (!url) return ''
  return url.startsWith('http') ? url : strapiUrl + url
}

function projectHref(project) {
  if (!project.URL) return undefined
  return project.URL.startsWith('http') ? project.URL : 'https://' + project.URL
}

const imageUrls = projects.map(p => p.FeaturedImage ? imgUrl(p.FeaturedImage.url) : null)

const wrapperRef = ref(null)
const trackRef = ref(null)
const cardRefs = ref([])
let textGrow = null
let scrollTrigger = null

onUnmounted(() => {
  textGrow?.stop()
  scrollTrigger?.kill()
  scrollTrigger = null
})

function updateActiveCard(wrapper) {
  const center = wrapper.getBoundingClientRect().left + wrapper.clientWidth / 2
  let closest = null
  let closestDist = Infinity
  for (const el of cardRefs.value) {
    if (!el) continue
    const r = el.getBoundingClientRect()
    const dist = Math.abs(r.left + r.width / 2 - center)
    if (dist < closestDist) {
      closestDist = dist
      closest = el
    }
  }
  for (const el of cardRefs.value) {
    if (el) el.classList.toggle('is-active', el === closest)
  }
}

onMounted(async () => {
  const { useTextGrow } = await import('~/composables/useTextGrow')
  textGrow = useTextGrow()
  textGrow.start()

  gsap.registerPlugin(ScrollTrigger)

  const track = trackRef.value
  const wrapper = wrapperRef.value

  const tween = gsap.to(track, {
    x: () => -(track.scrollWidth - wrapper.clientWidth),
    ease: 'none',
    scrollTrigger: {
      trigger: wrapper,
      start: 'top top',
      end: () => '+=' + (track.scrollWidth - wrapper.clientWidth),
      scrub: true,
      pin: true,
      invalidateOnRefresh: true,
      onUpdate: () => updateActiveCard(wrapper),
    },
  })
  scrollTrigger = tween.scrollTrigger
  updateActiveCard(wrapper)
  ScrollTrigger.refresh()
})
</script>

<template>
  <section class="projects-slider" id="projects">
    <div class="projects-slider__intro">
      <h2 class="section-title text-white text-grow">Fresh Juice. Freshly Served.</h2>
    </div>

    <div class="horizontal-wrapper" ref="wrapperRef">
      <div class="horizontal-track" ref="trackRef">
        <div v-for="(project, i) in projects" :key="i" class="slide-card" :ref="el => (cardRefs[i] = el)">
          <img v-if="imageUrls[i]" :src="imageUrls[i]" :alt="project.FeaturedImage?.alternativeText || project.Name"
            class="slide-card__img" loading="lazy" />
          <div class="slide-card__overlay">
            <span class="slide-card__index">{{ String(i + 1).padStart(2, '0') }}</span>
            <h3 class="slide-card__name">{{ project.Name }}</h3>
            <a v-if="project.URL" :href="projectHref(project)" target="_blank" rel="noopener noreferrer"
              class="slide-card__link">View project</a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
