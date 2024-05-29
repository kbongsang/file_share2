// import { Euler } from "../../core/util/euler";
// import { Quaternion } from "../../core/util/quaternion";
import { Euler } from "../../core/util/euler";
import Vec3 from "../../core/util/vec3";
import { Mesh } from "./mesh";
import * as THREE from "three";

export class Tube extends Mesh {
  constructor(
    origin: Vec3,
    BendingRadius: number,
    dir1: Vec3,
    dir2: Vec3,
    profile: RectangleProfile | CircleProfile
  ) {
    super();

    const shape = new THREE.Shape();
    if ("width" in profile && "height" in profile) {
      shape.moveTo(-profile.height / 2, -profile.width / 2);
      shape.lineTo(profile.height / 2, -profile.width / 2);
      shape.lineTo(profile.height / 2, profile.width / 2);
      shape.lineTo(-profile.height / 2, profile.width / 2);
      shape.lineTo(-profile.height / 2, -profile.width / 2);
      shape.closePath();
    }

    if ("radius" in profile) {
      shape.absarc(0, 0, profile.radius, 0, Math.PI * 2, false);
      shape.closePath();
    }

    const angle = Math.PI - Math.acos(dir1.unitVector.dot(dir2.unitVector));
    const arc = new THREE.EllipseCurve(
      0,
      0,
      BendingRadius,
      BendingRadius,
      0,
      angle,
      false
    ) as THREE.ArcCurve;
    const points = arc.getPoints(50);
    const targetPath = new THREE.CurvePath<THREE.Vector3>();

    let defaultDir2 = new Vec3(0, -1, 0);

    const defaultDir2Euler = new Euler();
    defaultDir2Euler.Z = angle - Math.PI;
    let defaultDir1 = new Vec3(0, -1, 0).applyEuler(defaultDir2Euler);

    let defaultCenter = defaultDir2.add(defaultDir1).unitVector;
    const dot = dir1.dot(dir2);
    let centerRotationAngle = Math.acos(
      defaultCenter.dot(new Vec3(-1, -1, 0).unitVector)
    );
    if (dot > 0) {
      centerRotationAngle = -centerRotationAngle;
    }

    const defaultEuler = new Euler();
    defaultEuler.Z = centerRotationAngle;
    defaultDir2 = defaultDir2.applyEuler(defaultEuler);
    defaultDir1 = defaultDir1.applyEuler(defaultEuler);
    defaultCenter = defaultCenter.applyEuler(defaultEuler);

    for (let i = 0; i < points.length - 1; i++) {
      targetPath.add(
        new THREE.LineCurve3(
          new THREE.Vector3(points[i].x, points[i].y, 0),
          new THREE.Vector3(points[i + 1].x, points[i + 1].y, 0)
        )
      );
    }

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 100,
      extrudePath: targetPath,
    };

    const translate = new Vec3(-1, -1, 0).unitVector.multiply(
      BendingRadius / Math.cos(angle / 2)
    );

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateZ(centerRotationAngle);
    geometry.translate(translate.x, translate.y, 0);

    const mesh = new THREE.Mesh(geometry, this.material);

    mesh.position.set(origin.x, origin.y, origin.z);

    const normalEuler = new Euler();
    const normal = defaultDir1.cross(defaultDir2).unitVector;
    const targetNormal = dir1.unitVector.cross(dir2.unitVector).unitVector;

    normalEuler.setFromTwoVectors(normal, targetNormal);
    defaultDir1 = defaultDir1.applyEuler(normalEuler);

    let rollAngle = Math.acos(dir1.unitVector.dot(defaultDir1.unitVector));

    let isClockwise =
      dir1.unitVector
        .cross(defaultDir1.unitVector)
        .unitVector.dot(targetNormal.unitVector) > 0;

    if (isClockwise) {
      rollAngle = -rollAngle;
    }

    mesh.rotation.set(normalEuler.X, normalEuler.Y, normalEuler.Z + rollAngle);

    this.object3d = mesh;
    this.add();
  }
}
