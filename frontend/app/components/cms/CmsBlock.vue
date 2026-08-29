<script setup>
const props = defineProps({
  block: Object,
  animateWords: Boolean,
  titleClassName: String,
})

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function safeHref(url) {
  return /^(https?:\/\/|\/|#)/.test(url) ? escapeAttr(url) : '#'
}

function renderInline(children) {
  if (!children) return ''
  return children.map(node => {
    if (node.type === 'link') {
      return `<a href="${safeHref(node.url)}">${renderInline(node.children)}</a>`
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

function renderInlineAnimated(children) {
  if (!children) return ''
  let wi = 0
  return children.map(node => {
    if (node.type === 'link') {
      return `<a href="${safeHref(node.url)}">${renderInline(node.children)}</a>`
    }
    const parts = (node.text || '').split(/(\s+)/)
    return parts.map(part => {
      if (/^\s+$/.test(part) || part === '') return part
      // each character gets its own span so the kinetic hero effect can push
      // individual letters around the cursor
      let content = part.split('').map(ch => {
        const safe = ch.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return `<span class="char">${safe}</span>`
      }).join('')
      if (node.bold) content = `<strong>${content}</strong>`
      if (node.italic) content = `<em>${content}</em>`
      if (node.underline) content = `<u>${content}</u>`
      if (node.strikethrough) content = `<s>${content}</s>`
      if (node.code) content = `<code>${content}</code>`
      return `<span class="word-wrap"><span class="word" style="--i:${wi++};transform:translateY(110%)">${content}</span></span>`
    }).join('')
  }).join('')
}

const render = (children) =>
  props.animateWords ? renderInlineAnimated(children) : renderInline(children)
</script>

<template>
  <h1 v-if="block.type === 'heading' && block.level === 1" :class="titleClassName" v-html="render(block.children)" />
  <h2 v-else-if="block.type === 'heading' && block.level === 2" :class="titleClassName" v-html="render(block.children)" />
  <h3 v-else-if="block.type === 'heading' && block.level === 3" :class="titleClassName" v-html="render(block.children)" />
  <h4 v-else-if="block.type === 'heading' && block.level === 4" :class="titleClassName" v-html="render(block.children)" />
  <h5 v-else-if="block.type === 'heading' && block.level === 5" :class="titleClassName" v-html="render(block.children)" />
  <h6 v-else-if="block.type === 'heading' && block.level === 6" :class="titleClassName" v-html="render(block.children)" />
  <p v-else-if="block.type === 'paragraph'" v-html="render(block.children)" />
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
