<script setup>
defineProps({
  section: Object
})
</script>

<template>
  <section class="cms-section" :class="section.className">
    <CmsBlock
      v-for="(block, i) in section.blocks"
      :key="`b-${i}`"
      :block="block"
      :animateWords="section.className?.includes('section-hero')"
    />
    <div v-if="section.columns?.length" class="cms-row">
      <CmsColumn
        v-for="(col, i) in section.columns"
        :key="i"
        :column="col"
      />
    </div>
    <CmsBlock
      v-for="(block, i) in section.afterBlocks"
      :key="`ab-${i}`"
      :block="block"
    />
    <div v-if="section.className?.includes('section-hero')" class="hero-eyes">
      <div class="eye eye1"><div class="pupil"></div></div>
      <div class="eye eye2"><div class="pupil"></div></div>
    </div>
  </section>
</template>

