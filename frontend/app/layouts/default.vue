<template>
  <ClientOnly><Preloader /></ClientOnly>
  <ClientOnly><AppCursor /></ClientOnly>
  <AppRail />

  <main>
    <slot />
  </main>

  <AppFooter />
</template>
