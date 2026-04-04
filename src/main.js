import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const app = document.getElementById("app");
if (!(app instanceof HTMLDivElement)) {
  throw new Error("Missing #app container.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const defaultCameraFov = 60;
const camera = new THREE.PerspectiveCamera(
  defaultCameraFov,
  app.clientWidth / app.clientHeight,
  0.1,
  100
);
const defaultLookAtTarget = new THREE.Vector3(0, 0, 0);
const defaultCameraPosition = new THREE.Vector3(0, 2, 8);
const yawStep = THREE.MathUtils.degToRad(8);
const pitchStep = THREE.MathUtils.degToRad(6);
const zoomStep = 4;
const moveStep = 0.8;
const minPitch = THREE.MathUtils.degToRad(-89);
const maxPitch = THREE.MathUtils.degToRad(89);
const minCameraFov = 20;
const maxCameraFov = 90;
const worldUp = new THREE.Vector3(0, 1, 0);
const cameraForward = new THREE.Vector3();
const cameraRight = new THREE.Vector3();
const targetCameraPosition = new THREE.Vector3();
const targetCameraQuaternion = new THREE.Quaternion();
const targetCameraEuler = new THREE.Euler(0, 0, 0, "YXZ");
let targetCameraYaw = 0;
let targetCameraPitch = 0;
const cameraPositionSmoothing = 10;
const cameraRotationSmoothing = 14;
const cameraFovSmoothing = 14;
const cameraPositionSnapEpsilonSq = 0.000001;
const cameraRotationSnapDotEpsilon = 0.000001;
const cameraFovSnapEpsilon = 0.001;
let targetCameraFov = defaultCameraFov;
camera.rotation.order = "YXZ";
setCameraView(defaultCameraPosition, defaultLookAtTarget, true);

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
const panLeftButton = document.getElementById("pan-left");
const panRightButton = document.getElementById("pan-right");
const tiltUpButton = document.getElementById("tilt-up");
const tiltDownButton = document.getElementById("tilt-down");
const zoomInButton = document.getElementById("zoom-in");
const zoomOutButton = document.getElementById("zoom-out");
const moveLeftButton = document.getElementById("move-left");
const moveRightButton = document.getElementById("move-right");
const moveUpButton = document.getElementById("move-up");
const moveDownButton = document.getElementById("move-down");
const toggleOrbitIcon = document.getElementById("toggle-orbit-icon");

const pauseOrbitIconSrc = "./assets/icons/controls/pause-orbit.svg";
const resumeOrbitIconSrc = "./assets/icons/controls/resume-orbit.svg";

let orbitIsRunning = true;
if (toggleOrbitButton instanceof HTMLButtonElement) {
  syncOrbitToggleButton();
  toggleOrbitButton.addEventListener("click", () => {
    orbitIsRunning = !orbitIsRunning;
    syncOrbitToggleButton();
  });
}
if (resetCameraButton instanceof HTMLButtonElement) {
  resetCameraButton.addEventListener("click", () => {
    setCameraView(defaultCameraPosition, defaultLookAtTarget);
    setTargetCameraFov(defaultCameraFov);
  });
}
if (panLeftButton instanceof HTMLButtonElement) {
  panLeftButton.addEventListener("click", () => {
    rotateCamera(yawStep, 0);
  });
}
if (panRightButton instanceof HTMLButtonElement) {
  panRightButton.addEventListener("click", () => {
    rotateCamera(-yawStep, 0);
  });
}
if (tiltUpButton instanceof HTMLButtonElement) {
  tiltUpButton.addEventListener("click", () => {
    rotateCamera(0, pitchStep);
  });
}
if (tiltDownButton instanceof HTMLButtonElement) {
  tiltDownButton.addEventListener("click", () => {
    rotateCamera(0, -pitchStep);
  });
}
if (zoomInButton instanceof HTMLButtonElement) {
  zoomInButton.addEventListener("click", () => {
    zoomCamera(-zoomStep);
  });
}
if (zoomOutButton instanceof HTMLButtonElement) {
  zoomOutButton.addEventListener("click", () => {
    zoomCamera(zoomStep);
  });
}
if (moveLeftButton instanceof HTMLButtonElement) {
  moveLeftButton.addEventListener("click", () => {
    moveCamera(-moveStep, 0, 0);
  });
}
if (moveRightButton instanceof HTMLButtonElement) {
  moveRightButton.addEventListener("click", () => {
    moveCamera(moveStep, 0, 0);
  });
}
if (moveUpButton instanceof HTMLButtonElement) {
  moveUpButton.addEventListener("click", () => {
    moveCamera(0, moveStep, 0);
  });
}
if (moveDownButton instanceof HTMLButtonElement) {
  moveDownButton.addEventListener("click", () => {
    moveCamera(0, -moveStep, 0);
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

  updateCameraTransform(deltaSeconds);
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

function setCameraView(position, target, immediate = false) {
  targetCameraPosition.copy(position);

  cameraForward.copy(target).sub(position);
  if (cameraForward.lengthSq() > 0) {
    cameraForward.normalize();
    targetCameraPitch = THREE.MathUtils.clamp(
      Math.asin(THREE.MathUtils.clamp(cameraForward.y, -1, 1)),
      minPitch,
      maxPitch
    );
    targetCameraYaw = Math.atan2(-cameraForward.x, -cameraForward.z);
    updateTargetCameraQuaternion();
  }

  if (immediate) {
    camera.position.copy(targetCameraPosition);
    camera.quaternion.copy(targetCameraQuaternion);
  }
}

function rotateCamera(yawDelta, pitchDelta) {
  targetCameraYaw += yawDelta;
  targetCameraPitch = THREE.MathUtils.clamp(targetCameraPitch + pitchDelta, minPitch, maxPitch);
  updateTargetCameraQuaternion();
}

function moveCamera(rightDelta, upDelta, forwardDelta) {
  if (rightDelta !== 0 || forwardDelta !== 0) {
    cameraForward.set(0, 0, -1).applyQuaternion(targetCameraQuaternion).normalize();
    cameraRight.crossVectors(cameraForward, worldUp).normalize();
  }

  if (rightDelta !== 0) {
    targetCameraPosition.addScaledVector(cameraRight, rightDelta);
  }
  if (upDelta !== 0) {
    targetCameraPosition.addScaledVector(worldUp, upDelta);
  }
  if (forwardDelta !== 0) {
    targetCameraPosition.addScaledVector(cameraForward, forwardDelta);
  }
}

function zoomCamera(fovDelta) {
  setTargetCameraFov(targetCameraFov + fovDelta);
}

function setTargetCameraFov(nextFov) {
  targetCameraFov = THREE.MathUtils.clamp(nextFov, minCameraFov, maxCameraFov);
}

function updateTargetCameraQuaternion() {
  targetCameraEuler.set(targetCameraPitch, targetCameraYaw, 0, "YXZ");
  targetCameraQuaternion.setFromEuler(targetCameraEuler);
}

function updateCameraTransform(deltaSeconds) {
  const previousFov = camera.fov;
  const positionAlpha = 1 - Math.exp(-cameraPositionSmoothing * deltaSeconds);
  const rotationAlpha = 1 - Math.exp(-cameraRotationSmoothing * deltaSeconds);
  const fovAlpha = 1 - Math.exp(-cameraFovSmoothing * deltaSeconds);

  if (positionAlpha > 0) {
    camera.position.lerp(targetCameraPosition, positionAlpha);
  }
  if (rotationAlpha > 0) {
    camera.quaternion.slerp(targetCameraQuaternion, rotationAlpha);
  }
  if (fovAlpha > 0) {
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetCameraFov, fovAlpha);
  }

  if (camera.position.distanceToSquared(targetCameraPosition) <= cameraPositionSnapEpsilonSq) {
    camera.position.copy(targetCameraPosition);
  }
  if (1 - Math.abs(camera.quaternion.dot(targetCameraQuaternion)) <= cameraRotationSnapDotEpsilon) {
    camera.quaternion.copy(targetCameraQuaternion);
  }
  if (Math.abs(camera.fov - targetCameraFov) <= cameraFovSnapEpsilon) {
    camera.fov = targetCameraFov;
  }
  if (Math.abs(camera.fov - previousFov) > 0) {
    camera.updateProjectionMatrix();
  }
}

function syncOrbitToggleButton() {
  if (!(toggleOrbitButton instanceof HTMLButtonElement)) {
    return;
  }

  const label = orbitIsRunning ? "Pause Orbit" : "Resume Orbit";
  toggleOrbitButton.setAttribute("aria-label", label);
  toggleOrbitButton.title = label;

  if (toggleOrbitIcon instanceof HTMLImageElement) {
    toggleOrbitIcon.src = orbitIsRunning ? pauseOrbitIconSrc : resumeOrbitIconSrc;
  }
}
