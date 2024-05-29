import * as THREE from "three";
import { Object3D } from "./object-3d";

export class Mesh extends Object3D {
  material = new THREE.MeshStandardMaterial({
    color: this.defaultMaterial.color,
    roughness: 0,
    transparent: true,
    opacity: this.defaultMaterial.opacity,
  });
  constructor() {
    super();
  }

  setColor(
    setToDefault: boolean,
    color: { r: number; g: number; b: number },
    isTransparent?: boolean,
    opacity?: number
  ): void {
    if (
      this.object3d instanceof THREE.Mesh &&
      this.object3d.material instanceof THREE.MeshStandardMaterial
    ) {
      this.object3d.material.color = new THREE.Color(color.r, color.g, color.b);
      if (isTransparent !== undefined && opacity) {
        this.object3d.material.transparent = true;
        this.object3d.material.opacity = opacity;
      }
      if (setToDefault) {
        this.defaultMaterial.color = new THREE.Color(color.r, color.g, color.b);
        if (isTransparent && opacity) {
          this.defaultMaterial.transparent = true;
          this.defaultMaterial.opacity = opacity;
        }
      }
    }
  }

  onSelect(): void {
    this.setColor(false, { r: 0, g: 1, b: 1 }, true, 0.2);
  }

  onDeSelect(): void {
    this.setColor(
      true,
      this.defaultMaterial.color,
      this.defaultMaterial.transparent,
      this.defaultMaterial.opacity
    );
  }
}
