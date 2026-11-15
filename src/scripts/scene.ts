// The whole show. A background image is turned into 3D by pushing every vertex of a grid back along its camera ray
// to the depth the depth map gives it. From the camera it still looks like a flat picture; to the light it has hills,
// trees and a sign, so the pig's shadow bends over them. The pig is real geometry flying through that space.
import * as THREE from 'three';

/* ---------------------------------------------------------------- config */
const DEPTH_NEAR = 4, DEPTH_FAR = 120;          // Depth Anything / MiDaS convention: bright = near, dark = far
const TAGLINES = [
  'A website. Technically.',
  'Yes, the shadow is real. The pig is not.',
  'Depth-mapped shadows for no reason whatsoever.',
  'Over-engineered on purpose.',
  'Now accepting donations and compliments.',
  'Gravity is more of a suggestion here.',
];
const BANNERS = ['DONATE PLS', 'MAXIMUM JEFF', 'HI MOM', 'PIGS: FLYING', 'NO REFUNDS', 'WORTH IT'];
const OINKS = ['OINK.', 'Rude.', "I'm a professional.", 'Please donate.', 'Wheee.', 'Do not poke the pilot.'];
const DISPLAY_FONT = '"Bricolage Grotesque Variable", Impact, sans-serif';

/* ---------------------------------------------------------------- renderer & cameras */
const FAR = 300, CAM_H = 2.2;
const CAM_POS = new THREE.Vector3(0, CAM_H, 0);
const CAM_TGT = new THREE.Vector3(0, 1.0, -20);

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const imageCam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000); // the camera the background "was shot with"
const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);      // the camera we render with (cover-cropped)
let bgAspect = 16 / 9;

function setupImageCam(a: number) {
  bgAspect = a;
  imageCam.aspect = a;
  imageCam.position.copy(CAM_POS);
  imageCam.lookAt(CAM_TGT);
  imageCam.updateProjectionMatrix();
  imageCam.updateMatrixWorld();
}
const rayDirN = (nx: number, ny: number, out: THREE.Vector3) =>
  out.set(nx, ny, 0.5).unproject(imageCam).sub(CAM_POS).normalize();

/* ---------------------------------------------------------------- light */
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c8c0, 2.3));
const sun = new THREE.DirectionalLight(0xfff3e0, 2.6);
sun.position.set(-5, 8, 4);            // low, left, behind the camera: long shadows thrown into the scene
sun.target.position.set(0, 0, -14);
scene.add(sun, sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 70 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0004;
sun.shadow.radius = 3;

/* ---------------------------------------------------------------- helpers */
type RGB = [number, number, number];
const hex2rgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
const HAZE = hex2rgb('#d6ebf5');
const fogged = (hex: string, d: number) => css(mix(hex2rgb(hex), HAZE, 1 - Math.exp(-d / 110)));
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type DepthFn = (dir: THREE.Vector3, u: number, v: number) => number;
interface Background { src: TexImageSource & CanvasImageSource; aspect: number; depthAt: DepthFn }

/* ---------------------------------------------------------------- procedural background
   Image and depth come from one scene description: flat "cutouts" standing at distance d, plus the ground plane. */
interface Cutout { d: number; inside: (x: number, y: number) => boolean; draw: () => void }

function makeProcedural(): Background {
  const W = 1920, H = 1080;
  setupImageCam(W / H);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const v = new THREE.Vector3();
  const P = (x: number, y: number, z: number): [number, number] => {
    v.set(x, y, z).project(imageCam);
    return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
  };
  const pxPerM = (d: number) => Math.abs(P(0, CAM_H, -d)[1] - P(0, CAM_H + 1, -d)[1]);
  const hfov = Math.tan(THREE.MathUtils.degToRad(22.5)) * (W / H);
  const R = rng(7);

  // sky
  const hy = P(0, CAM_H, -5000)[1];
  const sky = g.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, '#5aa9f5'); sky.addColorStop(0.7, '#a9d6ff'); sky.addColorStop(1, '#e4f4ff');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // clouds
  for (let i = 0; i < 7; i++) {
    const cx = R() * W, cy = 60 + R() * (hy * 0.55), s = 40 + R() * 60;
    for (let k = 0; k < 6; k++) {
      const ox = (k - 2.5) * s * 0.55, oy = Math.sin(k * 1.7) * s * 0.18, r = s * (0.45 + R() * 0.35);
      g.fillStyle = 'rgba(160,190,225,.35)'; g.beginPath(); g.arc(cx + ox, cy + oy + r * 0.25, r, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + ox, cy + oy, r, 0, 7); g.fill();
    }
  }
  // ground rows: mowed-lawn stripes in perspective
  const d = new THREE.Vector3();
  for (let sy = Math.floor(hy); sy < H; sy++) {
    rayDirN(0, 1 - ((sy + 0.5) / H) * 2, d);
    if (d.y >= -1e-5) continue;
    const z = (-d.z * CAM_H) / -d.y;
    const stripe = (Math.floor(z / 2.4) % 2) * Math.exp(-z / 45);
    const base = mix(hex2rgb('#86cc60'), hex2rgb('#6fb54e'), stripe);
    g.fillStyle = css(mix(base, HAZE, 1 - Math.exp(-z / 110)));
    g.fillRect(0, sy, W, 1);
  }

  const cut: Cutout[] = [];
  const hill = (dd: number, amp: number, base: number, f: number, s: number, col: [string, string]) => {
    const h = (x: number) =>
      base + amp * (0.55 + 0.25 * Math.sin(x * f + s) + 0.15 * Math.sin(x * f * 2.3 + s * 1.7) + 0.05 * Math.sin(x * f * 5.1 + s * 3.1));
    cut.push({
      d: dd,
      inside: (x, y) => y >= -0.02 && y <= h(x),
      draw() {
        const half = dd * hfov * 1.3 + 5, n = 240, tops: number[] = [];
        g.beginPath();
        for (let i = 0; i <= n; i++) {
          const x = -half + (2 * half * i) / n, p = P(x, h(x), -dd);
          tops.push(p[1]);
          if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
        }
        for (let i = n; i >= 0; i--) { const p = P(-half + (2 * half * i) / n, 0, -dd); g.lineTo(p[0], p[1]); }
        const gr = g.createLinearGradient(0, Math.min(...tops), 0, P(0, 0, -dd)[1]);
        gr.addColorStop(0, fogged(col[0], dd)); gr.addColorStop(1, fogged(col[1], dd));
        g.fillStyle = gr; g.fill();
      },
    });
  };
  hill(160, 34, 4, 0.018, 1.0, ['#a8b9e0', '#9fb7cf']);
  hill(95, 15, 2, 0.032, 2.2, ['#8ec2a6', '#77ad8d']);
  hill(52, 6, 1.2, 0.065, 4.1, ['#86c96a', '#68ad55']);
  hill(30, 2.4, 0.4, 0.11, 0.3, ['#9bd56e', '#79bf57']);
  hill(18, 1.9, 0.25, 0.16, 2.9, ['#a6dc74', '#86c95d']);

  // lollipop trees
  const tree = (x: number, dd: number, h: number, r: number) => cut.push({
    d: dd,
    inside: (px, py) => (Math.abs(px - x) < 0.1 + h * 0.02 && py >= 0 && py <= h - r) || (px - x) ** 2 + (py - (h - r)) ** 2 <= r * r,
    draw() {
      const [bx, by] = P(x, 0, -dd), [cx, cy] = P(x, h - r, -dd), k = pxPerM(dd), tw = (0.1 + h * 0.02) * k;
      g.fillStyle = fogged('#7a5236', dd); g.fillRect(bx - tw, cy, tw * 2, by - cy);
      g.fillStyle = fogged('#3e9a4b', dd); g.beginPath(); g.arc(cx, cy, r * k, 0, 7); g.fill();
      g.fillStyle = fogged('#5fbf5f', dd); g.beginPath(); g.arc(cx - r * k * 0.28, cy - r * k * 0.3, r * k * 0.45, 0, 7); g.fill();
    },
  });
  for (let i = 0; i < 16; i++) {
    const dd = 19 + R() * 45, x = (R() * 2 - 1) * dd * hfov * 1.1;
    if (Math.abs(x + 9) < 3 && dd < 30) continue;
    tree(x, dd, 2 + R() * 1.6, 0.8 + R() * 0.5);
  }
  tree(-2.2, 10.5, 3.9, 1.15); // tall one up front: the pig flies behind it

  // Jeff HQ
  {
    const x0 = -8.5, dd = 16;
    cut.push({
      d: dd,
      inside: (x, y) => (Math.abs(x - x0) <= 1.6 && y >= 0 && y <= 2) || (y > 2 && y <= 3.4 && Math.abs(x - x0) <= 1.9 * (1 - (y - 2) / 1.4)),
      draw() {
        const k = pxPerM(dd);
        const [l, t] = P(x0 - 1.6, 2, -dd), [r, b] = P(x0 + 1.6, 0, -dd);
        g.fillStyle = fogged('#f6efe1', dd); g.fillRect(l, t, r - l, b - t);
        g.fillStyle = fogged('#d9534f', dd); g.beginPath();
        g.moveTo(...P(x0 - 1.9, 2, -dd)); g.lineTo(...P(x0, 3.4, -dd)); g.lineTo(...P(x0 + 1.9, 2, -dd)); g.fill();
        const [dx, dy] = P(x0 - 0.3, 1.1, -dd); g.fillStyle = fogged('#5b3a29', dd); g.fillRect(dx, dy, 0.6 * k, 1.1 * k);
        const [wx, wy] = P(x0 + 0.6, 1.5, -dd); g.fillStyle = fogged('#8fd3ff', dd); g.fillRect(wx, wy, 0.6 * k, 0.5 * k);
        const [tx, ty] = P(x0, 1.55, -dd);
        g.fillStyle = fogged('#2b1d3a', dd); g.font = `800 ${0.32 * k}px ${DISPLAY_FONT}`; g.textAlign = 'center';
        g.fillText('JEFF HQ', tx - 0.55 * k, ty);
      },
    });
  }
  // caution sign
  {
    const x0 = 4.6, dd = 13, cy = 2.25, hd = 0.7;
    cut.push({
      d: dd,
      inside: (x, y) => (Math.abs(x - x0) < 0.06 && y >= 0 && y <= cy) || Math.abs(x - x0) + Math.abs(y - cy) <= hd,
      draw() {
        const k = pxPerM(dd), [px, py] = P(x0, 0, -dd), [cx, cyy] = P(x0, cy, -dd);
        g.fillStyle = '#6b6b6b'; g.fillRect(px - 0.06 * k, cyy, 0.12 * k, py - cyy);
        g.save(); g.translate(cx, cyy); g.rotate(Math.PI / 4);
        const s = (hd * k) / Math.SQRT2;
        g.fillStyle = '#ffd23f'; g.strokeStyle = '#2b1d3a'; g.lineWidth = 0.06 * k;
        g.fillRect(-s, -s, 2 * s, 2 * s); g.strokeRect(-s * 0.88, -s * 0.88, 1.76 * s, 1.76 * s); g.restore();
        g.fillStyle = '#2b1d3a'; g.textAlign = 'center'; g.font = `800 ${0.14 * k}px ${DISPLAY_FONT}`;
        g.fillText('CAUTION', cx, cyy - 0.2 * k); g.fillText('LOW-FLYING', cx, cyy + 0.02 * k); g.fillText('PIGS', cx, cyy + 0.24 * k);
      },
    });
  }

  cut.sort((a, b) => b.d - a.d).forEach((o) => o.draw());

  const depthAt: DepthFn = (dir) => {
    let best = FAR;
    if (dir.y < -1e-5) best = Math.min(FAR, CAM_H / -dir.y);
    if (dir.z < 0) for (const o of cut) {
      const s = o.d / -dir.z;
      if (s >= best) continue;
      if (o.inside(dir.x * s, CAM_H + dir.y * s)) best = s;
    }
    return best;
  };
  return { src: c, aspect: W / H, depthAt };
}

/* ---------------------------------------------------------------- background mesh */
let bgMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | undefined;
let shadowMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShadowMaterial> | undefined;

function buildBackground({ src, aspect, depthAt }: Background) {
  setupImageCam(aspect);
  const SY = 280, SX = Math.round(SY * aspect);
  const geo = new THREE.PlaneGeometry(1, 1, SX, SY);
  const pos = geo.attributes.position as THREE.BufferAttribute, uv = geo.attributes.uv as THREE.BufferAttribute;
  const depth = new Float32Array(pos.count), dir = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    rayDirN(u * 2 - 1, v * 2 - 1, dir);
    const s = depthAt(dir, u, v);
    depth[i] = s;
    pos.setXYZ(i, CAM_POS.x + dir.x * s, CAM_POS.y + dir.y * s, CAM_POS.z + dir.z * s);
  }
  geo.computeBoundingSphere();
  // Shadow receiver: same vertices, minus the stretched triangles that bridge depth jumps (hilltop → sky).
  const ix = geo.index!.array, keep: number[] = [];
  for (let t = 0; t < ix.length; t += 3) {
    const a = depth[ix[t]], b = depth[ix[t + 1]], c = depth[ix[t + 2]];
    const mn = Math.min(a, b, c), mx = Math.max(a, b, c);
    if (mx < FAR * 0.9 && mx / mn < 1.2) keep.push(ix[t], ix[t + 1], ix[t + 2]);
  }
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute('position', pos);
  sgeo.setAttribute('normal', geo.attributes.normal); // shadow receivers need a normal attribute or they draw nothing
  sgeo.setIndex(keep);

  const tex = new THREE.Texture(src);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;

  if (bgMesh && shadowMesh) {
    scene.remove(bgMesh, shadowMesh);
    bgMesh.geometry.dispose(); bgMesh.material.map?.dispose(); bgMesh.material.dispose();
    shadowMesh.geometry.dispose(); shadowMesh.material.dispose();
  }
  bgMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));
  shadowMesh = new THREE.Mesh(sgeo, new THREE.ShadowMaterial({ color: 0x24123a, opacity: 0.38, depthWrite: false }));
  shadowMesh.material.depthFunc = THREE.LessEqualDepth;
  shadowMesh.receiveShadow = true;
  shadowMesh.renderOrder = 1;
  bgMesh.frustumCulled = shadowMesh.frustumCulled = false;
  scene.add(bgMesh, shadowMesh);
  resize();
}

/* ---------------------------------------------------------------- the pig */
const rig = new THREE.Group(); scene.add(rig);
const pig = new THREE.Group(); rig.add(pig);
const M = (c: number) => new THREE.MeshLambertMaterial({ color: c });
const pink = M(0xf4a3b5), dpink = M(0xe5859d), black = M(0x2b1d3a);
const white = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x666666, side: THREE.DoubleSide });
function part(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = pig) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; parent.add(m);
  return m;
}
part(new THREE.SphereGeometry(1, 28, 18), pink, 0, 0, 0).scale.set(1.3, 0.95, 0.95);
part(new THREE.SphereGeometry(0.62, 24, 16), pink, 1.2, 0.35, 0);
part(new THREE.CylinderGeometry(0.28, 0.3, 0.24, 20), dpink, 1.78, 0.28, 0).rotation.z = Math.PI / 2;
for (const z of [0.1, -0.1]) part(new THREE.SphereGeometry(0.05, 8, 6), black, 1.9, 0.3, z);
for (const z of [0.27, -0.27]) part(new THREE.SphereGeometry(0.07, 10, 8), black, 1.6, 0.6, z);
for (const [z, r] of [[0.3, 0.35], [-0.3, -0.35]]) part(new THREE.ConeGeometry(0.2, 0.38, 12), dpink, 1.02, 0.9, z).rotation.set(r, 0, -0.4);
const legs = [[0.65, 0.42], [0.65, -0.42], [-0.65, 0.42], [-0.65, -0.42]].map(([x, z]) =>
  part(new THREE.CylinderGeometry(0.16, 0.14, 0.55, 12), pink, x, -0.82, z));
{
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = i * 0.55, r = 0.16 * (1 - i / 34);
    pts.push(new THREE.Vector3(-1.25 - i * 0.018, 0.25 + r * Math.sin(a), r * Math.cos(a)));
  }
  part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.035, 6), dpink, 0, 0, 0);
}
const wingShape = new THREE.Shape();
wingShape.moveTo(0.35, 0); wingShape.quadraticCurveTo(0.55, 0.9, 0.15, 1.55); wingShape.quadraticCurveTo(0, 1.2, -0.22, 1.3);
wingShape.quadraticCurveTo(-0.3, 1, -0.5, 1); wingShape.quadraticCurveTo(-0.52, 0.65, -0.68, 0.6);
wingShape.quadraticCurveTo(-0.5, 0.2, -0.4, 0); wingShape.lineTo(0.35, 0);
const wings = [1, -1].map((side) => {
  const pivot = new THREE.Group(); pivot.position.set(0.1, 0.72, 0.48 * side); pig.add(pivot);
  const geo = new THREE.ShapeGeometry(wingShape, 12); geo.rotateX((Math.PI / 2) * side);
  part(geo, white, 0, 0, 0, pivot);
  pivot.userData.side = side;
  return pivot;
});
pig.scale.setScalar(0.9);
rig.scale.setScalar(0.62);

// Banner + rope. Its shadow uses a second texture with the letters cut out, so light comes through the words.
const BW = 5.2, BH = 1.25;
const bColor = document.createElement('canvas'), bAlpha = document.createElement('canvas');
bColor.width = bAlpha.width = 1024; bColor.height = bAlpha.height = 248;
const bTex = new THREE.CanvasTexture(bColor), aTex = new THREE.CanvasTexture(bAlpha);
bTex.colorSpace = THREE.SRGBColorSpace;
function drawBanner(text: string) {
  const font = `800 ${text.length > 10 ? 132 : 160}px ${DISPLAY_FONT}`;
  let g = bColor.getContext('2d')!;
  g.fillStyle = '#fff3d6'; g.fillRect(0, 0, 1024, 248);
  g.fillStyle = '#d6336c'; g.fillRect(0, 0, 1024, 14); g.fillRect(0, 234, 1024, 14);
  g.fillStyle = '#2b1d3a'; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 132);
  g = bAlpha.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, 1024, 248);
  g.fillStyle = '#000'; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 132);
  bTex.needsUpdate = aTex.needsUpdate = true;
}
const banner = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshLambertMaterial({ map: bTex, side: THREE.DoubleSide }));
banner.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: aTex, alphaTest: 0.5, side: THREE.DoubleSide });
banner.castShadow = true;
banner.position.set(-1.4 - 0.9 - BW / 2, 0, 0);
rig.add(banner);
const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), black);
rope.castShadow = true; rope.rotation.z = Math.PI / 2; rope.position.set(-1.85, 0.1, 0);
rig.add(rope);

/* ---------------------------------------------------------------- layout: cover-crop the background to any screen */
function resize() {
  const w = innerWidth, h = innerHeight, a = w / h;
  renderer.setSize(w, h, false);
  cam.aspect = bgAspect;
  const FW = 1000 * bgAspect, FH = 1000;
  if (a > bgAspect) { const vh = FW / a; cam.setViewOffset(FW, FH, 0, (FH - vh) / 2, FW, vh); }
  else { const vw = FH * a; cam.setViewOffset(FW, FH, (FW - vw) / 2, 0, vw, FH); }
  cam.updateProjectionMatrix();
}
addEventListener('resize', resize);

const tmp = new THREE.Vector3();
function halfWidthAt(z: number) {
  tmp.set(1, 0.3, 0.5).unproject(cam).sub(cam.position).normalize();
  return Math.abs(cam.position.x + tmp.x * (z / tmp.z));
}

/* ---------------------------------------------------------------- UI */
let ti = 0;
setInterval(() => {
  const t = $('tag');
  t.classList.add('fade');
  setTimeout(() => { t.textContent = TAGLINES[++ti % TAGLINES.length]; t.classList.remove('fade'); }, 350);
}, 5200);

let toastTimer = 0;
function toast(msg: string) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('on'), 3200);
}
document.querySelectorAll<HTMLAnchorElement>('.tier').forEach((a) =>
  a.addEventListener('click', (e) => {
    if (a.dataset.live !== 'true') { e.preventDefault(); toast("The pig's bank account isn't hooked up yet. Check back soon."); }
  }));
const modal = $('modal');
$('donateBtn').addEventListener('click', () => modal.classList.add('on'));
$('close').addEventListener('click', () => modal.classList.remove('on'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('on'); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('on'); });

// parallax (mouse only)
const par = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') { par.tx = (e.clientX / innerWidth) * 2 - 1; par.ty = -((e.clientY / innerHeight) * 2 - 1); }
});

// poke the pig
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let roll = -1, bubbleT = 0;
const bubble = $('bubble');
canvas.addEventListener('pointerdown', (e) => {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
  ray.setFromCamera(ndc, cam);
  if (ray.intersectObject(pig, true).length) {
    roll = 0; bubbleT = 1.6;
    bubble.textContent = OINKS[Math.floor(Math.random() * OINKS.length)];
    bubble.classList.add('on');
  }
});

/* ---------------------------------------------------------------- your own photo (+ optional depth map) */
let customBg = false;
const loadImg = (f: File) => new Promise<HTMLImageElement>((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(f);
});
async function useFiles(list: FileList | null | undefined) {
  const files = [...(list ?? [])].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  const depthF = files.find((f) => /depth|disp/i.test(f.name)) ?? (files.length > 1 ? files[1] : null);
  const colorF = files.find((f) => f !== depthF) ?? files[0];
  const img = await loadImg(colorF), aspect = img.naturalWidth / img.naturalHeight;
  let depthAt: DepthFn;
  if (depthF) {
    const dimg = await loadImg(depthF), dw = 640, dh = Math.round(640 / aspect);
    const dc = document.createElement('canvas'); dc.width = dw; dc.height = dh;
    const dg = dc.getContext('2d')!;
    dg.filter = 'blur(1px)'; dg.drawImage(dimg, 0, 0, dw, dh);
    const px = dg.getImageData(0, 0, dw, dh).data;
    depthAt = (_dir, u, v) => {
      const x = Math.min(dw - 1, Math.round(u * (dw - 1))), y = Math.min(dh - 1, Math.round((1 - v) * (dh - 1)));
      const val = px[(y * dw + x) * 4] / 255;
      return Math.min(FAR, 1 / (1 / DEPTH_FAR + val * (1 / DEPTH_NEAR - 1 / DEPTH_FAR)));
    };
    toast('Photo + depth map loaded.');
  } else {
    depthAt = (dir) => (dir.y < -1e-5 ? Math.min(FAR, CAM_H / -dir.y) : FAR); // assume flat ground
    toast('No depth map found, so: flat ground. Add a *depth* image for the good stuff.');
  }
  customBg = true;
  buildBackground({ src: img, aspect, depthAt });
}
const fileIn = $<HTMLInputElement>('fileIn');
$('ownPhoto').addEventListener('click', () => fileIn.click());
fileIn.addEventListener('change', () => useFiles(fileIn.files));
const drop = $('drop');
let dragN = 0;
addEventListener('dragenter', (e) => { e.preventDefault(); dragN++; drop.classList.add('on'); });
addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; drop.classList.remove('on'); } });
addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', (e) => { e.preventDefault(); dragN = 0; drop.classList.remove('on'); useFiles(e.dataTransfer?.files); });

/* ---------------------------------------------------------------- go */
let launched = 1, bi = 0;
drawBanner(BANNERS[0]);
buildBackground(makeProcedural());
// Canvas text only uses the web font once it's loaded: redraw then.
document.fonts?.ready.then(() => {
  drawBanner(BANNERS[bi % BANNERS.length]);
  if (!customBg) buildBackground(makeProcedural());
});

const slow = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPEED = slow ? 1.2 : 2.4, Z0 = -12;
let px: number | null = null, t = 0, last = performance.now();
const head = new THREE.Vector3();
const count = $('count');

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  const hw = halfWidthAt(Z0);
  if (px === null) px = -hw - 2;
  px += SPEED * dt;
  if (px > hw + 6) {
    px = -hw - 2; launched++;
    count.textContent = `Pigs launched: ${launched}`;
    drawBanner(BANNERS[++bi % BANNERS.length]);
  }

  rig.position.set(px, 2.75 + 0.45 * Math.sin(t * 1.3), Z0 + 0.7 * Math.sin(t * 0.45));
  rig.rotation.z = 0.085 * Math.cos(t * 1.3);
  const flap = 0.55 + 0.6 * Math.sin(t * 13);
  wings.forEach((w) => (w.rotation.x = -flap * w.userData.side));
  legs.forEach((l, i) => (l.rotation.z = 0.35 * Math.sin(t * 9 + (i % 2) * Math.PI)));
  banner.rotation.y = 0.18 * Math.sin(t * 2.7);
  banner.rotation.x = 0.08 * Math.sin(t * 3.3);
  banner.position.y = -0.05 + 0.06 * Math.sin(t * 4);

  if (roll >= 0) {
    roll += dt / 0.75;
    pig.rotation.x = Math.PI * 2 * (1 - Math.pow(1 - Math.min(1, roll), 3));
    if (roll >= 1) { roll = -1; pig.rotation.x = 0; }
  }
  if (bubbleT > 0) {
    bubbleT -= dt;
    pig.localToWorld(head.set(1.5, 1.0, 0)).project(cam);
    bubble.style.left = `${((head.x + 1) / 2) * innerWidth}px`;
    bubble.style.top = `${((1 - head.y) / 2) * innerHeight}px`;
    if (bubbleT <= 0) bubble.classList.remove('on');
  }

  par.x += (par.tx - par.x) * 0.04; par.y += (par.ty - par.y) * 0.04;
  cam.position.set(CAM_POS.x + par.x * 0.22, CAM_POS.y + par.y * 0.1, CAM_POS.z);
  cam.lookAt(CAM_TGT);

  renderer.render(scene, cam);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
