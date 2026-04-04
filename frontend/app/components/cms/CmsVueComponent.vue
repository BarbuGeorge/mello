<script setup>
import { resolveComponent } from 'vue'

const props = defineProps({
  block: Object
})

const dynamicComponent = computed(() => {
  return resolveComponent(props.block.component)
})
</script>

<template>
  <component
    :is="dynamicComponent"
    v-bind="block.props || {}"
  />
</template>
