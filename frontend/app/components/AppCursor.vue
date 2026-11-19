<template>
  <div class="cursor" ref="cursorEl" />
</template>

<script setup>
const cursorEl = ref(null)
let raf = null

onMounted(() => {
  const el = cursorEl.value
  if (!el) return
  if (window.matchMedia('(pointer: coarse)').matches) return

  let x = -999, y = -999
  let cx = -999, cy = -999

  const move = (e) => {
    x = e.clientX
    y = e.clientY
  }

  const tick = () => {
    cx += (x - cx) * 0.18
    cy += (y - cy) * 0.18
    el.style.transform = `translate(calc(${cx}px - 50%), calc(${cy}px - 50%))`
    raf = requestAnimationFrame(tick)
  }

  const onEnter = () => el.classList.add('is-hover')
  const onLeave = () => el.classList.remove('is-hover')

  document.querySelectorAll('a, button, [role="button"]').forEach(link => {
    link.addEventListener('mouseenter', onEnter)
    link.addEventListener('mouseleave', onLeave)
  })

  window.addEventListener('mousemove', move, { passive: true })
  raf = requestAnimationFrame(tick)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
})
</script>
