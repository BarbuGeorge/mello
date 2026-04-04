<script setup>
const props = defineProps({
  block: Object
})

const renderText = (children) => {
  if (!children) return ''

  return children.map(node => {
    if (node.type === 'text') return node.text
    return ''
  }).join('')
}
</script>

<template>

  <!-- PARAGRAPH -->
  <p v-if="block.type === 'paragraph'">
    {{ renderText(block.children) }}
  </p>

  <!-- HEADING -->
  <h2 v-else-if="block.type === 'heading'">
    {{ renderText(block.children) }}
  </h2>

</template>
