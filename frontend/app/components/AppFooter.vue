<script setup>
// The payload is already structured by ContactForm; this is where a real
// integration (email service, CRM, Strapi endpoint) would pick it up.
function onInquiry(payload) {
  console.info('[mello] inquiry received in footer', payload)
}
</script>

<template>
  <footer class="site-footer" id="contact">
    <div class="site-footer__inner">
      <ContactForm class="site-footer__form" @submit="onInquiry" />

      <div class="footer-strip">
        <a class="footer-strip__brand" href="#top" aria-label="mello — back to top">
          mell<span class="footer-strip__o" aria-hidden="true"></span>
        </a>

        <p class="footer-strip__block">
          <span class="footer-strip__kicker">Mail <em>?</em></span>
          <a class="footer-strip__mail" href="mailto:hello@mello.com">hello@mello.com</a>
        </p>

        <p class="footer-strip__block footer-strip__block--social">
          <span class="footer-strip__kicker">Follow <em>?</em></span>
          <span class="footer-strip__icons">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i class="bi bi-instagram" aria-hidden="true"></i>
            </a>
            <a href="https://dribbble.com" target="_blank" rel="noopener noreferrer" aria-label="Dribbble">
              <i class="bi bi-dribbble" aria-hidden="true"></i>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <i class="bi bi-linkedin" aria-hidden="true"></i>
            </a>
          </span>
        </p>
      </div>

      <p class="site-footer__meta">© {{ new Date().getFullYear() }} mello</p>
    </div>
  </footer>
</template>
