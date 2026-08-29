import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

// Premium motion layer:
//  - masked line reveals for every heading (SplitText) — the award-grade
//    typographic entrance, not a generic fade-up
//  - a marquee whose speed and skew react to scroll velocity
//  - magnetic buttons
//  - an orchestrated rail entrance once the intro lifts
// Lenis is wired to ScrollTrigger.update in the lenis plugin, so everything
// stays in sync with smooth scroll. Reduced-motion opts out entirely.
export default defineNuxtPlugin((nuxtApp) => {
  gsap.registerPlugin(ScrollTrigger, SplitText)

  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let triggers = []
  let splits = []
  let magnetCleanups = []
  let marqueeRaf = null

  function revealLines(target, { start = 'top 85%', stagger = 0.1, duration = 1, delay = 0 } = {}) {
    const els = gsap.utils.toArray(target)
    els.forEach((el) => {
      if (el.dataset.split) return
      el.dataset.split = '1'
      const split = new SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'sp-line' })
      splits.push({ split, el })
      const tw = gsap.from(split.lines, {
        yPercent: 118, duration, delay, ease: 'power4.out', stagger,
        scrollTrigger: { trigger: el, start, once: true },
      })
      if (tw.scrollTrigger) triggers.push(tw.scrollTrigger)
    })
  }

  function fadeUp(target, vars = {}) {
    gsap.utils.toArray(target).forEach((el) => {
      const tw = gsap.from(el, {
        y: 40, opacity: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }, ...vars,
      })
      if (tw.scrollTrigger) triggers.push(tw.scrollTrigger)
    })
  }

  function magnetic() {
    document.querySelectorAll('.btn-primary, .rail__cta').forEach((btn) => {
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' })
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' })
      const move = (e) => {
        const r = btn.getBoundingClientRect()
        xTo((e.clientX - (r.left + r.width / 2)) * 0.35)
        yTo((e.clientY - (r.top + r.height / 2)) * 0.5)
      }
      const leave = () => { xTo(0); yTo(0) }
      btn.addEventListener('pointermove', move)
      btn.addEventListener('pointerleave', leave)
      magnetCleanups.push(() => {
        btn.removeEventListener('pointermove', move)
        btn.removeEventListener('pointerleave', leave)
        gsap.set(btn, { x: 0, y: 0 })
      })
    })
  }

  function velocityMarquee() {
    const track = document.querySelector('.site-footer__marquee-track')
    if (!track) return
    const half = () => track.scrollWidth / 2 || 1
    let offset = 0
    const lenis = nuxtApp.$lenis
    const tick = () => {
      const v = lenis?.velocity ?? 0
      const speed = 1.1 + Math.min(Math.abs(v) * 0.5, 42)
      offset -= speed
      const h = half()
      if (offset <= -h) offset += h
      const skew = Math.max(-9, Math.min(9, v * -0.45))
      track.style.transform = `translateX(${offset.toFixed(2)}px) skewX(${skew.toFixed(2)}deg)`
      marqueeRaf = requestAnimationFrame(tick)
    }
    marqueeRaf = requestAnimationFrame(tick)
  }

  function railIntro() {
    const items = gsap.utils.toArray('.rail__link')
    gsap.from(['.rail__brand', ...items, '.rail__bottom'], {
      opacity: 0, x: -18, duration: 0.7, ease: 'power3.out', stagger: 0.07,
    })
  }

  function teardown() {
    triggers.forEach((t) => t.kill())
    triggers = []
    splits.forEach(({ split, el }) => { delete el.dataset.split; split.revert() })
    splits = []
    magnetCleanups.forEach((fn) => fn())
    magnetCleanups = []
    if (marqueeRaf) { cancelAnimationFrame(marqueeRaf); marqueeRaf = null }
  }

  async function setup() {
    if (reduce()) return
    await document.fonts.ready // correct line breaks before splitting

    revealLines('.section-what-we-do > h2', { stagger: 0.14 })
    revealLines('.section-made-here > h2', { stagger: 0.14 })
    revealLines('.section-steps > h2', { stagger: 0.14 })
    revealLines('.projects-slider__intro .section-title', { stagger: 0.12 })
    revealLines('.site-footer__title', { stagger: 0.1, duration: 1.05 })

    // service rows + supporting copy keep a lighter fade
    const rows = gsap.utils.toArray('.section-what-we-do .cms-row > .card')
    if (rows.length) {
      const tw = gsap.from(rows, {
        y: 60, opacity: 0, duration: 0.85, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: '.section-what-we-do .cms-row', start: 'top 82%', once: true },
      })
      if (tw.scrollTrigger) triggers.push(tw.scrollTrigger)
    }
    fadeUp('.section-made-here .cms-row > .card', { stagger: 0.1 })
    fadeUp('.section-steps .cms-column h4')
    fadeUp('.section-steps .cms-column p', { duration: 0.8 })
    fadeUp('.site-footer__meta', { y: 24, duration: 0.7 })

    magnetic()
    velocityMarquee()
    ScrollTrigger.refresh()
  }

  // rail entrance fires when the intro curtain lifts (or immediately if skipped)
  let railed = false
  const doRail = () => { if (railed || reduce()) return; railed = true; railIntro() }
  window.addEventListener('mello:loaded', doRail, { once: true })
  // fallback in case the preloader was skipped
  setTimeout(doRail, 2600)

  nuxtApp.hook('page:finish', async () => {
    teardown()
    await nextTick()
    setTimeout(setup, 220)
  })
})
