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

  const startY = window.innerHeight * 0.5

  // The lowest 'top' the section can actually reach depends on how much content follows it
  // on the page — near the bottom of a short page that can be well above 0. Clamp the target
  // so the animation always has room to fully complete instead of stalling partway.
  const naturalTop = section.getBoundingClientRect().top + window.scrollY
  const minReachableTop = naturalTop - (document.documentElement.scrollHeight - window.innerHeight)
  const endY = Math.max(window.innerHeight * 0.05, minReachableTop + 10)

  const update = () => {
    const top = section.getBoundingClientRect().top
    const progress = Math.min(1, Math.max(0, (startY - top) / (startY - endY)))
    // First half of the scroll: all cards rise together, stacked under the first card.
    // Second half: the trailing cards slide sideways into their own flex-row spot.
    const rise = Math.min(1, progress / 0.5)
    const shift = Math.max(0, (progress - 0.5) / 0.5)
    cards.forEach((card, i) => {
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

  // The step number is pinned via CSS (position: sticky) so it naturally hands off from one
  // step to the next as you scroll. This just tracks which step is currently at that pinned
  // spot so its number can get the highlighted badge style — a thin detection band near the
  // sticky offset, rather than anything scroll-position-math-based.
  stepsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => entry.target.classList.toggle('is-active', entry.isIntersecting))
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
  )
  steps.forEach(step => stepsObserver.observe(step))
}

onUnmounted(() => {
  if (onScroll) useNuxtApp().$lenis?.off('scroll', onScroll)
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
    <div v-if="section.className?.includes('section-hero')" class="hero-eyes">
      <div class="eye eye1"><div class="pupil"></div></div>
      <div class="eye eye2"><div class="pupil"></div></div>
    </div>
  </section>
</template>
