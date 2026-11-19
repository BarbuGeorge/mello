// Kinetic hero typography.
//
// Hover: letters near the pointer behave like gummy candy — they stretch up off
// the baseline, squash back with an overshoot and wobble to rest, and the ripple
// travels along the word as the pointer sweeps across it (each letter is its own
// underdamped spring).
//
// Grab: a letter can be picked up and moved anywhere, including to another line.
// Each line's natural letter positions are fixed "slots"; when the held letter
// gets nearer another slot, the two swap places and the bumped letter glides
// over. A couple of seconds after the last change (and only when nothing is being
// held) every letter eases back to its original slot.
export function useKineticType() {
  const RADIUS = 130          // px of cursor influence
  const LIFT = 0.22           // fraction of char height
  const STRETCH = 0.30        // extra scaleY at full proximity
  const SQUEEZE = 0.12        // scaleX lost at full proximity (volume-ish)
  const TILT = 10             // deg
  const PUSH = 9              // px a letter is nudged away from the pointer
  // underdamped: ~40% overshoot, settles in ~0.55s at 60fps — the gummy feel
  const GUMMY_K = 0.18
  const GUMMY_D = 0.80
  // rotation / plain follow: calmer
  const STIFF = 0.14
  const DAMP = 0.72
  // gliding into a swapped slot (and back on revert): no bounce
  const SLOT_STIFF = 0.09
  const SLOT_DAMP = 0.74
  const REVERT_MS = 2500      // quiet time before everything goes back

  let chars = []
  let rows = []
  let parents = []
  let raf = null
  let running = false
  let listeners = []
  let grabbed = null
  let revertTimer = null
  let ready = false

  const pointer = { x: -9999, y: -9999 }

  // Splits the (already word-wrapped) hero headings into one span per letter.
  // Words stay whole for assistive tech: the word gets the label, letters hide.
  function splitChars() {
    const made = []
    document.querySelectorAll('.section-hero h1 .word, .section-hero h2 .word').forEach(word => {
      if (word.querySelector('.char')) return
      word.setAttribute('aria-label', word.textContent)
      const walker = document.createTreeWalker(word, NodeFilter.SHOW_TEXT)
      const nodes = []
      while (walker.nextNode()) nodes.push(walker.currentNode)
      nodes.forEach(node => {
        const frag = document.createDocumentFragment()
        for (const ch of Array.from(node.nodeValue)) {
          const span = document.createElement('span')
          span.className = 'char'
          span.setAttribute('aria-hidden', 'true')
          span.textContent = ch
          frag.appendChild(span)
        }
        node.parentNode.replaceChild(frag, node)
      })
    })
    document.querySelectorAll('.section-hero h1 .char, .section-hero h2 .char').forEach(el => made.push(el))
    return made
  }

  function measure() {
    const sx = window.scrollX, sy = window.scrollY
    parents.forEach(p => {
      const r = p.el.getBoundingClientRect()
      p.baseL = r.left + sx - p.dx
      p.baseT = r.top + sy - p.dy
    })
    for (const c of chars) {
      const r = c.el.getBoundingClientRect()
      c.cx = r.left + r.width / 2 + sx - c.x - c.parent.dx
      c.cy = r.top + r.height / 2 + sy - c.y - c.parent.dy
      c.h = r.height || 1
    }
  }

  // Groups chars into visual rows (by natural Y) and freezes each row's
  // left-to-right positions as fixed slots. c.row/c.curSlot are the letter's
  // CURRENT slot; c.homeRow/c.homeSlot never change and are what revert uses.
  function buildRows() {
    rows = []
    const byY = [...chars].sort((a, b) => a.cy - b.cy)
    for (const c of byY) {
      let row = rows.find(r => Math.abs(r.cy - c.cy) < 10)
      if (!row) { row = { cy: c.cy, items: [] }; rows.push(row) }
      row.items.push(c)
    }
    for (const row of rows) {
      row.items.sort((a, b) => a.cx - b.cx)
      row.slotsX = row.items.map(c => c.cx)
      row.order = row.items.slice()
      row.items.forEach((c, idx) => {
        c.homeRow = row; c.homeSlot = idx
        c.row = row; c.curSlot = idx
        c.settling = false
      })
    }
  }

  function nearestRow(y) {
    let best = rows[0], bestD = Infinity
    for (const row of rows) {
      const d = Math.abs(row.cy - y)
      if (d < bestD) { bestD = d; best = row }
    }
    return best
  }

  function nearestSlot(row, x) {
    let best = 0, bestD = Infinity
    for (let i = 0; i < row.slotsX.length; i++) {
      const d = Math.abs(row.slotsX[i] - x)
      if (d < bestD) { bestD = d; best = i }
    }
    return best
  }

  // While held, find the slot (in ANY row) closest to where the letter is and
  // swap it there — this is what lets a letter change lines, not just neighbors.
  function checkSwap(c) {
    if (!rows.length) return
    const targetRow = nearestRow(c.cy + c.y)
    const targetSlot = nearestSlot(targetRow, c.cx + c.x)
    if (targetRow === c.row && targetSlot === c.curSlot) return
    const other = targetRow.order[targetSlot]
    if (other === c) return

    const fromRow = c.row, fromSlot = c.curSlot
    fromRow.order[fromSlot] = other
    targetRow.order[targetSlot] = c
    other.row = fromRow; other.curSlot = fromSlot; other.settling = true
    c.row = targetRow; c.curSlot = targetSlot; c.settling = true
    scheduleRevert()
  }

  function scheduleRevert() {
    clearTimeout(revertTimer)
    revertTimer = setTimeout(() => {
      if (grabbed) { scheduleRevert(); return } // still holding one — wait
      revertAll()
    }, REVERT_MS)
  }

  function revertAll() {
    let changed = false
    for (const row of rows) {
      for (const c of row.items) {
        if (c.row !== row || c.curSlot !== c.homeSlot) { changed = true; c.settling = true }
        c.row = row
        c.curSlot = c.homeSlot
      }
      row.order = row.items.slice()
    }
    if (changed) ensureLoop()
  }

  function frame() {
    let alive = false
    const sx = window.scrollX, sy = window.scrollY

    // the hero headings drift with the mouse (parallax, set from the page); the
    // letters live inside them, so the pointer is compared in their local frame
    for (const p of parents) {
      const r = p.el.getBoundingClientRect()
      p.dx = r.left + sx - p.baseL
      p.dy = r.top + sy - p.baseT
    }

    for (const p of parents) p.lift = 0

    for (const c of chars) {
      let tx = 0, ty = 0, ts = 0, tr = 0, tsx = 0
      const px = pointer.x - c.parent.dx
      const py = pointer.y - c.parent.dy

      if (c === grabbed) {
        tx = px - (c.cx - sx)
        ty = py - (c.cy - sy)
        ts = 0.18
        tsx = -0.06
        tr = Math.max(-24, Math.min(24, tx * 0.25))
      } else {
        // measured from where the letter sits NOW (its current slot), so a
        // moved letter keeps reacting to the pointer at its new spot
        const restX = c.row ? c.row.slotsX[c.curSlot] : c.cx
        const restY = c.row ? c.row.cy : c.cy
        const dx = px - (restX - sx)
        const dy = py - (restY - sy)
        const d = Math.hypot(dx, dy)
        const prox = d < RADIUS ? Math.exp(-((d / RADIUS) ** 2) * 3.2) : 0
        ty = -prox * c.h * LIFT
        ts = prox * STRETCH
        tsx = -prox * SQUEEZE
        tr = prox * TILT * (dx >= 0 ? -1 : 1) * Math.min(1, Math.abs(dx) / 40)
        tx = restX - c.cx - (d > 1 ? (dx / d) * prox * PUSH : 0)
        ty += restY - c.cy
      }

      // c.settling is set by swap/revert and cleared once the letter has really
      // arrived, so the way back gets the same calm glide as the way out
      if (c !== grabbed && c.settling && Math.abs(tx - c.x) < 1 && Math.abs(ty - c.y) < 12) c.settling = false
      const slot = c !== grabbed && c.settling
      const kMove = c === grabbed ? 0.4 : (slot ? SLOT_STIFF : STIFF)
      const dMove = c === grabbed ? DAMP : (slot ? SLOT_DAMP : DAMP)

      c.vx = (c.vx + (tx - c.x) * kMove) * dMove
      c.vy = (c.vy + (ty - c.y) * kMove) * dMove
      c.vr = (c.vr + (tr - c.r) * STIFF) * DAMP
      c.vs = (c.vs + (ts - c.s) * GUMMY_K) * GUMMY_D
      c.vq = (c.vq + (tsx - c.q) * GUMMY_K) * GUMMY_D
      c.x += c.vx; c.y += c.vy; c.r += c.vr; c.s += c.vs; c.q += c.vq

      if (c === grabbed) checkSwap(c)

      // sibling spans have no z-index, so later-in-DOM wins hit-testing where
      // two overlap; raise whichever letter is held or out of place
      c.el.style.zIndex = c === grabbed ? '2' : (slot ? '1' : '')
      // ...and each heading is its own stacking context, so the heading holding
      // a raised letter must outrank the other one too (held one on top)
      if (c === grabbed) c.parent.lift = 2
      else if (slot) c.parent.lift = Math.max(c.parent.lift, 1)

      const moving =
        Math.abs(c.x) > 0.05 || Math.abs(c.y) > 0.05 ||
        Math.abs(c.s) > 0.001 || Math.abs(c.q) > 0.001 || Math.abs(c.r) > 0.05 ||
        Math.abs(c.vs) > 0.001 || tx !== 0 || ty !== 0

      if (moving) {
        alive = true
        c.el.style.transform =
          `translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px) rotate(${c.r.toFixed(2)}deg) scale(${(1 + c.q).toFixed(3)}, ${(1 + c.s).toFixed(3)})`
      } else if (c.el.style.transform) {
        c.el.style.transform = ''
      }
    }

    for (const p of parents) p.el.style.zIndex = p.lift === 2 ? '4' : (p.lift === 1 ? '3' : '')

    raf = alive ? requestAnimationFrame(frame) : null
  }

  function ensureLoop() {
    if (!running || !ready) return
    if (raf === null) raf = requestAnimationFrame(frame)
  }

  function release() {
    if (!grabbed) return
    const g = grabbed
    grabbed = null
    scheduleRevert()
    // the recoil ripples outward through the word
    for (const c of chars) {
      if (c === g) continue
      const falloff = Math.exp(-Math.abs(c.i - g.i) / 2.4)
      if (falloff < 0.04) continue
      c.vx += -g.x * 0.04 * falloff
      c.vy += -g.y * 0.06 * falloff
      c.vr += -g.r * 0.08 * falloff
      c.vs += 0.05 * falloff
    }
    ensureLoop()
  }

  function on(target, ev, fn, opts) {
    target.addEventListener(ev, fn, opts)
    listeners.push(() => target.removeEventListener(ev, fn, opts))
  }

  function start() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!canHover) return

    chars = splitChars().map((el, i) => ({
      el, i, cx: 0, cy: 0, h: 1,
      x: 0, y: 0, r: 0, s: 0, q: 0,
      vx: 0, vy: 0, vr: 0, vs: 0, vq: 0,
      row: null, homeRow: null, homeSlot: 0, curSlot: 0, settling: false,
      parent: null,
    }))
    if (!chars.length) return

    const heads = Array.from(document.querySelectorAll('.section-hero h1, .section-hero h2'))
    parents = heads.map(el => ({ el, dx: 0, dy: 0, baseL: 0, baseT: 0, lift: 0 }))
    chars.forEach(c => { c.parent = parents.find(p => p.el.contains(c.el)) })

    // measure once the word entrance has finished, then release the entrance
    // clipping so lifted letters aren't cut off at the top
    const remeasure = () => { measure(); buildRows() }
    const readyTimer = setTimeout(() => {
      remeasure()
      heads.forEach(el => el.classList.add('kinetic-live'))
      ready = true
      document.fonts?.ready.then(() => { if (running && !grabbed) remeasure() })
    }, 1900)
    listeners.push(() => clearTimeout(readyTimer))
    on(window, 'resize', () => { if (ready && !grabbed) remeasure() })

    on(window, 'pointermove', (e) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      ensureLoop()
    }, { passive: true })

    on(document, 'pointerdown', (e) => {
      if (!ready) return
      const el = e.target.closest?.('.section-hero .char')
      if (!el) return
      const c = chars.find(ch => ch.el === el)
      if (!c) return
      // no preventDefault here: cancelling pointerdown makes the browser stop
      // sending mousemove, which freezes the custom cursor dot and the page's
      // parallax while a letter is held (text selection is stopped on mousedown)
      grabbed = c
      pointer.x = e.clientX
      pointer.y = e.clientY
      clearTimeout(revertTimer)
      ensureLoop()
    })
    on(document, 'mousedown', (e) => {
      if (e.target.closest?.('.section-hero .char')) e.preventDefault()
    })
    on(window, 'pointerup', release)
    on(window, 'pointercancel', release)
    on(window, 'blur', release)

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
  }

  function stop() {
    running = false
    ready = false
    grabbed = null
    clearTimeout(revertTimer)
    if (raf !== null) { cancelAnimationFrame(raf); raf = null }
    listeners.forEach(off => off())
    listeners = []
    chars.forEach(c => { c.el.style.transform = ''; c.el.style.zIndex = '' })
    parents.forEach(p => { p.el.style.zIndex = '' })
    chars = []
    rows = []
    parents = []
  }

  return { start, stop }
}
