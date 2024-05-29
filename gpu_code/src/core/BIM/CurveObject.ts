import { Line } from "../../render/generic/line";
import Vec3 from "../util/vec3";
import { HostObject } from "./HostObject";
import { LocationCurve } from "./Location";

export class CurveObject extends HostObject {
  location: LocationCurve;

  constructor(id: string, location: LocationCurve, meta: object) {
    super(id, location, meta);
    this.location = location;

    this.createGeometry();
  }

  createGeometry = () => {
    this.add(
      new Line([this.location.startPoint, this.location.endPoint], {
        r: 1,
        g: 1,
        b: 1,
      })
    );
  };

  get StartPoint() {
    return this.location.startPoint;
  }

  set StartPoint(value: Vec3) {
    this.location.startPoint = value;
    this.disposeGeometry();
    this.createGeometry();
  }

  get EndPoint() {
    return this.location.endPoint;
  }

  set EndPoint(value: Vec3) {
    this.location.endPoint = value;
    this.disposeGeometry();
    this.createGeometry();
  }

  get Length() {
    return this.StartPoint.subtract(this.EndPoint).length;
  }
}
