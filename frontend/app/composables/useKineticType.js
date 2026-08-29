// Kinetic hero typography: letters near the pointer lift, swell and tip away,
// each on its own spring, and can be grabbed and slingshot — pull a letter like
// a rubber band, release, and the recoil ripples through its neighbors.
export function useKineticType() {
  const RADIUS = 130          // px of cursor influence
  const LIFT = 0.22           // fraction of char height
  const SCALE = 0.22
  const TILT = 10             // deg
  const STIFF = 0.14
  const DAMP = 0.72
  const GRAB_MAX = 70         // px of comfortable stretch; beyond it resists

  let chars = []
  let raf = null
  let running = false
  let listeners = []
  let grabbed = null

  const pointer = { x: -9999, y: -9999 }

  function measure() {
    for (const c of chars) {
      const r = c.el.getBoundingClientRect()
      c.cx = r.left + r.width / 2 + window.scrollX - c.x
      c.cy = r.top + r.height / 2 + window.scrollY - c.y
      c.h = r.height || 1
    }
  }

  function frame() {
    let alive = false
    const sx = window.scrollX
    const sy = window.scrollY

    for (const c of chars) {
      let tx = 0, ty = 0, ts = 0, tr = 0

      if (c === grabbed) {
        // rubber band: follows the pointer with growing resistance
        const dx = pointer.x - (c.cx - sx)
        const dy = pointer.y - (c.cy - sy)
        const len = Math.hypot(dx, dy) || 1
        const stretch = len > GRAB_MAX ? GRAB_MAX + (len - GRAB_MAX) * 0.22 : len
        tx = (dx / len) * stretch
        ty = (dy / len) * stretch
        ts = 0.18
        tr = Math.max(-24, Math.min(24, tx * 0.25))
      } else {
        const dx = pointer.x - (c.cx - sx)
        const dy = pointer.y - (c.cy - sy)
        const d = Math.hypot(dx, dy)
        const prox = d < RADIUS ? Math.exp(-((d / RADIUS) ** 2) * 3.2) : 0
        ty = -prox * c.h * LIFT
        ts = prox * SCALE
        tr = prox * TILT * (dx >= 0 ? -1 : 1) * Math.min(1, Math.abs(dx) / 40)
      }

      const k = c === grabbed ? 0.4 : STIFF
      c.vx = (c.vx + (tx - c.x) * k) * DAMP
      c.vy = (c.vy + (ty - c.y) * k) * DAMP
      c.vs = (c.vs + (ts - c.s) * STIFF) * DAMP
      c.vr = (c.vr + (tr - c.r) * STIFF) * DAMP
      c.x += c.vx
      c.y += c.vy
      c.s += c.vs
      c.r += c.vr

      const moving =
        Math.abs(c.x) > 0.05 || Math.abs(c.y) > 0.05 ||
        Math.abs(c.s) > 0.001 || Math.abs(c.r) > 0.05 ||
        tx !== 0 || ty !== 0

      if (moving) {
        alive = true
        c.el.style.transform =
          `translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px) rotate(${c.r.toFixed(2)}deg) scale(${(1 + c.s).toFixed(3)})`
      } else if (c.el.style.transform) {
        c.el.style.transform = ''
      }
    }

    raf = alive ? requestAnimationFrame(frame) : null
  }

  function ensureLoop() {
    if (!running) return
    if (raf === null) raf = requestAnimationFrame(frame)
  }

  function release() {
    if (!grabbed) return
    const g = grabbed
    grabbed = null
    // the recoil ripples outward through the word
    for (const c of chars) {
      if (c === g) continue
      const falloff = Math.exp(-Math.abs(c.i - g.i) / 2.4)
      if (falloff < 0.04) continue
      c.vx += -g.x * 0.1 * falloff
      c.vy += -g.y * 0.12 * falloff
      c.vr += -g.r * 0.08 * falloff
    }
    ensureLoop()
  }

  function on(target, ev, fn, opts) {
    target.addEventListener(ev, fn, opts)
    listeners.push(() => target.removeEventListener(ev, fn, opts))
  }

  function start() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const els = document.querySelectorAll('.section-hero h1 .char, .section-hero h2 .char')
    if (!els.length) return

    chars = Array.from(els).map((el, i) => ({
      el, i, cx: 0, cy: 0, h: 1,
      x: 0, y: 0, s: 0, r: 0,
      vx: 0, vy: 0, vs: 0, vr: 0,
    }))

    // measure after the word entrance choreography has finished, then release
    // the entrance clipping so lifted letters aren't cut off at the top
    const measureTimer = setTimeout(() => {
      measure()
      document.querySelectorAll('.section-hero h1, .section-hero h2')
        .forEach(el => el.classList.add('kinetic-live'))
    }, 1900)
    listeners.push(() => clearTimeout(measureTimer))
    on(window, 'resize', measure)

    on(window, 'pointermove', (e) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      ensureLoop()
    }, { passive: true })

    // grab & slingshot (precise pointers only; on touch it would fight scroll)
    if (window.matchMedia('(pointer: fine)').matches) {
      on(document, 'pointerdown', (e) => {
        const el = e.target.closest?.('.section-hero .char')
        if (!el) return
        const c = chars.find(ch => ch.el === el)
        if (!c) return
        e.preventDefault()
        grabbed = c
        pointer.x = e.clientX
        pointer.y = e.clientY
        ensureLoop()
      })
      on(window, 'pointerup', release)
      on(window, 'pointercancel', release)
    }

    // on touch the letters ripple under the finger while scrolling the hero
    on(window, 'touchmove', (e) => {
      const t = e.touches[0]
      if (!t) return
      pointer.x = t.clientX
      pointer.y = t.clientY
      ensureLoop()
    }, { passive: true })
    on(window, 'touchend', () => { pointer.x = -9999; pointer.y = -9999 })

    const hero = document.querySelector('.section-hero')
    if (hero) {
      const io = new IntersectionObserver(([entry]) => {
        running = entry.isIntersecting
        if (running) ensureLoop()
        else if (raf !== null) { cancelAnimationFrame(raf); raf = null }
      })
      io.observe(hero)
      listeners.push(() => io.disconnect())
    }
    running = true
    ensureLoop()
  }

  function stop() {
    running = false
    grabbed = null
    if (raf !== null) { cancelAnimationFrame(raf); raf = null }
    listeners.forEach(off => off())
    listeners = []
    chars = []
  }

  return { start, stop }
}
