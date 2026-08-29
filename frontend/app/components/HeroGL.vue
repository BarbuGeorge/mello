<template>
  <div class="hero-gl" ref="wrapEl" aria-hidden="true" />
</template>

<script setup>
// Premium WebGL hero backdrop: a slow flowing fbm-noise field on the white
// canvas with a warm glow that trails the cursor. Deliberately low-contrast so
// the black headline stays readable. One fullscreen shader, one draw call.
const wrapEl = ref(null)
let cleanup = null

onMounted(async () => {
  const wrap = wrapEl.value
  if (!wrap) return

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const coarse = window.matchMedia('(pointer: coarse)').matches

  const THREE = await import('three')
  if (!wrapEl.value) return

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' })
  } catch {
    return // no WebGL: hero just stays plain white
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2))
  renderer.setClearColor(0x0e0e0e, 1)
  wrap.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.Camera()

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.7, 0.5) },
    uRes: { value: new THREE.Vector2(1, 1) },
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform vec2 uRes;
      varying vec2 vUv;

      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(dot(hash(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)),
                       dot(hash(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),
                   mix(dot(hash(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)),
                       dot(hash(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        vec2 asp = vec2(uRes.x / uRes.y, 1.0);
        vec2 p = uv * asp;
        vec2 m = uMouse;

        float d = distance(uv, m);
        vec2 warp = (uv - m) * 0.45 * exp(-d * 3.0);

        float n  = fbm(p * 2.2 + uTime * 0.04 + warp * 3.0);
        float n2 = fbm(p * 3.6 - uTime * 0.03 + n);

        vec3 base = vec3(0.055);            // #0e0e0e
        vec3 lift = vec3(0.11);             // subtle lighter flow
        vec3 col = mix(base, lift, smoothstep(0.15, 0.8, n + 0.5));
        col = mix(col, vec3(0.04), smoothstep(0.55, 0.82, n2 + 0.5) * 0.6);

        // warm glow trailing the cursor
        float glow = exp(-d * 3.8);
        col = mix(col, vec3(0.85, 0.62, 0.18), glow * 0.55);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  scene.add(quad)

  const mouse = { x: 0.7, y: 0.5 }
  const smooth = { x: 0.7, y: 0.5 }

  const onMove = (e) => {
    const r = wrap.getBoundingClientRect()
    mouse.x = (e.clientX - r.left) / r.width
    mouse.y = 1 - (e.clientY - r.top) / r.height
  }

  const resize = () => {
    const { width, height } = wrap.getBoundingClientRect()
    if (!width || !height) return
    renderer.setSize(width, height)
    uniforms.uRes.value.set(width, height)
  }
  resize()

  const clock = new THREE.Clock()
  let raf = null
  let visible = true

  const renderFrame = () => {
    uniforms.uTime.value = clock.getElapsedTime()
    smooth.x += (mouse.x - smooth.x) * 0.045
    smooth.y += (mouse.y - smooth.y) * 0.045
    uniforms.uMouse.value.set(smooth.x, smooth.y)
    renderer.render(scene, camera)
  }
  const loop = () => { renderFrame(); raf = requestAnimationFrame(loop) }
  const start = () => { if (raf === null && visible && !document.hidden) raf = requestAnimationFrame(loop) }
  const stop = () => { if (raf !== null) { cancelAnimationFrame(raf); raf = null } }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    visible ? start() : stop()
  })
  io.observe(wrap)

  const onVis = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVis)
  window.addEventListener('resize', resize)

  if (reduce) {
    renderFrame() // one static frame
  } else {
    if (!coarse) window.addEventListener('mousemove', onMove, { passive: true })
    start()
  }

  cleanup = () => {
    stop()
    io.disconnect()
    document.removeEventListener('visibilitychange', onVis)
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', onMove)
    quad.geometry.dispose()
    material.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
})

onBeforeUnmount(() => { cleanup?.(); cleanup = null })
</script>
