import * as THREE from "three";
import {
  GENode,
  //  , NodeType
} from "./GENode";
import { DebugBox, DebugBoxByMinMax } from "./DebugingGeometry";
import {
  AddPerpendicularFromTwoPoints,
  AddPerpendicularFromTwoPointsbyBoxes,
  checkOverlapBoxToBox,
  //checkOverlapBoxToBox,
  CheckParallel,
  CheckPointOverlap,
  findBoundingBox,
  //findBoundingBox,
  LongestDirection,
  MidPoint,
  // MakePerpendicular,
  // MidPoint,
} from "./GEFunctions";
import { VoxelNode } from "../Voxel/VoxelNode";
import { Point } from "../../../render/generic/point";

//Pipe to Per
export class TiltedPolylineToPerpendicular {
  nodes: GENode[] = [];
  reversedNodes: GENode[] = [];
  strength: number = 10; // Node Moving Speed
  threshold: number = 0.001; // Threshold for find WeirdNode

  tiltedPointsGroupStart: GENode[] = [];
  tiltedPointsGroupMid: GENode[] = [];
  tiltedPointsGroupEnd: GENode[] = [];
  newPointsGroup: GENode[] = [];
  newMidPoints: GENode[] = [];
  obstacleVoxels: VoxelNode[] = [];
  flags: number = 0;

  levels: GENode[][] = [];
  lineIndex: number;

  minEdge: number = 1;
  maxEdge: number = 5;

  //for debug
  scene: THREE.Scene | null = null;
  boxes: DebugBox[] = [];
  boxesMinMax: DebugBoxByMinMax[] = [];
  steps: number = 0;
  points: Point[] = [];

  constructor(
    nodes: GENode[],
    strength: number,
    threshold: number,
    obstacleVoxels: VoxelNode[],
    lineIndex: number
  ) {
    this.nodes = nodes;
    this.strength = strength;
    this.threshold = threshold;
    this.obstacleVoxels = obstacleVoxels;
    this.lineIndex = lineIndex;
  }
  //Run
  Run = () => {
    //Initialize
    //
    this.tiltedPointsGroupStart = [];
    this.tiltedPointsGroupMid = [];
    this.tiltedPointsGroupEnd = [];
    //---------------------------------------
    console.log("Step: ", this.steps);

    for (const box of this.boxesMinMax) {
      this.scene?.remove(box.cube);
    }

    //this.SplitPointsList();

    // if (this.steps % 60 < 30 || this.steps >= 100) {
    //   this.SynchronizeTwoCoordinates(this.tiltedPointsGroupStart);
    //   this.CheckWeirdNode(this.tiltedPointsGroupStart);
    //   this.ReverseList(this.tiltedPointsGroupEnd);
    //   this.SynchronizeTwoCoordinates(this.tiltedPointsGroupEnd);
      this.CheckWeirdNode(this.nodes);
    //   this.CheckWeirdNode(this.tiltedPointsGroupEnd);
    //   this.ReverseList(this.tiltedPointsGroupEnd);
    // } else {
    //   this.ReverseList(this.nodes);
    //   this.SolveTwistedLine(this.nodes);
    //   this.SynchronizeTwoCoordinates(this.nodes);
    //   this.ReverseList(this.nodes);
    // }

    // Initialize
    this.NodeSet();

    // 1. Solve Twisted Line (최초 Line을 받았을때만)
    //if (this.steps == 0) this.SolveTwistedLine(this.nodes);

    // 2. Tilted Point Check
    // get tilted points by group [startPoint, endPoint]
    this.CheckFlag();
    let tiltedGroup = [];
    tiltedGroup = this.UnFlagedGroup();
    console.log("tiltedGroup", tiltedGroup);

    // 3. by tilted Point reinforce to be Perpendicular

    //this.PickNewMidPoint();
    if (tiltedGroup.length > 0 && this.steps == 1) {
      this.CubeBasePerpendicular(tiltedGroup);
    }

    //this.ApplyToNodeMovement();

    this.DivideLevels();
    this.DirectionSet();

    if (this.steps > 10) {
      //this.Optimization(this.nodes);
    }
    this.steps++;
  };

  // SplitPointsList() {
  //   let t = this.nodes.length;

  //   if (this.nodes.length % 2 === 1) {
  //     for (let i = 0; i < (t - 1) / 2; i++) {
  //       this.tiltedPointsGroupStart.push(this.nodes[i]);
  //     }

  //     this.tiltedPointsGroupMid.push(this.nodes[Math.floor((t - 1) / 2)]);

  //     for (let i = Math.floor(t / 2) + 1; i < t; i++) {
  //       this.tiltedPointsGroupEnd.push(this.nodes[i]);
  //     }
  //   } else {
  //     for (let i = 0; i < t / 2; i++) {
  //       this.tiltedPointsGroupStart.push(this.nodes[i]);
  //     }

  //     this.tiltedPointsGroupMid.push(this.nodes[Math.floor(t / 2)]);

  //     for (let i = Math.floor(t / 2) + 1; i < this.nodes.length; i++) {
  //       this.tiltedPointsGroupEnd.push(this.nodes[i]);
  //     }
  //   }
  //   console.log("짝수");
  //   // 짝수
  // }

  // ReverseList(nodes: GENode[]) {
  //   this.reversedNodes = nodes.reverse();
  // }

  // SynchronizeTwoCoordinates(nodes: GENode[]) {
  //   if (nodes.length <= 1) {
  //     return;
  //   }
  //   // 1. Point들을 검색하면서,

  //   for (let i = 0; i < nodes.length - 1; i++) {
  //     if (nodes[i + 1].isEPT || nodes[i + 1].isSPT) {
  //       //this.Function(nodes[i], nodes[i + 1]);
  //       continue;
  //     }
  //     // if (
  //     //   CheckPerPendicular(
  //     //     nodes[i].location,
  //     //     nodes[i + 1].location,
  //     //     this.threshold
  //     //   )[0] == 0
  //     // ) {
  //     //   continue;
  //     // }

  //     const absX = Math.abs(nodes[i].location.x - nodes[i + 1].location.x);
  //     const absY = Math.abs(nodes[i].location.y - nodes[i + 1].location.y);
  //     const absZ = Math.abs(nodes[i].location.z - nodes[i + 1].location.z);

  //     if (absX >= absY && absX >= absZ) {
  //       nodes[i + 1].finalVector = new THREE.Vector3(
  //         nodes[i + 1].location.x,
  //         nodes[i].location.y,
  //         nodes[i].location.z
  //       );
  //     } // 1-1. X 거리가 Y나 Z의 거리보다 크다면, 다음포인트의 y, z 값을 현재의 y, z으로 변경
  //     else if (absY >= absX && absY >= absZ) {
  //       nodes[i + 1].finalVector = new THREE.Vector3(
  //         nodes[i].location.x,
  //         nodes[i + 1].location.y,
  //         nodes[i].location.z
  //       );
  //     } // 1-2. 1-1과 같은방식으로 Y의 기준
  //     else {
  //       nodes[i + 1].finalVector = new THREE.Vector3(
  //         nodes[i].location.x,
  //         nodes[i].location.y,
  //         nodes[i + 1].location.z
  //       );
  //     } // 1-3. 1-1과 같은방식으로 Z의 기준

  //     MakePerpendicular(nodes[i], nodes[i + 1], 0.1);
  //   }
  // }

  // ApplyToNodeMovement() {
  //   for (let i = 0; i < this.nodes.length; i++) {
  //     if (this.nodes[i].isSPT || this.nodes[i].isEPT) {
  //       continue;
  //     }
  //     this.nodes[i].totalMove = new THREE.Vector3(0, 0, 0);

  //     const length = Math.abs(
  //       this.nodes[i].location.distanceTo(this.nodes[i].finalVector)
  //     );

  //     const dir = this.nodes[i].finalVector
  //       .clone()
  //       .sub(this.nodes[i].location)
  //       .normalize();
  //     dir.multiplyScalar(length * 0.01 * this.strength);
  //     //console.log(length);

  //     //console.log("length:", length);
  //     //console.log("dir:", dir);
  //     if (this.nodes[i].nodeType == NodeType.None) {
  //       this.nodes[i].totalMove.add(dir);
  //     }
  //   }
  // }

  SolveTwistedLine = (nodes: GENode[]) => {
    for (let i = 0; i < nodes.length - 2; i++) {
      const firstNode = nodes[i];
      const midNode = nodes[i + 1];
      const lastNode = nodes[i + 2];
      // 꺾인 선 탐색

      // Check if the lastNode is within a threshold distance above or below the midNode along each axis (x, y, z).
      // If it is, move the midNode towards the midpoint along that axis.
      if (
        (midNode.location.x < lastNode.location.x &&
          midNode.location.x < firstNode.location.x) ||
        (midNode.location.x > lastNode.location.x &&
          midNode.location.x > firstNode.location.x)
      ) {
        //midNode.finalVector = firstNode.finalVector;
        midNode.location = new THREE.Vector3(
          lastNode.location.x,
          firstNode.location.y,
          firstNode.location.z
        );
      }
      if (
        (midNode.location.y < lastNode.location.y &&
          midNode.location.y < firstNode.location.y) ||
        (midNode.location.y > lastNode.location.y &&
          midNode.location.y > firstNode.location.y)
      ) {
        //midNode.finalVector = firstNode.finalVector;
        midNode.location = new THREE.Vector3(
          firstNode.location.x,
          lastNode.location.y,
          firstNode.location.z
        );
      }
      if (
        (midNode.location.z < lastNode.location.z &&
          midNode.location.z < firstNode.location.z) ||
        (midNode.location.z > lastNode.location.z &&
          midNode.location.z > firstNode.location.z)
      ) {
        //midNode.finalVector = firstNode.finalVector;
        midNode.location = new THREE.Vector3(
          firstNode.location.x,
          firstNode.location.y,
          lastNode.location.z
        );
      }
    }
  };

  CheckWeirdNode(nodes: GENode[]) {
    if (nodes.length < 3 || this.steps < 100) {
      return;
    }

    for (let i = 0; i < nodes.length - 2; i++) {
      const firstNode = nodes[i];
      const midNode = nodes[i + 1];
      const lastNode = nodes[i + 2];
      // 꺾인 선 탐색

      const midpoint = MidPoint(firstNode.location, lastNode.location);

      // Check if the lastNode is within a threshold distance above or below the midNode along each axis (x, y, z).
      // If it is, move the midNode towards the midpoint along that axis.
      if (
        (midNode.location.x < lastNode.location.x &&
          midNode.location.x < firstNode.location.x) ||
        (midNode.location.x > lastNode.location.x &&
          midNode.location.x > firstNode.location.x)
      ) {
        //midNode.finalVector = firstNode.location;
        midNode.finalVector = new THREE.Vector3(
          midpoint.x,
          firstNode.location.y,
          firstNode.location.z
        );
      }
      if (
        (midNode.location.y < lastNode.location.y &&
          midNode.location.y < firstNode.location.y) ||
        (midNode.location.y > lastNode.location.y &&
          midNode.location.y > firstNode.location.y)
      ) {
        //midNode.finalVector = firstNode.location;
        midNode.finalVector = new THREE.Vector3(
          firstNode.location.x,
          midpoint.y,
          firstNode.location.z
        );
      }
      if (
        (midNode.location.z < lastNode.location.z &&
          midNode.location.z < firstNode.location.z) ||
        (midNode.location.z > lastNode.location.z &&
          midNode.location.z > firstNode.location.z)
      ) {
        //midNode.finalVector = firstNode.location;
        midNode.finalVector = new THREE.Vector3(
          firstNode.location.x,
          firstNode.location.y,
          midpoint.z
        );
      }
    }
  }

  Flaging = (node1: GENode, node2: GENode) => {
    const dir = node2.location.clone().sub(node1.location).normalize();

    if (CheckParallel(dir, 0.001)) {
      this.flags++;
      node1.flag = true;
      return true;
    } else {
      node1.flag = false;
      return false;
    }
  };

  UnflagFilter = () => {
    for (let i = 0; i < this.nodes.length; i++) {}
  };

  CheckFlag = () => {
    // Check perpendicular finished
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].flag = false;
      this.flags = 0;
      if (this.nodes[i].isEPT) {
        this.nodes[i].flag = true;
      }
    }
    for (let i = 0; i < this.nodes.length - 1; i++) {
      this.Flaging(this.nodes[i], this.nodes[i + 1]);
    }
  };

  UnFlagedGroup = (): GENode[][] => {
    const result: GENode[][] = [];
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const startPoint = this.nodes[i];
      const endPoint = this.nodes[i + 1];
      if (startPoint.flag == false) {
        result.push([startPoint, endPoint]);
      }
    }
    return result;
  };

  CubeBasePerpendicular = (tiltedGroup: GENode[][]) => {
    for (let i = 0; i < tiltedGroup.length; i++) {
      const startNode = tiltedGroup[i][0];
      const endNode = tiltedGroup[i][1];

      const startPoint = startNode.location;
      const endPoint = endNode.location;

      let newPoints: THREE.Vector3[] = [];

      // if (
      //   Math.abs(startPoint.clone().z - endPoint.clone().z) < 0.5 &&
      //   startNode.isSPT == false
      // ) {
      //   const result = AddPerpendicularFromTwoPoints(startPoint, endPoint);
      //   if (result.finished) {
      //     newPoints = result.locations;
      //   } else {
      //     continue;
      //   }
      // } else {
      //   const result = AddPerpendicularFromTwoPoints(
      //     startPoint,
      //     endPoint,
      //     new THREE.Vector3(0, 0, 1)
      //   );
      //   if (result.finished) {
      //     newPoints = result.locations;
      //   }
      //   else{
      //     continue;
      //   }
      // }

      // const result = AddPerpendicularFromTwoPointsbyBoxes(startNode, endNode);
      const result = AddPerpendicularFromTwoPoints(startNode.location, endNode.location);
      if (result.finished) {
        newPoints = result.locations;
      } else {
        continue;
      }

      // const result = testAddPerpendicularFromTwoPoints(startPoint, endPoint);

      // if (result.finished) {
      //   newPoints = result.locations;
      // } else {
      //   continue;
      // }

      const midnode1 = new GENode(newPoints[0]);
      this.nodes.splice(startNode.nodeIndex + 1, 0, midnode1);
      const midnode2 = new GENode(newPoints[1]);
      this.nodes.splice(startNode.nodeIndex + 2, 0, midnode2);

      console.log("Added Perpendicular Point2");
      midnode1.voxelNode = endNode.voxelNode;
      midnode1.finalVector = midnode1.location;

      console.log("Added Perpendicular Point1");
      midnode2.voxelNode = endNode.voxelNode;
      midnode2.finalVector = midnode2.location;

      startNode.flag = true;
      midnode1.flag = true;
      midnode2.flag = true;

      this.NodeSet();
    }
  };

  //#region Optimize
  // Optimize Senarios
  // 1. Too much near Nodes -> Delete
  // 2. Mid point on a direction -> Delete
  // 3. Mid point on Opposide direction -> Delete
  // 4. 1st & 3rd Direction Same but, on have weird direction on mid -> Move Last Node
  // 5. 1st & 3rd Direction Opposite -> move Node and delete surcharge node
  // 6. if no have obstacle on diffrent Level -> need only 4 Points

  Optimization = (nodes: GENode[]) => {
    this.OptimizeNearNode(nodes);
    this.OptimzemidPointOnSameDirection(nodes);
    this.OptimzemidPointOnOppositeDirection(nodes);
    this.OptimizeSenario4(nodes);
    // this.OptimizeSenario5(nodes);
    // this.OptimizeFromLevel();
  };

  // Optimize Senario 1
  // 1. Too much near Nodes -> Delete
  OptimizeNearNode = (nodes: GENode[]) => {
    for (let i = 0; i < nodes.length - 1; i++) {
      if (nodes[i].location.distanceTo(nodes[i + 1].location) < 0.001) {
        nodes[i + 1].destroy();
        nodes.splice(i + 1, 1);
      } //if too much near
    }
  };

  // Optimize Senario 2
  // 2. Mid point on a direction -> Delete
  OptimzemidPointOnSameDirection = (nodes: GENode[]) => {
    for (let i = 0; i < nodes.length - 2; i++) {
      const dir1 = nodes[i + 1].location
        .clone()
        .sub(nodes[i].location)
        .normalize();
      const dir2 = nodes[i + 2].location
        .clone()
        .sub(nodes[i + 1].location)
        .normalize();
      if (dir1.clone().distanceTo(dir2) < 0.005) {
        nodes[i + 1].destroy();
        nodes.splice(i + 1, 1);
        break;
      } //if same direction
    }
  };

  // Optimize Senario 3
  // 3. Mid point on Opposide direction -> Delete
  OptimzemidPointOnOppositeDirection = (nodes: GENode[]) => {
    for (let i = 0; i < nodes.length - 2; i++) {
      const dir1 = nodes[i + 1].location
        .clone()
        .sub(nodes[i].location)
        .normalize();
      const dir2 = nodes[i + 2].location
        .clone()
        .sub(nodes[i + 1].location)
        .normalize();

      if (dir1.clone().multiplyScalar(-1).distanceTo(dir2) < 0.005) {
        nodes[i + 1].destroy();
        nodes.splice(i + 1, 1);
        break;
      } //if opposite direction
    }
  };

  // Optimize Senario 4
  // 4. 1st & 3rd Direction Same but, on have weird direction on mid -> Move Last Node
  OptimizeSenario4 = (nodes: GENode[]) => {
    for (let i = 0; i < nodes.length - 3; i++) {
      const firstNode = nodes[i];
      const midNode = nodes[i + 1];
      const lastNode = nodes[i + 2];
      const nextNode = nodes[i + 3];

      if (
        firstNode.direction.equals(lastNode.direction) &&
        !firstNode.direction.equals(midNode.direction) &&
        firstNode.flag &&
        midNode.flag &&
        lastNode.flag
      ) {
        let point = midNode.location
          .clone()
          .add(nextNode.location.clone().sub(lastNode.location));
        const lastpoint = midNode.location.clone().add(point);
        const midPoint = midNode.location
          .clone()
          .add(point.clone().sub(midNode.location.clone()).divideScalar(2));
        if (
          CheckPointOverlap(
            midNode.location.clone().add(lastpoint),
            this.obstacleVoxels
          ) &&
          CheckPointOverlap(
            midNode.location.clone().add(midPoint),
            this.obstacleVoxels
          )
        ) {
          continue;
        } else {
          lastNode.location = point;
          return;
        }
      }
    }
  };

  // Optimize Senario 5
  // 5. 1st & 3rd Direction Opposite -> move Node and delete surcharge node
  OptimizeSenario5 = (nodes: GENode[]) => {
    for (let i = 0; i < nodes.length - 3; i++) {
      const firstNode = nodes[i];
      const midNode = nodes[i + 1];
      const lastNode = nodes[i + 2];
      const nextNode = nodes[i + 3];

      if (
        firstNode.direction.equals(
          lastNode.direction.clone().multiplyScalar(-1)
        ) &&
        !firstNode.direction.equals(midNode.direction) &&
        firstNode.flag &&
        midNode.flag &&
        lastNode.flag
      ) {
        let point = midNode.location
          .clone()
          .add(nextNode.location.clone().sub(lastNode.location));
        const lastpoint = firstNode.location.clone().add(point);
        const midPoint = midNode.location
          .clone()
          .add(point.clone().sub(firstNode.location.clone()).divideScalar(2));
        if (
          CheckPointOverlap(
            midNode.location.clone().add(lastpoint),
            this.obstacleVoxels
          ) &&
          CheckPointOverlap(
            midNode.location.clone().add(midPoint),
            this.obstacleVoxels
          )
        ) {
          continue;
        } else {
          lastNode.location = point;
          midNode.destroy();
          this.nodes.splice(midNode.nodeIndex, 1);
          return;
        }
      }
    }
  };

  // Optimize Senario 6
  // 6. if no have obstacle on diffrent Level -> need only 4 Points
  OptimizeFromLevel = () => {
    if (this.steps <= 190) {
      return;
    }
    for (let i = 0; i < this.levels.length - 1; i++) {
      let vertices = [
        this.levels[i][0].location,
        this.levels[i + 1][this.levels[i + 1].length - 1].location,
      ];

      let boundingBox = findBoundingBox(vertices);
      console.log("boundingbox", boundingBox);
      //let color = new THREE.Color(0, 1, 0);
      let checkpoint = false;

      for (const obstacle of this.obstacleVoxels) {
        checkpoint = checkOverlapBoxToBox(boundingBox, obstacle.box);
        if (checkpoint) {
          //color = new THREE.Color(1, 0, 0);
          break;
        }
      }

      if (checkpoint) {
        continue;
      }

      if (this.levels[i].length + this.levels[i + 1].length <= 4) {
        continue;
      }

      console.log(
        "Between:",
        this.levels[i].length + this.levels[i + 1].length - 3
      );

      const result = AddPerpendicularFromTwoPoints(
        this.nodes[this.levels[i][0].nodeIndex].location,
        this.nodes[this.levels[i + 1][this.levels[i + 1].length - 1].nodeIndex]
          .location
      );
      if (result.finished == false) {
        return;
      }
      const newPoints = result.locations;

      const midnode1 = new GENode(newPoints[0]);
      const midnode2 = new GENode(newPoints[1]);

      console.log("Added Perpendicular Point2");
      midnode1.voxelNode =
        this.nodes[
          this.levels[i + 1][this.levels[i + 1].length - 1].nodeIndex
        ].voxelNode;
      midnode1.finalVector = midnode1.location;

      console.log("Added Perpendicular Point1");
      midnode2.voxelNode =
        this.nodes[
          this.levels[i + 1][this.levels[i + 1].length - 1].nodeIndex
        ].voxelNode;
      midnode2.finalVector = midnode2.location;

      midnode1.flag = true;
      midnode2.flag = true;

      for (
        let j = this.levels[i][0].nodeIndex + 1;
        j < this.levels[i + 1][this.levels[i + 1].length - 1].nodeIndex;
        j++
      ) {
        this.nodes[j].destroy();
      }

      this.nodes.splice(
        this.levels[i][0].nodeIndex + 1,
        this.levels[i].length + this.levels[i + 1].length - 2
      );
      this.nodes.splice(this.levels[i][0].nodeIndex + 1, 0, midnode1);
      this.nodes.splice(this.levels[i][0].nodeIndex + 2, 0, midnode2);
      break;

      // if (this.scene) {
      //   this.boxesMinMax.push(
      //     new DebugBoxByMinMax(
      //       this.scene,
      //       boundingBox.min,
      //       boundingBox.max,
      //       color
      //     )
      //   );
      // }
    }
    return;
  };
  //#endregion

  // Give Direction to each Node
  DirectionSet = () => {
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const startNode = this.nodes[i];
      const endNode = this.nodes[i + 1];

      startNode.direction = LongestDirection(
        startNode.location,
        endNode.location
      );
      // console.log("Direction Node", this.nodes[i].direction);
    }
  };

  // Node Index Update (splice)
  NodeSet = () => {
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].lineIndex = this.lineIndex;
      this.nodes[i].nodeIndex = i;
    }
  };

  DivideLevels = () => {
    this.levels = [];
    let level = 0;
    this.levels.push([this.nodes[0]]);
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const startNode = this.nodes[i];
      const endNode = this.nodes[i + 1];

      const startLevel = startNode.location.z;
      const endLevel = endNode.location.z;

      if (Math.abs(startLevel - endLevel) < this.threshold) {
        this.levels[level].push(endNode);
      } else {
        if (this.levels[level].length > 0) {
          this.levels.push([this.nodes[i + 1]]);
          level++;
        }
      }
    }
    console.log("Levels", this.levels);
  };
}
