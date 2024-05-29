import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Sky } from "three/examples/jsm/Addons.js";
import { Gizmo } from "../render/misc/Gizmo";

export class ViewModel {
  scene: THREE.Scene;
  renderer = new THREE.WebGLRenderer({ antialias: true, precision: "highp" });
  camera = new THREE.PerspectiveCamera(65, 1, 0.0001, 1000000) as THREE.Camera;
  controls = new OrbitControls(this.camera, this.renderer.domElement);
  meshes: THREE.Mesh[] = [];
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  intersects: THREE.Intersection[] = [];
  gizmo?: Gizmo;

  // Sky parameters.
  pmremRenderTarget?: THREE.WebGLRenderTarget<THREE.Texture>;
  sun: THREE.Vector3 = new THREE.Vector3(1, 0, 0);
  sky: Sky = new Sky();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1);
    var grid = new THREE.AxesHelper(30);
    this.scene.add(grid);
  }

  setRenderer = (width: number, height: number) => {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
  };

  setSize = (width: number, height: number) => {
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio));

    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  };

  setPerspectiveCamera = (
    fov: number,
    aspect: number,
    near: number,
    far: number,
    position: { x: number; y: number; z: number } = { x: 0, y: 100, z: 2000 }
  ) => {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.controls.object = this.camera;
    this.camera.position.set(position.x, position.y, position.z);
  };

  setSky = (elevation: number = 5, azimuth: number = 90) => {
    this.sky.name = "sky";
    this.sky.scale.setScalar(1000000000);
    this.sky.material.uniforms.up.value.set(0, 0, 1);

    const skyUniforms = this.sky.material.uniforms;
    skyUniforms["turbidity"].value = 10;
    skyUniforms["rayleigh"].value = 2;
    skyUniforms["mieCoefficient"].value = 0.005;
    skyUniforms["mieDirectionalG"].value = 0.8;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);

    const updateSun = () => {
      const sceneEnv = new THREE.Scene();
      const phi = THREE.MathUtils.degToRad(90 - elevation);
      const theta = THREE.MathUtils.degToRad(azimuth);

      this.sun.setFromSphericalCoords(1, theta, phi);

      this.sky.material.uniforms["sunPosition"].value.copy(this.sun);

      if (this.pmremRenderTarget !== undefined)
        this.pmremRenderTarget.dispose();

      sceneEnv.add(this.sky);
      this.pmremRenderTarget = pmremGenerator.fromScene(sceneEnv);
      this.scene.add(this.sky);

      this.scene.environment = this.pmremRenderTarget.texture;
    };

    updateSun();
  };

  setGizmo = () => {
    this.gizmo = new Gizmo(
      this.camera,
      this.renderer,
      this.controls,
      this.render
    );
  };

  setTestObject = () => {
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshStandardMaterial({ roughness: 0 });

    for (let i = 0; i < 500; i++) {
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.x = Math.random() * 10 - 5;
      mesh.position.y = Math.random() * 10 - 5;
      mesh.position.z = Math.random() * 10 - 5;

      mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 3 + 1;

      this.scene.add(mesh);

      this.meshes.push(mesh);
    }
  };

  setControls = () => {
    this.controls.maxPolarAngle = Math.PI;
    this.controls.listenToKeyEvents(window);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.update();
  };

  setPointer = (
    clientX: number,
    clientY: number,
    width: number,
    height: number
  ) => {
    this.pointer.x = (clientX / width) * 2 - 1;
    this.pointer.y = -(clientY / height) * 2 + 1;
  };

  render = () => {
    this.controls.update();
    const timer = performance.now() * 0.0001;

    for (let i = 0, il = this.meshes.length; i < il; i++) {
      const sphere = this.meshes[i];

      sphere.position.x = 5 * Math.cos(timer + i);
      sphere.position.y = 5 * Math.sin(timer + i * 1.1);
    }

    this.controls.update();
    this.camera instanceof THREE.PerspectiveCamera &&
      this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);

    const includes = this.scene.children.filter((child) => child !== this.sky);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.intersects = this.raycaster.intersectObjects(includes, false);
  };
}
