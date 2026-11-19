<script>
// Multi-step project inquiry form for the contact section.
//
// Submits to /api/inquiry (a Nuxt server route), which is what talks to
// Strapi — the write-capable token stays on the server, never in the browser.
const TOTAL_STEPS = 4
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default {
  name: 'ContactForm',

  emits: ['submit'],

  data() {
    return {
      TOTAL_STEPS,
      SERVICES: [
        'Website',
        'E-commerce',
        'Web app',
        'Brand / visual identity',
        'AI automation',
        'Something else',
      ],
      BUDGETS: ['Under €2k', '€2k–€5k', '€5k–€10k', '€10k+', 'Not sure yet'],
      TIMELINES: ['ASAP', 'Within 1 month', '1–3 months', 'Flexible'],

      step: 1,
      direction: 'forward', // drives which way the step slides
      sent: false,
      sending: false,
      sendError: '',

      // one flat object, so going back and forth never loses anything
      form: {
        services: [],
        company: '',
        industry: '',
        description: '',
        budget: '',
        timeline: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        link: '',
      },

      errors: {},
    }
  },

  beforeUnmount() {
    this.$refs.card?.removeEventListener('transitionend', this.releaseHeight)
  },

  methods: {
    errorId(field) {
      return `contact-${field}-error`
    },

    toggleService(name) {
      const i = this.form.services.indexOf(name)
      if (i === -1) this.form.services.push(name)
      else this.form.services.splice(i, 1)
    },

    // Only ever validates the step you're on, so you're never blocked by a
    // field you haven't reached yet.
    validate(n) {
      const found = {}
      const f = this.form

      if (n === 1 && f.services.length === 0) {
        found.services = 'Pick at least one so we know what you need.'
      }
      if (n === 2 && !f.description.trim()) {
        found.description = 'A couple of lines is plenty — what are you after?'
      }
      if (n === 3) {
        if (!f.budget) found.budget = 'Pick the range that fits best.'
        if (!f.timeline) found.timeline = 'When would you like this live?'
      }
      if (n === 4) {
        if (!f.firstName.trim()) found.firstName = 'What should we call you?'
        if (!f.email.trim()) found.email = 'We need somewhere to reply.'
        else if (!EMAIL_RE.test(f.email)) found.email = 'That address looks off.'
      }

      this.errors = found
      return Object.keys(found).length === 0
    },

    // moving focus to the new step's heading keeps keyboard and screen-reader
    // users with the content instead of stranding them where the old button was
    async focusHeading() {
      await this.$nextTick()
      this.$refs.headingEl?.focus?.()
    },

    // The steps differ in height by a few hundred pixels. Rather than a floor
    // tall enough to hide that (which left the short steps half empty), the
    // card's height is pinned as the old step leaves and tweened to the new
    // step's height as it enters; the CSS transition on .inquiry does the rest.
    lockHeight() {
      const card = this.$refs.card
      if (!card) return
      card.removeEventListener('transitionend', this.releaseHeight)
      // offsetHeight is the in-flight value mid-tween, so a quick double click
      // carries on from wherever the card currently is
      card.style.height = `${card.offsetHeight}px`
    },

    growHeight() {
      const card = this.$refs.card
      if (!card || !card.style.height) return
      const from = card.offsetHeight
      card.style.height = ''
      const to = card.offsetHeight
      card.style.height = `${from}px`

      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (from === to || still) return this.releaseHeight()

      void card.offsetHeight // commit the start value so the change animates
      card.style.height = `${to}px`
      card.addEventListener('transitionend', this.releaseHeight)
    },

    // hand the height back to the content, so errors and textarea resizes
    // can still grow the card afterwards
    releaseHeight(e) {
      const card = this.$refs.card
      if (!card || (e && (e.target !== card || e.propertyName !== 'height'))) return
      card.removeEventListener('transitionend', this.releaseHeight)
      card.style.height = ''
    },

    onSwapEntered() {
      if (this.sent) this.$refs.headingEl?.focus?.()
    },

    next() {
      if (!this.validate(this.step)) return
      this.direction = 'forward'
      this.step = Math.min(TOTAL_STEPS, this.step + 1)
      this.focusHeading()
    },

    back() {
      this.errors = {}
      this.direction = 'back'
      this.step = Math.max(1, this.step - 1)
      this.focusHeading()
    },

    async onSubmit() {
      if (!this.validate(TOTAL_STEPS) || this.sending) return
      const f = this.form

      const payload = {
        services: [...f.services],
        company: f.company.trim(),
        industry: f.industry.trim(),
        description: f.description.trim(),
        budget: f.budget,
        timeline: f.timeline,
        contact: {
          firstName: f.firstName.trim(),
          lastName: f.lastName.trim(),
          email: f.email.trim(),
          phone: f.phone.trim(),
          link: f.link.trim(),
        },
        submittedAt: new Date().toISOString(),
      }

      this.sending = true
      this.sendError = ''
      try {
        await $fetch('/api/inquiry', { method: 'POST', body: payload })
        this.$emit('submit', payload)
        // the thank-you heading is focused once it has actually mounted,
        // in onSwapEntered — the form has to finish leaving first
        this.sent = true
      } catch (err) {
        this.sendError = 'That did not go through. Try again, or email us directly.'
        console.error('[mello] inquiry submit failed', err)
      } finally {
        this.sending = false
      }
    },
  },
}
</script>

<template>
  <div class="inquiry-block">
    <div ref="card" class="inquiry">
      <Transition
        name="inquiry-swap"
        mode="out-in"
        @before-leave="lockHeight"
        @enter="growHeight"
        @after-enter="onSwapEntered"
      >
      <!-- success: the envelope (with the site's eyes) swallows the letter,
           blinks, and flies off; the thank-you rises into the space it left -->
      <div v-if="sent" key="done" class="inquiry__done">
        <div class="inquiry__mail" aria-hidden="true">
          <span class="inquiry__puff"></span>
          <span class="inquiry__puff"></span>
          <span class="inquiry__puff"></span>
          <svg class="envelope" viewBox="0 0 120 92" fill="none">
            <rect class="envelope__back" x="8" y="32" width="104" height="56" rx="8" />
            <path class="envelope__flap envelope__flap--open" d="M8 32 L60 4 L112 32 Z" />
            <g class="envelope__letter">
              <rect x="20" y="10" width="80" height="48" rx="4" />
              <path d="M32 22h40M32 30h56M32 38h48" />
            </g>
            <path class="envelope__front" d="M8 32 L60 64 L112 32 V80 a8 8 0 0 1 -8 8 H16 a8 8 0 0 1 -8 -8 Z" />
            <path class="envelope__flap envelope__flap--shut" d="M8 32 L60 64 L112 32 Z" />
            <g class="envelope__eyes">
              <circle cx="47" cy="76" r="6.5" />
              <circle cx="73" cy="76" r="6.5" />
              <g class="envelope__pupils">
                <circle cx="47" cy="76" r="2.8" />
                <circle cx="73" cy="76" r="2.8" />
              </g>
            </g>
          </svg>
        </div>

        <div class="inquiry__thanks">
          <h2 ref="headingEl" tabindex="-1" class="inquiry__heading">Thank you!</h2>
          <p class="inquiry__lead">Your message is on its way. We’ll be in touch soon.</p>
        </div>
      </div>

      <form v-else key="form" class="inquiry__form" novalidate @submit.prevent="onSubmit">
        <header class="inquiry__head">
          <h2 class="inquiry__heading">Let’s chat !</h2>
          <p class="inquiry__lead">Wanna add more details about the project ?</p>
        </header>

        <Transition
          :name="direction === 'forward' ? 'step-fwd' : 'step-back'"
          mode="out-in"
          @before-leave="lockHeight"
          @enter="growHeight"
        >
          <!-- 1 — services ---------------------------------------------- -->
          <fieldset v-if="step === 1" key="1" class="inquiry__step">
            <legend class="inquiry__legend">
              <h2 ref="headingEl" tabindex="-1" class="inquiry__title">What can we help you build?</h2>
              <p class="inquiry__sub">Choose everything that fits your project.</p>
            </legend>

            <div class="inquiry__pills" :class="{ 'is-invalid': errors.services }">
              <label v-for="s in SERVICES" :key="s" class="pill">
                <input
                  type="checkbox"
                  class="pill__input"
                  :value="s"
                  :checked="form.services.includes(s)"
                  @change="toggleService(s)"
                />
                <span class="pill__face">{{ s }}</span>
              </label>
            </div>
            <p v-if="errors.services" :id="errorId('services')" class="inquiry__error" role="alert">
              {{ errors.services }}
            </p>
          </fieldset>

          <!-- 2 — about the project -------------------------------------- -->
          <div v-else-if="step === 2" key="2" class="inquiry__step">
            <h2 ref="headingEl" tabindex="-1" class="inquiry__title">Tell us a little more.</h2>

            <div class="inquiry__grid">
              <label class="field">
                <span class="field__label">Business / company name <em>optional</em></span>
                <input v-model="form.company" type="text" class="field__input" placeholder="mello" />
              </label>
              <label class="field">
                <span class="field__label">Industry</span>
                <input v-model="form.industry" type="text" class="field__input" placeholder="Hospitality, SaaS, retail…" />
              </label>
            </div>

            <label class="field">
              <span class="field__label">Project description</span>
              <textarea
                v-model="form.description"
                class="field__input field__input--area"
                rows="4"
                placeholder="What are you trying to achieve, and what is getting in the way right now?"
                :aria-invalid="!!errors.description"
                :aria-describedby="errors.description ? errorId('description') : undefined"
              ></textarea>
            </label>
            <p v-if="errors.description" :id="errorId('description')" class="inquiry__error" role="alert">
              {{ errors.description }}
            </p>
          </div>

          <!-- 3 — budget & timing ---------------------------------------- -->
          <div v-else-if="step === 3" key="3" class="inquiry__step">
            <h2 ref="headingEl" tabindex="-1" class="inquiry__title">Budget &amp; timing.</h2>

            <fieldset class="inquiry__group">
              <legend class="field__label">Budget</legend>
              <div class="inquiry__pills" :class="{ 'is-invalid': errors.budget }">
                <label v-for="b in BUDGETS" :key="b" class="pill">
                  <input v-model="form.budget" type="radio" name="budget" class="pill__input" :value="b" />
                  <span class="pill__face">{{ b }}</span>
                </label>
              </div>
              <p v-if="errors.budget" class="inquiry__error" role="alert">{{ errors.budget }}</p>
            </fieldset>

            <fieldset class="inquiry__group">
              <legend class="field__label">Timeline</legend>
              <div class="inquiry__pills" :class="{ 'is-invalid': errors.timeline }">
                <label v-for="t in TIMELINES" :key="t" class="pill">
                  <input v-model="form.timeline" type="radio" name="timeline" class="pill__input" :value="t" />
                  <span class="pill__face">{{ t }}</span>
                </label>
              </div>
              <p v-if="errors.timeline" class="inquiry__error" role="alert">{{ errors.timeline }}</p>
            </fieldset>
          </div>

          <!-- 4 — details ------------------------------------------------- -->
          <div v-else key="4" class="inquiry__step">
            <h2 ref="headingEl" tabindex="-1" class="inquiry__title">Your details.</h2>
            <p class="inquiry__sub">Leave these and we’ll get back to you soon.</p>

            <div class="inquiry__grid">
              <label class="field">
                <span class="field__label">First name</span>
                <input
                  v-model="form.firstName"
                  type="text"
                  class="field__input"
                  placeholder="John"
                  :aria-invalid="!!errors.firstName"
                  :aria-describedby="errors.firstName ? errorId('firstName') : undefined"
                />
                <span v-if="errors.firstName" :id="errorId('firstName')" class="inquiry__error" role="alert">
                  {{ errors.firstName }}
                </span>
              </label>
              <label class="field">
                <span class="field__label">Last name <em>optional</em></span>
                <input v-model="form.lastName" type="text" class="field__input" placeholder="Johnson" />
              </label>
              <label class="field">
                <span class="field__label">Email</span>
                <input
                  v-model="form.email"
                  type="email"
                  class="field__input"
                  placeholder="you@company.com"
                  :aria-invalid="!!errors.email"
                  :aria-describedby="errors.email ? errorId('email') : undefined"
                />
                <span v-if="errors.email" :id="errorId('email')" class="inquiry__error" role="alert">
                  {{ errors.email }}
                </span>
              </label>
              <label class="field">
                <span class="field__label">Phone <em>optional</em></span>
                <input v-model="form.phone" type="tel" class="field__input" placeholder="+40 700 000 000" />
              </label>
            </div>

            <label class="field">
              <span class="field__label">Website / LinkedIn <em>optional</em></span>
              <input v-model="form.link" type="url" class="field__input" placeholder="mello.com" />
            </label>
          </div>
        </Transition>

        <p v-if="sendError" class="inquiry__error" role="alert">{{ sendError }}</p>

        <!-- the design's one full-width dark button; Back is secondary, so it
             sits under it rather than competing for the same row -->
        <div class="inquiry__actions">
          <button v-if="step < TOTAL_STEPS" type="button" class="inquiry__next" @click="next">Continue →</button>
          <button v-else type="submit" class="inquiry__send" :disabled="sending">
            {{ sending ? 'Sending…' : 'Send It !' }}
          </button>
          <button v-if="step > 1" type="button" class="inquiry__back" @click="back">← Back</button>
        </div>
      </form>
      </Transition>
    </div>
  </div>
</template>
