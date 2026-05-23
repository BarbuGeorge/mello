<script setup>
const { fetchCms } = useCms()

const query = `
query {
  pages(filters: { slug: { eq: "home" } }) {
    title
    slug
    Content {
      __typename

      ... on ComponentDefaultSection {
        className
        blocks
        afterBlocks
        columns {
          __typename
          className
          blocks
        }
      }

      ... on ComponentBuilderVueComponent {
        __typename
        component
        props
      }
    }
  }
}
`

const response = await fetchCms(query)
const page = response?.data?.pages?.[0]

useHead({ bodyAttrs: { class: page?.slug ?? 'home' } })
</script>

<template>
  <template v-if="page">
    <CmsRenderer :content="page.Content" />
  </template>
</template>
