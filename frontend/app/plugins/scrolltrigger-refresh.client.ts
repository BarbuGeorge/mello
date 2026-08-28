import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default defineNuxtPlugin(() => {
	gsap.registerPlugin(ScrollTrigger)

	let lastHeight = 0
	let raf: number | null = null
	let isRefreshing = false

	const observer = new ResizeObserver(() => {
		if (isRefreshing) return

		const height = document.documentElement.scrollHeight
		if (height === lastHeight) return
		lastHeight = height

		if (raf) cancelAnimationFrame(raf)
		raf = requestAnimationFrame(() => {
			isRefreshing = true
			ScrollTrigger.refresh()
			lastHeight = document.documentElement.scrollHeight
			requestAnimationFrame(() => { isRefreshing = false })
		})
	})

	observer.observe(document.body)
})
