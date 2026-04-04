<script setup>
defineProps({
  section: Object
})
</script>

<template>
  <section class="cms-section">
    <div class="cms-row">
      <CmsColumn
        v-for="(col, i) in section.columns"
        :key="i"
        :column="col"
      />
    </div>
  </section>
</template>

