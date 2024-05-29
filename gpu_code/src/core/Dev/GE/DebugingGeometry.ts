import * as THREE from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { Vector3 } from "three";
import { result } from "lodash";

export class DebugBox {
  scene: THREE.Scene;
  cube: THREE.Mesh;
  location: THREE.Vector3;

  constructor(
    scene: THREE.Scene,
    scale: number = 1,
    location: THREE.Vector3,
    color: THREE.Color
  ) {
    const geometry = new THREE.BoxGeometry(scale, scale, scale);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5,
    });
    this.scene = scene;
    this.cube = new THREE.Mesh(geometry, material);
    this.location = location;
    //console.log("DebugBox location", location);
    scene.children.push(this.cube);
    this.SetLocation(location);
  }

  SetLocation(location: THREE.Vector3) {
    this.cube.position.set(location.x, location.y, location.z);
    this.location = location;
  }
}

export class DebugBoxByMinMax {
  scene: THREE.Scene;
  cube: THREE.Mesh;
  min: THREE.Vector3;
  max: THREE.Vector3;

  constructor(
    scene: THREE.Scene,
    min: THREE.Vector3,
    max: THREE.Vector3,
    color: THREE.Color = new THREE.Color()
  ) {
    var boxWidth = max.x - min.x;
    var boxHeight = max.y - min.y;
    var boxDepth = max.z - min.z;

    const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
    });
    this.scene = scene;
    this.cube = new THREE.Mesh(geometry, material);
    this.min = min;
    this.max = max;
    //console.log("DebugBox location", location);

    scene.children.push(this.cube);
    this.SetLocation(min, max);
  }

  SetLocation(min: THREE.Vector3, max: THREE.Vector3) {
    this.cube.position.x = (max.x + min.x) / 2;
    this.cube.position.y = (max.y + min.y) / 2;
    this.cube.position.z = (max.z + min.z) / 2;
  }
}

export const DrawLines = (
  scene: THREE.Scene,
  polyline: THREE.Vector3[],
  color: THREE.Color = new THREE.Color(0xffffff)
) => {
  const result = [];
  for (let i = 0; i < polyline.length - 1; i++) {
    result.push(new DebugLine(scene, polyline[i], polyline[i + 1], color));
  }

  return result;
};

export class DebugLine {
  scene: THREE.Scene;
  line: THREE.Line;
  points: THREE.Vector3[] = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
  ];

  constructor(
    scene: THREE.Scene,
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: THREE.Color = new THREE.Color(0xffffff) // Default to red
  ) {
    const material = new THREE.LineBasicMaterial({ color: color });
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    this.line = new THREE.Line(geometry, material);
    this.scene = scene;

    this.points[0] = start;
    this.points[1] = end;

    scene.children.push(this.line);
  }

  SetPositions(start: THREE.Vector3, end: THREE.Vector3) {
    this.line.geometry.setFromPoints([start, end]);

    this.points[0] = start;
    this.points[1] = end;
  }
}

export class DebugSphere {
  scene: THREE.Scene;
  sphere: THREE.Mesh;
  location: THREE.Vector3;

  constructor(
    scene: THREE.Scene,
    radius: number = 1, // Default radius
    location: THREE.Vector3,
    color: THREE.Color = new THREE.Color(0xffffff) // Default to green
  ) {
    const geometry = new THREE.SphereGeometry(radius, 16, 16); // Adjust segment counts (16, 16) as needed
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5,
    });
    this.sphere = new THREE.Mesh(geometry, material);
    this.scene = scene;
    scene.children.push(this.sphere);
    this.location = location;
    this.SetLocation(location);
  }

  SetLocation(location: THREE.Vector3) {
    this.sphere.position.set(location.x, location.y, location.z);
    this.location = location;
  }
}

export class DebugCapsule {
  scene: THREE.Scene;
  capsule: THREE.Mesh = new THREE.Mesh();
  points: THREE.Vector3[] = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
  ];
  radius: number = 0.5;
  color: THREE.Color = new THREE.Color(1, 1, 1);

  constructor(
    scene: THREE.Scene,
    radius: number = 1, // Default radius
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: THREE.Color = new THREE.Color(0xffffff) // Default to green
  ) {
    this.scene = scene;
    this.points[0] = start;
    this.points[1] = end;
    7;
    this.CreateCapsule(this.points[0], this.points[1], radius, color);
  }

  CreateCapsule(
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number = 1,
    color: THREE.Color
  ) {
    // Calculate the length and orientation of the capsule
    const length =
      new THREE.Vector3().subVectors(end, start).length() - 2 * radius;
    const orientation = new THREE.Matrix4().lookAt(
      start,
      end,
      new THREE.Object3D().up
    );
    const rotation = new THREE.Euler().setFromRotationMatrix(orientation);

    // Sphere geometry for the ends
    const sphereGeometry = new THREE.SphereGeometry(radius, 16, 16);
    // Adjust the position of the spheres to the ends
    const topSphere = sphereGeometry.clone().translate(0, 0, length * 0.5);
    const bottomSphere = sphereGeometry.clone().translate(0, 0, -length * 0.5);

    // Cylinder geometry for the middle
    const cylinderGeometry = new THREE.CylinderGeometry(
      radius,
      radius,
      length,
      16
    );
    cylinderGeometry.rotateX(Math.PI / 2); // Orient the cylinder along the z-axis

    // Merge geometries
    const capsuleGeometry = BufferGeometryUtils.mergeGeometries(
      [cylinderGeometry, topSphere, bottomSphere],
      false
    );

    // Create the material
    const material = new THREE.MeshBasicMaterial({ color: color });

    // Create the mesh
    this.capsule = new THREE.Mesh(capsuleGeometry, material);
    this.capsule.setRotationFromEuler(rotation);
    this.capsule.position.copy(start).add(end).multiplyScalar(0.5);
    this.scene.children.push(this.capsule);
  }

  SetPositions(start: THREE.Vector3, end: THREE.Vector3) {
    if (this.capsule) {
      this.scene.remove(this.capsule);
      this.capsule.geometry.dispose();
    }
    this.CreateCapsule(start, end, this.radius, this.color);
  }
}

// export class DebugText {
//   scene: THREE.Scene;
//   textMesh: THREE.Mesh;
//   text: string;
//   location: THREE.Vector3;

//   constructor(
//     scene: THREE.Scene,
//     text: string,
//     location: THREE.Vector3,
//     font: string = 'helvetiker',
//     size: number = 1,
//     color: THREE.Color = new THREE.Color(0xffffff)
//   ) {
//     this.scene = scene;
//     this.text = text;
//     this.location = location;

//     const textGeometry = new THREE.TextGeometry(text, {
//       font: font,
//       size: size,
//       height: 0.1,
//       curveSegments: 12,
//       bevelEnabled: false
//     });

//     const material = new THREE.MeshBasicMaterial({ color: color });

//     this.textMesh = new THREE.Mesh(textGeometry, material);
//     this.scene.add(this.textMesh);

//     this.setLocation(location);
//   }

//   setLocation(location: THREE.Vector3) {
//     this.textMesh.position.copy(location);
//     this.location.copy(location);
//   }
// }
