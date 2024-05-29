import * as THREE from "three";
import { ReduxStore } from "../../app/redux-store";

export abstract class Object3D {
  object3d: THREE.Object3D = new THREE.Object3D();
  defaultMaterial: {
    color: THREE.Color;
    transparent: boolean;
    opacity: number;
  } = {
    color: new THREE.Color(1, 1, 1),
    transparent: false,
    opacity: 1,
  };

  constructor() {}

  protected add() {
    ReduxStore.getState().RenderReducer.scene.add(this.object3d);
    // console.log(ReduxStore.getState().RenderReducer.scene);
  }

  dispose() {
    ReduxStore.getState().RenderReducer.scene.remove(this.object3d);
  }

  abstract setColor(
    setToDefault: boolean,
    color: { r: number; g: number; b: number },
    isTransparent?: boolean,
    opacity?: number
  ): void;

  abstract onSelect(): void;

  abstract onDeSelect(): void;
}
