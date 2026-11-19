<script setup>
// Maps the content editor's plain-language choice (Strapi enum) to the actual CSS class.
const TITLE_EFFECT_CLASS = {
  grow: 'text-grow',
}

const props = defineProps({
  section: Object
})

// The section's "title" is its first heading block; the effect only applies there.
const titleBlockIndex = computed(() => props.section.blocks?.findIndex(b => b.type === 'heading') ?? -1)
const titleClassName = computed(() => TITLE_EFFECT_CLASS[props.section.titleEffect] ?? undefined)

const sectionRef = ref(null)
let onScroll = null
let onStepsScroll = null
let onStepsMouse = null
let stepsObserver = null

onMounted(() => {
  if (props.section.className?.includes('section-made-here')) setupMadeHere()
  if (props.section.className?.includes('section-steps')) setupSteps()
})

function setupMadeHere() {
  const section = sectionRef.value
  const cards = Array.from(section.querySelectorAll('.cms-row > .card'))
  if (!cards.length) return

  // Each card starts stacked under the first card's left edge and pushed down by a full
  // viewport height, then eases toward its natural flex-row spot (dx 0, y 0) continuously
  // as the section scrolls up through the viewport — no CSS transition, driven every frame.
  const firstLeft = cards[0].getBoundingClientRect().left
  const dx = cards.map(card => firstLeft - card.getBoundingClientRect().left)

  // The scroll range is deliberately long: it starts as soon as the section
  // peeks in from the bottom and runs until it is well into the viewport.
  const startY = window.innerHeight * 0.9
  const desiredEndY = -window.innerHeight * 0.1

  // The lowest 'top' the section can actually reach depends on how much content follows it
  // on the page — near the bottom of a short page that can be well above 0. Clamp the target
  // so the animation always has room to fully complete instead of stalling partway.
  const naturalTop = section.getBoundingClientRect().top + window.scrollY
  const minReachableTop = naturalTop - (document.documentElement.scrollHeight - window.innerHeight)
  const endY = Math.max(desiredEndY, minReachableTop + 10)

  const ease = t => 1 - Math.pow(1 - t, 3)
  const clamp01 = t => Math.min(1, Math.max(0, t))

  // Timeline (0..1 over the scroll range):
  //   0 – RISE     every card rises together, stacked in the same spot (the first
  //                card's left edge)
  //   RISE – 1     then the trailing cards slide from that stack into their own
  //                place in the row — the LAST card leaves first, each one before
  //                it follows a beat later (so 3 goes, then 2 right behind it)
  const RISE = 0.4
  const SLIDE = 0.4    // how much of the timeline one card's slide takes
  const trailing = cards.length - 1
  const STAGGER = Math.min(0.03, (1 - RISE - SLIDE) / Math.max(1, trailing - 1))
  const slideStart = i => RISE + (trailing - i) * STAGGER

  const update = () => {
    const top = section.getBoundingClientRect().top
    const progress = clamp01((startY - top) / (startY - endY))
    const rise = ease(clamp01(progress / RISE))
    cards.forEach((card, i) => {
      const shift = i === 0 ? 1 : ease(clamp01((progress - slideStart(i)) / SLIDE))
      card.style.transform = `translate(${dx[i] * (1 - shift)}px, ${100 * (1 - rise)}dvh)`
    })
  }

  update()
  const { $lenis } = useNuxtApp()
  onScroll = update
  $lenis?.on('scroll', onScroll)
}

function setupSteps() {
  const section = sectionRef.value
  const steps = Array.from(section.querySelectorAll('.cms-row > .cms-column'))
  if (!steps.length) return

  const eye = section.querySelector('.steps-eye')
  const pupil = eye?.querySelector('.pupil')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // The step number is pinned via CSS (position: sticky) so it naturally hands off from one
  // step to the next as you scroll. This tracks which step is currently at that pinned spot
  // so its number gets the highlighted badge style — and the mascot eye (also sticky, riding
  // the right rail) blinks whenever a new step takes over.
  stepsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        entry.target.classList.toggle('is-active', entry.isIntersecting)
        if (entry.isIntersecting && eye && !reduced) {
          eye.classList.remove('is-blink')
          void eye.offsetWidth // restart the blink animation
          eye.classList.add('is-blink')
        }
      })
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
  )
  steps.forEach(step => stepsObserver.observe(step))

  // progress line; until a pointer shows up (touch), the pupil glances left
  // toward the content, guided by scroll progress
  let hasPointer = false
  const updateProgress = () => {
    const rect = section.getBoundingClientRect()
    const total = Math.max(1, rect.height - window.innerHeight * 0.58)
    const p = Math.min(1, Math.max(0, (window.innerHeight * 0.42 - rect.top) / total))
    section.style.setProperty('--steps-progress', p.toFixed(4))
    if (pupil && !hasPointer) pupil.style.translate = `-4px ${(p * 10 - 5).toFixed(1)}px`
  }
  updateProgress()
  onStepsScroll = updateProgress
  useNuxtApp().$lenis?.on('scroll', onStepsScroll)

  if (eye && pupil && !reduced) {
    onStepsMouse = (e) => {
      const r = eye.getBoundingClientRect()
      if (r.bottom < 0 || r.top > window.innerHeight) return
      hasPointer = true
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      const dist = Math.hypot(dx, dy) || 1
      const travel = Math.min(r.width * 0.17, dist * 0.1)
      pupil.style.translate = `${(dx / dist) * travel}px ${(dy / dist) * travel}px`
    }
    window.addEventListener('pointermove', onStepsMouse, { passive: true })
  }
}

onUnmounted(() => {
  if (onScroll) useNuxtApp().$lenis?.off('scroll', onScroll)
  if (onStepsScroll) useNuxtApp().$lenis?.off('scroll', onStepsScroll)
  if (onStepsMouse) window.removeEventListener('pointermove', onStepsMouse)
  stepsObserver?.disconnect()
})
</script>

<template>
  <section class="cms-section" :class="section.className" ref="sectionRef">
    <CmsBlock
      v-for="(block, i) in section.blocks"
      :key="`b-${i}`"
      :block="block"
      :animateWords="section.className?.includes('section-hero')"
      :titleClassName="i === titleBlockIndex ? titleClassName : undefined"
    />
    <div v-if="section.columns?.length" class="cms-row">
      <CmsColumn
        v-for="(col, i) in section.columns"
        :key="i"
        :column="col"
      />
    </div>
    <CmsBlock
      v-for="(block, i) in section.afterBlocks"
      :key="`ab-${i}`"
      :block="block"
    />
    <div v-if="section.className?.includes('section-steps')" class="steps-rail" aria-hidden="true">
      <div class="steps-rail__line"><div class="steps-rail__fill"></div></div>
      <div class="steps-rail__spacer">
        <div class="steps-eye"><div class="pupil"></div></div>
      </div>
    </div>
    <div v-if="section.className?.includes('section-hero')" class="hero-eyes">
      <div class="eye eye1"><div class="pupil"></div></div>
      <div class="eye eye2"><div class="pupil"></div></div>
    </div>
  </section>
</template>
