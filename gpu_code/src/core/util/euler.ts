import { Quaternion } from "./quaternion";
import Vec3 from "./vec3";

export class Euler {
  X: number = 0;
  Y: number = 0;
  Z: number = 0;

  setFromQuaternion(
    q: Quaternion,
    order: "ZYX" | "ZXY" | "YXZ" | "YZX" | "XYZ" | "XZY" = "XYZ"
  ) {
    let angles: number[] = [];

    switch (order) {
      case "ZYX":
        angles = this.threeAxisRotate(
          2 * (q.X * q.Y + q.W * q.Z),
          q.W * q.W + q.X * q.X - q.Y * q.Y - q.Z * q.Z,
          -2 * (q.X * q.Z - q.W * q.Y),
          2 * (q.Y * q.Z + q.W * q.X),
          q.W * q.W - q.X * q.X - q.Y * q.Y + q.Z * q.Z
        );
        break;
      case "ZXY":
        angles = this.threeAxisRotate(
          -2 * (q.X * q.Y - q.W * q.Z),
          q.W * q.W - q.X * q.X + q.Y * q.Y - q.Z * q.Z,
          2 * (q.Y * q.Z + q.W * q.X),
          -2 * (q.X * q.Z - q.W * q.Y),
          q.W * q.W - q.X * q.X - q.Y * q.Y + q.Z * q.Z
        );
        break;
      case "YXZ":
        angles = this.threeAxisRotate(
          2 * (q.X * q.Z + q.W * q.Y),
          q.W * q.W - q.X * q.X - q.Y * q.Y + q.Z * q.Z,
          -2 * (q.Y * q.Z - q.W * q.X),
          2 * (q.X * q.Y + q.W * q.Z),
          q.W * q.W - q.X * q.X + q.Y * q.Y - q.Z * q.Z
        );
        break;
      case "YZX":
        angles = this.threeAxisRotate(
          -2 * (q.X * q.Z - q.W * q.Y),
          q.W * q.W + q.X * q.X - q.Y * q.Y - q.Z * q.Z,
          2 * (q.X * q.Y + q.W * q.Z),
          -2 * (q.Y * q.Z - q.W * q.X),
          q.W * q.W - q.X * q.X + q.Y * q.Y - q.Z * q.Z
        );
        break;
      case "XYZ":
        angles = this.threeAxisRotate(
          -2 * (q.Y * q.Z - q.W * q.X),
          q.W * q.W - q.X * q.X - q.Y * q.Y + q.Z * q.Z,
          2 * (q.X * q.Z + q.W * q.Y),
          -2 * (q.X * q.Y - q.W * q.Z),
          q.W * q.W + q.X * q.X - q.Y * q.Y - q.Z * q.Z
        );
        break;
      case "XZY":
        angles = this.threeAxisRotate(
          2 * (q.Y * q.Z + q.W * q.X),
          q.W * q.W - q.X * q.X + q.Y * q.Y - q.Z * q.Z,
          -2 * (q.X * q.Y - q.W * q.Z),
          2 * (q.X * q.Z + q.W * q.Y),
          q.W * q.W + q.X * q.X - q.Y * q.Y - q.Z * q.Z
        );
        break;
    }

    this.X = angles[0];
    this.Y = angles[1];
    this.Z = angles[2];
  }

  setFromTwoVectors(v1: Vec3, v2: Vec3) {
    const q = new Quaternion();
    q.setFromUnitVectors(v1, v2);
    this.setFromQuaternion(q);

    return this;
  }

  private threeAxisRotate(
    r11: number,
    r12: number,
    r21: number,
    r31: number,
    r32: number
  ) {
    return [Math.atan2(r11, r12), Math.asin(r21), Math.atan2(r31, r32)];
  }
}
