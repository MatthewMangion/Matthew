// post.js — WebGL2 finishing pipeline (tuned for software GL: 8-bit targets, one full-res pass)
//   input : one RGBA8 texture per frame (already motion-blurred on the CPU in linear light)
//   passes: bright-pass (½ res) → dual-filter bloom chain → final (glitch, chromatic aberration,
//           bloom add, soft shoulder, grade, vignette, grain, flash) → optional YUV 4:2:0 pack
(function (G) {
  const VS = `#version 300 es
  in vec2 p; out vec2 uv;
  void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

  // the uploaded image has row 0 = top, so every read of `src` flips v
  const FS_BRIGHT = `#version 300 es
  precision highp float; in vec2 uv; out vec4 o;
  uniform sampler2D src; uniform float thr; uniform vec2 texel;
  vec3 S(vec2 q){ return pow(texture(src, vec2(q.x, 1.0 - q.y)).rgb, vec3(2.2)); }
  void main(){
    vec3 c = S(uv + texel*vec2(-1.,-1.)) + S(uv + texel*vec2(1.,-1.)) + S(uv + texel*vec2(-1.,1.)) + S(uv + texel*vec2(1.,1.));
    c *= 0.25;
    float l = max(c.r, max(c.g, c.b));
    float k = 0.25;
    float s = clamp(l - thr + k, 0.0, 2.0*k); s = s*s/(4.0*k+1e-4);
    float m = max(s, l - thr) / max(l, 1e-4);
    o = vec4(c*m, 1.);
  }`;

  const FS_DOWN = `#version 300 es
  precision highp float; in vec2 uv; out vec4 o;
  uniform sampler2D src; uniform vec2 texel;
  void main(){
    vec3 s = texture(src, uv).rgb*4.0;
    s += texture(src, uv - texel).rgb;
    s += texture(src, uv + texel).rgb;
    s += texture(src, uv + vec2(texel.x,-texel.y)).rgb;
    s += texture(src, uv - vec2(texel.x,-texel.y)).rgb;
    o = vec4(s/8.0, 1.);
  }`;

  const FS_UP = `#version 300 es
  precision highp float; in vec2 uv; out vec4 o;
  uniform sampler2D src; uniform sampler2D add; uniform vec2 texel;
  void main(){
    vec3 s = texture(src, uv + vec2(-texel.x*2.0, 0.0)).rgb;
    s += texture(src, uv + vec2(-texel.x, texel.y)).rgb*2.0;
    s += texture(src, uv + vec2(0.0, texel.y*2.0)).rgb;
    s += texture(src, uv + vec2(texel.x, texel.y)).rgb*2.0;
    s += texture(src, uv + vec2(texel.x*2.0, 0.0)).rgb;
    s += texture(src, uv + vec2(texel.x, -texel.y)).rgb*2.0;
    s += texture(src, uv + vec2(0.0, -texel.y*2.0)).rgb;
    s += texture(src, uv + vec2(-texel.x, -texel.y)).rgb*2.0;
    o = vec4(s/12.0 + texture(add, uv).rgb, 1.);
  }`;

  const FS_FINAL = `#version 300 es
  precision highp float; in vec2 uv; out vec4 o;
  uniform sampler2D src; uniform sampler2D bloom; uniform vec2 res;
  uniform float ca; uniform float glitch; uniform float warp;
  uniform float bloomAmt; uniform float vig; uniform float grain; uniform float fr;
  uniform vec3 flashCol; uniform float flash; uniform float invert; uniform float expo; uniform float sat;
  float h1(float n){ return fract(sin(n*127.1)*43758.5453); }
  float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
  uint hash(uvec3 v){ v = v*1664525u + 1013904223u; v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y;
    v ^= v >> 16u; v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y; return v.x; }
  float rand(vec2 p, float f){ return float(hash(uvec3(uvec2(p), uint(f)))) / 4294967295.0; }
  vec3 shoulder(vec3 x){ float k = 0.82; vec3 y = k + (1.0-k)*(1.0 - exp(-(x-k)/(1.0-k))); return mix(x, y, step(k, x)); }
  vec3 S(vec2 q){ return texture(src, vec2(q.x, 1.0 - q.y)).rgb; }
  void main(){
    vec2 p = uv;
    vec2 d0 = p-0.5; d0.x *= res.x/res.y;
    p = 0.5 + (p-0.5)*(1.0 + warp*dot(d0,d0));
    vec2 off = vec2(0.);
    if (glitch > 0.001) {
      float f = floor(fr);
      float rows = 28.0 + 40.0*h1(f*3.1);
      float band = floor(p.y*rows);
      float on = step(1.0 - 0.55*glitch, h2(vec2(band*1.37, f+9.0)));
      p.x += (h2(vec2(band, f))-0.5)*0.22*glitch*on;
      vec2 blk = floor(p*vec2(12.0, 22.0));
      float bon = step(1.0-0.18*glitch, h2(blk + f*1.7));
      p += bon*(vec2(h2(blk+3.0), h2(blk+5.0))-0.5)*0.06*glitch;
      off.x += 0.012*glitch*(h1(f)-0.2);
    }
    vec2 cao = (p-0.5)*ca*0.018 + off;
    vec3 c = vec3(S(p + cao).r, S(p).g, S(p - cao).b);
    if (p.x < 0.0 || p.x > 1.0) c = vec3(0.0);
    c = pow(c, vec3(2.2)) * expo;
    c += texture(bloom, uv).rgb * bloomAmt;
    c = shoulder(c);
    c = pow(max(c, 0.0), vec3(1.0/2.2));
    float l = dot(c, vec3(0.2126,0.7152,0.0722));
    c = mix(vec3(l), c, sat);
    c += vec3(-0.012,0.0,0.022)*(1.0-l)*(1.0-l) + vec3(0.018,0.008,-0.012)*l*l;
    vec2 d = uv-0.5; d.x *= res.x/res.y*1.15;
    c *= mix(1.0, smoothstep(0.95, 0.18, length(d)), vig);
    c = mix(c, 1.0-c, invert);
    c = mix(c, flashCol, clamp(flash,0.0,1.0));
    vec2 gp = floor(uv*res/1.35);
    float n = rand(gp, fr) + rand(gp+vec2(19.0,7.0), fr+17.0) - 1.0;
    c += n*grain*(0.55+0.45*(1.0-l));
    o = vec4(clamp(c,0.0,1.0), 1.0);
  }`;

  // Packs the graded frame into planar YUV 4:2:0 (BT.709, limited range) inside an RGBA8 target of
  // (W/4) x (H*1.5): each texel = 4 consecutive bytes of the yuv420p stream, rows top-to-bottom.
  const FS_PACK = `#version 300 es
  precision highp float; out vec4 o;
  uniform sampler2D src; uniform vec2 res;
  vec3 rgb(vec2 px){ return texture(src, vec2(px.x, res.y - px.y) / res).rgb; }
  float Y(vec3 c){ return (16.0 + 219.0 * dot(c, vec3(0.2126, 0.7152, 0.0722))) / 255.0; }
  float U(vec3 c){ return (128.0 + 224.0 * dot(c, vec3(-0.114572, -0.385428, 0.5))) / 255.0; }
  float V(vec3 c){ return (128.0 + 224.0 * dot(c, vec3(0.5, -0.454153, -0.045847))) / 255.0; }
  void main(){
    int tx = int(gl_FragCoord.x); int row = int(gl_FragCoord.y);
    int W = int(res.x), H = int(res.y);
    vec4 v;
    if (row < H) {
      for (int k = 0; k < 4; k++) { vec2 p = vec2(float(tx * 4 + k) + 0.5, float(row) + 0.5); v[k] = Y(rgb(p)); }
    } else {
      int r = row - H; bool isV = r >= H / 4; if (isV) r -= H / 4;
      int CW = W / 2;
      for (int k = 0; k < 4; k++) {
        int b = tx * 4 + k;
        int crow = r * 2 + b / CW;
        int ccol = b % CW;
        vec2 p = vec2(float(ccol * 2) + 1.0, float(crow * 2) + 1.0);
        vec3 c = rgb(p);
        v[k] = isV ? V(c) : U(c);
      }
    }
    o = v;
  }`;

  const FS_COPY = `#version 300 es
  precision highp float; in vec2 uv; out vec4 o; uniform sampler2D src;
  void main(){ o = vec4(texture(src, uv).rgb, 1.0); }`;

  class Post {
    constructor(canvas) {
      const gl = (this.gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true, premultipliedAlpha: false }));
      if (!gl) throw new Error('WebGL2 unavailable');
      this.floatOK = true;
      this.W = canvas.width;
      this.H = canvas.height;
      const quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      this.progs = {
        bright: this.prog(FS_BRIGHT), down: this.prog(FS_DOWN), up: this.prog(FS_UP),
        fin: this.prog(FS_FINAL), pack: this.prog(FS_PACK), copy: this.prog(FS_COPY),
      };
      this.src = this.tex(this.W, this.H);
      this.outT = this.target(this.W, this.H);
      this.packT = this.target(this.W / 4, this.H * 1.5);
      this.yuv = new Uint8Array((this.W / 4) * (this.H * 1.5) * 4);
      this.mips = [];
      let w = this.W >> 1, h = this.H >> 1;
      for (let i = 0; i < 6; i++) {
        this.mips.push({ d: this.target(w, h), u: this.target(w, h), w, h });
        w = Math.max(1, w >> 1);
        h = Math.max(1, h >> 1);
      }
      this.black = this.tex(1, 1);
    }
    prog(fs) {
      const gl = this.gl;
      const mk = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const p = gl.createProgram();
      gl.attachShader(p, mk(gl.VERTEX_SHADER, VS));
      gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'p');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      p.u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        p.u[info.name] = gl.getUniformLocation(p, info.name);
      }
      return p;
    }
    tex(w, h) {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    target(w, h) {
      const gl = this.gl;
      const t = this.tex(w, h);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return { t, fb, w, h };
    }
    draw(p, target, uniforms, texs) {
      const gl = this.gl;
      gl.useProgram(p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
      gl.viewport(0, 0, target ? target.w : this.W, target ? target.h : this.H);
      let unit = 0;
      for (const k in texs) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texs[k]);
        gl.uniform1i(p.u[k], unit++);
      }
      for (const k in uniforms) {
        const v = uniforms[k];
        if (p.u[k] == null) continue;
        if (typeof v === 'number') gl.uniform1f(p.u[k], v);
        else if (v.length === 2) gl.uniform2f(p.u[k], v[0], v[1]);
        else if (v.length === 3) gl.uniform3f(p.u[k], v[0], v[1], v[2]);
      }
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // upload the frame (a canvas, or RGBA bytes with row 0 = top)
    upload(source) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.src);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      if (source instanceof Uint8Array || source instanceof Uint8ClampedArray)
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.W, this.H, gl.RGBA, gl.UNSIGNED_BYTE, source);
      else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    finish(fx, frame) {
      const P = this.progs, m = this.mips;
      // bloom: bright-pass at ½ res, then down / up with additive recombination
      let bloomTex = this.black;
      if (fx.bloom > 0.001) {
        this.draw(P.bright, m[0].d, { thr: fx.bloomThr, texel: [1 / this.W, 1 / this.H] }, { src: this.src });
        for (let i = 1; i < m.length; i++) this.draw(P.down, m[i].d, { texel: [1 / m[i - 1].w, 1 / m[i - 1].h] }, { src: m[i - 1].d.t });
        for (let i = m.length - 2; i >= 0; i--) {
          const srcT = i === m.length - 2 ? m[i + 1].d.t : m[i + 1].u.t;
          this.draw(P.up, m[i].u, { texel: [1 / m[i + 1].w, 1 / m[i + 1].h] }, { src: srcT, add: m[i].d.t });
        }
        bloomTex = m[0].u.t;
      }
      this.draw(
        P.fin,
        this.outT,
        {
          res: [this.W, this.H], ca: fx.ca, glitch: fx.glitch, warp: fx.warp || 0, bloomAmt: fx.bloom, vig: fx.vig, grain: fx.grain, fr: frame,
          flashCol: fx.flashCol, flash: fx.flash, invert: fx.invert, expo: fx.expo, sat: fx.sat,
        },
        { src: this.src, bloom: bloomTex }
      );
      if (this.present !== false) this.draw(P.copy, null, {}, { src: this.outT.t });
    }
    readYUV() {
      const gl = this.gl;
      this.draw(this.progs.pack, this.packT, { res: [this.W, this.H] }, { src: this.outT.t });
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.packT.fb);
      gl.readPixels(0, 0, this.W / 4, this.H * 1.5, gl.RGBA, gl.UNSIGNED_BYTE, this.yuv);
      return this.yuv;
    }
  }
  G.Post = Post;
})(window);
