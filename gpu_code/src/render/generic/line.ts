import Vec3 from "../../core/util/vec3";
import { Object3D } from "./object-3d";
import * as THREE from "three";

export class Line extends Object3D {
  constructor(
    points: Vec3[] | THREE.Vector3[],
    color: { r: number; g: number; b: number } = { r: 1, g: 0, b: 0 }
  ) {
    super();

    const geometry = new THREE.BufferGeometry();

    const pos: number[] = [];
    points.forEach((pt) => {
      pos.push(pt.x);
      pos.push(pt.y);
      pos.push(pt.z);
    });

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color.r, color.g, color.b),
    });

    this.object3d = new THREE.LineSegments(geometry, material);
    this.add();
  }

  setColor = (
    setToDefault: boolean,
    color: { r: number; g: number; b: number }
  ) => {
    if (
      this.object3d instanceof THREE.LineSegments &&
      this.object3d.material instanceof THREE.LineBasicMaterial
    ) {
      this.object3d.material.color = new THREE.Color(color.r, color.g, color.b);
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
