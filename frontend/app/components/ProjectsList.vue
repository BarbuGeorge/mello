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
    Category
    Year
    Summary
    FeaturedImage {
      url
      alternativeText
    }
    Description {
      __typename
      ... on ComponentDefaultSection {
        className
        titleEffect
        blocks
        afterBlocks
        columns {
          __typename
          className
          blocks
        }
      }
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

// index of the project whose detail dialog is open, or null
const openIndex = ref(null)

// arriving on /projects/<slug> redirects here carrying the slug, so the right
// project opens straight away (see pages/projects/[slug].vue)
const route = useRoute()
onMounted(() => {
  const wanted = route.query.project
  if (!wanted) return
  // drop the hand-off param straight away: the dialog replaces the URL with
  // /projects/<slug> anyway, and leaving it behind would mean closing the
  // dialog lands on /?project=… and a reload would re-open it
  history.replaceState(history.state, '', '/')
  const i = projects.findIndex(p => projectSlug(p.Name) === wanted)
  if (i !== -1) openIndex.value = i
})

// Safety net: whatever route the dialog took to close, the hand-off param
// must never be what the visitor is left looking at. Runs after the dialog's
// own history.back() has settled.
watch(openIndex, (value) => {
  if (value !== null || typeof window === 'undefined') return
  setTimeout(() => {
    if (window.location.search.includes('project=')) {
      history.replaceState(history.state, '', window.location.pathname)
    }
  }, 50)
})

const wrapperRef = ref(null)
const trackRef = ref(null)
const cardRefs = ref([])
const rippleCanvasRefs = ref([])
let textGrow = null
let scrollTrigger = null
const ripples = new Map() // card index -> instance, created lazily, one per card
let rippleListeners = []
let snapCleanup = null

onUnmounted(() => {
  textGrow?.stop()
  scrollTrigger?.kill()
  scrollTrigger = null
  snapCleanup?.()
  snapCleanup = null
  rippleListeners.forEach(off => off())
  rippleListeners = []
  ripples.forEach(r => r.destroy())
  ripples.clear()
})

// Water-ripple on the image, trailing the pointer while you hover a card —
// desktop-with-a-real-mouse only, and skipped outright for
// prefers-reduced-motion.
//
// Each card gets its WebGL context created lazily, the first time it's
// hovered — not all five upfront for cards you may never look at. Once made,
// a card keeps its context for the slider's lifetime rather than tearing it
// down on every mouseleave: repeated context creation/teardown churn is a
// known source of driver instability on some GPUs, and the context is
// essentially free while idle (the render loop stops itself the moment
// nothing is left decaying — see useRippleImage.js).
async function setupRipples() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

  const { useRippleImage } = await import('~/composables/useRippleImage')
  const { attach } = useRippleImage()

  cardRefs.value.forEach((card, i) => {
    const canvas = rippleCanvasRefs.value[i]
    const url = imageUrls[i]
    if (!card || !canvas || !url) return
    // guards against a stale instance from an earlier HMR remount still
    // being wired to this same physical canvas
    if (canvas.dataset.rippleWired) return
    canvas.dataset.rippleWired = '1'

    const onEnter = () => { if (!ripples.has(i)) ripples.set(i, attach(canvas, url)) }
    const onMove = (e) => {
      const instance = ripples.get(i)
      if (!instance) return
      const r = card.getBoundingClientRect()
      if (!r.width || !r.height) return
      instance.pointer((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
    }

    card.addEventListener('pointerenter', onEnter)
    card.addEventListener('pointermove', onMove)
    rippleListeners.push(() => {
      card.removeEventListener('pointerenter', onEnter)
      card.removeEventListener('pointermove', onMove)
    })
  })

  const onResize = () => ripples.forEach(r => r.resize())
  window.addEventListener('resize', onResize)
  rippleListeners.push(() => window.removeEventListener('resize', onResize))
}

// Snap to the nearest slide once the user stops scrolling.
//
// ScrollTrigger's own `snap` waits for scroll events to stop — but Lenis
// keeps emitting them throughout its ~1.2s smooth-scroll ease, so the snap
// only began once all that inertia had played out, then took its own
// animation on top: a second and a half before anything settled. This drives
// the snap off the raw wheel input instead, and cuts the inertia short by
// handing the scroll straight to Lenis, so it reacts as soon as you stop.
function setupSnap(st) {
  if (projects.length < 2) return
  const lenis = useNuxtApp().$lenis
  if (!lenis) return

  const step = 1 / (projects.length - 1)
  let timer = null
  let snapping = false

  const trySnap = () => {
    timer = null
    if (snapping || !st.isActive) return
    // still coasting (e.g. a hard flick meant to blow past the whole section,
    // or simply momentum they haven't finished riding) — don't grab them
    // mid-glide, just re-check shortly
    if (Math.abs(lenis.velocity ?? 0) > 11) {
      timer = setTimeout(trySnap, 50)
      return
    }
    const target = Math.round(st.progress / step) * step
    const y = st.start + (st.end - st.start) * target
    if (Math.abs(y - window.scrollY) < 2) return
    snapping = true
    lenis.scrollTo(y, {
      duration: 0.55,
      // eases in as well as out: a plain ease-out starts at full speed, which
      // is what made the snap feel like it yanked you
      easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      onComplete: () => { snapping = false },
    })
    setTimeout(() => { snapping = false }, 900) // in case onComplete never lands
  }

  const onWheel = () => {
    snapping = false // user took over again
    clearTimeout(timer)
    timer = setTimeout(trySnap, 120)
  }

  window.addEventListener('wheel', onWheel, { passive: true })
  snapCleanup = () => {
    window.removeEventListener('wheel', onWheel)
    clearTimeout(timer)
  }
}

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
  setupRipples()

  const { useTextGrow } = await import('~/composables/useTextGrow')
  textGrow = useTextGrow()
  textGrow.start()

  gsap.registerPlugin(ScrollTrigger)

  const track = trackRef.value
  const wrapper = wrapperRef.value
  const intro = wrapper.querySelector('.projects-slider__intro')

  // Same big -> normal shrink every other .text-grow title on the site gets
  // while you scroll onto it (useTextGrow tracks the element's own position,
  // but that freezes once pinning locks the wrapper in place — so this is the
  // same 1.5 -> 1 shrink, just driven by ScrollTrigger over the exact approach
  // range, ending precisely as the pin engages instead of stalling mid-way).
  if (intro) {
    gsap.fromTo(intro, { scale: 1.5 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: wrapper, start: 'top bottom', end: 'top top', scrub: true },
    })
  }

  // Once pinned, the caption belongs to slide one, not the whole gallery: it
  // fades out (no second grow — only the approach gets that) over the first
  // slide's share of the horizontal scroll. A real scrubbed tween, not a
  // value set by hand in onUpdate — onUpdate only runs on scroll events, so a
  // layout refresh with no scroll right after it (resizing the window,
  // opening devtools — anything that fires the site's ResizeObserver) could
  // leave it stuck on whatever opacity it last had. A tween tied to its own
  // ScrollTrigger re-renders itself on every refresh, scrolled or not.
  const introFadeFrac = projects.length > 1 ? Math.min(1, (1 / (projects.length - 1)) * 0.12) : 1
  if (intro) {
    gsap.to(intro, {
      opacity: 0, y: -16, ease: 'none',
      scrollTrigger: {
        trigger: wrapper,
        start: 'top top',
        end: () => '+=' + (track.scrollWidth - wrapper.clientWidth) * introFadeFrac,
        scrub: true,
      },
    })
  }

  const tween = gsap.to(track, {
    x: () => -(track.scrollWidth - wrapper.clientWidth),
    ease: 'none',
    scrollTrigger: {
      trigger: wrapper,
      start: 'top top',
      end: () => '+=' + (track.scrollWidth - wrapper.clientWidth),
      scrub: true,
      // snapping is handled by setupSnap() below, not ScrollTrigger's own
      // `snap` — see the comment there for why
      pin: true,
      invalidateOnRefresh: true,
      onUpdate: () => updateActiveCard(wrapper),
    },
  })
  scrollTrigger = tween.scrollTrigger
  setupSnap(scrollTrigger)
  updateActiveCard(wrapper)
  ScrollTrigger.refresh()
})
</script>

<template>
  <section class="projects-slider" id="projects">
    <div class="horizontal-wrapper" ref="wrapperRef">
      <div class="projects-slider__intro">
        <h2 class="section-title text-white">Fresh Juice. Freshly Served.</h2>
      </div>

      <div class="horizontal-track" ref="trackRef">
        <div v-for="(project, i) in projects" :key="i" class="slide-card" :ref="el => (cardRefs[i] = el)">
          <img v-if="imageUrls[i]" :src="imageUrls[i]" :alt="project.FeaturedImage?.alternativeText || project.Name"
            class="slide-card__img" loading="lazy" />
          <canvas v-if="imageUrls[i]" class="slide-card__ripple" aria-hidden="true"
            :ref="el => (rippleCanvasRefs[i] = el)"></canvas>
          <div class="slide-card__overlay">
            <span class="slide-card__index">{{ String(i + 1).padStart(2, '0') }}</span>
            <h3 class="slide-card__name">{{ project.Name }}</h3>
            <button type="button" class="slide-card__link" @click="openIndex = i">View project</button>
          </div>
        </div>
      </div>
    </div>

    <ProjectModal
      v-if="openIndex !== null"
      :projects="projects"
      :images="imageUrls"
      :index="openIndex"
      @open="openIndex = $event"
      @close="openIndex = null"
    />
  </section>
</template>
