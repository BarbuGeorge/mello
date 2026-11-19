<script setup>
// Project detail dialog. Teleported to <body> on purpose: the slider it opens
// from is pinned and transformed by GSAP, and a transformed ancestor breaks
// position: fixed for everything inside it.
const props = defineProps({
  projects: { type: Array, required: true },
  images: { type: Array, required: true },
  index: { type: Number, required: true },
})
const emit = defineEmits(['close', 'open'])

const panel = ref(null)
let lastFocused = null
const titleId = 'project-modal-title'

const project = computed(() => props.projects[props.index] ?? {})
const image = computed(() => props.images[props.index] ?? '')

// Up to three other projects, shuffled — never the one being read. Picked in a
// watcher rather than a computed so the order holds still while you're looking
// at it, and only reshuffles when you actually move to another project.
const MORE_COUNT = 3
const more = ref([])

function pickMore() {
  const others = props.projects
    .map((p, i) => ({ project: p, image: props.images[i], i }))
    .filter((entry) => entry.i !== props.index)

  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[others[i], others[j]] = [others[j], others[i]]
  }
  more.value = others.slice(0, MORE_COUNT)
}

// The dialog lives over the home page, so the address bar is driven by the
// History API rather than the router: pushing a real route would unmount the
// page underneath. One entry is pushed when the dialog opens, so Back closes
// it; moving between projects inside the dialog replaces that entry instead of
// stacking one per project.
let pushedEntry = false
let closedByBack = false

function syncUrl(replace) {
  const slug = projectSlug(project.value?.Name)
  if (!slug || typeof window === 'undefined') return
  const url = `/projects/${slug}`
  if (replace) history.replaceState(history.state, '', url)
  else {
    history.pushState({ ...history.state, projectModal: true }, '', url)
    pushedEntry = true
  }
}

function onPopState() {
  closedByBack = true
  emit('close')
}

watch(() => props.index, (_next, prev) => {
  pickMore()
  syncUrl(prev !== undefined)
  // a different project starts at its own beginning, not wherever the last
  // one was scrolled to
  panel.value?.scrollTo({ top: 0 })
  panel.value?.focus()
}, { immediate: true })

function close() {
  emit('close')
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    close()
    return
  }
  if (e.key !== 'Tab' || !panel.value) return

  // keep Tab inside the dialog
  const focusable = panel.value.querySelectorAll(
    'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
  )
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

const href = computed(() => {
  const url = project.value?.URL
  if (!url) return null
  return url.startsWith('http') ? url : `https://${url}`
})

const sections = computed(() => project.value?.Description ?? [])

onMounted(() => {
  lastFocused = document.activeElement
  // Lenis keeps scrolling the page underneath otherwise
  useNuxtApp().$lenis?.stop?.()
  document.documentElement.classList.add('is-modal-open')
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('popstate', onPopState)
  nextTick(() => panel.value?.focus())
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('popstate', onPopState)
  // closing by button or Escape should leave the history as it was found —
  // unless Back is what closed it, in which case the browser already did
  if (pushedEntry && !closedByBack) history.back()
  document.documentElement.classList.remove('is-modal-open')
  useNuxtApp().$lenis?.start?.()
  lastFocused?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <!-- data-lenis-prevent: Lenis swallows wheel events page-wide, which stops
         this overlay from scrolling natively; the attribute tells it to leave
         events that start in here alone -->
    <div ref="panel" class="project-modal" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1"
      data-lenis-prevent>
      <button type="button" class="project-modal__close" aria-label="Close" @click="close">
        <i class="bi bi-x-lg" aria-hidden="true"></i>
      </button>

      <div class="project-modal__inner">
        <h2 :id="titleId" class="project-modal__title">{{ project.Name }}</h2>

        <div class="project-modal__head">
          <!-- Category / Year / live link, as a definition list: these are
               label-value pairs, not a layout grid pretending to be one -->
          <dl v-if="project.Category || project.Year || href" class="project-meta">
            <div v-if="project.Category" class="project-meta__item">
              <dt>Category</dt>
              <dd>{{ project.Category }}</dd>
            </div>
            <div v-if="project.Year" class="project-meta__item">
              <dt>Year</dt>
              <dd>{{ project.Year }}</dd>
            </div>
            <div v-if="href" class="project-meta__item">
              <dt>Live</dt>
              <dd>
                <a :href="href" target="_blank" rel="noopener noreferrer" class="project-meta__link">
                  Visit site <span aria-hidden="true">↗</span>
                </a>
              </dd>
            </div>
          </dl>

          <p v-if="project.Summary" class="project-modal__summary">{{ project.Summary }}</p>
        </div>

        <!-- same shot the card on the home page uses -->
        <img v-if="image" :src="image" :alt="project.FeaturedImage?.alternativeText || project.Name"
          class="project-modal__img" />

        <div v-if="sections.length" class="project-modal__content">
          <CmsRenderer :content="sections" />
        </div>
        <p v-else-if="!project.Summary" class="project-modal__empty">
          No write-up for this one yet.
        </p>

        <section v-if="more.length" class="more-projects">
          <h3 class="more-projects__title">More Projects</h3>
          <ul class="more-projects__grid">
            <li v-for="entry in more" :key="entry.i">
              <button type="button" class="more-projects__card" @click="emit('open', entry.i)">
                <span v-if="entry.image" class="more-projects__frame">
                  <img :src="entry.image" alt="" class="more-projects__img" />
                </span>
                <span class="more-projects__name">{{ entry.project.Name }}</span>
                <span v-if="entry.project.Category" class="more-projects__meta">
                  {{ entry.project.Category }}
                </span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </Teleport>
</template>
