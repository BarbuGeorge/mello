<template>
  <footer class="site-footer" id="contact">
    <div class="site-footer__marquee" aria-hidden="true">
      <div class="site-footer__marquee-track">
        <span v-for="g in 2" :key="g">
          <template v-for="w in ['Web design', 'Branding', 'Development', 'Strategy', 'Motion']" :key="w">
            {{ w }} <em>&#9679;</em>
          </template>
        </span>
      </div>
    </div>
    <div class="site-footer__inner">
      <p class="ed-label">Start a project <span>&#8595;</span></p>
      <h2 class="site-footer__title">Let&rsquo;s build something worth the&nbsp;click.</h2>
      <a class="btn btn-primary site-footer__cta" href="mailto:brbgeorge13@gmail.com">
        Start a project <span>&#8594;</span>
      </a>
      <div class="site-footer__meta">
        <span>&copy; {{ year }} mello</span>
        <a href="mailto:brbgeorge13@gmail.com">brbgeorge13@gmail.com</a>
      </div>
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear()
</script>
