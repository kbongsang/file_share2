import { Object3D } from "../../render/generic/object-3d";
import { LocationCurve, LocationPoint, LocationSpline } from "./Location";

export abstract class HostObject {
  id: string;
  location: LocationCurve | LocationPoint | LocationSpline | null;
  meta: object;
  renderObjects: Object3D[] = [];
  isHidden: boolean = false;

  constructor(
    id: string,
    location: LocationCurve | LocationPoint | LocationSpline | null,
    meta: object
  ) {
    this.id = id;
    this.meta = meta;
    const FACTOR = 0.01;

    if (
      location instanceof LocationCurve ||
      location instanceof LocationPoint
    ) {
      this.location = location;
      this.location.scale(FACTOR);
    } else {
      this.location = null;
    }
  }

  get Category() {
    if ("Category" in this.meta) return this.meta["Category"] as string;
    else return undefined;
  }

  get StartPoint() {
    if (this.location instanceof LocationCurve) return this.location.startPoint;
    else return undefined;
  }

  get EndPoint() {
    if (this.location instanceof LocationCurve) return this.location.endPoint;
    else return undefined;
  }

  protected add(obj: Object3D) {
    this.renderObjects.push(obj);
  }

  protected abstract createGeometry(): void;

  disposeGeometry() {
    this.renderObjects.forEach((obj) => {
      obj.dispose();
    });

    this.renderObjects.length = 0;
  }

  show() {
    this.renderObjects.forEach((obj) => {
      obj.object3d.visible = true;
    });
    this.isHidden = false;
  }

  hide() {
    this.renderObjects.forEach((obj) => {
      obj.object3d.visible = false;
    });
    this.isHidden = true;
  }

  setColor(color: { r: number; g: number; b: number }) {
    this.renderObjects.forEach((obj) => {
      obj.setColor(true, color);
    });
  }
}
