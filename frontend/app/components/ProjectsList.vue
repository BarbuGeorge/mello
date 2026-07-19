<script setup>
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

const imageUrls = projects.map(p => p.FeaturedImage ? imgUrl(p.FeaturedImage.url) : null)

const hoveredIndex = ref(0)
const canvasRef = ref(null)

let distortion = null
let textGrow = null

onMounted(async () => {
  const { useDistortionCanvas } = await import('~/composables/useDistortionCanvas')
  distortion = useDistortionCanvas(canvasRef)
  await distortion.setup(imageUrls)

  const ro = new ResizeObserver(() => distortion?.resize())
  ro.observe(canvasRef.value)

  const { useTextGrow } = await import('~/composables/useTextGrow')
  textGrow = useTextGrow()
  textGrow.start()

  onUnmounted(() => {
    ro.disconnect()
    distortion?.dispose()
    textGrow?.stop()
    clearTimeout(hoverTimer)
  })
})

const HOVER_DELAY = 150
let hoverTimer = null

function onHover(i) {
  clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => {
    if (i === hoveredIndex.value) return
    distortion?.transitionTo(i)
    hoveredIndex.value = i
  }, HOVER_DELAY)
}
</script>

<template>
  <section class="projects-list" id="projects">
    <div class="container">
      <div class="text-center mb-10">
        <h2 class="section-title text-white text-grow">Fresh Juice. Freshly Served.</h2>
      </div>
      <div class="row">
        <div class="projects-image-col col-lg-6">
          <div class="projects-image-sticky">
            <canvas ref="canvasRef" />
          </div>
        </div>

        <div class="projects-names-col col-lg-6">
          <a v-for="(project, i) in projects" :key="i"
            :href="project.URL ? (project.URL.startsWith('http') ? project.URL : 'https://' + project.URL) : undefined"
            :target="project.URL ? '_blank' : undefined" :rel="project.URL ? 'noopener noreferrer' : undefined"
            class="project-name h2" :class="{ active: hoveredIndex === i }" @mouseenter="onHover(i)">
            {{ project.Name }}
            <span class="link"></span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
