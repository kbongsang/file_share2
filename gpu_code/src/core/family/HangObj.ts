import { LocationPoint } from "../BIM/Location";
import { PointObject } from "../BIM/PointObject";
import * as THREE from "three";
import { expandSpace } from "./Grid";
import { vec3ToVector3, Vector3ToVec3 } from "../api/hookup-routing/general";
import { cloneDeep } from "lodash";
import { Point } from "../../render/generic/point";

export class HangObj extends PointObject {
  obstacleBoxes: THREE.Box3[] = [];
  boundingBox: THREE.Box3 = new THREE.Box3();

  constructor(id: string, location: LocationPoint, meta: object) {
    super(id, location, meta);

    // get bounding box
    for (const obj of this.renderObjects) {
      if (obj.object3d instanceof THREE.Mesh) {
        console.log("find mesh");
        const boundingBox = new THREE.Box3().setFromObject(obj.object3d);
        // expandSpace(boundingBox, -1, -1);
        this.boundingBox = boundingBox;
      }
    }

    // set obstacle boxes

    // bottom Y
    const centralOrigin = vec3ToVector3(this.location.origin).multiplyScalar(
      100
    );
    console.log("central origin", centralOrigin);

    const btmBoxY_1 = BasicBoxY.clone().translate(
      centralOrigin.clone().add(new THREE.Vector3(-14.25, -70, 0))
    );
    this.obstacleBoxes.push(btmBoxY_1);

    const btmBoxY_2 = BasicBoxY.clone().translate(
      centralOrigin
        .clone()
        .add(new THREE.Vector3(14.25 - BasicBoxY.max.x, -70, 0))
    );
    this.obstacleBoxes.push(btmBoxY_2);

    // bottom X
    const btmBoxX_1 = BasicBoxX.clone().translate(
      centralOrigin
        .clone()
        .add(new THREE.Vector3(-15.75, 20 - BasicBoxX.max.y / 2, 0))
    );
    this.obstacleBoxes.push(btmBoxX_1);

    const btmBoxX_2 = BasicBoxX.clone().translate(
      centralOrigin
        .clone()
        .add(new THREE.Vector3(-15.75, -40 - BasicBoxX.max.y / 2, 0))
    );
    this.obstacleBoxes.push(btmBoxX_2);

    // support

    // make a group
    const supGroup: THREE.Box3[] = [];

    // vertical support
    const vsBox = verticalSup
      .clone()
      .translate(
        centralOrigin
          .clone()
          .add(
            new THREE.Vector3(-verticalSup.max.x / 2, -verticalSup.max.x / 2, 2)
          )
      );
    supGroup.push(vsBox);
    const vsBox2 = vsBox.clone().translate(new THREE.Vector3(-14.045, 0, 0));
    supGroup.push(vsBox2);
    const vsBox3 = vsBox.clone().translate(new THREE.Vector3(14.045, 0, 0));
    supGroup.push(vsBox3);

    // horizontal support X
    const hsBoxX1 = horizontalSupX
      .clone()
      .translate(
        centralOrigin
          .clone()
          .add(
            new THREE.Vector3(
              -horizontalSupX.max.x / 2,
              -horizontalSupX.max.y / 2,
              2 + horizontalSupX.max.z / 2 + 0.455
            )
          )
      );
    supGroup.push(hsBoxX1);

    const hsBoxX2 = hsBoxX1.clone().translate(new THREE.Vector3(0, 0, 7.6));
    supGroup.push(hsBoxX2);

    const hsBoxX3 = hsBoxX1.clone().translate(new THREE.Vector3(0, 0, 12.6));
    supGroup.push(hsBoxX3);

    const hsBoxX4 = hsBoxX1.clone().translate(new THREE.Vector3(0, 0, 17.6));
    supGroup.push(hsBoxX4);

    const hsBoxX5 = hsBoxX1.clone().translate(new THREE.Vector3(0, 0, 22.35));
    supGroup.push(hsBoxX5);

    // horizontal support Y
    const hsBoxY1 = horizontalSupY
      .clone()
      .translate(
        centralOrigin
          .clone()
          .add(
            new THREE.Vector3(
              -horizontalSupX.max.x / 2,
              -horizontalSupY.max.y / 2,
              24.79
            )
          )
      );
    supGroup.push(hsBoxY1);

    const hsBoxY2 = hsBoxY1
      .clone()
      .translate(new THREE.Vector3(horizontalSupX.max.x, 0, 0));
    supGroup.push(hsBoxY2);

    // copy and add all of the group
    const distanceAll: number[] = [40, 20, 0, -20, -40, -60];
    for (const distance of distanceAll) {
      supGroup.map((box) => {
        this.obstacleBoxes.push(
          box.clone().translate(new THREE.Vector3(0, distance, 0))
        );
      });
    }
  }
}

// basic boxes
const BasicBoxX = new THREE.Box3(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(31.5, 1.3, 2.0)
);

const BasicBoxY = new THREE.Box3(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(1.275, 120, 2.0)
);

const verticalSup = new THREE.Box3(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.41, 0.41, 23.2)
);
const horizontalSupX = new THREE.Box3(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(28.5, 0.41, 0.41)
);
const horizontalSupY = new THREE.Box3(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.41, 20.41, 0.41)
  // new THREE.Vector3(0.41, 60.41, 0.41)
);
