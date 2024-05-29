import * as THREE from "three";
import { VoxelNode } from "../Voxel/VoxelNode";
import { Point } from "../../../render/generic/point";
import Vec3 from "../../util/vec3";

export enum NodeType {
  None,
  Obstacle,
}

export class GENode {
  nodeIndex: number;
  lineIndex: number = 0;
  location: THREE.Vector3;
  nodeType: NodeType;
  totalMove: THREE.Vector3 = new THREE.Vector3();
  totalWeight: number = 0;
  isSPT: boolean = false;
  isEPT: boolean = false;
  radius: number = 0.5;
  finalVector: THREE.Vector3 = new THREE.Vector3();
  directionPanelty: THREE.Vector3 = new THREE.Vector3();
  voxelNode?: VoxelNode;
  box: THREE.Box3 = new THREE.Box3();
  isElbow: boolean = false;
  direction: THREE.Vector3 = new THREE.Vector3();
  flag: boolean = false;

  //Debug
  lastStart: boolean = false;
  lastEnd: boolean = false;
  mid: boolean = false;

  pointObject: Point = new Point(new Vec3(0, 0, 0));

  constructor(location: THREE.Vector3 = new THREE.Vector3()) {
    this.nodeIndex = -1;
    this.location = location;
    this.nodeType = NodeType.None;
  }

  Setup = (
    nodeIndex: number,
    nodeType: NodeType,
    location: THREE.Vector3,
    voxelNode: VoxelNode
  ) => {
    this.nodeIndex = nodeIndex;
    this.nodeType = nodeType;
    this.location = location;
    this.voxelNode = voxelNode;
  };

  UpdateLocation = (location: THREE.Vector3) => {
    this.location = location;
  };

  Update = (totalMove: THREE.Vector3) => {
    this.totalMove = totalMove;
  };

  ToString = () => {
    console.log(`Index: {this.nodeIndex}\n
            Type: {this.nodeType}\n
            location: {this.location}\n
            totalMove: {totalMove}
        `);
  };

  SetPointPosition = () => {
    this.pointObject.object3d.position.x = this.location.x;
    this.pointObject.object3d.position.y = this.location.y;
    this.pointObject.object3d.position.z = this.location.z;

    if (this.flag) {
      this.pointObject.setColor(false, { r: 0, g: 0, b: 0 });
    } else {
      this.pointObject.setColor(false, { r: 1, g: 1, b: 1 });
    }
  };
  SetNodeLocation = () => {
    this.location = this.pointObject.object3d.position;
  };

  destroy = () => {
    this.pointObject.object3d.removeFromParent();
  };
}
