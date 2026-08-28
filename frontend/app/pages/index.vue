<script setup>
const { fetchCms } = useCms()

// Word parallax on mouse move
onMounted(() => {
  const hero = document.querySelector('.section-hero')
  if (!hero) return

  const targets = [
    { el: hero.querySelector('h1'), sx: 18, sy: 9 },
    { el: hero.querySelector('h2'), sx: 10, sy: 5 },
    { el: hero.querySelector('ul'), sx: 5,  sy: 2 },
  ].filter(t => t.el)

  const pupils = Array.from(hero.querySelectorAll('.pupil'))
  const eyes   = Array.from(hero.querySelectorAll('.hero-eyes .eye'))
  const mouse   = { x: 0, y: 0 }
  const current = { x: 0, y: 0 }
  let raf = null

  const eyeTimers = new WeakMap()
  const heroEyes  = hero.querySelector('.hero-eyes')
  let heroVisible = true

  const tick = () => {
    current.x += (mouse.x - current.x) * 0.06
    current.y += (mouse.y - current.y) * 0.06
    targets.forEach(({ el, sx, sy }) => {
      el.style.transform = `translate(${current.x * sx}px, ${current.y * sy}px)`
    })
    const cx = (current.x + 0.5) * window.innerWidth
    const cy = (current.y + 0.5) * window.innerHeight
    pupils.forEach(p => {
      const r  = p.parentElement.getBoundingClientRect()
      const dx = cx - (r.left + r.width  / 2)
      const dy = cy - (r.top  + r.height / 2)
      const dist   = Math.sqrt(dx * dx + dy * dy) || 1
      const travel = Math.min(22, dist * 0.08)
      p.style.transform = `translate(${(dx / dist) * travel}px, ${(dy / dist) * travel}px)`
    })

    // hero-eyes is fixed to the viewport so it must be hidden once the hero scrolls out of view
    const heroRect = hero.getBoundingClientRect()
    const isVisible = heroRect.bottom > 0 && heroRect.top < window.innerHeight
    if (isVisible !== heroVisible) {
      heroVisible = isVisible
      heroEyes.classList.toggle('is-out-of-view', !isVisible)
    }

    raf = requestAnimationFrame(tick)
  }

  const onMouse = (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5
    mouse.y = e.clientY / window.innerHeight - 0.5
    eyes.forEach(eye => {
      if (!eye.classList.contains('is-open')) return
      if (eye.classList.contains('is-dragging')) return
      const r = eye.getBoundingClientRect()
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom

      if (inside && !eye.classList.contains('is-closing')) {
        clearTimeout(eyeTimers.get(eye))
        eye.classList.remove('is-opening')
        eye.classList.add('is-closing')
      } else if (!inside && eye.classList.contains('is-closing')) {
        eye.classList.remove('is-closing')
        eye.classList.add('is-opening')
        const t = setTimeout(() => eye.classList.remove('is-opening'), 650)
        eyeTimers.set(eye, t)
      }
    })
  }

  // Drag + bounce + roll-back for each eye
  // FLOOR_Y = -50: translateY where eye's bottom edge touches the viewport bottom
  // (hero-eyes has bottom:-50px → eye center is naturally at vh-15, floor center at vh-65 → delta = -50)
  const EYE_CIRCUMFERENCE = Math.PI * 130
  const FLOOR_Y = -50
  let activeDrags = 0

  eyes.forEach(eye => {
    const offset = { x: 0, y: 0 }
    let currentAnim = null

    const cancelAnim = () => { if (currentAnim) { currentAnim.cancel(); currentAnim = null } }

    const cleanup = () => {
      cancelAnim()
      eye.classList.remove('is-dragging')
      eye.style.transform = ''
      activeDrags--
      if (activeDrags === 0) heroEyes.style.zIndex = ''
      offset.x = 0; offset.y = 0
      // Force eye open after returning home
      clearTimeout(eyeTimers.get(eye))
      eye.classList.remove('is-closing', 'is-opening')
      eye.classList.add('is-opening')
      const t = setTimeout(() => eye.classList.remove('is-opening'), 500)
      eyeTimers.set(eye, t)
    }

    const release = (fromX, fromY) => {
      if (Math.sqrt(fromX * fromX + fromY * fromY) < 5) { cleanup(); return }

      const aboveFloor = fromY < FLOOR_Y
      const floorX     = fromX
      const rollDist   = Math.sqrt(floorX * floorX + FLOOR_Y * FLOOR_Y)
      const rollAngle  = (rollDist / EYE_CIRCUMFERENCE) * 360
      const rotDir     = fromX >= 0 ? -1 : 1

      if (aboveFloor) {
        const fallDist  = FLOOR_Y - fromY
        const fallDur   = Math.min(480, Math.max(150, fallDist * 1.0))
        const squishDur = 300
        const rollDur   = Math.min(2000, Math.max(600, rollDist * 2.6))
        const total     = fallDur + squishDur + rollDur
        const fi = fallDur / total
        const fb = (fallDur + 130) / total
        const fs = (fallDur + squishDur) / total

        currentAnim = eye.animate([
          { offset: 0,  transform: `translate(${fromX}px,${fromY}px) scale(1)`,                              easing: 'cubic-bezier(0.55,0,1,0.45)' },
          { offset: fi, transform: `translate(${floorX}px,${FLOOR_Y}px) scaleX(1.28) scaleY(0.65)`,         easing: 'cubic-bezier(0,0,0.2,1)' },
          { offset: fb, transform: `translate(${floorX}px,${FLOOR_Y - 14}px) scaleX(0.88) scaleY(1.12)`,    easing: 'cubic-bezier(0,0,0.2,1)' },
          { offset: fs, transform: `translate(${floorX}px,${FLOOR_Y}px) scale(1)`,                           easing: 'cubic-bezier(0.22,1,0.36,1)' },
          { offset: 1,  transform: `translate(0px,0px) rotate(${rotDir * rollAngle}deg)` },
        ], { duration: total, fill: 'forwards' })
      } else {
        const dist    = Math.sqrt(fromX * fromX + fromY * fromY)
        const angle   = (dist / EYE_CIRCUMFERENCE) * 360
        const rollDur = Math.min(2200, Math.max(700, dist * 2.8))
        const total   = 220 + rollDur
        const fs      = 220 / total

        currentAnim = eye.animate([
          { offset: 0,        transform: `translate(${fromX}px,${fromY}px) scale(1)`,                       easing: 'cubic-bezier(0,0,0.2,1)' },
          { offset: 0.4 * fs, transform: `translate(${fromX}px,${fromY}px) scaleX(1.2) scaleY(0.75)`,      easing: 'cubic-bezier(0,0,0.2,1)' },
          { offset: fs,       transform: `translate(${fromX}px,${fromY}px) scale(1)`,                       easing: 'cubic-bezier(0.22,1,0.36,1)' },
          { offset: 1,        transform: `translate(0px,0px) rotate(${rotDir * angle}deg)` },
        ], { duration: total, fill: 'forwards' })
      }

      currentAnim.onfinish = cleanup
    }

    eye.addEventListener('mousedown', (e) => {
      e.preventDefault()
      cancelAnim()

      const startX = e.clientX - offset.x
      const startY = e.clientY - offset.y

      eye.classList.add('is-dragging')
      activeDrags++
      if (activeDrags === 1) heroEyes.style.zIndex = '100'

      const onMove = (ev) => {
        offset.x = ev.clientX - startX
        offset.y = ev.clientY - startY
        eye.style.transform = `translate(${offset.x}px, ${offset.y}px)`
      }

      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        release(offset.x, offset.y)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    })
  })

  window.addEventListener('mousemove', onMouse, { passive: true })
  raf = requestAnimationFrame(tick)

  // Mark eyes as open after all animations complete (heroEyesIn + eyeLidOpen)
  setTimeout(() => {
    hero.querySelectorAll('.eye').forEach(el => el.classList.add('is-open'))
  }, 2100)

  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouse)
    cancelAnimationFrame(raf)
  })
})


const query = `
query {
  pages(filters: { slug: { eq: "home" } }) {
    title
    slug
    Content {
      __typename

      ... on ComponentDefaultSection {
        className
        titleEffect
        blocks
        afterBlocks
        columns {
          __typename
          className
          blocks
        }
      }

      ... on ComponentBuilderVueComponent {
        __typename
        VueComponent
        props
      }
    }
  }
}
`

const response = await fetchCms(query)
const page = response?.data?.pages?.[0]

useHead({ bodyAttrs: { class: page?.slug ?? 'home' } })
</script>

<template>
  <template v-if="page">
    <CmsRenderer :content="page.Content" />
  </template>
</template>
