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
        columns {
          __typename
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
console.log("RESPONSE =", response)
const page = response?.data?.pages?.[0]
</script>


<template>
  <template v-if="page">
    <CmsRenderer :content="page.Content" />
  </template>
</template>

