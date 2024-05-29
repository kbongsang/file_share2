import { LocationPoint } from "../BIM/Location";
import { PointObject } from "../BIM/PointObject";
import * as THREE from "three";

export class GridObj extends PointObject {
  boundingBox: THREE.Box3 = new THREE.Box3();
  // beamBoxes: THREE.Box3[] = [];
  restSpaces: THREE.Box3[] = [];
  dividerX = 3;
  dividerY = 3;
  centralPt: THREE.Vector3;

  constructor(id: string, location: LocationPoint, meta: object) {
    super(id, location, meta);
    for (const obj of this.renderObjects) {
      if (obj.object3d instanceof THREE.Mesh) {
        console.log("find mesh");
        const boundingBox = new THREE.Box3().setFromObject(obj.object3d);
        // expandSpace(boundingBox, -1, -1);
        this.boundingBox = boundingBox;
      }
    }

    const central = new THREE.Vector3();
    this.boundingBox.getCenter(central);
    this.centralPt = central;

    // divide rest space
    for (let i = 0; i < this.dividerX; i++) {
      const gapX =
        (this.boundingBox.max.x - this.boundingBox.min.x) / this.dividerX;
      const thisMinX = this.boundingBox.min.x + gapX * i;
      const thisMaxX = thisMinX + gapX;
      for (let j = 0; j < this.dividerY; j++) {
        const gapY =
          (this.boundingBox.max.y - this.boundingBox.min.y) / this.dividerY;
        const thisMinY = this.boundingBox.min.y + gapY * j;
        const thisMaxY = thisMinY + gapY;
        this.restSpaces.push(
          new THREE.Box3(
            new THREE.Vector3(thisMinX, thisMinY, this.boundingBox.min.z),
            new THREE.Vector3(thisMaxX, thisMaxY, this.boundingBox.max.z)
          )
        );
      }
    }

    // shrink rest space
    for (const space of this.restSpaces) {
      expandSpace(space, -1, -1);
    }
  }
}
export function expandSpace(
  space: THREE.Box3,
  xAmount: number,
  yAmount: number
) {
  space.min.x -= xAmount;
  space.max.x += xAmount;
  space.min.y -= yAmount;
  space.max.y += yAmount;
}
