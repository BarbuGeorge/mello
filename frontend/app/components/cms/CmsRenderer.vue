<script setup>
defineProps({
  content: Array
})
</script>

<template>
  <div v-for="(block, i) in content" :key="i">



    <!-- SECTION -->
    <CmsSection
      v-if="block.__typename === 'ComponentDefaultSection'"
      :section="block"
    />

    <!-- VUE COMPONENT BLOCK -->
    <CmsVueComponent
      v-else-if="block.__typename === 'ComponentBuilderVueComponent'"
      :block="block"
    />

  </div>
</template>
