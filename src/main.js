import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const app = document.getElementById("app");
if (!(app instanceof HTMLDivElement)) {
  throw new Error("Missing #app container.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  60,
  app.clientWidth / app.clientHeight,
  0.1,
  100
);
camera.position.set(5, 3, 7);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(app.clientWidth, app.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(6, 8, 4);
scene.add(sun);

const stationRoot = new THREE.Group();
scene.add(stationRoot);

const modelLoader = new GLTFLoader();
modelLoader.register(() => ({
  name: "ForceFlatShading",
  extendMaterialParams(_materialIndex, materialParams) {
    materialParams.flatShading = true;
    return Promise.resolve();
  }
}));

modelLoader.load(
  "./assets/models/station.glb",
  (gltf) => {
    stationRoot.add(gltf.scene);
  },
  undefined,
  (error) => {
    console.error("Could not load ./assets/models/station.glb.", error);
  }
);

const timer = new THREE.Timer();
timer.connect(document);

function animate(timestamp) {
  requestAnimationFrame(animate);
  timer.update(timestamp);

  const t = timer.getElapsed();
  stationRoot.rotation.y = t * 0.02;

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  const width = app.clientWidth;
  const height = app.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

window.addEventListener("beforeunload", () => {
  timer.dispose();
});
