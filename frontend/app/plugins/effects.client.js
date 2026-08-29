import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Wires the interactive hero letters to the Nuxt page lifecycle so they rebind
// after every navigation.
export default defineNuxtPlugin((nuxtApp) => {
  gsap.registerPlugin(ScrollTrigger)
  const kinetic = useKineticType()

  nuxtApp.hook('page:finish', async () => {
    kinetic.stop()
    await nextTick()
    kinetic.start()
    ScrollTrigger.refresh()
  })
})
