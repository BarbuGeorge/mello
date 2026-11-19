<script setup>
// A project is a dialog over the home page, not a page of its own — but the
// dialog puts /projects/<slug> in the address bar, so that URL has to resolve
// when someone opens it cold (refresh, shared link, bookmark). Hand the slug
// to the home page, which opens the matching project on arrival.
const route = useRoute()

await navigateTo(
  { path: '/', query: { project: String(route.params.slug || '') } },
  { replace: true }
)
</script>

<template>
  <div />
</template>
