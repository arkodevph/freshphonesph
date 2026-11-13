import { advanceMenuSpring } from "./menu-spring";

const vertex = `attribute vec2 position;
void main() { gl_Position = vec4(position, 0., 1.); }`;

const fragment = `precision highp float;
uniform vec2 resolution;
uniform float time, yaw, pitch, work, blink, press;
mat2 rotate(float a) { float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float ellipsoid(vec3 p, vec3 r) {
  float a=length(p/r), b=length(p/(r*r));
  return a*(a-1.)/max(b,.0001);
}
float blend(float a,float b,float k) {
  float h=clamp(.5+.5*(b-a)/k,0.,1.);
  return mix(b,a,h)-k*h*(1.-h);
}
vec2 scene(vec3 p) {
  p.y -= sin(time*2.1)*.055*work;
  p.xz = rotate(yaw+sin(time*1.4)*.14*work)*p.xz;
  p.yz = rotate(pitch+sin(time*1.8)*.055*work)*p.yz;
  float breathing=sin(time*2.4)*.03*work;
  p /= vec3(1.+breathing+press*.06,1.-breathing-press*.08,1.+breathing);
  float d=ellipsoid(p-vec3(0.,-.05,0.),vec3(.77,.72,.57));
  d=blend(d,ellipsoid(p-vec3(-.3,-.64,.1),vec3(.22,.2,.27)),.16);
  d=blend(d,ellipsoid(p-vec3(.3,-.64,.1),vec3(.22,.2,.27)),.16);
  vec3 tuft=p-vec3(.045,.68,-.02);
  tuft.xy=rotate(-.5)*tuft.xy;
  d=blend(d,ellipsoid(tuft,vec3(.14,.22,.17)),.15);
  float eyeHeight=mix(.104,.014,blink);
  float eye1=ellipsoid(p-vec3(-.245,.13,.527),vec3(.067,eyeHeight,.06));
  float eye2=ellipsoid(p-vec3(.245,.13,.527),vec3(.067,eyeHeight,.06));
  float eyes=min(eye1,eye2);
  return eyes<d ? vec2(eyes,1.) : vec2(d,0.);
}
void main() {
  vec2 uv=(gl_FragCoord.xy*2.-resolution)/resolution.y;
  vec3 ro=vec3(0.,.04,3.5), rd=normalize(vec3(uv*1.13,-3.));
  float t=1.7;
  vec2 hit;
  bool found=false;
  for(int i=0;i<64;i++) {
    hit=scene(ro+rd*t);
    if(hit.x<.0015) { found=true; break; }
    t+=max(hit.x*.8,.001);
    if(t>5.) { break; }
  }
  if(!found) { gl_FragColor=vec4(0.); return; }
  vec3 p=ro+rd*t;
  vec2 e=vec2(.002,0.);
  vec3 n=normalize(vec3(scene(p+e.xyy).x-scene(p-e.xyy).x,scene(p+e.yxy).x-scene(p-e.yxy).x,scene(p+e.yyx).x-scene(p-e.yyx).x));
  vec3 light=normalize(vec3(-.6,.9,1.4));
  float diffuse=max(dot(n,light),0.);
  vec3 halfVector=normalize(light-rd);
  float specular=pow(max(dot(n,halfVector),0.),hit.y>.5?65.:16.);
  vec3 cream=vec3(.94,.95,.9), mint=vec3(.58,.76,.7);
  vec3 color=mix(mint,cream,smoothstep(-.65,.5,n.y));
  color*=.62+diffuse*.42;
  color+=vec3(1.,.98,.9)*specular*.12;
  float rim=pow(1.-max(dot(n,-rd),0.),3.);
  color+=vec3(.1,.13,.12)*rim;
  if(hit.y>.5) { color=vec3(.035,.041,.046)*(.75+diffuse*.3)+vec3(.9)*specular*.7; }
  color=pow(clamp(color,0.,1.),vec3(.85));
  gl_FragColor=vec4(color,1.);
}`;

type Instance = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  active: () => boolean;
  visible: boolean;
  hover: boolean;
  dirty: boolean;
  lookX: number;
  lookY: number;
  down: boolean;
  lastBlink: boolean;
  previousActive: boolean;
  motion: Record<
    "yaw" | "pitch" | "work" | "press",
    { position: number; velocity: number }
  >;
};

type Renderer = {
  surface: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  uniforms: Record<string, WebGLUniformLocation | null>;
};

let renderer: Renderer | null | undefined;

const instances = new Set<Instance>();

let frame = 0;

let previous = 0;

function getRenderer() {
  if (renderer !== undefined) {
    return renderer;
  }

  renderer = null;

  const surface = document.createElement("canvas");

  const gl = surface.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });

  if (!gl) {
    return null;
  }

  const program = gl.createProgram();

  if (!program) {
    return null;
  }

  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type);

    if (!shader) {
      return null;
    }

    gl.shaderSource(shader, source);

    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);

      return null;
    }

    gl.attachShader(program, shader);

    gl.deleteShader(shader);
  }

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return null;
  }

  gl.useProgram(program);

  const buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const position = gl.getAttribLocation(program, "position");

  gl.enableVertexAttribArray(position);

  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = Object.fromEntries(
    ["resolution", "time", "yaw", "pitch", "work", "blink", "press"].map(
      (name) => {
        return [name, gl.getUniformLocation(program, name)];
      },
    ),
  );

  renderer = { surface, gl, uniforms };

  return renderer;
}

function tick(now: number) {
  frame = 0;

  const elapsed = previous ? Math.min((now - previous) / 1000, 1 / 20) : 1 / 60;

  previous = now;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const engine = getRenderer();

  if (!engine) {
    return;
  }

  for (const item of instances) {
    if (!item.visible || (document.hidden && !item.dirty)) {
      continue;
    }

    const active = item.active();

    const blinkCycle = now % 5300;

    const blinking = !reduced && blinkCycle < 180;

    let moving = false;

    const targets = {
      yaw: reduced ? 0 : item.lookX * 0.32,
      pitch: reduced ? 0 : item.lookY * 0.18,
      work: active && !reduced ? 1 : 0,
      press: item.down && !reduced ? 1 : 0,
    };

    for (const key of ["yaw", "pitch", "work", "press"] as const) {
      item.motion[key] = reduced
        ? { position: 0, velocity: 0 }
        : advanceMenuSpring(item.motion[key], targets[key], elapsed);

      moving ||=
        Math.abs(item.motion[key].position - targets[key]) > 0.001 ||
        Math.abs(item.motion[key].velocity) > 0.01;
    }

    if (
      !item.dirty &&
      !moving &&
      !(active && !reduced) &&
      !item.hover &&
      !blinking &&
      !item.lastBlink &&
      item.previousActive === active
    ) {
      continue;
    }

    item.dirty = false;

    item.lastBlink = blinking;

    item.previousActive = active;

    const size = Math.max(
      48,
      Math.min(
        256,
        Math.ceil(
          item.canvas.getBoundingClientRect().width *
            Math.min(devicePixelRatio, 2),
        ),
      ),
    );

    const { gl, surface, uniforms } = engine;

    surface.width = size;

    surface.height = size;

    gl.viewport(0, 0, size, size);

    gl.uniform2f(uniforms.resolution, size, size);

    gl.uniform1f(uniforms.time, now / 1000);

    gl.uniform1f(uniforms.yaw, item.motion.yaw.position);

    gl.uniform1f(uniforms.pitch, item.motion.pitch.position);

    gl.uniform1f(uniforms.work, item.motion.work.position);

    gl.uniform1f(uniforms.press, item.motion.press.position);

    gl.uniform1f(
      uniforms.blink,
      blinking ? Math.sin((blinkCycle / 180) * Math.PI) : 0,
    );

    gl.clearColor(0, 0, 0, 0);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    item.canvas.width = size;

    item.canvas.height = size;

    item.context.clearRect(0, 0, size, size);

    item.context.drawImage(surface, 0, 0);
  }

  if (instances.size) {
    frame = requestAnimationFrame(tick);
  }
}

/** One shared GPU scene; each visible avatar gets a small canvas, not another WebGL context. */
export function mountCloudMascot(
  canvas: HTMLCanvasElement,
  active: () => boolean,
) {
  const engine = getRenderer();

  const context = canvas.getContext("2d");

  if (!engine || !context) {
    return null;
  }

  const item: Instance = {
    canvas,
    context,
    active,
    visible: true,
    hover: false,
    dirty: true,
    lookX: 0,
    lookY: 0,
    down: false,
    lastBlink: false,
    previousActive: false,
    motion: {
      yaw: { position: 0, velocity: 0 },
      pitch: { position: 0, velocity: 0 },
      work: { position: 0, velocity: 0 },
      press: { position: 0, velocity: 0 },
    },
  };

  instances.add(item);

  const observer = new IntersectionObserver((entries) => {
    item.visible = entries[0].isIntersecting;

    item.dirty = true;
  });

  observer.observe(canvas);

  function move(event: PointerEvent) {
    const box = canvas.getBoundingClientRect();

    item.lookX = ((event.clientX - box.left) / box.width) * 2 - 1;

    item.lookY = ((event.clientY - box.top) / box.height) * 2 - 1;

    item.hover = true;
  }

  function leave() {
    item.lookX = 0;

    item.lookY = 0;

    item.hover = false;

    item.down = false;
  }

  function down() {
    item.down = true;
  }

  function up() {
    item.down = false;
  }

  canvas.addEventListener("pointermove", move);

  canvas.addEventListener("pointerleave", leave);

  canvas.addEventListener("pointerdown", down);

  canvas.addEventListener("pointerup", up);

  cancelAnimationFrame(frame);

  frame = 0;

  tick(performance.now());

  return () => {
    observer.disconnect();

    instances.delete(item);

    canvas.removeEventListener("pointermove", move);

    canvas.removeEventListener("pointerleave", leave);

    canvas.removeEventListener("pointerdown", down);

    canvas.removeEventListener("pointerup", up);

    if (!instances.size) {
      cancelAnimationFrame(frame);

      frame = 0;

      previous = 0;
    }
  };
}
