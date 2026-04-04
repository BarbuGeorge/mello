// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	ssr: true, // activează Server-Side Rendering
	srcDir: 'app/',
	serverDir: 'app/server',
	devtools: { enabled: true },
	css: ['~/assets/scss/main.scss'],
	plugins: ['~/plugins/bootstrap.client.ts'],
	components: [
		{ path: '~/components', pathPrefix: false }
	],
	runtimeConfig: {
		public: {
			// URL-ul Strapi, fallback la localhost pentru development
			strapiUrl: process.env.STRAPI_URL || 'http://localhost:1337',
			// Token API Strapi, gol dacă nu e setat
			strapiApiToken: process.env.STRAPI_API_TOKEN || ''
		}
	}
})
