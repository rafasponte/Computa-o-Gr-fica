import * as THREE from "three";
/*import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";*/

import { VRButton } from 'three/addons/webxr/VRButton.js';

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////
let scene, camera, renderer;
let terrain;
let floralTexture, starryTexture;
let currentTexture;
let heightmapURL = 'heightmap.png';
let moon;
let directionalLight;
let wall;
let house;
let tree, ovni;
let pressedKeys = new Set();
let spotLight, pointLights = [];

let houseWidth = 4;
let houseHeight = 3;
let houseDepth = 3;

let currentShadingMode = 'phong';
let lightingEnabled = true;

let stereoCamera = new THREE.StereoCamera();
let useFixedCamera = false;
let fixedCamera;

const treeTrunkMaterial = new THREE.MeshPhongMaterial({ color: 0xCC7722 });
const treeLeafMaterial = new THREE.MeshPhongMaterial({ color: 0x013220 });
const ovniBodyMaterial = new THREE.MeshPhongMaterial({ color: 0x702963 });
const ovniCockpitMaterial = new THREE.MeshPhongMaterial({ color: 0xdbe1e3 });
const ovniBaseMaterial = new THREE.MeshPhongMaterial({ color: 0x301934 });
const ovniLightMaterial = new THREE.MeshPhongMaterial({ color: 0xee4b2b });
const ovniLightsColor = 0xee4b2b;
let trees = [];

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
    scene = new THREE.Scene();
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createCamera() {
    fixedCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    fixedCamera.position.set(0, 50, 60);
    fixedCamera.lookAt(0, 0, 0);

    camera = fixedCamera;
}

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////
function createObjects() {
    createMap();
    createMoon();
    createSkyDome();
    trees.push(createTree(-35, 15, 30, Math.PI / 6, 2.5));
    trees.push(createTree(-20, 15, -10, Math.PI / 2, 4));
    trees.push(createTree(10, 15, 5, -(Math.PI / 3), 2));
    trees.push(createTree(25, 15, -20, 0, 5));
    trees.push(createTree(40, 15, 20, -(Math.PI / 2), 3));
    createOvni(0, 25, 10);
}
function createMap() {
    floralTexture = generateFloralTexture();
    starryTexture = generateStarrySkyTexture();
    currentTexture = floralTexture;

    new THREE.TextureLoader().load(heightmapURL, (texture) => {
        const size = 256;
        const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
        const ctx = canvas.getContext('2d');
        ctx.drawImage(texture.image, 0, 0, size, size);

        const data = ctx.getImageData(0, 0, size, size).data;
        const heights = Array.from({ length: size * size }, (_, i) => data[i * 4] / 255 * 20);

        const geometry = new THREE.PlaneGeometry(500, 500, size - 1, size - 1);
        geometry.rotateX(-Math.PI / 2);

        for (let i = 0; i < geometry.attributes.position.count; i++) {
            geometry.attributes.position.setY(i, heights[i]);
        }
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({ map: currentTexture });
        terrain = new THREE.Mesh(geometry, material);
        terrain.name = "terrain";
        scene.add(terrain);
        terrain.y = -30;

        const terrainHeight = getHeightAt(0, 0, terrain);
        createHouse(0, terrainHeight + houseHeight / 2, 10);
    });
}

function getHeightAt(x, z, mesh) {
    const { width, height, widthSegments, heightSegments } = mesh.geometry.parameters;
    const positions = mesh.geometry.attributes.position;
    const gridX = widthSegments + 1;
    const ix = Math.round(((x + width / 2) / width) * widthSegments);
    const iz = Math.round(((z + height / 2) / height) * heightSegments);
    const index = iz * gridX + ix;
    return (index >= 0 && index < positions.count) ? positions.getY(index) : 0;
}

function createSkyDome() {
    const geometry = new THREE.SphereGeometry(100, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      map: starryTexture,
      side: THREE.BackSide
    });
    const skydome = new THREE.Mesh(geometry, material);
    skydome.name = 'skydome';
    scene.add(skydome);
  }

function createMoon() {
    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 5,
        metalness: 0,
        roughness: 0.4
    });
    moon = new THREE.Mesh(geometry, material);
    moon.position.set(50, 40, -50);
    scene.add(moon);
}

function createTree(pos_x, pos_y, pos_z, rot_y, height) {
  tree = new THREE.Group();

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, height, 32), treeTrunkMaterial);
  trunk.position.y = height/2;
  tree.add(trunk);

  const branch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4, 32), treeTrunkMaterial);
  branch1.position.set(1, height + 1.55, 0);
  branch1.rotation.z = -(Math.PI / 6);
  tree.add(branch1);

  const branch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3, 32), treeTrunkMaterial);
  branch2.position.set(-0.75, height + 1.5, 0);
  branch2.rotation.z = Math.PI / 3;
  tree.add(branch2);

  const leaf1 = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), treeLeafMaterial);
  leaf1.scale.set(2, 1, 1.5);
  leaf1.position.set(2, height + 3, 0);
  tree.add(leaf1);
  
  const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), treeLeafMaterial);
  leaf2.scale.set(2.5, 1.2, 2);
  leaf2.position.set(-2, height + 2.5, 0);
  tree.add(leaf2);

  tree.position.set(pos_x, pos_y, pos_z);
  tree.rotation.y = rot_y;

  scene.add(tree);
  return tree;
}

function createOvni(pos_x, pos_y, pos_z){
    ovni = new THREE.Group();
    ovni.position.set(pos_x, pos_y, pos_z);
    ovni.rotation.set(0, 0, 0);

    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), ovniBodyMaterial);
    body.scale.set(3, 0.6, 3);
    ovni.add(body);

    const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2), ovniCockpitMaterial);
    cockpit.position.y = 0.3;
    ovni.add(cockpit);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.2, 32), ovniBaseMaterial);
    base.position.y = -0.5;

    spotLight = new THREE.SpotLight(ovniLightsColor, 15, 100, Math.PI / 9, 0.7, 1);
    spotLight.position.copy(base.position);
    spotLight.target.position.set(0, -10, 0);

    base.add(spotLight);
    base.add(spotLight.target);
    ovni.add(base);
    
    const numLights = 8;
    const radius = 2.5;
    for (let i = 0; i < numLights; i++) {
        const angle = (i / numLights) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const light = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), ovniLightMaterial);
        light.position.set(x, -0.3, z);

        const pointLight = new THREE.PointLight(ovniLightsColor, 7, 7, 1);
        pointLight.position.copy(light.position);
        light.add(pointLight);
        ovni.add(light);
        pointLights.push(light);
    }

    scene.add(ovni);
}

function createLights() {
  directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(30,30, 50);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
}


function createHouse(x, y, z) {
    house = new THREE.Group();

    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const roofMaterial = new THREE.MeshPhongMaterial({ color: 0xff6600 });
    const doorMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    const windowMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    const stripeMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(houseWidth, houseHeight, houseDepth), wallMaterial);
    base.position.y = houseHeight / 2;
    house.add(base);

    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.sqrt(houseWidth ** 2 + houseDepth ** 2) / 2, 1.5, 4),
        roofMaterial
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = houseHeight + 0.75;
    house.add(roof);

    const door = new THREE.Mesh(new THREE.BoxGeometry(1, 1.8, 0.1), doorMaterial);
    door.position.set(0, 0.9, houseDepth / 2 + 0.05);
    house.add(door);

    const window1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), windowMaterial);
    window1.position.set(-1.2, 1.5, houseDepth / 2 + 0.05);
    house.add(window1);

    const window2 = window1.clone();
    window2.position.x = 1.2;
    house.add(window2);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(houseWidth, 0.2, houseDepth), stripeMaterial);
    stripe.position.y = 0.1;
    house.add(stripe);

    house.position.set(x, y, z);
    scene.add(house);
}

function setShadingMode(mode) {
    currentShadingMode = mode;

    const updateMaterials = (object) => {
        object.traverse(child => {
            if (child.isMesh) {
                const oldMaterial = child.material;
                const color = oldMaterial.color ? oldMaterial.color.clone() : new THREE.Color(0xffffff);

                let newMaterial;

                if (lightingEnabled) {
                    if (mode === 'flat' || mode === 'q') {
                        newMaterial = new THREE.MeshPhongMaterial({ color, flatShading: true });
                    } else if (mode === 'phong' || mode === 'w') {
                        newMaterial = new THREE.MeshPhongMaterial({ color, flatShading: false });
                    } else if (mode === 'toon' || mode === 'e') {
                        newMaterial = new THREE.MeshToonMaterial({ color });
                    } else {
                        newMaterial = new THREE.MeshPhongMaterial({ color, flatShading: false });
                    }
                } else {
                    newMaterial = new THREE.MeshBasicMaterial({ color });
                }

                child.material = newMaterial;
                child.material.needsUpdate = true;
            }
        });
    };

    if (house) updateMaterials(house);
    if (ovni) updateMaterials(ovni);
    trees.forEach(tree => updateMaterials(tree));
}



//////////////////////
/* CHECK COLLISIONS */
//////////////////////
function checkCollisions() { }

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////
function handleCollisions() { }

////////////
/* UPDATE */
////////////
function update() { 
    if (!ovni) return;

    ovni.rotation.y += 0.005;

    const direction = new THREE.Vector3();

    if (pressedKeys.has('arrowup'))    direction.z -= 1;
    if (pressedKeys.has('arrowdown'))  direction.z += 1;
    if (pressedKeys.has('arrowleft'))  direction.x -= 1;
    if (pressedKeys.has('arrowright')) direction.x += 1;

    direction.normalize();
    ovni.position.add(direction.multiplyScalar(0.1));
}

/////////////
/* DISPLAY */
/////////////
function render() {
    if (renderer.xr.isPresenting) {
        
        renderer.render(scene, camera);
    } else if (useFixedCamera) {
        stereoCamera.eyeSep = 0.064;
        stereoCamera.update(camera);

        const width = window.innerWidth / 2;
        const height = window.innerHeight;

        renderer.setScissorTest(true);

        renderer.setScissor(0, 0, width, height);
        renderer.setViewport(0, 0, width, height);
        renderer.render(scene, stereoCamera.cameraL);

        renderer.setScissor(width, 0, width, height);
        renderer.setViewport(width, 0, width, height);
        renderer.render(scene, stereoCamera.cameraR);

        renderer.setScissorTest(false);
    } else {
        renderer.render(scene, fixedCamera);
    }
}

////////////////////////////////
/* INITIALIZE ANIMATION CYCLE */
////////////////////////////////
function init() {
    createScene();
    createCamera();
    createLights();
    createRenderer();
    createObjects();

    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
    renderer.setAnimationLoop(() => {
        update();
        render();
    });
}

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
function onKeyDown(e) {
    const key = e.key.toLowerCase();

    if (!terrain) return;

    switch (key) {
        case "s":
            if (spotLight) {
                spotLight.visible = !spotLight.visible;
            }
            break;

        case "p":
            pointLights.forEach(mesh => {
                mesh.children.forEach(child => {
                    if (child.isPointLight) {
                        child.visible = !child.visible;
                    }
                });
            });
            break;

        case 'arrowup':
            pressedKeys.add(key);
            break;

        case 'arrowdown':
            pressedKeys.add(key);
            break;

        case 'arrowleft':
            pressedKeys.add(key);
            break;

        case 'arrowright':
            pressedKeys.add(key);
            break;
            
        case "1":
        floralTexture = generateFloralTexture();
        floralTexture.needsUpdate = true;

        currentTexture = floralTexture;

        terrain.material.map = currentTexture;
        terrain.material.needsUpdate = true;
        break;

        case "2":
        starryTexture = generateStarrySkyTexture();
        starryTexture.needsUpdate = true;

        currentTexture = starryTexture;

        const skydome = scene.children.find(obj => obj.name === 'skydome');
        skydome.material.map = currentTexture;
        skydome.material.needsUpdate = true;
        break;

        case "d":
            if (directionalLight) {
                directionalLight.visible = !directionalLight.visible;
            }
            break;

        case "q":
            setShadingMode("flat");
            break;

        case "w":
            setShadingMode("phong");
            break;

        case "e":
            setShadingMode("toon");
            break;

        case "r":
            lightingEnabled = !lightingEnabled;
            setShadingMode(currentShadingMode);
            break;

        case "7":
            useFixedCamera = !useFixedCamera;

            if (useFixedCamera) {
                camera = fixedCamera;
            } else {
                renderer.setScissorTest(false);
                renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
            }
            break;
    }
}


///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) { 
    const key = e.key.toLowerCase();

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        pressedKeys.delete(key);
    }
}

/////////////////////////
/* CREATE RENDERER     */
/////////////////////////
function createRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));
}

///////////////////////////////////////
/* TEXTURA DO CAMPO FLORAL (1)      */
///////////////////////////////////////
function generateFloralTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#a8e6a3";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const colors = ["white", "yellow", "violet", "lightblue"];
    for (let i = 0; i < 800; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = Math.random() * 1.5 + 0.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
}

////////////////////////////////////////
/* TEXTURA DO CÉU ESTRELADO (2)      */
////////////////////////////////////////
function generateStarrySkyTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#000033");
    gradient.addColorStop(1, "#330033");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 800; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = Math.random() * 1.5 + 0.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = "white";
        ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
}

init();
animate();
