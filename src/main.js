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
const lookAtTarget = new THREE.Vector3(0, 0, 0);
const defaultCameraPosition = new THREE.Vector3(5, 3, 7);
camera.position.copy(defaultCameraPosition);
camera.lookAt(lookAtTarget);

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

const shipsRoot = new THREE.Group();
scene.add(shipsRoot);

const toggleOrbitButton = document.getElementById("toggle-orbit");
const resetCameraButton = document.getElementById("reset-camera");

let orbitIsRunning = true;
if (toggleOrbitButton instanceof HTMLButtonElement) {
  toggleOrbitButton.addEventListener("click", () => {
    orbitIsRunning = !orbitIsRunning;
    toggleOrbitButton.textContent = orbitIsRunning ? "Pause Orbit" : "Resume Orbit";
  });
}
if (resetCameraButton instanceof HTMLButtonElement) {
  resetCameraButton.addEventListener("click", () => {
    setCameraView(defaultCameraPosition);
  });
}

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

const shipConfigs = [
  {
    radius: 6,
    inclination: THREE.MathUtils.degToRad(10),
    speed: 0.2,
    phase: 0
  },
  {
    radius: 6,
    inclination: THREE.MathUtils.degToRad(10),
    speed: 0.2,
    phase: Math.PI
  },
  {
    radius: 6,
    inclination: THREE.MathUtils.degToRad(-10),
    speed: 0.2,
    phase: Math.PI * 0.5
  },
  {
    radius: 6,
    inclination: THREE.MathUtils.degToRad(-10),
    speed: 0.2,
    phase: Math.PI * 1.5
  }
];

const ships = [];
modelLoader.load(
  "./assets/models/ship.glb",
  (gltf) => {
    for (const config of shipConfigs) {
      const shipMesh = gltf.scene.clone(true);
      const shipOrbitNode = new THREE.Group();
      shipOrbitNode.add(shipMesh);
      shipOrbitNode.scale.setScalar(0.20);
      // Ship mesh points +X (nose). lookAt aligns +Z, so pre-rotate mesh once.
      shipMesh.rotation.y = -Math.PI * 0.5;
      shipsRoot.add(shipOrbitNode);

      ships.push({
        orbitNode: shipOrbitNode,
        mesh: shipMesh,
        radius: config.radius,
        inclination: config.inclination,
        speed: config.speed,
        phase: config.phase
      });
    }
  },
  undefined,
  (error) => {
    console.error("Could not load ./assets/models/ship.glb.", error);
  }
);

const orbitPosition = new THREE.Vector3();
const orbitLookAhead = new THREE.Vector3();
let orbitTime = 0;
let stationTime = 0;
let previousFrameMs;

function animate(timestamp) {
  requestAnimationFrame(animate);
  if (previousFrameMs === undefined) {
    previousFrameMs = timestamp;
  }
  const deltaSeconds = Math.max(0, (timestamp - previousFrameMs) * 0.001);
  previousFrameMs = timestamp;
  stationTime += deltaSeconds;
  if (orbitIsRunning) {
    orbitTime += deltaSeconds;
  }
  stationRoot.rotation.y = stationTime * 0.02;

  for (const ship of ships) {
    const theta = orbitTime * ship.speed + ship.phase;
    computeOrbitalPosition(theta, ship.radius, ship.inclination, orbitPosition);
    ship.orbitNode.position.copy(orbitPosition);
    const nextTheta = theta + 0.01;
    computeOrbitalPosition(nextTheta, ship.radius, ship.inclination, orbitLookAhead);
    ship.orbitNode.lookAt(orbitLookAhead);
  }

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

window.addEventListener("resize", () => {
  const width = app.clientWidth;
  const height = app.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

function computeOrbitalPosition(theta, radius, inclination, target) {
  const x = radius * Math.cos(theta);
  const z = radius * Math.sin(theta);

  const sinI = Math.sin(inclination);
  const cosI = Math.cos(inclination);

  target.set(
    x,
    -z * sinI,
    z * cosI
  );
}

function setCameraView(position) {
  camera.position.copy(position);
  camera.lookAt(lookAtTarget);
}
