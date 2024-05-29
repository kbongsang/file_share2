import Vec3 from "../util/vec3";

export class LocationCurve {
  startPoint: Vec3;
  endPoint: Vec3;

  constructor(startPoint: Vec3, endPoint: Vec3) {
    this.startPoint = startPoint;
    this.endPoint = endPoint;
  }

  scale(factor: number) {
    this.startPoint = this.startPoint.multiply(factor);
    this.endPoint = this.endPoint.multiply(factor);
  }
}

export class LocationPoint {
  origin: Vec3;

  constructor(origin: Vec3) {
    this.origin = origin;
  }

  scale(factor: number) {
    this.origin = this.origin.multiply(factor);
  }
}

export class LocationSpline {
  controlPoints: Vec3[];

  constructor(controlPoints: Vec3[]) {
    this.controlPoints = controlPoints;
  }

  scale(factor: number) {
    this.controlPoints = this.controlPoints.map((point) =>
      point.multiply(factor)
    );
  }
}
