export function useTextGrow() {
  const supportsNative = typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: view()')
  if (supportsNative) return { start() {}, stop() {} }

  let els = []
  let ticking = false

  function apply() {
    const vh = window.innerHeight
    for (const el of els) {
      const rect = el.getBoundingClientRect()
      const traveled = vh - rect.top
      const total = vh + rect.height
      const progress = Math.min(1, Math.max(0, traveled / total))
      el.style.transform = `scale(${1.5 - 0.5 * progress})`
    }
    ticking = false
  }

  function onScroll() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(apply)
  }

  function start() {
    els = Array.from(document.querySelectorAll('.text-grow'))
    if (!els.length) return
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
  }

  function stop() {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  }

  return { start, stop }
}
