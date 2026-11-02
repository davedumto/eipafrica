"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { useFilter } from "./FilterStore";

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  x = clamp((x - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const mobile = () => innerWidth <= 900;

type Key = { t: [number, number, number]; az: number; el: number; r: number; pad: number; mpad?: number; mz?: number; my?: number };

export default function Stage() {
  const { setChapter } = useFilter();

  // Keep latest setChapter without re-running the whole effect.
  const setChapterRef = useRef(setChapter);
  setChapterRef.current = setChapter;

  useEffect(() => {
    const $ = <T extends Element = Element>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
    const $$ = <T extends Element = Element>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const canvas = $("#stage") as HTMLCanvasElement | null;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer | undefined;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    } catch {
      document.documentElement.classList.add("no3d");
    }

    if (!renderer) return;

    const BG = 0x0a0b0e;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.FogExp2(BG, 0.0062);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 600);

    scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x3a2e24, 1.35));
    const key = new THREE.DirectionalLight(0xffd9a8, 2.6);
    key.position.set(40, 60, 30);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7fa0ff, 1.5);
    rim.position.set(-50, 25, -40);
    scene.add(rim);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: 0x0b0c10 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.06;
    scene.add(ground);
    const grid = new THREE.GridHelper(600, 120, 0x2f333d, 0x1b1e25);
    grid.position.y = -0.02;
    scene.add(grid);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf0b34a, transparent: true, opacity: 0.38, side: THREE.DoubleSide, fog: true });
    function ring(x: number, z: number, r: number) {
      const m = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.09, 128), ringMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.02, z);
      scene.add(m);
      return m;
    }

    const L = {
      plant: new THREE.Vector3(0, 0, 0),
      dam: new THREE.Vector3(-64, 0, -12),
      tower: new THREE.Vector3(-33, 0, -2),
      pylonX: -126,
      pylonZ: [-32, -9, 14],
      solar: new THREE.Vector3(36, 0, -16),
      wind: [new THREE.Vector3(-226, 0, -40), new THREE.Vector3(-210, 0, -58)],
      hills: new THREE.Vector3(74, -0.5, -104),
    };

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const progress: Record<string, number> = {};
    let ready = false;
    function updProgress() {
      const v = Object.values(progress);
      const p = v.reduce((a, b) => a + b, 0) / 4;
      ($("#loading") as HTMLElement | null)?.style.setProperty("--p", p.toFixed(3));
      const t = $("#loadtxt");
      if (t) t.textContent = "LOADING 3D SCENE " + Math.round(p * 100) + "%";
    }

    async function fetchModel(dir: string, name: string): Promise<THREE.Group> {
      const res = await fetch("/models/" + dir + name + ".glb");
      if (!res.ok) throw new Error("fetch " + res.status);
      const total = +(res.headers.get("content-length") || 0);
      const parts: Uint8Array[] = [];
      let got = 0;
      const rd = res.body!.getReader();
      for (;;) {
        const { done, value } = await rd.read();
        if (done) break;
        if (value) {
          parts.push(value);
          got += value.length;
          if (total) {
            progress[name] = 0.9 * got / total;
            updProgress();
          }
        }
      }
      const buf = await new Blob(parts as BlobPart[]).arrayBuffer();
      return new Promise((ok, no) => loader.parse(buf, "", (g) => ok(g.scene), no));
    }
    let compressed = true;
    function loadModel(name: string): Promise<THREE.Group> {
      const done = (sc: THREE.Group) => {
        progress[name] = 1;
        updProgress();
        return sc;
      };
      if (!compressed) return fetchModel("plain/", name).then(done);
      return fetchModel("", name)
        .then(done)
        .catch(() => {
          compressed = false;
          progress[name] = 0;
          return fetchModel("plain/", name).then(done);
        });
    }

    function place(obj: THREE.Object3D, pos: THREE.Vector3, size: number, byHeight = false, rotY = 0) {
      obj.rotation.y = rotY;
      obj.updateMatrixWorld(true);
      let b = new THREE.Box3().setFromObject(obj);
      const s = b.getSize(new THREE.Vector3());
      const k = size / (byHeight ? s.y : Math.max(s.x, s.z));
      obj.scale.setScalar(k);
      obj.updateMatrixWorld(true);
      b = new THREE.Box3().setFromObject(obj);
      const c = b.getCenter(new THREE.Vector3());
      obj.position.set(pos.x - c.x, pos.y - b.min.y, pos.z - c.z);
      obj.updateMatrixWorld(true);
      scene.add(obj);
      return new THREE.Box3().setFromObject(obj);
    }
    function tame(obj: THREE.Object3D) {
      obj.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          mesh.frustumCulled = true;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.envMapIntensity !== undefined) mat.envMapIntensity = 0.4;
        }
      });
    }

    function softEdge(obj: THREE.Object3D, box: THREE.Box3, start = 0.55, bright = 1.3, shrink = 0.97) {
      const c = box.getCenter(new THREE.Vector3());
      const sz = box.getSize(new THREE.Vector3());
      const R = 0.5 * Math.max(sz.x, sz.z) * shrink;
      const seen = new Set<THREE.Material>();
      obj.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (seen.has(mat)) return;
        seen.add(mat);
        if (mat.color) mat.color.multiplyScalar(bright);
        mat.onBeforeCompile = (sh) => {
          sh.uniforms.uC = { value: new THREE.Vector2(c.x, c.z) };
          sh.uniforms.uR = { value: R };
          sh.uniforms.uS = { value: start };
          sh.vertexShader = sh.vertexShader
            .replace("#include <common>", "#include <common>\nvarying vec2 vEdgeXZ;")
            .replace("#include <begin_vertex>", "#include <begin_vertex>\nvEdgeXZ = (modelMatrix * vec4(transformed, 1.0)).xz;");
          sh.fragmentShader = sh.fragmentShader
            .replace("#include <common>", "#include <common>\nvarying vec2 vEdgeXZ;\nuniform vec2 uC;\nuniform float uR;\nuniform float uS;")
            .replace(
              "#include <dithering_fragment>",
              "#include <dithering_fragment>\n float ed = length(vEdgeXZ - uC) / uR; if (ed > 1.0) discard; gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.043, 0.047, 0.062), smoothstep(uS, 1.0, ed));"
            );
        };
        mat.customProgramCacheKey = () => "softedge";
        mat.needsUpdate = true;
      });
      return R;
    }

    const pins: { el: HTMLDivElement; v: THREE.Vector3; chapter: number }[] = [];
    function addPin(chapter: number, title: string, sub: string, v: THREE.Vector3) {
      const el = document.createElement("div");
      el.className = "pin";
      el.innerHTML = "<i></i><b></b><span></span>";
      const span = $("span", el)!;
      span.innerHTML = title + "<em>" + sub + "</em>";
      $("#pins")?.appendChild(el);
      pins.push({ el, v, chapter });
    }

    function buildSolar() {
      const g = new THREE.Group();
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 64;
      const x = c.getContext("2d")!;
      x.fillStyle = "#2b4a82";
      x.fillRect(0, 0, 128, 64);
      x.strokeStyle = "#8fb1e6";
      x.lineWidth = 2;
      for (let i = 0; i <= 8; i++) {
        x.beginPath();
        x.moveTo(i * 16, 0);
        x.lineTo(i * 16, 64);
        x.stroke();
      }
      for (let j = 0; j <= 4; j++) {
        x.beginPath();
        x.moveTo(0, j * 16);
        x.lineTo(128, j * 16);
        x.stroke();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.35, emissive: 0x1a3566, emissiveIntensity: 1.0 });
      const side = new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.6, metalness: 0.4 });
      const post = new THREE.MeshStandardMaterial({ color: 0x6d7482, roughness: 0.7, metalness: 0.3 });
      const geo = new THREE.BoxGeometry(2.6, 0.1, 1.5);
      const mats = [side, side, top, side, side, side];
      for (let r = 0; r < 5; r++)
        for (let i = 0; i < 9; i++) {
          const p = new THREE.Mesh(geo, mats);
          p.position.set((i - 4) * 2.75, 1.1, (r - 2) * 3.6);
          p.rotation.x = -0.46;
          g.add(p);
          const s = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), post);
          s.position.set(p.position.x, 0.55, p.position.z);
          g.add(s);
        }
      g.position.copy(L.solar);
      g.rotation.y = -0.35;
      scene.add(g);
      return g;
    }
    void buildSolar; // defined, unused — matches index.html where buildSolar() is never invoked.

    let damObj: THREE.Object3D | null = null;
    let damRing: THREE.Mesh | null = null;

    async function build() {
      const plant = await loadModel("thermal");
      tame(plant);
      const pb = place(plant, L.plant, 36);
      const pR = softEdge(plant, pb);
      ring(L.plant.x, L.plant.z, pR + 1.2);
      setKey("hero", pb, 38, 22, 1.22, pR * 1.12);
      setKey("power", pb, 26, 26, 1.0, pR * 1.12);
      addPin(
        0,
        "THERMAL POWER",
        "Plants, projects, tenders",
        new THREE.Vector3(pb.max.x - (pb.max.x - pb.min.x) * 0.32, pb.max.y * 0.78, (pb.min.z + pb.max.z) / 2 + 1)
      );
      canvas!.classList.add("ready");
      ready = true;

      ring(-218, -49, 24);

      const [dam, pylon, turbine] = await Promise.all([loadModel("dam"), loadModel("pylon"), loadModel("turbine")]);
      tame(dam);
      tame(pylon);
      tame(turbine);
      const DZ = 8;
      damObj = dam;
      const db = place(dam, L.dam.clone().add(new THREE.Vector3(0, 0, DZ)), 64);
      const dR = softEdge(dam, db, 0.5, 1.7, 0.86);
      damRing = ring(L.dam.x, L.dam.z + DZ, dR * 1.0);
      damRing.scale.y = 0.78;
      setKey("water", db.clone().translate(new THREE.Vector3(0, 0, -DZ)), -24, 30, 0.95, dR * 1.45);
      K.water.mpad = 1.6;
      K.water.mz = 8;
      K.water.my = -13;
      addPin(1, "HYDRO", "Dams, concessions, rehabilitation", new THREE.Vector3((db.min.x + db.max.x) / 2, db.max.y * 0.7, (db.min.z + db.max.z) / 2));

      const windBoxes: THREE.Box3[] = [];
      const tOpts: [number, number][] = [
        [24, -1.15],
        [20, -1.25],
      ];
      const turbObjs = L.wind.map((_, i) => (i === 0 ? turbine : turbine.clone(true)));
      L.wind.forEach((pos, i) => windBoxes.push(place(turbObjs[i], pos, tOpts[i][0], true, tOpts[i][1])));
      const renBox = new THREE.Box3();
      windBoxes.forEach((b) => renBox.union(b));
      setKey("ren", renBox, -108, 15, 0.9);
      K.ren.mpad = 2.0;
      K.ren.my = -11;
      addPin(3, "WIND", "Projects and EPC mandates", new THREE.Vector3(L.wind[0].x, windBoxes[0].max.y * 0.82, L.wind[0].z));

      const H = 23;
      const tops: { bb: THREE.Box3; z: number }[] = [];
      const pylonObjs = L.pylonZ.map((_, i) => (i === 0 ? pylon : pylon.clone(true)));
      L.pylonZ.forEach((z, i) => {
        const o = pylonObjs[i];
        const bb = place(o, new THREE.Vector3(L.pylonX, 0, z), H, true, Math.PI / 2);
        tops.push({ bb, z });
      });
      const bb0 = tops[0].bb;
      const armHalf = (bb0.max.x - bb0.min.x) / 2;
      const cx = (bb0.min.x + bb0.max.x) / 2;
      const wireMat = new THREE.LineBasicMaterial({ color: 0x9aa0ab, transparent: true, opacity: 0.55 });
      ([
        [-0.92, 0.93],
        [0.92, 0.93],
        [-0.9, 0.78],
        [0.9, 0.78],
      ] as [number, number][]).forEach(([ox, hy]) => {
        for (let i = 0; i < tops.length - 1; i++) {
          const a = new THREE.Vector3(cx + ox * armHalf, hy * H, tops[i].z);
          const b = new THREE.Vector3(cx + ox * armHalf, hy * H, tops[i + 1].z);
          const m = a.clone().add(b).multiplyScalar(0.5);
          m.y -= 1.8;
          const curve = new THREE.QuadraticBezierCurve3(a, m, b);
          scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)), wireMat));
        }
      });
      const gb = new THREE.Box3(new THREE.Vector3(L.pylonX - 9, 0, L.pylonZ[0] - 4), new THREE.Vector3(L.pylonX + 9, H, L.pylonZ[2] + 4));
      setKey("grid", gb, -76, 9, 0.8);
      addPin(2, "TRANSMISSION", "Lines, substations, grid", new THREE.Vector3(L.pylonX, H * 0.95, L.pylonZ[1]));
      ring(L.pylonX, L.pylonZ[1], 34);
    }

    build()
      .catch((e) => console.warn("3D load issue", e))
      .finally(() => {
        setTimeout(() => $("#loading")?.classList.add("done"), 400);
      });

    const dflt = (x: number, z: number): Key => ({ t: [x, 4, z], az: 30, el: 22, r: 16, pad: 1.4 });
    const K: Record<string, Key> = { hero: dflt(2, 0), power: dflt(0, 0), water: dflt(-40, 0), grid: dflt(-88, -9), ren: dflt(48, -30) };
    function setKey(name: string, box: THREE.Box3, az: number, el: number, pad: number, rOverride?: number) {
      const c = box.getCenter(new THREE.Vector3());
      const r = rOverride || box.getBoundingSphere(new THREE.Sphere()).radius;
      K[name] = { t: [c.x, c.y, c.z], az, el, r, pad, mpad: name === "hero" ? pad * 1.25 : pad };
    }
    const chapterKeys = () => [K.power, K.water, K.grid, K.ren];
    const cur = { tx: K.hero.t[0], ty: K.hero.t[1], tz: K.hero.t[2], az: K.hero.az, el: K.hero.el, d: 60, ox: 0, oy: 0 };
    function keyVals(k: Key) {
      return {
        tx: k.t[0],
        ty: k.t[1] + (mobile() && k.my ? k.my : 0),
        tz: k.t[2] + (mobile() && k.mz ? k.mz : 0),
        az: k.az,
        el: k.el,
        d: (k.r / Math.sin((camera.fov * Math.PI) / 360)) * (mobile() ? k.mpad || k.pad : k.pad),
      };
    }
    function mix<T extends Record<string, number>>(a: T, b: T, w: number): T {
      const r = {} as T;
      for (const p in a) r[p] = lerp(a[p], b[p], w) as T[Extract<keyof T, string>];
      return r;
    }

    let mx = 0,
      my = 0;
    const onPointerMove = (e: PointerEvent) => {
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
    };
    addEventListener("pointermove", onPointerMove, { passive: true });

    const journey = $("#journey")! as HTMLElement;
    const hero = $("#hero")! as HTMLElement;
    let chapter = -1;
    let w = 0,
      h = 0,
      last = performance.now(),
      time = 0;

    function setChapterLocal(i: number) {
      if (i === chapter) return;
      chapter = i;
      setChapterRef.current(i);
    }

    function resize() {
      w = innerWidth;
      h = innerHeight;
      renderer!.setPixelRatio(Math.min(devicePixelRatio || 1, mobile() ? 1.5 : 1.75));
      (scene.fog as THREE.FogExp2).density = mobile() ? 0.0028 : 0.0062;
      renderer!.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = mobile() ? 44 : 32;
      camera.updateProjectionMatrix();
    }
    addEventListener("resize", resize);
    resize();

    const v3 = new THREE.Vector3();
    const proj = new THREE.Vector3();
    let rafId = 0;

    function frame(now: number) {
      rafId = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduce) time += dt;
      const sy = scrollY,
        jr = journey.getBoundingClientRect();
      if (!ready) return;
      if (jr.bottom < -20) {
        pins.forEach((p) => p.el.classList.remove("show"));
        return;
      }

      const heroP = smooth(0, 0.9, sy / Math.max(1, hero.offsetHeight * 0.9));
      const j = clamp(-jr.top / Math.max(1, jr.height - h));
      const s = j * 4,
        i = Math.min(3, Math.floor(s)),
        frac = s - i;
      const idx = jr.top > h * 0.4 ? -1 : i;
      setChapterLocal(idx);
      if (damObj) {
        const vis = j > 0.0001 && (i === 1 || i === 2 || (i === 0 && frac > 0.55));
        damObj.visible = vis;
        if (damRing) damRing.visible = vis;
      }
      let target;
      if (j <= 0.0001) target = mix(keyVals(K.hero), keyVals(K.power), heroP);
      else {
        const ck = chapterKeys(),
          a = keyVals(ck[i]),
          b = keyVals(ck[Math.min(3, i + 1)]);
        target = i < 3 ? mix(a, b, smooth(0.6, 1, frac)) : a;
      }
      const orbit = reduce ? 0 : Math.sin(time * 0.12) * 9 * (1 - heroP);
      const k = 1 - Math.exp(-dt * 3.4);
      for (const p in target) (cur as Record<string, number>)[p] += (target[p as keyof typeof target] - (cur as Record<string, number>)[p]) * k;
      cur.ox += (mx * 5 - cur.ox) * k;
      cur.oy += (my * 3 - cur.oy) * k;
      const az = ((cur.az + orbit + cur.ox) * Math.PI) / 180,
        el = ((cur.el - cur.oy) * Math.PI) / 180;
      camera.position.set(
        cur.tx + cur.d * Math.sin(az) * Math.cos(el),
        cur.ty + cur.d * Math.sin(el),
        cur.tz + cur.d * Math.cos(az) * Math.cos(el)
      );
      camera.lookAt(cur.tx, cur.ty, cur.tz);
      if (mobile()) {
        const oy = lerp(-h * 0.17, h * 0.17, smooth(0.2, 1, Math.max(heroP, j > 0 ? 1 : 0)));
        camera.setViewOffset(w, h, 0, oy, w, h);
      } else camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
      renderer!.render(scene, camera);

      const showHero = j <= 0.0001 && heroP < 0.55 && !mobile();
      pins.forEach((p) => {
        const on = (p.chapter === 0 && showHero) || (j > 0.0001 && p.chapter === chapter);
        proj.copy(p.v).project(camera);
        const x = (proj.x * 0.5 + 0.5) * w,
          y = (-proj.y * 0.5 + 0.5) * h;
        const visible = on && proj.z < 1 && x > 40 && x < w - 24 && y > 120 && y < (mobile() ? h * 0.45 : h - 40);
        p.el.classList.toggle("show", visible);
        if (visible) {
          const wd = p.el.offsetWidth,
            flip = x + wd + 16 > w;
          p.el.classList.toggle("flip", flip);
          const tx = Math.max(8, Math.min(w - wd - 8, flip ? x - wd + 5 : x - 5));
          p.el.style.transform = `translate(${tx.toFixed(1)}px,${y.toFixed(1)}px) translateY(-50%)`;
        }
      });
    }
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onPointerMove);
      pins.forEach((p) => p.el.remove());
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const mat = m as THREE.MeshStandardMaterial;
            mat.map?.dispose();
            mat.dispose?.();
          });
        }
      });
      renderer!.dispose();
      void v3;
    };
  }, []);

  return null;
}
