// Hero eyeballs as real little balls.
//
// Drag: the eye follows the hand with a bit of lag and swings/tilts with the
// motion. Let go and it keeps the speed you threw it with, falls under gravity,
// bounces off the floor/walls/ceiling (squashing on impact and wobbling back),
// and picks up spin from the floor so it visibly rolls. Once it has come to
// rest it rolls back to its spot, eases the spin out, and drops into place.
// Two eyes also bump into each other; a held eye shoves a resting one.
//
// Everything is plain per-eye state stepped on a fixed 1/120s timestep and
// written out as one transform. Coordinates: x/y are offsets (px) from the
// eye's resting spot, a is degrees (clockwise, like CSS).
export function useEyePhysics() {
  const G = 2400            // px/s²
  const AIR = 0.25          // linear drag, 1/s
  const FLOOR_REST = 0.52   // bounciness
  const WALL_REST = 0.6
  const ROLL_RESIST = 1.1   // rolling friction, 1/s
  const SLIP_RATE = 10      // how fast a skid turns into a roll, 1/s
  const MAX_V = 3400
  const STEP = 1 / 120
  const RAD = 180 / Math.PI

  let items = []
  let container = null
  let opts = {}
  let raf = null
  let last = 0
  let acc = 0
  let listeners = []
  const pointer = { x: 0, y: 0 }

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

  function bounds(it) {
    const vw = document.documentElement.clientWidth
    return {
      minX: it.r - it.hx,
      maxX: vw - it.r - it.hx,
      ceilY: it.r - it.hy,
      // while sinking into its spot the "floor" is the spot itself (which sits
      // below the visible floor, half tucked under the fold)
      floorY: it.stage === 'sink' ? 0 : vhFloor(it),
    }
  }

  function measureHome(it) {
    const rect = it.el.getBoundingClientRect()
    it.hx = rect.left + rect.width / 2 - it.x
    it.hy = rect.top + rect.height / 2 - it.y
    it.r = it.el.offsetWidth / 2 || 65
  }

  function anyActive() { return items.some(it => it.mode !== 'home') }

  function ensureLoop() {
    if (raf === null) { last = 0; acc = 0; raf = requestAnimationFrame(frame) }
  }

  function goHome(it) {
    it.mode = 'home'; it.stage = ''
    it.x = it.y = it.vx = it.vy = it.a = it.omega = 0
    it.sqx = it.sqy = it.vsqx = it.vsqy = 0
    it.el.style.transform = ''
    it.el.__angle = 0
    it.el.classList.remove('is-dragging')
    opts.onHome?.(it.el)
    if (!anyActive() && container) container.style.zIndex = ''
  }

  function squash(it, axis, impact) {
    const amt = clamp(impact / 2200, 0.05, 0.38)
    if (axis === 'y') { it.sqy = Math.max(it.sqy, amt); it.vsqy = 0 }
    else { it.sqx = Math.max(it.sqx, amt); it.vsqx = 0 }
  }

  // ---- one physics step -------------------------------------------------
  function stepItem(it, dt) {
    // squash springs: underdamped on purpose, so a landing jiggles
    const K = 900, C = 26
    it.vsqy += (-K * it.sqy - C * it.vsqy) * dt; it.sqy += it.vsqy * dt
    it.vsqx += (-K * it.sqx - C * it.vsqx) * dt; it.sqx += it.vsqx * dt

    const b = bounds(it)

    if (it.mode === 'drag') {
      // An eye picked up from its spot starts below the floor (the spot is
      // tucked under the fold, or behind the bottom nav bar on a phone). It
      // may stay that low while held, but once lifted above the floor it
      // can't be pushed back under — and a plain tap doesn't make it jump.
      it.dragFloor = Math.min(it.dragFloor, Math.max(vhFloor(it), it.y))
      const tx = clamp(pointer.x - it.gx - it.hx, b.minX, b.maxX)
      const ty = clamp(pointer.y - it.gy - it.hy, b.ceilY, it.dragFloor)
      const k = 1 - Math.exp(-dt * 28)
      const px = it.x, py = it.y
      it.x += (tx - it.x) * k
      it.y += (ty - it.y) * k
      // smoothed velocity — this is what the throw is made of
      it.vx = it.vx * 0.6 + ((it.x - px) / dt) * 0.4
      it.vy = it.vy * 0.6 + ((it.y - py) / dt) * 0.4
      // hangs off the hand: swings with sideways speed, settles when still
      const target = clamp(it.vx * 0.012, -28, 28)
      it.a += (target - it.a) * (1 - Math.exp(-dt * 8))
      it.omega = 0
      return
    }

    // ---- flying / returning ----
    const returning = it.mode === 'return'

    if (returning && it.stage === 'roll' && it.onFloor) {
      // roll home: aim for a speed proportional to the distance left, so it
      // accelerates, cruises, and eases out like a ball losing momentum
      const vDes = clamp(-it.x * 5, -720, 720)
      const ax = clamp((vDes - it.vx) * 9, -1900, 1900)
      // the motor is the floor: push the speed and the spin together so it
      // rolls instead of skidding
      it.vx += ax * dt
      it.omega += (ax * dt) / it.r
    }

    it.vy += G * dt
    const air = Math.exp(-AIR * dt)
    it.vx *= air
    it.vy *= air
    it.vx = clamp(it.vx, -MAX_V, MAX_V)
    it.vy = clamp(it.vy, -MAX_V, MAX_V)

    it.x += it.vx * dt
    it.y += it.vy * dt

    // walls & ceiling
    if (it.x < b.minX) {
      it.x = b.minX
      if (it.vx < 0) { squash(it, 'x', -it.vx); it.vx = -it.vx * WALL_REST }
    } else if (it.x > b.maxX) {
      it.x = b.maxX
      if (it.vx > 0) { squash(it, 'x', it.vx); it.vx = -it.vx * WALL_REST }
    }
    if (it.y < b.ceilY) {
      it.y = b.ceilY
      if (it.vy < 0) { squash(it, 'y', -it.vy); it.vy = -it.vy * 0.5 }
    }

    // floor
    let contact = false
    if (it.y >= b.floorY) {
      it.y = b.floorY
      if (it.vy > 0) {
        const impact = it.vy
        const rest = it.stage === 'sink' ? 0.25 : FLOOR_REST
        it.vy = -it.vy * rest
        if (impact > 220) squash(it, 'y', impact)
        if (Math.abs(it.vy) < 140) it.vy = 0
      }
      contact = true
    }
    it.onFloor = contact && Math.abs(it.vy) < 1

    if (contact) {
      // skid -> roll: friction against the floor trades sliding speed for spin
      // (solid sphere: 2/7 of the slip goes to the body, 5/7 to the spin)
      const slip = it.vx - it.omega * it.r
      const f = slip * (1 - Math.exp(-dt * SLIP_RATE))
      it.vx -= f * (2 / 7)
      it.omega += (f * (5 / 7)) / it.r
      const roll = Math.exp(-ROLL_RESIST * dt)
      it.vx *= roll
      it.omega *= roll
    } else {
      it.omega *= Math.exp(-0.15 * dt)
    }
    it.a += it.omega * dt * RAD

    // ---- return choreography ----
    if (it.mode === 'fly') {
      const calm = Math.hypot(it.vx, it.vy) < 130
      it.restT = calm ? it.restT + dt : 0
      // normally that's on the floor; the timeout covers a perch on the other eye
      if (it.restT > (it.onFloor ? 0.25 : 1.0)) {
        it.mode = 'return'; it.stage = it.stage === 'sink' ? 'sink' : 'roll'; it.restT = 0
      }
    } else if (returning) {
      if (it.stage === 'roll') {
        // rolling: the spin must match the distance travelled, so it is only
        // eased toward "upright" over the last stretch, once it is nearly there
        const near = clamp(1 - Math.abs(it.x) / 110, 0, 1)
        const upright = Math.round(it.a / 360) * 360
        it.a += (upright - it.a) * (1 - Math.exp(-dt * 16 * near * near))
        if (Math.abs(it.x) < 3 && Math.abs(it.vx) < 45) { it.stage = 'sink'; it.onFloor = false }
      } else if (it.stage === 'sink') {
        const upright = Math.round(it.a / 360) * 360
        it.a += (upright - it.a) * (1 - Math.exp(-dt * 12))
        it.x += (0 - it.x) * (1 - Math.exp(-dt * 14))
        it.vx = 0
        if (Math.abs(it.y) < 0.4 && Math.abs(it.vy) < 25 && Math.abs(it.a - upright) < 0.3 && Math.abs(it.x) < 0.4) {
          goHome(it)
        }
      }
    }
  }

  // the visible floor: the viewport's bottom edge, raised by whatever the page
  // says covers it (the bottom nav bar on phones and tablets)
  function vhFloor(it) { return window.innerHeight - (opts.floorInset?.() ?? 0) - it.r - it.hy }

  // eye vs eye. A resting or held eye can't be moved by the other's impulse
  // (held: driven by the hand; resting: wakes up and gets shoved instead).
  function collide(a, b, dt) {
    const ax = a.hx + a.x, ay = a.hy + a.y
    const bx = b.hx + b.x, by = b.hy + b.y
    let dx = bx - ax, dy = by - ay
    let dist = Math.hypot(dx, dy)
    const min = a.r + b.r
    if (dist >= min) return
    // a returning eye passes a resting one (ghost) — otherwise it could get
    // stuck behind it on the way home
    if ((a.mode === 'return' && b.mode === 'home') || (b.mode === 'return' && a.mode === 'home')) return
    if (a.mode === 'home' && b.mode === 'home') return

    if (dist < 0.001) { dx = 1; dy = -0.001 * (Math.random() + 0.5); dist = 1 }
    const nx = dx / dist, ny = dy / dist

    // wake a resting eye that got hit
    for (const e of [a, b]) {
      // stays at its own level ('sink' floor = its spot) so it slides aside
      // instead of popping up onto the visible floor
      if (e.mode === 'home') { e.mode = 'fly'; e.stage = 'sink'; e.vx = e.vy = 0; e.omega = 0; e.restT = 0 }
    }
    if (container) container.style.zIndex = '100'

    const wa = a.mode === 'drag' ? 0 : 1
    const wb = b.mode === 'drag' ? 0 : 1
    const wsum = wa + wb
    if (wsum === 0) return

    const pen = min - dist
    a.x -= nx * pen * (wa / wsum); a.y -= ny * pen * (wa / wsum)
    b.x += nx * pen * (wb / wsum); b.y += ny * pen * (wb / wsum)

    const rvx = b.vx - a.vx, rvy = b.vy - a.vy
    const vn = rvx * nx + rvy * ny
    if (vn < 0) {
      const e = 0.6
      const j = (-(1 + e) * vn) / wsum
      a.vx -= j * nx * wa; a.vy -= j * ny * wa
      b.vx += j * nx * wb; b.vy += j * ny * wb
      const hit = -vn
      if (hit > 200) { squash(a, 'x', hit * 0.6); squash(b, 'x', hit * 0.6) }
    }
  }

  function render(it) {
    const sx = 1 + it.sqy * 0.7 - it.sqx
    const sy = 1 - it.sqy + it.sqx * 0.7
    // scale before rotate: the squash stays aligned with the floor/wall while
    // the ball itself spins
    it.el.style.transform =
      `translate(${it.x.toFixed(2)}px, ${it.y.toFixed(2)}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)}) rotate(${it.a.toFixed(2)}deg)`
    // the page reads this to keep the pupil looking at the cursor while spinning
    it.el.__angle = it.a / RAD
  }

  function frame(ts) {
    if (!last) last = ts
    const dt = Math.min(0.05, (ts - last) / 1000)
    last = ts
    acc += dt

    while (acc >= STEP) {
      for (const it of items) if (it.mode !== 'home') stepItem(it, STEP)
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) collide(items[i], items[j], STEP)
      }
      // safety net: a NaN or an eye somehow far outside goes straight home
      for (const it of items) {
        if (it.mode !== 'home' && (!Number.isFinite(it.x + it.y + it.a) || Math.abs(it.x) > 6000 || Math.abs(it.y) > 6000)) goHome(it)
      }
      acc -= STEP
    }

    for (const it of items) if (it.mode !== 'home') render(it)

    if (anyActive()) raf = requestAnimationFrame(frame)
    else { raf = null; last = 0 }
  }

  function grab(it, e) {
    e.preventDefault()
    // pick it up wherever it currently is (mid-air, rolling, sinking...); every
    // eye's spot is refreshed since resting ones take part in collisions too
    items.forEach(measureHome)
    it.mode = 'drag'; it.stage = ''
    it.a -= 360 * Math.round(it.a / 360) // same look, smaller number
    it.omega = 0
    pointer.x = e.clientX; pointer.y = e.clientY
    it.gx = e.clientX - (it.hx + it.x)
    it.gy = e.clientY - (it.hy + it.y)
    it.dragFloor = Math.max(vhFloor(it), it.y)
    it.vx = it.vy = 0
    // keep getting this finger's moves even when it slides off the eye
    it.el.setPointerCapture?.(e.pointerId)
    it.el.classList.add('is-dragging')
    if (container) container.style.zIndex = '100'
    opts.onGrab?.(it.el)
    ensureLoop()
  }

  function release(it) {
    if (it.mode !== 'drag') return
    const speed = Math.hypot(it.vx, it.vy)
    if (reduced() || (Math.hypot(it.x, it.y) < 5 && speed < 80)) { goHome(it); return }
    const s = speed > MAX_V ? MAX_V / speed : 1
    it.vx *= s; it.vy *= s
    it.omega = (it.vx / it.r) * 0.3 // a thrown ball spins a little
    it.mode = 'fly'; it.stage = ''; it.restT = 0
  }

  function on(target, ev, fn, o) {
    target.addEventListener(ev, fn, o)
    listeners.push(() => target.removeEventListener(ev, fn, o))
  }

  // eyes: NodeList/array of .eye elements, container: their fixed wrapper
  function start(options) {
    opts = options
    container = options.container
    items = Array.from(options.eyes).map(el => ({
      el, mode: 'home', stage: '',
      hx: 0, hy: 0, r: 65,
      x: 0, y: 0, vx: 0, vy: 0, a: 0, omega: 0,
      sqx: 0, sqy: 0, vsqx: 0, vsqy: 0,
      gx: 0, gy: 0, dragFloor: 0, restT: 0, onFloor: false,
    }))

    // pointer events, so a finger can grab and throw an eye just like a mouse
    // (the eyes have touch-action: none, so touching one doesn't scroll)
    items.forEach(it => {
      on(it.el, 'pointerdown', (e) => { if (e.isPrimary && e.button === 0) grab(it, e) })
    })
    on(window, 'pointermove', (e) => { if (e.isPrimary) { pointer.x = e.clientX; pointer.y = e.clientY } }, { passive: true })
    const up = () => items.forEach(release)
    on(window, 'pointerup', up)
    on(window, 'pointercancel', up)
    on(window, 'blur', up)
  }

  function stop() {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null }
    listeners.forEach(off => off())
    listeners = []
    items.forEach(it => { it.el.style.transform = ''; it.el.classList.remove('is-dragging') })
    items = []
  }

  return { start, stop }
}
