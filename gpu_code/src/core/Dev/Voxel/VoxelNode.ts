import * as THREE from "three";

export class VoxelNode {
  nodeId: number = -1;
  box: THREE.Box3;
  location: THREE.Vector3;

  neighbors: VoxelNode[] = [];
  tempNeighbor: VoxelNode[] = [];
  gCost: number = Number.MAX_SAFE_INTEGER;
  hCost: number = Number.MAX_SAFE_INTEGER;
  fCost: number;
  isAvailable: boolean;

  isDivided: boolean;
  isGrid: boolean = false;
  parent: number = -1;

  canBeDivided: boolean = true;
  dividedChildren: VoxelNode[] = [];
  childrenShape: THREE.Vector3 = new THREE.Vector3(1, 1, 1);

  dividedParentNode?: VoxelNode;
  positionInParent: THREE.Vector3 = new THREE.Vector3(1, 1, 1);

  branchInfo: BranchInfo = new BranchInfo();

  constructor(_box: THREE.Box3) {
    this.nodeId = -1;
    this.box = _box;
    const _location = new THREE.Vector3();
    this.box.getCenter(_location);
    this.location = _location;
    this.isDivided = false;
    this.isAvailable = true;
    //
    if (
      this.gCost == Number.MAX_SAFE_INTEGER ||
      this.hCost == Number.MAX_SAFE_INTEGER
    ) {
      this.fCost = Number.MAX_SAFE_INTEGER;
      return;
    }
    this.fCost = this.gCost + this.hCost;
  }

  get neighborsId(): number[] {
    const _neighborsId: number[] = [];
    if (this.neighbors.length > 0) {
      for (const neighbor of this.neighbors) {
        _neighborsId.push(neighbor.nodeId);
      }
    }
    return _neighborsId;
  }

  initializeScore() {
    this.fCost = Number.MAX_SAFE_INTEGER;
    this.gCost = Number.MAX_SAFE_INTEGER;
    this.hCost = Number.MAX_SAFE_INTEGER;
  }

  toString(): string {
    return `nodeInfo\nnodeId: ${this.nodeId}, \nlocation: X: ${this.location.x}, Y: ${this.location.y}, Z: ${this.location.z} \ngCost: ${this.gCost}, hCost: ${this.hCost}, fCost: ${this.fCost}\npreNodeId: ${this.parent}, \n neighborsId: ${this.neighborsId}, isAvailable: ${this.isAvailable}\n`;
  }
}

// ---------------------------------
// ---------------------------------
// ---------------------------------

export enum aheadDir {
  X = "X",
  Y = "Y",
  XMinus = "XMinus",
  YMinus = "YMinus",
  None = "None",
}

export class BranchInfo {
  aheadDir: aheadDir;
  maxBranchAmount: number;
  currentBranchAmount: number;
  maxMainAmount: number;
  currentMainAmount: number;
  occuPiedSubVoxels: VoxelNode[] = [];
  assignProps: propertyInfo[] = [];
  branchSPts: THREE.Vector3[] = [];
  propertyOrder: string[] = [];
  branchEPts: THREE.Vector3[] = [];
  route1Paths: THREE.Vector3[][] = [];

  constructor() {
    this.aheadDir = aheadDir.None;
    this.maxBranchAmount = -1;
    this.currentBranchAmount = 0;
    this.maxMainAmount = -1;
    this.currentMainAmount = 0;
  }
}

export interface propertyInfo {
  property: string;
  amount: number;
  branchAmount: number;
}
