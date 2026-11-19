// Water-like ripple distortion on a project image, driven by the pointer.
// Raw WebGL (same house style as useDistortionCanvas.js — no three.js): a
// fullscreen-quad fragment shader samples the image with its UV pushed around
// by a handful of decaying radial ripples. Moving the pointer stamps a new
// ripple at its current position every few pixels of travel, so a swipe
// leaves a trailing wake instead of one static blob under the cursor.
const MAX_RIPPLES = 9
// the fragment shader loops over MAX_RIPPLES per pixel — rendering at full
// device-pixel resolution on a full-bleed slide (easily 2500x1300+ physical
// pixels) made that loop genuinely expensive. The blur/soft nature of this
// effect hides a lower internal resolution completely; the canvas is still
// displayed at full CSS size, just upscaled by the browser.
const RENDER_SCALE = 0.55

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x, -a_pos.y) * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
#define MAX_RIPPLES ${MAX_RIPPLES}
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform vec2 u_imgSize;
uniform float u_time;
// xy = uv position, z = time it was stamped, w = strength (0 = unused slot)
uniform vec4 u_ripples[MAX_RIPPLES];
varying vec2 v_uv;

vec2 coverUV(vec2 uv, vec2 imgSize) {
  float ca = u_res.x / u_res.y;
  float ia = imgSize.x / imgSize.y;
  vec2 scale = ca > ia ? vec2(1.0, ia / ca) : vec2(ca / ia, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 disp = vec2(0.0);

  for (int i = 0; i < MAX_RIPPLES; i++) {
    vec4 r = u_ripples[i];
    if (r.w <= 0.0) continue;
    vec2 d = uv - r.xy;
    d.x *= aspect; // aspect-correct so ripples read as circles, not ellipses
    float dist = length(d);
    float age = u_time - r.z;
    // fade each stamp in rather than having it appear at full strength —
    // an instant pop reads as a judder when stamps land in quick succession
    float env = exp(-age * 3.4) * exp(-dist * 9.5) * r.w * smoothstep(0.0, 0.10, age);
    // phase runs off the shared clock, NOT each stamp's own age: with per-age
    // phases, stamps piling up in one spot (which is exactly what a small,
    // slow movement does) each carried their own phase and beat against each
    // other, and that interference is what looked like trembling. On a common
    // clock they stay coherent and just reinforce each other smoothly.
    float wave = sin(dist * 26.0 - u_time * 12.0) * env;
    vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);
    dir.x /= aspect;
    disp += dir * wave;
  }

  // a long hover can build up many overlapping ripples (up to MAX_RIPPLES all
  // alive at once); if enough happen to push the same way, the raw sum has no
  // natural ceiling. Cap it so stacking ripples can only ever look more
  // turbulent, never shove the sampled UV out past the image edge.
  float dispLen = length(disp);
  if (dispLen > 1.0) disp = disp / dispLen;

  vec2 duv = uv + disp * 0.03;

  // no RGB channel split here — sampling all three at the same displaced UV
  // keeps the wave-glass distortion without the violet/cyan hologram fringing
  // that split produced
  gl_FragColor = texture2D(u_tex, coverUV(duv, u_imgSize));
}
`

function compile(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  return s
}

// One WebGL instance per <canvas>. Renders only while ripples are actually
// decaying on it (or the pointer is currently over it) — at rest, with no
// displacement, the shader output is pixel-identical to the plain image, so
// there's nothing gained by drawing every frame forever.
export function useRippleImage() {
  function attach(canvas, imgUrl) {
    if (!canvas || !imgUrl) return null

    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false })
    if (!gl) return null

    const program = gl.createProgram()
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
    gl.useProgram(program)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const locs = {
      tex: gl.getUniformLocation(program, 'u_tex'),
      res: gl.getUniformLocation(program, 'u_res'),
      imgSize: gl.getUniformLocation(program, 'u_imgSize'),
      time: gl.getUniformLocation(program, 'u_time'),
      ripples: gl.getUniformLocation(program, 'u_ripples'),
    }
    gl.uniform1i(locs.tex, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    // 1x1 transparent placeholder so nothing renders (the plain <img> shows
    // through underneath) until the real texture is decoded
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]))

    let imgSize = { w: 1, h: 1 }
    let ready = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      } catch {
        // cross-origin without CORS headers taints the canvas on upload —
        // bail out silently; the plain <img> underneath still shows the picture
        return
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      imgSize = { w: img.naturalWidth || 1, h: img.naturalHeight || 1 }
      ready = true
      draw(performance.now())
    }
    img.onerror = () => {}
    img.src = imgUrl

    // ring buffer of ripple stamps: {x, y, t, s}
    const ripples = []
    let writeIdx = 0
    const ripBuf = new Float32Array(MAX_RIPPLES * 4)

    let raf = null
    let lastPointer = null

    function syncSize() {
      const { width, height } = canvas.getBoundingClientRect()
      if (!width || !height) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * RENDER_SCALE
      const w = Math.round(width * dpr)
      const h = Math.round(height * dpr)
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
    }

    function draw(t) {
      if (!ready) return
      syncSize()
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      const now = t / 1000
      let alive = false
      for (let i = 0; i < MAX_RIPPLES; i++) {
        const r = ripples[i]
        const off = i * 4
        if (r && now - r.t < 2.2) {
          ripBuf[off] = r.x; ripBuf[off + 1] = r.y; ripBuf[off + 2] = r.t; ripBuf[off + 3] = r.s
          alive = true
        } else {
          ripBuf[off + 3] = 0
        }
      }

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform2f(locs.res, canvas.width, canvas.height)
      gl.uniform2f(locs.imgSize, imgSize.w, imgSize.h)
      gl.uniform1f(locs.time, now)
      gl.uniform4fv(locs.ripples, ripBuf)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      if (alive) raf = requestAnimationFrame(draw)
      else raf = null
    }

    function ensureLoop() {
      if (raf === null) raf = requestAnimationFrame(draw)
    }

    let lastStampAt = 0

    function pointer(x, y) {
      // x/y in 0..1, canvas-local. Stamp a new ripple once the pointer has
      // travelled a bit, OR — regardless of distance — once enough time has
      // passed since the last stamp. Distance-only gating meant a slow, small
      // movement could go a long while without crossing the distance
      // threshold at all, leaving gaps in the trail that read as choppy/
      // laggy; a fast sweep crossed it every frame and looked fine. The time
      // fallback keeps the trail continuous at any speed.
      const now = performance.now()
      if (lastPointer) {
        const dx = x - lastPointer.x, dy = y - lastPointer.y
        if (Math.hypot(dx, dy) < 0.025 && now - lastStampAt < 45) return
      }
      const speed = lastPointer ? Math.min(1, 1 / (now - lastStampAt + 1) * 40) : 0.6
      lastPointer = { x, y }
      lastStampAt = now
      ripples[writeIdx] = { x, y, t: now / 1000, s: 0.55 + speed * 0.45 }
      writeIdx = (writeIdx + 1) % MAX_RIPPLES
      ensureLoop()
    }

    function resize() { syncSize(); if (ready) draw(performance.now()) }

    function destroy() {
      if (raf !== null) cancelAnimationFrame(raf)
      gl.deleteTexture(tex)
      gl.deleteProgram(program)
      gl.deleteBuffer(buf)
    }

    syncSize()
    return { pointer, resize, destroy }
  }

  return { attach }
}
