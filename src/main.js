import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";

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
const shipViewOffset = new THREE.Vector3(0, 0.8, -1);
const yawStep = THREE.MathUtils.degToRad(8);
const pitchStep = THREE.MathUtils.degToRad(6);
const zoomStep = 4;
const moveStep = 0.8;
const minPitch = THREE.MathUtils.degToRad(-89);
const maxPitch = THREE.MathUtils.degToRad(89);
const minCameraFov = 20;
const maxCameraFov = 90;
const worldUp = new THREE.Vector3(0, 1, 0);
const shipViewFacingFix = new THREE.Quaternion().setFromAxisAngle(worldUp, Math.PI);
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
let viewIndex = 0; // 0 = free camera, 1..N = ship first-person views
const savedFreeCameraPosition = new THREE.Vector3();
let savedFreeCameraYaw = 0;
let savedFreeCameraPitch = 0;
let savedFreeCameraFov = defaultCameraFov;
camera.rotation.order = "YXZ";
setCameraView(defaultCameraPosition, defaultLookAtTarget, true);
saveFreeCameraState();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(app.clientWidth, app.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const LIGHTING_MODES = Object.freeze({
  DAY: "day",
  ECLIPSE: "eclipse"
});
const sunLightingPresets = Object.freeze({
  [LIGHTING_MODES.DAY]: Object.freeze({
    color: 0xffffff,
    intensity: 2.0,
  }),
  [LIGHTING_MODES.ECLIPSE]: Object.freeze({
    color: 0xa8b4cc,
    intensity: 0.2,
  }),
});

const sun = new THREE.DirectionalLight(
  sunLightingPresets[LIGHTING_MODES.DAY].color,
  sunLightingPresets[LIGHTING_MODES.DAY].intensity
);
sun.position.set(6, 8, 4);
scene.add(sun);

const stationRoot = new THREE.Group();
scene.add(stationRoot);

const shipsRoot = new THREE.Group();
scene.add(shipsRoot);
const ships = [];

const toggleOrbitButton = document.getElementById("toggle-orbit");
const resetCameraButton = document.getElementById("reset-camera");
const cycleViewButton = document.getElementById("cycle-view");
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
const moveForwardButton = document.getElementById("move-forward");
const moveBackwardButton = document.getElementById("move-backward");
const toggleShadingModeButton = document.getElementById("toggle-shading-mode");
const toggleLightingModeButton = document.getElementById("toggle-lighting-mode");
const toggleOrbitIcon = document.getElementById("toggle-orbit-icon");
const toggleLightingModeIcon = document.getElementById("toggle-lighting-mode-icon");
const modeOverlayElement = document.getElementById("mode-overlay");

const pauseOrbitIconSrc = "./assets/icons/controls/pause-orbit.svg";
const resumeOrbitIconSrc = "./assets/icons/controls/resume-orbit.svg";
const dayLightingIconSrc = "./assets/icons/controls/sunny.svg";
const eclipseLightingIconSrc = "./assets/icons/controls/brightness-7.svg";

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
    viewIndex = 0;
    setCameraView(defaultCameraPosition, defaultLookAtTarget);
    setTargetCameraFov(defaultCameraFov);
    saveFreeCameraState();
    syncCycleViewButton();
  });
}
if (cycleViewButton instanceof HTMLButtonElement) {
  syncCycleViewButton();
  cycleViewButton.addEventListener("click", () => {
    cycleCameraView();
  });
}
if (panLeftButton instanceof HTMLButtonElement) {
  panLeftButton.addEventListener("click", () => {
    if (!isFreeCameraView()) {
      return;
    }
    rotateCamera(yawStep, 0);
  });
}
if (panRightButton instanceof HTMLButtonElement) {
  panRightButton.addEventListener("click", () => {
    if (!isFreeCameraView()) {
      return;
    }
    rotateCamera(-yawStep, 0);
  });
}
if (tiltUpButton instanceof HTMLButtonElement) {
  tiltUpButton.addEventListener("click", () => {
    if (!isFreeCameraView()) {
      return;
    }
    rotateCamera(0, pitchStep);
  });
}
if (tiltDownButton instanceof HTMLButtonElement) {
  tiltDownButton.addEventListener("click", () => {
    if (!isFreeCameraView()) {
      return;
    }
    rotateCamera(0, -pitchStep);
  });
}
if (zoomInButton instanceof HTMLButtonElement) {
  zoomInButton.addEventListener("click", () => {
    if (!isFreeCameraView()) {
      return;
    }
    zoomCamera(-zoomStep);
  });
}
if (zoomOutButton instanceof HTMLButtonElement) {
  zoomOutButton.addEventListener("click", () => {
    if (!isFreeCameraView()) {
      return;
    }
    zoomCamera(zoomStep);
  });
}
if (moveLeftButton instanceof HTMLButtonElement) {
  moveLeftButton.addEventListener("click", () => {
    if (!isFreeCameraView()) {
      return;
    }
    moveCamera(-moveStep, 0, 0);
  });
}
if (moveRightButton instanceof HTMLButtonElement) {
  moveRightButton.addEventListener("click", () => {
    if (!isFreeCameraView()) {
      return;
    }
    moveCamera(moveStep, 0, 0);
  });
}
if (moveUpButton instanceof HTMLButtonElement) {
  moveUpButton.addEventListener("click", () => {
    if (!isFreeCameraView()) {
      return;
    }
    moveCamera(0, moveStep, 0);
  });
}
if (moveDownButton instanceof HTMLButtonElement) {
  moveDownButton.addEventListener("click", () => {
    if (!isFreeCameraView()) {
      return;
    }
    moveCamera(0, -moveStep, 0);
  });
}
if (moveForwardButton instanceof HTMLButtonElement) {
  moveForwardButton.addEventListener("click", () => {
    if (!isFreeCameraView()) {
      return;
    }
    moveCamera(0, 0, moveStep);
  });
}
if (moveBackwardButton instanceof HTMLButtonElement) {
  moveBackwardButton.addEventListener("click", () => {
    if (!isFreeCameraView()) {
      return;
    }
    moveCamera(0, 0, -moveStep);
  });
}

const modelLoader = new GLTFLoader();
const environmentMapLoader = new EXRLoader();
const environmentMapPath = "./assets/textures/env/night_sky_hdri_1k.exr";
let environmentMapTexture = null;
const reflectiveSurfaceProfiles = Object.freeze([
  Object.freeze({ prefix: "mid_", reflectivity: 0.30 }),
  Object.freeze({ prefix: "core_band_windows", reflectivity: 0.30 }),
  Object.freeze({ prefix: "ship_", reflectivity: 0.30 }),
]);
const SHADING_TECHNIQUES = Object.freeze({
  FLAT: "flat",
  GOURAUD: "gouraud",
  PHONG: "phong"
});
const SHADING_MODE_ASSIGNED = "assigned";
const shadingModeCycle = [
  SHADING_MODE_ASSIGNED,
  SHADING_TECHNIQUES.FLAT,
  SHADING_TECHNIQUES.GOURAUD,
  SHADING_TECHNIQUES.PHONG
];
let shadingMode = SHADING_MODE_ASSIGNED;
let lightingMode = LIGHTING_MODES.DAY;
if (toggleShadingModeButton instanceof HTMLButtonElement) {
  syncShadingModeButton();
  toggleShadingModeButton.addEventListener("click", () => {
    cycleShadingMode();
  });
}
if (toggleLightingModeButton instanceof HTMLButtonElement) {
  syncLightingModeButton();
  toggleLightingModeButton.addEventListener("click", () => {
    cycleLightingMode();
  });
}
applyCurrentLightingMode();
syncModeOverlay();
loadEnvironmentMap();

modelLoader.load(
  "./assets/models/station.glb",
  (gltf) => {
    applyStationShading(gltf.scene);
    registerDockBeaconBeams(gltf.scene);
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

modelLoader.load(
  "./assets/models/ship.glb",
  (gltf) => {
    for (const config of shipConfigs) {
      const shipMesh = gltf.scene.clone(true);
      const shipOrbitNode = new THREE.Group();
      shipOrbitNode.add(shipMesh);
      applyShipShading(shipOrbitNode);
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
    syncCycleViewButton();
  },
  undefined,
  (error) => {
    console.error("Could not load ./assets/models/ship.glb.", error);
  }
);

const orbitPosition = new THREE.Vector3();
const orbitLookAhead = new THREE.Vector3();
const dockBeaconBeams = [];
const dockBeaconRuntimeTargets = [];
const dockBeaconRotationAxisY = new THREE.Vector3(0, 1, 0);
const dockBeaconAngularSpeed = Math.PI;
const dockBeaconTargetLocal = new THREE.Vector3();
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
  updateDockBeaconBeams(stationTime);

  for (const ship of ships) {
    const theta = orbitTime * ship.speed + ship.phase;
    computeOrbitalPosition(theta, ship.radius, ship.inclination, orbitPosition);
    ship.orbitNode.position.copy(orbitPosition);
    const nextTheta = theta + 0.01;
    computeOrbitalPosition(nextTheta, ship.radius, ship.inclination, orbitLookAhead);
    ship.orbitNode.lookAt(orbitLookAhead);
  }

  if (!isFreeCameraView()) {
    setShipViewTarget();
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

function applyStationShading(root) {
  applyShadingToHierarchy(
    root,
    SHADING_TECHNIQUES.GOURAUD,
    resolveForcedTechniqueFromMode()
  );
}

function clearDockBeaconRuntimeTargets() {
  for (const target of dockBeaconRuntimeTargets) {
    target.removeFromParent();
  }
  dockBeaconRuntimeTargets.length = 0;
}

function registerDockBeaconBeams(root) {
  clearDockBeaconRuntimeTargets();
  dockBeaconBeams.length = 0;

  root.traverse((node) => {
    if (!(node instanceof THREE.SpotLight)) {
      return;
    }

    if (typeof node.name !== "string" || !node.name.startsWith("dock_beacon_spot_b")) {
      return;
    }

    const baseTargetLocal = node.target instanceof THREE.Object3D
      ? node.target.position.clone()
      : new THREE.Vector3(0, 0, -1);
    if (baseTargetLocal.lengthSq() < 0.000001) {
      baseTargetLocal.set(0, 0, -1);
    }

    const runtimeTarget = new THREE.Object3D();
    runtimeTarget.name = `${node.name}_runtime_target`;
    scene.add(runtimeTarget);
    dockBeaconRuntimeTargets.push(runtimeTarget);
    node.target = runtimeTarget;

    dockBeaconBeams.push({
      spotNode: node,
      baseTargetLocal,
      runtimeTarget,
    });
  });
}

function updateDockBeaconBeams(elapsedSeconds) {
  if (dockBeaconBeams.length === 0) {
    return;
  }

  const angle = (elapsedSeconds * dockBeaconAngularSpeed) % (Math.PI * 2);
  for (const beam of dockBeaconBeams) {
    dockBeaconTargetLocal.copy(beam.baseTargetLocal).applyAxisAngle(dockBeaconRotationAxisY, angle);
    beam.spotNode.updateWorldMatrix(true, false);
    beam.spotNode.localToWorld(dockBeaconTargetLocal);
    beam.runtimeTarget.position.copy(dockBeaconTargetLocal);
    beam.runtimeTarget.updateMatrixWorld();
  }
}

function applyShipShading(root) {
  applyShadingToHierarchy(
    root,
    SHADING_TECHNIQUES.PHONG,
    resolveForcedTechniqueFromMode()
  );
}

function applyShadingToHierarchy(root, fallbackTechnique, forcedTechnique = null) {
  applyShadingToSubtree(root, fallbackTechnique, false, forcedTechnique, null);
}

function applyShadingToSubtree(
  node,
  inheritedTechnique,
  parentTechniqueLocked,
  forcedTechnique,
  inheritedReflectivity
) {
  const nodeTechnique = forcedTechnique === null && !parentTechniqueLocked
    ? resolveTechniqueFromNodeName(node.name)
    : null;
  const activeTechnique = forcedTechnique || nodeTechnique || inheritedTechnique;
  const lockDescendantTechnique = forcedTechnique !== null || parentTechniqueLocked || nodeTechnique !== null;
  const nodeReflectivity = resolveReflectivityFromNodeName(node.name);
  const activeReflectivity = nodeReflectivity ?? inheritedReflectivity;

  if (node instanceof THREE.Mesh) {
    node.material = remapMaterial(node.material, activeTechnique);
    applyEnvironmentMapping(node.material, activeReflectivity);
  }

  for (const child of node.children) {
    applyShadingToSubtree(
      child,
      activeTechnique,
      lockDescendantTechnique,
      forcedTechnique,
      activeReflectivity
    );
  }
}

function resolveTechniqueFromNodeName(nodeName) {
  const objectName = typeof nodeName === "string" ? nodeName.toLowerCase() : "";

  if (objectName.startsWith("cargo_")) {
    return SHADING_TECHNIQUES.FLAT;
  }
  if (objectName.startsWith("mid_")) {
    return SHADING_TECHNIQUES.GOURAUD;
  }
  if (objectName.startsWith("core_") || objectName.startsWith("ship_")) {
    return SHADING_TECHNIQUES.PHONG;
  }

  return null;
}

function resolveReflectivityFromNodeName(nodeName) {
  const objectName = typeof nodeName === "string" ? nodeName.toLowerCase() : "";
  for (const profile of reflectiveSurfaceProfiles) {
    if (objectName.startsWith(profile.prefix)) {
      return profile.reflectivity;
    }
  }
  return null;
}

function applyEnvironmentMapping(material, reflectivity) {
  if (Array.isArray(material)) {
    for (const entry of material) {
      applyEnvironmentMapping(entry, reflectivity);
    }
    return;
  }

  if (!(material instanceof THREE.Material) || !("envMap" in material)) {
    return;
  }

  const shouldApplyReflection = environmentMapTexture !== null && typeof reflectivity === "number";

  if (!shouldApplyReflection) {
    if (material.envMap !== null) {
      material.envMap = null;
      material.needsUpdate = true;
    }
    return;
  }

  let changed = false;
  if (material.envMap !== environmentMapTexture) {
    material.envMap = environmentMapTexture;
    changed = true;
  }
  if ("reflectivity" in material && typeof material.reflectivity === "number") {
    if (Math.abs(material.reflectivity - reflectivity) > 0.0001) {
      material.reflectivity = reflectivity;
      changed = true;
    }
  }
  if ("combine" in material && material.combine !== THREE.MixOperation) {
    material.combine = THREE.MixOperation;
    changed = true;
  }
  if (changed) {
    material.needsUpdate = true;
  }
}

function loadEnvironmentMap() {
  environmentMapLoader.load(
    environmentMapPath,
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      environmentMapTexture = texture;
      scene.environment = texture;
      applyCurrentShading();
    },
    undefined,
    (error) => {
      console.error(`Could not load ${environmentMapPath}.`, error);
    }
  );
}

function remapMaterial(material, technique) {
  if (Array.isArray(material)) {
    return material.map((entry) => createShadingMaterial(entry, technique));
  }
  return createShadingMaterial(material, technique);
}

function createShadingMaterial(sourceMaterial, technique) {
  if (!(sourceMaterial instanceof THREE.Material)) {
    return sourceMaterial;
  }

  let targetMaterial;
  if (technique === SHADING_TECHNIQUES.GOURAUD) {
    targetMaterial = new THREE.MeshLambertMaterial();
  } else {
    targetMaterial = new THREE.MeshPhongMaterial();
  }

  // Keep only properties currently used by the project materials.
  if ("color" in sourceMaterial && sourceMaterial.color && "color" in targetMaterial) {
    targetMaterial.color.copy(sourceMaterial.color);
  }
  if ("emissive" in sourceMaterial && sourceMaterial.emissive && "emissive" in targetMaterial) {
    targetMaterial.emissive.copy(sourceMaterial.emissive);
  }
  if (
    "emissiveIntensity" in sourceMaterial &&
    typeof sourceMaterial.emissiveIntensity === "number" &&
    "emissiveIntensity" in targetMaterial
  ) {
    targetMaterial.emissiveIntensity = sourceMaterial.emissiveIntensity;
  }

  // Preserve texture mapping when remapping GLTF materials to Lambert/Phong.
  const textureProps = [
    "map",
    "alphaMap",
    "aoMap",
    "lightMap",
    "emissiveMap",
    "normalMap",
    "bumpMap",
    "displacementMap",
    "specularMap",
    "envMap",
  ];
  for (const prop of textureProps) {
    if (prop in sourceMaterial && sourceMaterial[prop] && prop in targetMaterial) {
      targetMaterial[prop] = sourceMaterial[prop];
    }
  }

  const numericProps = [
    "aoMapIntensity",
    "lightMapIntensity",
    "bumpScale",
    "displacementScale",
    "displacementBias",
    "reflectivity",
    "refractionRatio",
  ];
  for (const prop of numericProps) {
    if (prop in sourceMaterial && typeof sourceMaterial[prop] === "number" && prop in targetMaterial) {
      targetMaterial[prop] = sourceMaterial[prop];
    }
  }
  if (
    "normalScale" in sourceMaterial &&
    sourceMaterial.normalScale &&
    "normalScale" in targetMaterial &&
    targetMaterial.normalScale
  ) {
    targetMaterial.normalScale.copy(sourceMaterial.normalScale);
  }
  if ("normalMapType" in sourceMaterial && "normalMapType" in targetMaterial) {
    targetMaterial.normalMapType = sourceMaterial.normalMapType;
  }

  targetMaterial.side = sourceMaterial.side;
  targetMaterial.transparent = sourceMaterial.transparent;
  targetMaterial.opacity = sourceMaterial.opacity;
  targetMaterial.visible = sourceMaterial.visible;

  if (targetMaterial instanceof THREE.MeshPhongMaterial) {
    targetMaterial.flatShading = technique === SHADING_TECHNIQUES.FLAT;
    targetMaterial.shininess = 30;
    targetMaterial.specular.set(0x666666);
  }

  targetMaterial.name = `${sourceMaterial.name || "material"}_${technique}`;
  targetMaterial.needsUpdate = true;
  return targetMaterial;
}

function cycleShadingMode() {
  const currentIndex = shadingModeCycle.indexOf(shadingMode);
  const nextIndex = (currentIndex + 1) % shadingModeCycle.length;
  shadingMode = shadingModeCycle[nextIndex];
  applyCurrentShading();
  syncShadingModeButton();
  syncModeOverlay();
}

function applyCurrentShading() {
  applyStationShading(stationRoot);
  applyShipShading(shipsRoot);
}

function resolveForcedTechniqueFromMode() {
  if (shadingMode === SHADING_MODE_ASSIGNED) {
    return null;
  }
  return shadingMode;
}

function syncShadingModeButton() {
  if (!(toggleShadingModeButton instanceof HTMLButtonElement)) {
    return;
  }

  const label = `Shading Mode (${shadingMode})`;
  toggleShadingModeButton.setAttribute("aria-label", label);
  toggleShadingModeButton.title = `${label}`;
}

function cycleLightingMode() {
  lightingMode = lightingMode === LIGHTING_MODES.DAY
    ? LIGHTING_MODES.ECLIPSE
    : LIGHTING_MODES.DAY;
  applyCurrentLightingMode();
  syncLightingModeButton();
  syncModeOverlay();
}

function applyCurrentLightingMode() {
  const preset = sunLightingPresets[lightingMode];
  if (!preset) {
    return;
  }

  sun.color.setHex(preset.color);
  sun.intensity = preset.intensity;
}

function syncLightingModeButton() {
  if (!(toggleLightingModeButton instanceof HTMLButtonElement)) {
    return;
  }

  const nextLightingMode = lightingMode === LIGHTING_MODES.DAY
    ? LIGHTING_MODES.ECLIPSE
    : LIGHTING_MODES.DAY;
  const label = `Switch to ${nextLightingMode} lighting`;
  toggleLightingModeButton.setAttribute("aria-label", label);
  toggleLightingModeButton.title = label;

  if (toggleLightingModeIcon instanceof HTMLImageElement) {
    toggleLightingModeIcon.src = nextLightingMode === LIGHTING_MODES.DAY
      ? dayLightingIconSrc
      : eclipseLightingIconSrc;
  }
}

function syncModeOverlay() {
  if (!(modeOverlayElement instanceof HTMLElement)) {
    return;
  }

  modeOverlayElement.textContent = `lighting mode: ${lightingMode}\nshading mode: ${shadingMode}`;
}

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

function isFreeCameraView() {
  return viewIndex === 0;
}

function saveFreeCameraState() {
  savedFreeCameraPosition.copy(targetCameraPosition);
  savedFreeCameraYaw = targetCameraYaw;
  savedFreeCameraPitch = targetCameraPitch;
  savedFreeCameraFov = targetCameraFov;
}

function restoreFreeCameraState() {
  targetCameraPosition.copy(savedFreeCameraPosition);
  targetCameraYaw = savedFreeCameraYaw;
  targetCameraPitch = savedFreeCameraPitch;
  updateTargetCameraQuaternion();
  setTargetCameraFov(savedFreeCameraFov);
}

function cycleCameraView() {
  if (isFreeCameraView()) {
    saveFreeCameraState();
  }

  viewIndex += 1;
  if (viewIndex > ships.length) {
    viewIndex = 0;
  }

  if (isFreeCameraView()) {
    restoreFreeCameraState();
  } else {
    setShipViewTarget();
  }

  syncCycleViewButton();
}

function setShipViewTarget() {
  const shipIndex = viewIndex - 1;
  const ship = ships[shipIndex];
  if (!ship) {
    viewIndex = 0;
    restoreFreeCameraState();
    syncCycleViewButton();
    return;
  }

  ship.orbitNode.updateWorldMatrix(true, false);
  targetCameraPosition.copy(shipViewOffset).applyMatrix4(ship.orbitNode.matrixWorld);

  ship.orbitNode.getWorldQuaternion(targetCameraQuaternion);
  // Mesh/object forward is +Z while camera forward is -Z, so apply 180 deg yaw for first-person view.
  targetCameraQuaternion.multiply(shipViewFacingFix);
  targetCameraEuler.setFromQuaternion(targetCameraQuaternion, "YXZ");
  targetCameraPitch = THREE.MathUtils.clamp(targetCameraEuler.x, minPitch, maxPitch);
  targetCameraYaw = targetCameraEuler.y;
  updateTargetCameraQuaternion();
  setTargetCameraFov(defaultCameraFov);
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

function syncCycleViewButton() {
  if (!(cycleViewButton instanceof HTMLButtonElement)) {
    return;
  }

  const freeView = isFreeCameraView();

  let label = "Switch Camera";
  if (freeView) {
    label = "Switch Camera (Free View)";
  } else {
    label = `Switch Camera (Ship ${viewIndex} View)`;
  }

  cycleViewButton.setAttribute("aria-label", label);
  cycleViewButton.title = label;
}
