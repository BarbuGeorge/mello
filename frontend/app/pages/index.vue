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
  let lastCut = 0

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
      // a spinning eye carries its pupil around with it: express the world-space
      // look direction in the eye's rotated frame
      const ang = -(p.parentElement.__angle || 0)
      const ux = dx / dist, uy = dy / dist
      const lx = ux * Math.cos(ang) - uy * Math.sin(ang)
      const ly = ux * Math.sin(ang) + uy * Math.cos(ang)
      p.style.transform = `translate(${lx * travel}px, ${ly * travel}px)`
    })

    // hero-eyes is fixed to the viewport so it must be hidden once the hero scrolls out of view
    const heroRect = hero.getBoundingClientRect()
    const isVisible = heroRect.bottom > 0 && heroRect.top < window.innerHeight
    if (isVisible !== heroVisible) {
      heroVisible = isVisible
      heroEyes.classList.toggle('is-out-of-view', !isVisible)
    }

    // While an eye is held or flying, the container is raised above the hero text
    // (z-index 100) — which would also put it above every section below. Clip it
    // at the hero's bottom edge so, as you scroll, the eyes pass *under* the
    // content that follows, the way they do at rest. Insets are huge and negative
    // on the other sides so the eyes stay free to roam over the rest of the hero.
    const cut = Math.max(0, Math.round((heroEyes.getBoundingClientRect().bottom - heroRect.bottom) * 2) / 2)
    if (cut !== lastCut) {
      lastCut = cut
      heroEyes.style.clipPath = cut > 0 ? `inset(-9999px -9999px ${cut}px -9999px)` : ''
    }

    raf = requestAnimationFrame(tick)
  }

  const onMouse = (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5
    mouse.y = e.clientY / window.innerHeight - 0.5
    // hover-to-close is a mouse thing: a finger sliding over an eye would
    // shut its lids with no hover-out to ever open them again
    if (e.pointerType !== 'mouse') return
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

  // Drag / throw / bounce / roll-back: real-ish ball physics (useEyePhysics).
  // Lids go back to their open state whenever an eye gets home, like before.
  const eyePhysics = useEyePhysics()
  // On phones/tablets the nav is a bar fixed along the bottom (the <nav> itself
  // is only fixed in that layout); thrown eyes land on top of it, not under it.
  const navBar = document.querySelector('header nav')
  eyePhysics.start({
    eyes,
    container: heroEyes,
    floorInset: () => (navBar && getComputedStyle(navBar).position === 'fixed' ? navBar.offsetHeight : 0),
    // hovering closes an eye's lids; once it's picked up they open again, so a
    // held / flying eye stays a visible white ball (closed lids are the same
    // dark as the sections below the hero and it would vanish against them)
    onGrab: (eye) => {
      clearTimeout(eyeTimers.get(eye))
      if (eye.classList.contains('is-closing')) {
        eye.classList.remove('is-closing')
        eye.classList.add('is-opening')
        const t = setTimeout(() => eye.classList.remove('is-opening'), 500)
        eyeTimers.set(eye, t)
      }
    },
    onHome: (eye) => {
      clearTimeout(eyeTimers.get(eye))
      eye.classList.remove('is-closing', 'is-opening')
      eye.classList.add('is-opening')
      const t = setTimeout(() => eye.classList.remove('is-opening'), 500)
      eyeTimers.set(eye, t)
    },
  })

  // Kinetic hero text: gummy hover + grab-and-rearrange (useKineticType)
  const kineticType = useKineticType()
  kineticType.start()

  // pointer, not mouse: on a phone the pupils follow your finger too
  window.addEventListener('pointermove', onMouse, { passive: true })
  raf = requestAnimationFrame(tick)

  // Mark eyes as open after all animations complete (heroEyesIn + eyeLidOpen)
  setTimeout(() => {
    hero.querySelectorAll('.eye').forEach(el => el.classList.add('is-open'))
  }, 2100)

  onUnmounted(() => {
    window.removeEventListener('pointermove', onMouse)
    cancelAnimationFrame(raf)
    eyePhysics.stop()
    kineticType.stop()
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
