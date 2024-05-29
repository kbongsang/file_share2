import { Mesh } from "./mesh";
import * as THREE from "three";

export class TriangleMesh extends Mesh {
  constructor(vertices: { x: number; y: number; z: number }[]) {
    super();

    const geometry = new THREE.BufferGeometry();
    const flatten: number[] = [];
    const indices: number[] = [];

    vertices.forEach((vertex) => {
      flatten.push(vertex.x, vertex.y, vertex.z);
    });

    flatten.forEach((_value, index) => {
      indices.push(index);
    });

    const positions = new Float32Array(flatten);

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, this.material);

    this.object3d = mesh;
    this.add();
  }
}
