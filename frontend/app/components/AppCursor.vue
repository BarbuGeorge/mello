<template>
  <div class="cursor" ref="ring" aria-hidden="true">
    <span class="cursor__label">{{ label }}</span>
  </div>
  <div class="cursor-dot" ref="dot" aria-hidden="true"></div>
</template>

<script setup>
const ring = ref(null)
const dot = ref(null)
const label = ref('')
let raf = null
let cleanup = null

// Delegated targets so CMS/async content gets cursor states for free.
const TARGETS = '[data-cursor], a, button, [role="button"], .rail__link'
function resolveState(el) {
  if (el.dataset?.cursor) return { state: el.dataset.cursor, label: el.dataset.cursorLabel ?? '' }
  return { state: 'hover', label: '' }
}

onMounted(() => {
  const r = ring.value
  const d = dot.value
  if (!r || !d) return
  if (window.matchMedia('(pointer: coarse)').matches) { r.style.display = 'none'; d.style.display = 'none'; return }

  let x = -100, y = -100
  let rx = -100, ry = -100
  let started = false

  const move = (e) => {
    x = e.clientX; y = e.clientY
    // dot is 1:1 with the pointer, ring trails
    d.style.transform = `translate(${x}px, ${y}px)`
    if (!started) { rx = x; ry = y; started = true; r.classList.add('is-active'); d.classList.add('is-active') }
  }
  const tick = () => {
    rx += (x - rx) * 0.16
    ry += (y - ry) * 0.16
    r.style.transform = `translate(${rx}px, ${ry}px)`
    raf = requestAnimationFrame(tick)
  }

  let current = null
  const setState = (state, text) => {
    r.classList.toggle('is-hover', state === 'hover')
    r.classList.toggle('is-view', state === 'view')
    label.value = text
  }
  const onOver = (e) => {
    const t = e.target.closest?.(TARGETS)
    if (t === current) return
    current = t
    t ? setState(...Object.values(resolveState(t))) : setState(null, '')
  }
  const onDown = () => r.classList.add('is-down')
  const onUp = () => r.classList.remove('is-down')
  const hide = () => { r.classList.remove('is-active'); d.classList.remove('is-active') }
  const show = () => { if (started) { r.classList.add('is-active'); d.classList.add('is-active') } }

  window.addEventListener('pointermove', move, { passive: true })
  document.addEventListener('mouseover', onOver, { passive: true })
  document.addEventListener('mousedown', onDown)
  document.addEventListener('mouseup', onUp)
  document.documentElement.addEventListener('mouseleave', hide)
  document.documentElement.addEventListener('mouseenter', show)
  raf = requestAnimationFrame(tick)

  cleanup = () => {
    window.removeEventListener('pointermove', move)
    document.removeEventListener('mouseover', onOver)
    document.removeEventListener('mousedown', onDown)
    document.removeEventListener('mouseup', onUp)
    document.documentElement.removeEventListener('mouseleave', hide)
    document.documentElement.removeEventListener('mouseenter', show)
    cancelAnimationFrame(raf)
  }
})
onUnmounted(() => cleanup?.())
</script>
