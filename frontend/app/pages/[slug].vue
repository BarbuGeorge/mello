<script setup>
const route = useRoute()

const { fetchCms } = useCms()

const query = `
query {
  pages(filters: { slug: { eq: "${route.params.slug}" } }) {
    title
    slug
    Content {
      __typename

      ... on ComponentDefaultSection {
        className
        blocks
        columns {
          __typename
          className
          blocks
        }
        afterBlocks
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

useHead({ bodyAttrs: { class: page?.slug ?? '' } })
</script>


<template>
  <template v-if="page" class="page">
    <CmsRenderer :content="page.Content" />
  </template>
</template>

