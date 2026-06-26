import * as THREE from "three";

const canvas = document.getElementById("hero-canvas");
if (!canvas) {
  // No hero on this page; nothing to do.
} else {
  const heroEl = canvas.closest(".hero");

  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    48,
    heroEl.clientWidth / heroEl.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.1, 7.2);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  function getThemeColors() {
    const theme = document.documentElement.getAttribute("data-theme") || "dark";
    if (theme === "light") {
      return {
        cyan: 0x00a7b8,
        magenta: 0xd6258a,
        lime: 0x4e9a12,
        bg: 0x000000,
        fog: 0xeef1f8,
      };
    }
    return {
      cyan: 0x00f0ff,
      magenta: 0xff2e9a,
      lime: 0x9cff2e,
      bg: 0x000000,
      fog: 0x05060a,
    };
  }

  let colors = getThemeColors();
  scene.fog = new THREE.FogExp2(colors.fog, 0.07);

  /* ---------- Core: wireframe icosahedron ---------- */
  const coreGeo = new THREE.IcosahedronGeometry(1.65, 1);
  const coreMat = new THREE.MeshBasicMaterial({
    color: colors.cyan,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  scene.add(core);

  // inner solid faint core for depth
  const innerGeo = new THREE.IcosahedronGeometry(1.0, 0);
  const innerMat = new THREE.MeshBasicMaterial({
    color: colors.magenta,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });
  const innerCore = new THREE.Mesh(innerGeo, innerMat);
  scene.add(innerCore);

  /* ---------- Orbit rings ---------- */
  const ringGroup = new THREE.Group();
  const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.012, 8, 96),
    new THREE.MeshBasicMaterial({ color: colors.cyan, transparent: true, opacity: 0.5 })
  );
  ring1.rotation.x = Math.PI / 2.3;
  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(3.05, 0.01, 8, 96),
    new THREE.MeshBasicMaterial({ color: colors.magenta, transparent: true, opacity: 0.35 })
  );
  ring2.rotation.x = Math.PI / 1.7;
  ring2.rotation.y = Math.PI / 5;
  ringGroup.add(ring1, ring2);
  scene.add(ringGroup);

  /* ---------- Particle field (orbiting points) ---------- */
  const PARTICLE_COUNT = 420;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const radii = new Float32Array(PARTICLE_COUNT);
  const speeds = new Float32Array(PARTICLE_COUNT);
  const angles = new Float32Array(PARTICLE_COUNT);
  const heights = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const r = 2.2 + Math.random() * 2.6;
    const a = Math.random() * Math.PI * 2;
    const h = (Math.random() - 0.5) * 2.4;
    radii[i] = r;
    angles[i] = a;
    heights[i] = h;
    speeds[i] = 0.05 + Math.random() * 0.12;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = h;
    positions[i * 3 + 2] = Math.sin(a) * r;
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: colors.lime,
    size: 0.035,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* ---------- Floor grid (subtle, reinforces CSS grid) ---------- */
  const gridHelper = new THREE.GridHelper(20, 28, colors.cyan, colors.cyan);
  gridHelper.position.y = -2.1;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.12;
  scene.add(gridHelper);

  /* ---------- Resize handling ---------- */
  function resize() {
    const w = heroEl.clientWidth;
    const h = heroEl.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---------- Theme reactivity ---------- */
  function applyColors() {
    colors = getThemeColors();
    coreMat.color.setHex(colors.cyan);
    innerMat.color.setHex(colors.magenta);
    ring1.material.color.setHex(colors.cyan);
    ring2.material.color.setHex(colors.magenta);
    particleMat.color.setHex(colors.lime);
    gridHelper.material.color.setHex(colors.cyan);
    scene.fog.color.setHex(colors.fog);
  }
  window.addEventListener("themechange", applyColors);

  /* ---------- Mouse parallax (subtle) ---------- */
  let mouseX = 0, mouseY = 0;
  window.addEventListener("pointermove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* ---------- Animation loop ---------- */
  let frameId = null;
  const clock = new THREE.Clock();

  function tick() {
    frameId = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    const dt = clock.getDelta();

    core.rotation.y += dt * 0.18;
    core.rotation.x += dt * 0.06;
    innerCore.rotation.y -= dt * 0.26;
    innerCore.rotation.x -= dt * 0.09;
    ringGroup.rotation.z += dt * 0.05;
    ring1.rotation.y += dt * 0.07;
    ring2.rotation.y -= dt * 0.05;

    const posAttr = particleGeo.attributes.position;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      angles[i] += speeds[i] * dt * 0.6;
      const r = radii[i];
      posAttr.array[i * 3] = Math.cos(angles[i]) * r;
      posAttr.array[i * 3 + 2] = Math.sin(angles[i]) * r;
      posAttr.array[i * 3 + 1] = heights[i] + Math.sin(t * 0.6 + i) * 0.08;
    }
    posAttr.needsUpdate = true;

    // gentle camera parallax toward pointer
    camera.position.x += (mouseX * 0.6 - camera.position.x) * 0.02;
    camera.position.y += (1.1 - mouseY * 0.3 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  // Pause rendering when hero is off-screen to save GPU.
  const heroObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (frameId === null) tick();
        } else {
          if (frameId !== null) {
            cancelAnimationFrame(frameId);
            frameId = null;
          }
        }
      });
    },
    { threshold: 0.05 }
  );
  heroObserver.observe(heroEl);

  if (prefersReduced) {
    // Render a single static frame instead of a continuous loop.
    renderer.render(scene, camera);
  } else {
    tick();
  }
}
