<script setup>
const props = defineProps({ block: Object })

function renderInline(children) {
  if (!children) return ''
  return children.map(node => {
    if (node.type === 'link') {
      return `<a href="${node.url}">${renderInline(node.children)}</a>`
    }
    let text = (node.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (node.bold) text = `<strong>${text}</strong>`
    if (node.italic) text = `<em>${text}</em>`
    if (node.underline) text = `<u>${text}</u>`
    if (node.strikethrough) text = `<s>${text}</s>`
    if (node.code) text = `<code>${text}</code>`
    return text
  }).join('')
}
</script>

<template>
  <h1 v-if="block.type === 'heading' && block.level === 1" v-html="renderInline(block.children)" />
  <h2 v-else-if="block.type === 'heading' && block.level === 2" v-html="renderInline(block.children)" />
  <h3 v-else-if="block.type === 'heading' && block.level === 3" v-html="renderInline(block.children)" />
  <h4 v-else-if="block.type === 'heading' && block.level === 4" v-html="renderInline(block.children)" />
  <h5 v-else-if="block.type === 'heading' && block.level === 5" v-html="renderInline(block.children)" />
  <h6 v-else-if="block.type === 'heading' && block.level === 6" v-html="renderInline(block.children)" />
  <p v-else-if="block.type === 'paragraph'" v-html="renderInline(block.children)" />
  <ul v-else-if="block.type === 'list' && block.format === 'unordered'">
    <li v-for="(item, i) in block.children" :key="i" v-html="renderInline(item.children)" />
  </ul>
  <ol v-else-if="block.type === 'list' && block.format === 'ordered'">
    <li v-for="(item, i) in block.children" :key="i" v-html="renderInline(item.children)" />
  </ol>
  <blockquote v-else-if="block.type === 'quote'" v-html="renderInline(block.children)" />
  <pre v-else-if="block.type === 'code'"><code>{{ block.children?.[0]?.text }}</code></pre>
  <img v-else-if="block.type === 'image'" :src="block.image?.url" :alt="block.image?.alternativeText || ''" />
</template>
