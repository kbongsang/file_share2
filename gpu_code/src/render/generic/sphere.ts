import * as THREE from "three";
import Vec3 from "../../core/util/vec3";
import { Mesh } from "./mesh";

export class Sphere extends Mesh {
  constructor(
    radius: number,
    position: Vec3,
    material?: THREE.MeshStandardMaterial
  ) {
    super();

    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const usedMaterial = material
      ? material
      : new THREE.MeshStandardMaterial({ color: 0xffffff });
    const sphereMesh = new THREE.Mesh(geometry, usedMaterial);
    sphereMesh.position.set(position.x, position.y, position.z);

    this.object3d = sphereMesh;
    this.add();
  }
}
