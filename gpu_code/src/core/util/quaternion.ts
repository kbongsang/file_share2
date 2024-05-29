import { Euler } from "./euler";
import Vec3 from "./vec3";

export class Quaternion {
  X: number = 0;
  Y: number = 0;
  Z: number = 0;
  W: number = 0;

  setFromUnitVectors(vec1: Vec3, vec2: Vec3) {
    const v1 = vec1.unitVector;
    const v2 = vec2.unitVector;

    let r = v1.dot(v2) + 1;

    if (r < Number.EPSILON) {
      r = 0;
      if (Math.abs(v1.x) > Math.abs(v1.z)) {
        this.X = -v1.y;
        this.Y = v1.x;
        this.Z = 0;
        this.W = r;
      } else {
        this.X = 0;
        this.Y = -v1.z;
        this.Z = v1.y;
        this.W = r;
      }
    } else {
      this.X = v1.cross(v2).x;
      this.Y = v1.cross(v2).y;
      this.Z = v1.cross(v2).z;
      this.W = r;
    }

    return this.normalize();
  }

  normalize() {
    let l = this.length;

    if (l === 0) {
      this.X = 0;
      this.Y = 0;
      this.Z = 0;
      this.W = 1;
    } else {
      l = 1 / l;

      this.X = this.X * l;
      this.Y = this.Y * l;
      this.Z = this.Z * l;
      this.W = this.W * l;
    }
    // this._onChangeCallback();

    return this;
  }

  get length() {
    return Math.sqrt(
      this.X * this.X + this.Y * this.Y + this.Z * this.Z + this.W * this.W
    );
  }

  setFromEuler(
    euler: Euler,
    order: "ZYX" | "ZXY" | "YXZ" | "YZX" | "XYZ" | "XZY" = "XYZ"
  ) {
    const x = euler.X,
      y = euler.Y,
      z = euler.Z;

    // http://www.mathworks.com/matlabcentral/fileexchange/
    // 	20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
    //	content/SpinCalc.m

    const cos = Math.cos;
    const sin = Math.sin;

    const c1 = cos(x / 2);
    const c2 = cos(y / 2);
    const c3 = cos(z / 2);

    const s1 = sin(x / 2);
    const s2 = sin(y / 2);
    const s3 = sin(z / 2);

    switch (order) {
      case "XYZ":
        this.X = s1 * c2 * c3 + c1 * s2 * s3;
        this.Y = c1 * s2 * c3 - s1 * c2 * s3;
        this.Z = c1 * c2 * s3 + s1 * s2 * c3;
        this.W = c1 * c2 * c3 - s1 * s2 * s3;
        break;

      case "YXZ":
        this.X = s1 * c2 * c3 + c1 * s2 * s3;
        this.Y = c1 * s2 * c3 - s1 * c2 * s3;
        this.Z = c1 * c2 * s3 - s1 * s2 * c3;
        this.W = c1 * c2 * c3 + s1 * s2 * s3;
        break;

      case "ZXY":
        this.X = s1 * c2 * c3 - c1 * s2 * s3;
        this.Y = c1 * s2 * c3 + s1 * c2 * s3;
        this.Z = c1 * c2 * s3 + s1 * s2 * c3;
        this.W = c1 * c2 * c3 - s1 * s2 * s3;
        break;

      case "ZYX":
        this.X = s1 * c2 * c3 - c1 * s2 * s3;
        this.Y = c1 * s2 * c3 + s1 * c2 * s3;
        this.Z = c1 * c2 * s3 - s1 * s2 * c3;
        this.W = c1 * c2 * c3 + s1 * s2 * s3;
        break;

      case "YZX":
        this.X = s1 * c2 * c3 + c1 * s2 * s3;
        this.Y = c1 * s2 * c3 + s1 * c2 * s3;
        this.Z = c1 * c2 * s3 - s1 * s2 * c3;
        this.W = c1 * c2 * c3 - s1 * s2 * s3;
        break;

      case "XZY":
        this.X = s1 * c2 * c3 - c1 * s2 * s3;
        this.Y = c1 * s2 * c3 - s1 * c2 * s3;
        this.Z = c1 * c2 * s3 + s1 * s2 * c3;
        this.W = c1 * c2 * c3 + s1 * s2 * s3;
        break;

      default:
        console.warn(
          "THREE.Quaternion: .setFromEuler() encountered an unknown order: " +
            order
        );
    }

    return this;
  }
}
