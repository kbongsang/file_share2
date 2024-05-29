import * as THREE from "three";
import { VoxelNode } from "../Voxel/VoxelNode";
import { HostObject } from "../../BIM/HostObject";
export class PathInfo {
  sPt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  ePt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  obstacleVoxel: VoxelNode[] = [];
  obstaclePts: THREE.Vector3[] = [];
  obstaclesRadius: number[] = [];
  pathPts: THREE.Vector3[] = [];
  voxelNodes: VoxelNode[] = [];
  property: string = "none";
  connector?: HostObject;

  constructor(
    _SPt?: THREE.Vector3,
    _EPt?: THREE.Vector3,
    _obstacleGroups?: THREE.Vector3[],
    _obstaclesRadiusGroups?: number[],
    _pathPts?: THREE.Vector3[]
  ) {
    if (_SPt) this.sPt = _SPt;
    if (_EPt) this.ePt = _EPt;
    if (_obstacleGroups) this.obstaclePts = _obstacleGroups;
    if (_obstaclesRadiusGroups) this.obstaclesRadius = _obstaclesRadiusGroups;
    if (_pathPts) this.pathPts = _pathPts;
  }
}
