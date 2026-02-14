<template>
	<!-- Dynamic component from Strapi -->
	<component v-if="block.__component === 'content.dynamic-content'"
		:is="loadDynamicComponent(block.InternalComponent)" />

	<!-- If it's a Strapi component -->
	<Section v-else-if="block.__component === 'layout.group-columns'" class="container group-columns">

		<!-- Render the rich-text content if provided -->
		<div v-if="Array.isArray(block.Content) && block.Content.length" class="group-columns-content mb-4">
			<ParsedContentItem v-for="(child, i) in block.Content" :key="`gc-content-${i}`" :block="child" />
		</div>

		<!-- Render columns only if there are any -->
		<div v-if="Array.isArray(block.Columns) && block.Columns.length" class="row">
			<ColumnBlock v-for="col in block.Columns" :key="col.id" :col="col" />
		</div>
	</Section>


	<!-- Heading -->
	<component :is="tag" v-else-if="tag" :class="blockClass">
		<template v-for="(child, i) in block.children" :key="i">
			<ParsedContentItem v-if="child.children" :block="child" />
			{{ child.text }}
		</template>
	</component>

	<!-- Lists, paragraphs, fallback remain the same -->
	<ul v-else-if="block.type === 'list' && block.format === 'unordered'" :class="blockClass">
		<ParsedContentItem v-for="(item, i) in block.children" :key="i" :block="item" />
	</ul>

	<ol v-else-if="block.type === 'list' && block.format === 'ordered'" :class="blockClass">
		<ParsedContentItem v-for="(item, i) in block.children" :key="i" :block="item" />
	</ol>

	<li v-else-if="block.type === 'list-item'" :class="blockClass">
		<template v-for="(child, i) in block.children" :key="i">
			<ParsedContentItem v-if="child.children" :block="child" />
			<span v-else>{{ child.text }}</span>
		</template>
	</li>

	<p v-else-if="block.type === 'paragraph'" :class="blockClass">
		<template v-for="(child, i) in block.children" :key="i">
			<ParsedContentItem v-if="child.children" :block="child" />
			<span v-else>{{ child.text }}</span>
		</template>
	</p>
	<a :href="block.url" v-else-if="block.type === 'link'" :class="blockClass">
		<template v-for="(child, i) in block.children" :key="i">
			<ParsedContentItem v-if="child.children" :block="child" />
			<span v-else>{{ child.text }}</span>
		</template>
	</a>


	<!-- <pre v-else>{{ JSON.stringify(block, null, 2) }}</pre> -->
</template>


<script setup lang="ts">
import { defineAsyncComponent, computed } from 'vue'

const props = defineProps<{ block: any }>()

const modules = import.meta.glob([
	'/components/**/*.vue',
])

function sanitize(s: string) {
	return String(s ?? '')
		.trim()
		.replace(/^[`"'‘’“”]+|[`"'‘’“”]+$/g, '')
		.replace(/\.vue$/i, '')
		.replace(/[\u200B-\u200D\uFEFF]/g, '')
}
function toKebab(s: string) {
	return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[_\s]+/g, '-').toLowerCase()
}
function toPascal(s: string) {
	return s
		.replace(/[_-\s]+/g, ' ')
		.replace(/\b\w/g, m => m.toUpperCase())
		.replace(/\s/g, '')
}

function loadDynamicComponent(input: string) {
	const base = sanitize(input)
	const candidates = [
		`${base}.vue`,
		`${toKebab(base)}.vue`,
		`${toPascal(base)}.vue`,
	]

	const entry = Object.entries(modules).find(([path]) =>
		candidates.some(c => path.endsWith('/' + c))
	)

	if (!entry) {
		console.error('[Dynamic] Component not found for:', input, 'Candidates:', candidates)
		return null
	}

	const loader = entry[1] as () => Promise<any>
	return defineAsyncComponent(loader)
}

// (the rest of your computed stuff)
const tag = computed(() => {
	const b = props.block
	if (!b) return null
	if (b.type === 'heading' && b.level) return `h${b.level}`
	if (b.type === 'paragraph') return 'p'
	if (b.type === 'span') return 'span'
	if (b.type === 'textnode') return 'div'
	return null
})
const blockClass = computed(() => props.block?.customClass || '')
</script>
