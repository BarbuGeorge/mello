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
uniform sampler2D u_tex1;
uniform sampler2D u_tex2;
uniform float u_progress;
uniform float u_width;
uniform float u_scaleX;
uniform float u_scaleY;
uniform vec2 u_res;
uniform vec2 u_size1;
uniform vec2 u_size2;
varying vec2 v_uv;

vec2 coverUV(vec2 uv, vec2 imgSize) {
  float ca = u_res.x / u_res.y;
  float ia = imgSize.x / imgSize.y;
  vec2 scale = ca > ia ? vec2(1.0, ia / ca) : vec2(ca / ia, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec4 fade(vec4 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec4 P){
  vec4 Pi0 = floor(P);
  vec4 Pi1 = Pi0 + 1.0;
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec4 Pf0 = fract(P);
  vec4 Pf1 = Pf0 - 1.0;
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = vec4(Pi0.zzzz);
  vec4 iz1 = vec4(Pi1.zzzz);
  vec4 iw0 = vec4(Pi0.wwww);
  vec4 iw1 = vec4(Pi1.wwww);
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 ixy00 = permute(ixy0 + iw0);
  vec4 ixy01 = permute(ixy0 + iw1);
  vec4 ixy10 = permute(ixy1 + iw0);
  vec4 ixy11 = permute(ixy1 + iw1);
  vec4 gx00 = ixy00 / 7.0;
  vec4 gy00 = floor(gx00) / 7.0;
  vec4 gz00 = floor(gy00) / 6.0;
  gx00 = fract(gx00) - 0.5;
  gy00 = fract(gy00) - 0.5;
  gz00 = fract(gz00) - 0.5;
  vec4 gw00 = vec4(0.75) - abs(gx00) - abs(gy00) - abs(gz00);
  vec4 sw00 = step(gw00, vec4(0.0));
  gx00 -= sw00 * (step(0.0, gx00) - 0.5);
  gy00 -= sw00 * (step(0.0, gy00) - 0.5);
  vec4 gx01 = ixy01 / 7.0;
  vec4 gy01 = floor(gx01) / 7.0;
  vec4 gz01 = floor(gy01) / 6.0;
  gx01 = fract(gx01) - 0.5;
  gy01 = fract(gy01) - 0.5;
  gz01 = fract(gz01) - 0.5;
  vec4 gw01 = vec4(0.75) - abs(gx01) - abs(gy01) - abs(gz01);
  vec4 sw01 = step(gw01, vec4(0.0));
  gx01 -= sw01 * (step(0.0, gx01) - 0.5);
  gy01 -= sw01 * (step(0.0, gy01) - 0.5);
  vec4 gx10 = ixy10 / 7.0;
  vec4 gy10 = floor(gx10) / 7.0;
  vec4 gz10 = floor(gy10) / 6.0;
  gx10 = fract(gx10) - 0.5;
  gy10 = fract(gy10) - 0.5;
  gz10 = fract(gz10) - 0.5;
  vec4 gw10 = vec4(0.75) - abs(gx10) - abs(gy10) - abs(gz10);
  vec4 sw10 = step(gw10, vec4(0.0));
  gx10 -= sw10 * (step(0.0, gx10) - 0.5);
  gy10 -= sw10 * (step(0.0, gy10) - 0.5);
  vec4 gx11 = ixy11 / 7.0;
  vec4 gy11 = floor(gx11) / 7.0;
  vec4 gz11 = floor(gy11) / 6.0;
  gx11 = fract(gx11) - 0.5;
  gy11 = fract(gy11) - 0.5;
  gz11 = fract(gz11) - 0.5;
  vec4 gw11 = vec4(0.75) - abs(gx11) - abs(gy11) - abs(gz11);
  vec4 sw11 = step(gw11, vec4(0.0));
  gx11 -= sw11 * (step(0.0, gx11) - 0.5);
  gy11 -= sw11 * (step(0.0, gy11) - 0.5);
  vec4 g0000 = vec4(gx00.x,gy00.x,gz00.x,gw00.x);
  vec4 g1000 = vec4(gx00.y,gy00.y,gz00.y,gw00.y);
  vec4 g0100 = vec4(gx00.z,gy00.z,gz00.z,gw00.z);
  vec4 g1100 = vec4(gx00.w,gy00.w,gz00.w,gw00.w);
  vec4 g0010 = vec4(gx10.x,gy10.x,gz10.x,gw10.x);
  vec4 g1010 = vec4(gx10.y,gy10.y,gz10.y,gw10.y);
  vec4 g0110 = vec4(gx10.z,gy10.z,gz10.z,gw10.z);
  vec4 g1110 = vec4(gx10.w,gy10.w,gz10.w,gw10.w);
  vec4 g0001 = vec4(gx01.x,gy01.x,gz01.x,gw01.x);
  vec4 g1001 = vec4(gx01.y,gy01.y,gz01.y,gw01.y);
  vec4 g0101 = vec4(gx01.z,gy01.z,gz01.z,gw01.z);
  vec4 g1101 = vec4(gx01.w,gy01.w,gz01.w,gw01.w);
  vec4 g0011 = vec4(gx11.x,gy11.x,gz11.x,gw11.x);
  vec4 g1011 = vec4(gx11.y,gy11.y,gz11.y,gw11.y);
  vec4 g0111 = vec4(gx11.z,gy11.z,gz11.z,gw11.z);
  vec4 g1111 = vec4(gx11.w,gy11.w,gz11.w,gw11.w);
  vec4 norm00 = taylorInvSqrt(vec4(dot(g0000,g0000),dot(g0100,g0100),dot(g1000,g1000),dot(g1100,g1100)));
  g0000 *= norm00.x; g0100 *= norm00.y; g1000 *= norm00.z; g1100 *= norm00.w;
  vec4 norm01 = taylorInvSqrt(vec4(dot(g0001,g0001),dot(g0101,g0101),dot(g1001,g1001),dot(g1101,g1101)));
  g0001 *= norm01.x; g0101 *= norm01.y; g1001 *= norm01.z; g1101 *= norm01.w;
  vec4 norm10 = taylorInvSqrt(vec4(dot(g0010,g0010),dot(g0110,g0110),dot(g1010,g1010),dot(g1110,g1110)));
  g0010 *= norm10.x; g0110 *= norm10.y; g1010 *= norm10.z; g1110 *= norm10.w;
  vec4 norm11 = taylorInvSqrt(vec4(dot(g0011,g0011),dot(g0111,g0111),dot(g1011,g1011),dot(g1111,g1111)));
  g0011 *= norm11.x; g0111 *= norm11.y; g1011 *= norm11.z; g1111 *= norm11.w;
  float n0000 = dot(g0000, Pf0);
  float n1000 = dot(g1000, vec4(Pf1.x, Pf0.yzw));
  float n0100 = dot(g0100, vec4(Pf0.x, Pf1.y, Pf0.zw));
  float n1100 = dot(g1100, vec4(Pf1.xy, Pf0.zw));
  float n0010 = dot(g0010, vec4(Pf0.xy, Pf1.z, Pf0.w));
  float n1010 = dot(g1010, vec4(Pf1.x, Pf0.y, Pf1.z, Pf0.w));
  float n0110 = dot(g0110, vec4(Pf0.x, Pf1.yz, Pf0.w));
  float n1110 = dot(g1110, vec4(Pf1.xyz, Pf0.w));
  float n0001 = dot(g0001, vec4(Pf0.xyz, Pf1.w));
  float n1001 = dot(g1001, vec4(Pf1.x, Pf0.yz, Pf1.w));
  float n0101 = dot(g0101, vec4(Pf0.x, Pf1.y, Pf0.z, Pf1.w));
  float n1101 = dot(g1101, vec4(Pf1.xy, Pf0.z, Pf1.w));
  float n0011 = dot(g0011, vec4(Pf0.xy, Pf1.zw));
  float n1011 = dot(g1011, vec4(Pf1.x, Pf0.y, Pf1.zw));
  float n0111 = dot(g0111, vec4(Pf0.x, Pf1.yzw));
  float n1111 = dot(g1111, Pf1);
  vec4 fade_xyzw = fade(Pf0);
  vec4 n_0w = mix(vec4(n0000,n1000,n0100,n1100), vec4(n0001,n1001,n0101,n1101), fade_xyzw.w);
  vec4 n_1w = mix(vec4(n0010,n1010,n0110,n1110), vec4(n0011,n1011,n0111,n1111), fade_xyzw.w);
  vec4 n_zw = mix(n_0w, n_1w, fade_xyzw.z);
  vec2 n_yzw = mix(n_zw.xy, n_zw.zw, fade_xyzw.y);
  float n_xyzw = mix(n_yzw.x, n_yzw.y, fade_xyzw.x);
  return 2.2 * n_xyzw;
}

float parabola(float x, float k) {
  return pow(4.0 * x * (1.0 - x), k);
}

void main() {
  vec2 uv = v_uv;
  vec4 color1 = texture2D(u_tex1, coverUV(uv, u_size1));
  vec4 color2 = texture2D(u_tex2, coverUV(uv, u_size2));

  float realnoise = 0.5 * (cnoise(vec4(uv.x * u_scaleX, uv.y * u_scaleY, 0.0, 0.0)) + 1.0);

  float dt = parabola(u_progress, 1.0);
  float w = u_width * dt;
  float maskvalue = smoothstep(1.0 - w, 1.0, uv.x + mix(-w / 2.0, 1.0 - w / 2.0, u_progress));
  float mask = maskvalue + maskvalue * realnoise;
  float final = smoothstep(1.0, 1.01, mask);

  gl_FragColor = mix(color1, color2, final);
}
`

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

const TRANS_MS = 1500

export function useDistortionCanvas(canvasRef) {
  let gl = null, program = null, locs = {}
  let imageTex = [], imageSizes = []
  let fromIdx = 0, toIdx = 0
  let progress = 1, transStart = null
  let rafId = null

  function compile(type, src) {
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }

  function init() {
    const canvas = canvasRef.value
    gl = canvas.getContext('webgl', { alpha: false, antialias: false })
    if (!gl) return false

    program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(program)
    gl.useProgram(program)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const pos = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

    locs = {
      tex1:     gl.getUniformLocation(program, 'u_tex1'),
      tex2:     gl.getUniformLocation(program, 'u_tex2'),
      progress: gl.getUniformLocation(program, 'u_progress'),
      width:    gl.getUniformLocation(program, 'u_width'),
      scaleX:   gl.getUniformLocation(program, 'u_scaleX'),
      scaleY:   gl.getUniformLocation(program, 'u_scaleY'),
      res:      gl.getUniformLocation(program, 'u_res'),
      size1:    gl.getUniformLocation(program, 'u_size1'),
      size2:    gl.getUniformLocation(program, 'u_size2'),
    }

    gl.uniform1i(locs.tex1, 0)
    gl.uniform1i(locs.tex2, 1)
    gl.uniform1f(locs.width, 5.0)
    gl.uniform1f(locs.scaleX, 60.0)
    gl.uniform1f(locs.scaleY, 60.0)

    return true
  }

  function loadTex(url) {
    return new Promise((resolve) => {
      const tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 20, 20, 255]))
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        resolve({ tex, w: img.naturalWidth, h: img.naturalHeight })
      }
      img.onerror = () => resolve({ tex, w: 1, h: 1 })
      img.src = url
    })
  }

  function draw(t) {
    if (!gl || !canvasRef.value || !imageTex.length) return

    if (transStart !== null) {
      const raw = Math.min((t - transStart) / TRANS_MS, 1)
      progress = easeInOut(raw)
      if (raw >= 1) { progress = 1; transStart = null }
    }

    const canvas = canvasRef.value
    gl.viewport(0, 0, canvas.width, canvas.height)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, imageTex[fromIdx])
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, imageTex[toIdx])

    gl.uniform1f(locs.progress, progress)
    gl.uniform2f(locs.res, canvas.width, canvas.height)
    gl.uniform2f(locs.size1, imageSizes[fromIdx]?.w ?? 1, imageSizes[fromIdx]?.h ?? 1)
    gl.uniform2f(locs.size2, imageSizes[toIdx]?.w ?? 1, imageSizes[toIdx]?.h ?? 1)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    if (transStart !== null) rafId = requestAnimationFrame(draw)
  }

  async function setup(urls) {
    if (!init()) return
    const results = await Promise.all(urls.filter(Boolean).map(loadTex))
    imageTex = results.map(r => r.tex)
    imageSizes = results.map(r => ({ w: r.w, h: r.h }))
    syncSize()
    draw(performance.now())
  }

  function transitionTo(newIdx) {
    if (newIdx === toIdx || !gl || !imageTex.length) return
    fromIdx = toIdx
    toIdx = newIdx
    progress = 0
    transStart = performance.now()
    if (rafId) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(draw)
  }

  function syncSize() {
    if (!canvasRef.value) return
    const el = canvasRef.value
    const { width, height } = el.getBoundingClientRect()
    if (!width || !height) return
    const dpr = Math.min(window.devicePixelRatio, 2)
    el.width = Math.round(width * dpr)
    el.height = Math.round(height * dpr)
  }

  function resize() {
    syncSize()
    draw(performance.now())
  }

  function dispose() {
    if (rafId) cancelAnimationFrame(rafId)
    if (gl) {
      imageTex.forEach(t => gl.deleteTexture(t))
      gl.deleteProgram(program)
    }
    gl = null
  }

  return { setup, transitionTo, resize, dispose }
}
