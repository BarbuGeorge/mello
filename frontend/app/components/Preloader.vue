<template>
  <div v-if="active" class="preloader" ref="root">
    <div class="preloader__cols" ref="cols"><span v-for="n in 5" :key="n"></span></div>
    <div class="preloader__content" ref="content">
      <span class="preloader__brand">mello<em>&reg;</em></span>
      <span class="preloader__count"><b ref="count">0</b><i>%</i></span>
    </div>
  </div>
</template>

<script setup>
import { gsap } from 'gsap'

const active = ref(true)
const cols = ref(null)
const content = ref(null)
const count = ref(null)

onMounted(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const lenis = useNuxtApp().$lenis

  document.documentElement.classList.add('is-loading')
  lenis?.stop?.()

  const finish = () => {
    active.value = false
    document.documentElement.classList.remove('is-loading')
    lenis?.start?.()
    // let the rest of the page choreograph its entrance
    window.dispatchEvent(new CustomEvent('mello:loaded'))
  }

  if (reduce) { finish(); return }

  const counter = { v: 0 }
  const tl = gsap.timeline({ onComplete: finish })
  tl.to(counter, {
    v: 100, duration: 1.5, ease: 'power1.inOut',
    onUpdate: () => { if (count.value) count.value.textContent = Math.round(counter.v) },
  })
  tl.to(content.value, { opacity: 0, y: -24, duration: 0.4, ease: 'power2.in' }, '-=0.2')
  tl.to(cols.value.children, {
    yPercent: -100, duration: 0.85, ease: 'power4.inOut', stagger: 0.07,
  }, '-=0.1')
})
</script>
