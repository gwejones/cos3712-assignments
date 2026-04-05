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

const sun = new THREE.DirectionalLight(0xffffff, 2.0);
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
const toggleOrbitIcon = document.getElementById("toggle-orbit-icon");
const shadingSummaryElement = document.getElementById("shading-summary");

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
const shadingAssignments = {
  flat: [],
  gouraud: [],
  phong: []
};
if (toggleShadingModeButton instanceof HTMLButtonElement) {
  syncShadingModeButton();
  toggleShadingModeButton.addEventListener("click", () => {
    cycleShadingMode();
  });
}
updateShadingSummary();

modelLoader.load(
  "./assets/models/station.glb",
  (gltf) => {
    applyStationShading(gltf.scene);
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

function applyStationShading(root, refreshSummary = true) {
  applyShadingToHierarchy(
    root,
    SHADING_TECHNIQUES.GOURAUD,
    refreshSummary,
    resolveForcedTechniqueFromMode()
  );
}

function applyShipShading(root, refreshSummary = true) {
  applyShadingToHierarchy(
    root,
    SHADING_TECHNIQUES.PHONG,
    refreshSummary,
    resolveForcedTechniqueFromMode()
  );
}

function applyShadingToHierarchy(root, fallbackTechnique, refreshSummary = true, forcedTechnique = null) {
  applyShadingToSubtree(root, fallbackTechnique, false, forcedTechnique);

  if (refreshSummary) {
    updateShadingSummary();
  }
}

function applyShadingToSubtree(node, inheritedTechnique, parentTechniqueLocked, forcedTechnique) {
  const nodeTechnique = forcedTechnique === null && !parentTechniqueLocked
    ? resolveTechniqueFromNodeName(node.name)
    : null;
  const activeTechnique = forcedTechnique || nodeTechnique || inheritedTechnique;
  const lockDescendantTechnique = forcedTechnique !== null || parentTechniqueLocked || nodeTechnique !== null;

  if (node instanceof THREE.Mesh) {
    node.material = remapMaterial(node.material, activeTechnique);
    shadingAssignments[activeTechnique].push(buildNodeHierarchyPath(node));
  }

  for (const child of node.children) {
    applyShadingToSubtree(child, activeTechnique, lockDescendantTechnique, forcedTechnique);
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

function buildNodeHierarchyPath(node) {
  const nameParts = [];
  let current = node;

  while (current) {
    if (typeof current.name === "string" && current.name.trim().length > 0) {
      nameParts.push(current.name);
    }
    current = current.parent;
  }

  if (nameParts.length === 0) {
    return "<unnamed>";
  }

  nameParts.reverse();
  return nameParts.join(" -> ");
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

function updateShadingSummary() {
  if (!(shadingSummaryElement instanceof HTMLElement)) {
    return;
  }

  const summaryLines = [
    `shading mode: ${shadingMode}`,
    ""
  ];

  appendTechniqueGroup(summaryLines, SHADING_TECHNIQUES.FLAT);
  appendTechniqueGroup(summaryLines, SHADING_TECHNIQUES.GOURAUD);
  appendTechniqueGroup(summaryLines, SHADING_TECHNIQUES.PHONG);

  shadingSummaryElement.textContent = summaryLines.join("\n");
}

function appendTechniqueGroup(summaryLines, technique) {
  const assignments = shadingAssignments[technique];
  summaryLines.push(`${technique} (${assignments.length})`);

  for (const hierarchyPath of assignments) {
    summaryLines.push(`- ${hierarchyPath}`);
  }
  summaryLines.push("");
}

function cycleShadingMode() {
  const currentIndex = shadingModeCycle.indexOf(shadingMode);
  const nextIndex = (currentIndex + 1) % shadingModeCycle.length;
  shadingMode = shadingModeCycle[nextIndex];
  applyCurrentShading();
  syncShadingModeButton();
}

function applyCurrentShading() {
  clearShadingAssignments();
  applyStationShading(stationRoot, false);
  applyShipShading(shipsRoot, false);
  updateShadingSummary();
}

function clearShadingAssignments() {
  shadingAssignments.flat.length = 0;
  shadingAssignments.gouraud.length = 0;
  shadingAssignments.phong.length = 0;
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
