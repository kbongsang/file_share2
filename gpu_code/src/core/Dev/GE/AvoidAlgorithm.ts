import * as THREE from "three";
import { GENode, NodeType } from "./GENode";
import { DebugLine } from "./DebugingGeometry";
import { VoxelNode } from "../Voxel/VoxelNode";
import { LongestDirection, ShortestDirection } from "./GEFunctions";

//Avoid Algorithm
export class AvoidAlgorithm {
  nodes: GENode[] = [];
  obstacleNodes: GENode[] = [];
  obstacleVoxelNodes: VoxelNode[] = [];
  finished: Boolean = false;
  nodeDistance: number = 0;
  distance: number = 1;
  strength: number = 10;

  globalObstacleNodes: GENode[] = [];

  steps: number = 0;

  scene: THREE.Scene = new THREE.Scene();
  lines: DebugLine[] = [];

  constructor(
    nodes: GENode[],
    obstacleNodes: GENode[],
    strength: number,
    obstacleVoxelNodes: VoxelNode[]
  ) {
    this.nodes = nodes;
    this.obstacleNodes = obstacleNodes;
    this.strength = strength;
    this.obstacleVoxelNodes = obstacleVoxelNodes;
    //console.log("Setup: ", this.nodes);
  }

  Run() {
    this.finished = false;

    for (const line of this.lines) {
      this.scene.remove(line.line);
    }

    //Avoidance Each Node
    //this.CalculateDirectionAndLength(this.nodes);

    //Avoidance Obstacle with Pipe(TODO: Bugfix)
    //this.CalculateDirectionAndLengthLine(this.nodes);

    //Avoidance BoxObstacle with Node(Alter: in empty path)
    //this.CalculateDirectionAndLengthFace(this.nodes);

    console.log("run: ");
    //console.log("run: ", this.nodes);
    this.steps++;
  }

  //#region Avoidance Node
  CalculateDirectionAndLength = (nodes: GENode[]) => {
    let dir: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].totalMove = new THREE.Vector3(0, 0, 0);

      //SPT, EPT Not Move
      if (nodes[i].isSPT || nodes[i].isEPT) {
        continue;
      }

      //each Node checking each Other
      for (let j = 0; j < nodes.length; j++) {
        if (i != j) {
          const length = nodes[i].location.distanceTo(nodes[j].location);
          const distance = nodes[i].radius + nodes[j].radius;
          if (length > distance) {
            //nodes[i].directionPanelty = new THREE.Vector3();
            console.log("length > Distance");
            continue;
          } else {
          }
          const shortestDirection = ShortestDirection(nodes[i], nodes[j]);
          nodes[i].directionPanelty.add(
            shortestDirection.clone().multiplyScalar(0.1)
          );
          dir = nodes[i].location.clone().sub(nodes[j].location).normalize();
          dir.multiplyScalar(length * this.strength * 0.1);
          //console.log(length);

          //console.log("length:", length);
          //console.log("dir:", dir);
          if (nodes[i].nodeType == NodeType.None) {
            nodes[i].totalMove.add(dir);
            if (i == 0) {
              nodes[i].totalMove.multiply(
                shortestDirection
                  .multiply(nodes[i].directionPanelty)
                  .add(new THREE.Vector3(1, 1, 1))
              );
            }
            if (i > 0 && i < nodes.length - 1) {
              nodes[i - 1].totalMove.multiply(
                shortestDirection
                  .multiply(nodes[i].directionPanelty)
                  .add(new THREE.Vector3(1, 1, 1))
              );
              nodes[i].totalMove.multiply(
                shortestDirection
                  .multiply(nodes[i].directionPanelty)
                  .add(new THREE.Vector3(1, 1, 1))
              );
              nodes[i + 1].totalMove.multiply(
                shortestDirection
                  .multiply(nodes[i].directionPanelty)
                  .add(new THREE.Vector3(1, 1, 1))
              );
            } else {
              nodes[i - 1].totalMove.multiply(
                shortestDirection
                  .multiply(nodes[i].directionPanelty)
                  .add(new THREE.Vector3(1, 1, 1))
              );
              nodes[i].totalMove.multiply(
                shortestDirection
                  .multiply(nodes[i].directionPanelty)
                  .add(new THREE.Vector3(1, 1, 1))
              );
            }
          }
        }
      }
    }
  };
  //#endregion

  //#region Avoidance Pipe
  CalculateDirectionAndLengthLine = (nodes: GENode[]) => {
    for (let i = 0; i < this.lines.length; i++) {
      this.scene.remove(this.lines[i].line);
    }
    //nodes[i].totalMove = new THREE.Vector3(0, 0, 0);
    for (const obstacle of this.obstacleNodes) {
      for (let j = 0; j < nodes.length - 1; j++) {
        const capsulePoint = this.ClosestPointOnLineSegment(
          nodes[j].location,
          nodes[j + 1].location,
          obstacle
        );
        let length = obstacle.location.distanceTo(capsulePoint);
        const distance = nodes[j].radius + obstacle.radius;
        // let check1 = obstacle.location.distanceTo(
        //   nodes[j].location
        // );
        // let check2 = obstacle.location.distanceTo(
        //   nodes[j + 1].location
        // );

        if (
          length >= distance
          // &&
          // (check1 >= distance * Math.sqrt(2) ||
          //   check2 >= distance * Math.sqrt(2))
        ) {
          continue;
        }
        this.lines.push(
          new DebugLine(
            this.scene,
            capsulePoint,
            obstacle.location,
            new THREE.Color(0, 0, 0)
          )
        );

        // Calculate interaction with the capsule
        if (length == 0) {
          length = 1000;
        }
        const dir = capsulePoint.clone().sub(obstacle.location).normalize();
        dir.multiplyScalar(length * this.strength * 0.1);
        if (!nodes[j].isSPT && !nodes[j].isEPT) {
          // Adjust direction strength as needed
          nodes[j].totalMove.add(dir);
        } else if (!nodes[j + 1].isSPT && !nodes[j + 1].isEPT) {
          nodes[j + 1].totalMove.add(dir);
        }
      }
    }
  };

  ClosestPointOnLineSegment = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    node: GENode
  ): THREE.Vector3 => {
    const point = node.location;
    const direction = new THREE.Vector3().copy(end).sub(start);
    const lengthSq = direction.lengthSq(); // Length of the line segment squared
    if (lengthSq === 0) {
      return start.clone(); // Return the start point if the line segment has zero length
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        new THREE.Vector3().copy(point).sub(start).dot(direction) / lengthSq
      )
    );
    const closestPoint = new THREE.Vector3()
      .copy(start)
      .add(direction.multiplyScalar(t));
    return closestPoint;
  };

  //#endregion

  //#region Avoidance box

  CalculateDirectionAndLengthFace = (nodes: GENode[]) => {
    // Calculate the center of the box
    for (const obstacle of this.obstacleVoxelNodes) {
      const box = obstacle.box;
      //console.log("Box of obstacle", box);
      for (const node of nodes) {
        if (node.isSPT || node.isEPT) {
          continue;
        }
        const point = node.location;
        const boxCenter = new THREE.Vector3();
        box.getCenter(boxCenter);

        if (box.distanceToPoint(point) <= node.radius * 10) {
          if (!box.containsPoint(point)) {
            const dir = LongestDirection(node.location, obstacle.location);
            //console.log("distance to Point", box.distanceToPoint(point));

            const pushLength = dir.multiplyScalar(0.01);
            //console.log("projectionLine:", length);

            if (length < node.radius) {
              node.totalMove.add(pushLength);
            }
          }
        } else {
          return;
        }
      }
    }
  };

  CheckSphereBoxOverlap = (box: THREE.Vector3, sphere: GENode) => {
    // Find the closest point on the box to the sphere's center
    const closestPoint = new THREE.Vector3();
    box.clamp(sphere.location, closestPoint);

    // Calculate the distance from this point to the sphere's center
    const distance = closestPoint.distanceTo(sphere.location);

    // Check if the distance is less than or equal to the sphere's radius
    return distance <= sphere.radius;
  };

  // CalculateDirectionAndLengthFace(point: THREE.Vector3, box: THREE.Box3, faceNormal: THREE.Vector3) {
  //   // Calculate the center of the box
  //   const boxCenter = new THREE.Vector3();

  //   if (box.containsPoint(point)) {

  //   }// 만약 포인트가 박스 내부에 있을때 노멀 벡터 방향(노드를 튕겨낼 방향)
  //   else {

  //   }//

  //   box.getCenter(boxCenter);

  //   // Assuming the box is axis-aligned, the faceNormal can help us identify the face's plane equation
  //   const facePoint = boxCenter.clone().add(faceNormal.multiplyScalar(box.getSize(new THREE.Vector3()).y / 2));

  //   // Calculate the vector from the point to the face point
  //   const pointToFacePoint = facePoint.clone().sub(point);

  //   // Project this vector onto the face normal to find the distance from the point to the face
  //   const distanceToFace = pointToFacePoint.dot(faceNormal);

  //   // Use this distance to find the projection on the face
  //   const projection = point.clone().add(faceNormal.multiplyScalar(distanceToFace));

  //   console.log("ProjectionPoint", projection);
  //   this.lines.push(new DebugLine(this.scene, point, new THREE.Vector3(facePoint.x, point.y, point.z)));

  //   return projection;
  // }
  //#endregion
}
