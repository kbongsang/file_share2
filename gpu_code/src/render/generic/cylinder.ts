import { Euler } from "../../core/util/euler";
import { Quaternion } from "../../core/util/quaternion";
import Vec3 from "../../core/util/vec3";
import { Mesh } from "./mesh";
import * as THREE from "three";

export class Cylinder extends Mesh {
  constructor(
    radius: number,
    startPoint: Vec3,
    endPoint: Vec3,
    material?: THREE.MeshStandardMaterial
  ) {
    super();
    const height = startPoint.subtract(endPoint).length;
    const geometry = new THREE.CylinderGeometry(radius, radius, height);
    geometry.translate(0, height / 2, 0);

    const usedMaterial = material ? material : this.material;
    const mesh = new THREE.Mesh(geometry, usedMaterial);

    mesh.position.set(startPoint.x, startPoint.y, startPoint.z);

    const baseDir = new Vec3(0, 1, 0);
    const targetDir = endPoint.subtract(startPoint);
    const quaternion = new Quaternion();
    quaternion.setFromUnitVectors(baseDir, targetDir);

    const euler = new Euler();
    euler.setFromQuaternion(quaternion);

    mesh.rotation.set(euler.X, euler.Y, euler.Z);

    this.object3d = mesh;
    this.add();
  }
  get mesh() {
    return this.object3d as THREE.Mesh;
  }
}
