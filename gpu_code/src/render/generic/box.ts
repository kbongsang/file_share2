import { Euler } from "../../core/util/euler";
import Vec3 from "../../core/util/vec3";
import { Mesh } from "./mesh";
import * as THREE from "three";

export class Box extends Mesh {
  constructor(width: number, height: number, startPoint: Vec3, endPoint: Vec3) {
    super();
    const length = startPoint.subtract(endPoint).length;
    const v = endPoint.subtract(startPoint).divide(2).add(startPoint);
    const heightDir = new Vec3(0, 1, 0);

    const geometry = new THREE.BoxGeometry(width, height, length);

    const mesh = new THREE.Mesh(geometry, this.material);

    mesh.position.set(v.x, v.y, v.z);

    const baseDir = new Vec3(0, 0, 1);
    const targetDir = endPoint.subtract(startPoint);

    const euler = new Euler();
    euler.setFromTwoVectors(baseDir, targetDir);

    const normalDir = heightDir.applyEuler(euler);
    const normalTargetDir = new Vec3(0, 0, 1);

    const normalEuler = new Euler();
    normalEuler.setFromTwoVectors(normalDir, normalTargetDir);

    mesh.rotation.set(
      euler.X + normalEuler.X,
      euler.Y + normalEuler.Y,
      euler.Z + normalEuler.Z
    );

    this.object3d = mesh;
    this.add();
  }
}
