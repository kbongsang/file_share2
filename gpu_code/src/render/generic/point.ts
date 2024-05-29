import Vec3 from "../../core/util/vec3";
import { Object3D } from "./object-3d";
import * as THREE from "three";

export class Point extends Object3D {
  constructor(
    vector: Vec3 | THREE.Vector3,
    color: { r: number; g: number; b: number } = { r: 1, g: 1, b: 1 }
  ) {
    super();

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([vector.x, vector.y, vector.z]);

    // itemSize = 3 because there are 3 values (components) per vertex
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute(
      "size",
      new THREE.BufferAttribute(new Float32Array([5]), 1)
    );
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        new Float32Array([color.r, color.g, color.b]),
        3
      )
    );

    const vertexShader = `
    attribute vec3 instancePosition;
    attribute float size;
    varying vec3 vColor;
      void main() {
        vec3 newPosition = position + instancePosition;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size;
      vColor = color;
      }
    `;

    const fragmentShader = `
    varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        size: { value: 5 },
      },
      vertexColors: true,
    });

    this.object3d = new THREE.Points(geometry, material);
    this.add();
  }

  setColor = (
    setToDefault: boolean,
    color: { r: number; g: number; b: number }
  ) => {
    if (
      this.object3d instanceof THREE.Points &&
      this.object3d.geometry instanceof THREE.BufferGeometry
    ) {
      this.object3d.geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(
          new Float32Array([color.r, color.g, color.b]),
          3
        )
      );

      if (setToDefault) {
        this.defaultMaterial.color = new THREE.Color(color.r, color.g, color.b);
      }
    }
  };

  onSelect(): void {
    this.setColor(false, { r: 0, g: 1, b: 1 });
  }

  onDeSelect(): void {
    this.setColor(true, this.defaultMaterial.color);
  }
}
