import { TransformControls, OrbitControls } from "three/examples/jsm/Addons.js";

export class Gizmo {
  transformControls: TransformControls;

  constructor(
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    orbit: OrbitControls,
    render: () => void
  ) {
    this.transformControls = new TransformControls(camera, renderer.domElement);

    this.transformControls.addEventListener("change", render);
    this.transformControls.addEventListener(
      "dragging-changed",
      function (event) {
        orbit.enabled = !event.value;
      }
    );
    this.transformControls.setMode("translate");
  }

  updateCamera = (camera: THREE.Camera) => {
    this.transformControls.object = camera;
  };
}
