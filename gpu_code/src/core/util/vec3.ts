import { Euler } from "./euler";
import { Quaternion } from "./quaternion";
import * as THREE from "three";

export default class Vec3 {
  x: number;
  y: number;
  z: number;
  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  get unitVector() {
    return new Vec3(
      this.x / this.length,
      this.y / this.length,
      this.z / this.length
    );
  }

  convertToTHREE() {
    return new THREE.Vector3(this.x, this.y, this.z);
  }

  add(v: Vec3) {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  subtract(vector: Vec3): Vec3 {
    let X: number = this.x - vector.x;
    if (Math.abs(X) < 0.0001) {
      X = 0;
    }

    let Y: number = this.y - vector.y;
    if (Math.abs(Y) < 0.0001) {
      Y = 0;
    }

    let Z: number = this.z - vector.z;
    if (Math.abs(Z) < 0.0001) {
      Z = 0;
    }

    return new Vec3(X, Y, Z);
  }

  multiply(a: number) {
    return new Vec3(this.x * a, this.y * a, this.z * a);
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  normalize(): Vec3 {
    const length = Math.sqrt(
      this.x * this.x + this.y * this.y + this.z * this.z
    );
    if (length === 0) {
      return new Vec3(0, 0, 0);
    } else {
      return new Vec3(this.x / length, this.y / length, this.z / length);
    }
  }

  divide(a: number) {
    return new Vec3(this.x / a, this.y / a, this.z / a);
  }

  cross(vector: Vec3): Vec3 {
    const x = this.y * vector.z - this.z * vector.y;
    const y = this.z * vector.x - this.x * vector.z;
    const z = this.x * vector.y - this.y * vector.x;
    return new Vec3(x, y, z);
  }

  dot(vector: Vec3): number {
    return this.x * vector.x + this.y * vector.y + this.z * vector.z;
  }

  applyEuler(e: Euler) {
    const q = new Quaternion();
    return this.applyQuaternion(q.setFromEuler(e));
  }

  get squaredLength() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  applyQuaternion(q: Quaternion) {
    const vx = this.x,
      vy = this.y,
      vz = this.z;
    const qx = q.X,
      qy = q.Y,
      qz = q.Z,
      qw = q.W;

    // t = 2 * cross( q.xyz, v );
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);

    // v + q.w * t + cross( q.xyz, t );
    this.x = vx + qw * tx + qy * tz - qz * ty;
    this.y = vy + qw * ty + qz * tx - qx * tz;
    this.z = vz + qw * tz + qx * ty - qy * tx;

    return this;
  }

  isSame(vector: Vec3): boolean {
    if (this.x === vector.x && this.y === vector.y && this.z === vector.z) {
      return true;
    }

    return false;
  }

  get reverse() {
    return new Vec3(-this.x, -this.y, -this.z);
  }
}
