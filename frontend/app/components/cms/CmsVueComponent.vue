<script setup>
import ProjectsList from '~/components/ProjectsList.vue'

const registry = { ProjectsList }

const props = defineProps({
  block: Object
})

const dynamicComponent = registry[props.block.VueComponent] ?? null
</script>

<template>
  <Suspense v-if="dynamicComponent">
    <component
      :is="dynamicComponent"
      v-bind="block.props || {}"
    />
  </Suspense>
</template>
