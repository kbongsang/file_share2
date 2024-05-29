import * as THREE from "three";
import { DebugBoxByMinMax, DebugLine } from "./DebugingGeometry";
import { connection } from "../../../components/side-tab-contents/Debug";
import { areBoxesNeighbors } from "../Voxel/VoxelManager";
import { PumpConnectData } from "../../../components/side-tab-contents/Routing";
import { Point } from "../../../render/generic/point";
import Vec3 from "../../util/vec3";
// import {
//   FindPerpendicularPoint,
//   LongestDirectionByNode,
//   LongestDirectionByVector,
// } from "./GEFunctions";
// import { func } from "three/examples/jsm/nodes/Nodes.js";

export class PumpHookManager {
  mainLineLocations: THREE.Vector3[] = [];
  scene: THREE.Scene;
  lines: DebugLine[] = [];

  // gapValue: number = 1;
  gapValue: number = 18;
  startConnections: connection[] = [];
  endConnections: connection[] = [];
  sPts: THREE.Vector3[] = [];
  ePts: THREE.Vector3[] = [];
  obstacleBoxes: THREE.Box3[] = [];
  debugBoxes: DebugBoxByMinMax[] = [];
  connectDataAll: PumpConnectData[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  inputTestData = () => {
    console.log("---pumpHookManager.inputTestData start---");

    // // 1-1 set test point
    this.sPts.push(new THREE.Vector3(-5, 0, 0), new THREE.Vector3(10, 5, 0));
    this.ePts.push(new THREE.Vector3(-10, 0, 50), new THREE.Vector3(20, 0, 50));

    // // 1-2 set test obstacle
    const box = new THREE.Box3(
      new THREE.Vector3(-5, -20, 30),
      new THREE.Vector3(10, 20, 35)
    );
    const box2 = new THREE.Box3(
      new THREE.Vector3(-10, -20, 20),
      new THREE.Vector3(15, 30, 25)
    );
    this.obstacleBoxes.push(box, box2);
    console.log("---pumpHookManager.inputTestData end---");
  };

  inputData = (
    startConnections: connection[],
    endConnections: connection[],
    obstacles?: THREE.Box3[]
  ) => {
    console.log("---pumpHookManager.inputData---");
    // step1 set test object
    // // 1-1 set test point
    if (startConnections.length === endConnections.length) {
      for (const [_, sConnection] of startConnections.entries()) {
        for (const eConnection of endConnections) {
          if (
            sConnection.property === eConnection.property &&
            sConnection.space === eConnection.space
          ) {
            if (eConnection.collided) sConnection.collided = true;
            this.sPts.push(sConnection.location);
            this.startConnections.push(sConnection);
            this.ePts.push(eConnection.location);
            this.endConnections.push(eConnection);
          }
        }
      }
    } else {
      console.error("pump amount not equal to equip amount");
    }
    if (obstacles) {
      this.obstacleBoxes.push(...obstacles);
    }

    console.log("this.obstacleBoxes", this.obstacleBoxes);
    console.log("---pumpHookManager.inputData---");
  };

  inputDataForRoute = (
    _connectDataAll: PumpConnectData[],
    obstacles?: THREE.Box3[]
  ) => {
    this.connectDataAll = _connectDataAll;
    console.log("---pumpHookManager.inputData---");
    // step1 set test object
    // // 1-1 set test point
    // if (startConnections.length === endConnections.length) {
    //   for (const [i, sConnection] of startConnections.entries()) {
    //     for (const eConnection of endConnections) {
    //       if (
    //         sConnection.property === eConnection.property &&
    //         sConnection.space === eConnection.space
    //       ) {
    //         if (eConnection.collided) sConnection.collided = true;
    //         this.sPts.push(sConnection.location);
    //         this.startConnections.push(sConnection);
    //         this.ePts.push(eConnection.location);
    //         this.endConnections.push(eConnection);
    //       }
    //     }
    //   }
    // } else {
    //   console.error("pump amount not equal to equip amount");
    // }

    for (const connectData of _connectDataAll) {
      if (
        isFinite(connectData.Pump_Connector.x) &&
        isFinite(connectData.Equipment_Connector.x) &&
        !connectData.collided
      ) {
        this.sPts.push(connectData.Pump_Connector);
        this.ePts.push(connectData.Equipment_Connector);
      }
    }

    if (obstacles) {
      this.obstacleBoxes.push(...obstacles);
    }

    console.log("this.obstacleBoxes", this.obstacleBoxes);
    console.log("---pumpHookManager.inputData---");
  };

  Run = () => {
    console.log("---pumpHookManager.Run---");

    // step 2 set lines and obstacles
    // // 2-1 set test line
    const originLines = this.sPts.map((sPt, i) => {
      // this.DrawLine([sPt, this.ePts[i]], new THREE.Color(1, 0, 0));
      return [sPt, this.ePts[i]];
    });

    // // 2-2 collect obstacles
    console.log("this.obstacleBoxes", this.obstacleBoxes);
    console.log("sPts", this.sPts);
    console.log("ePts", this.ePts);
    const obstaclesGroup = this.sPts.map((sPt, i) => {
      const obstacles = this.collectObstacles(
        this.obstacleBoxes,
        sPt,
        this.ePts[i]
      );
      return obstacles;
    });

    const finalPaths: THREE.Vector3[][] = [];

    // step 3 turn origin path
    for (const [i, obstacles] of obstaclesGroup.entries()) {
      // if (i === 0 || i === 5) {
      console.log(`${i + 1} 's round mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm`);
      console.log("obstaclesGroup.length: ", obstaclesGroup.length);
      console.log("originLines", originLines);
      console.log("interact obstacles", obstacles);

      const obstaclesWithSpt = this.collectObstacles(
        this.obstacleBoxes,
        this.sPts[i]
      );

      // // if no obstacle
      if (
        obstacles.length === 0 ||
        (obstaclesWithSpt.length === 0 && obstacles.length === 1)
      ) {
        const modifiedLine = this.genLineWithoutObstacle(originLines[i]);
        this.DrawLine(modifiedLine, new THREE.Color(1, 1, 0));
        finalPaths.push(modifiedLine);
      }

      // // if with obstacle
      else {
        const modifiedLine = this.genLineWithObstacle(
          originLines[i],
          obstacles
        );

        console.log("modifiedLine: ", modifiedLine);

        if (this.startConnections.length > 0) {
          if (!this.startConnections[i].collided) {
            this.DrawLine(modifiedLine, new THREE.Color(1, 1, 0));
            finalPaths.push(modifiedLine);
          } else {
            // this.DrawLine(modifiedLine, new THREE.Color(1, 0, 0));
          }
        } else {
          if (!this.connectDataAll[i].collided) {
            this.DrawLine(modifiedLine, new THREE.Color(1, 1, 0));
            finalPaths.push(modifiedLine);
          } else {
            // temporary draw right line
            this.DrawLine(modifiedLine, new THREE.Color(1, 1, 0));
            finalPaths.push(modifiedLine);
            // this.DrawLine(modifiedLine, new THREE.Color(1, 0, 0));
          }
        }

        // console.log("modifiedLine", modifiedLine);
      }
      // }
    }
    // console.log("---pumpHookManager.Run---");

    //#region for JSON
    // for (const path of finalPaths) {
    //   for (let i = path.length - 1; i > 0; i--) {
    //     if (i === 1) break;
    //     const thisPt = path[i];
    //     const lastPt = path[i - 1];
    //     const lastPt2 = path[i - 2];
    //     if (
    //       lastPt.x.toFixed(3) === thisPt.x.toFixed(3) &&
    //       lastPt.y.toFixed(3) === thisPt.y.toFixed(3) &&
    //       lastPt.x.toFixed(3) === lastPt2.x.toFixed(3) &&
    //       lastPt.y.toFixed(3) === lastPt2.y.toFixed(3)
    //     ) {
    //       path.splice(i - 1, 1);
    //     }
    //   }
    // }

    // for (const path of finalPaths) {
    //   for (const pt of path) {
    //     pt.x *= 100;
    //     pt.y *= 100;
    //     pt.z *= 100;
    //   }
    // }
    // console.log("finalPaths", finalPaths);

    // type Line = {
    //   Id: string;
    //   data: {
    //     "Start Point": THREE.Vector3;
    //     "End Point": THREE.Vector3;
    //     Category: string;
    //     Family: string;
    //     Type: string;
    //     "System Type": string;
    //     "System Name": string;
    //     "Pipe Segment": string;
    //     Diameter: string;
    //     "Reference Level": string;
    //   };
    // };
    // function createLines(paths: THREE.Vector3[][]): Line[] {
    //   let lines: Line[] = [];
    //   paths.forEach((path, pathIndex) => {
    //     for (let i = 0; i < path.length - 1; i++) {
    //       const line: Line = {
    //         Id: `461be15a-4c1e-4c3b-a207-2e928badfbc3-0006d45c-path-${
    //           pathIndex + 1
    //         }-line-${i + 1}`,
    //         data: {
    //           "Start Point": {
    //             X: path[i].x,
    //             Y: path[i].y,
    //             Z: path[i].z,
    //           },
    //           "End Point": {
    //             X: path[i + 1].x,
    //             Y: path[i + 1].y,
    //             Z: path[i + 1].z,
    //           },
    //           Category: "Pipes",
    //           Family: "Pipe Types",
    //           Type: "SubRack Pipe",
    //           "System Type": "Hydronic Supply",
    //           "System Name": "Hydronic Supply 300",
    //           "Pipe Segment": "Carbon Steel - Schedule 40",
    //           Diameter: "100mm",
    //           "Reference Level": "4F",
    //         },
    //       };
    //       lines.push(line);
    //     }
    //   });
    //   return lines;
    // }
    // const lineData = createLines(finalPaths);

    // console.log("lineData", lineData);
    // console.log(JSON.stringify(lineData));
    // const json = JSON.stringify(finalPaths);
    // console.log("json", json);
    //#endregion
    return finalPaths;
  };

  RunTest = () => {
    // step1 set test object

    // step 2 set lines and obstacles
    // // 2-1 set test line
    const originLines = this.sPts.map((sPt, i) => {
      this.DrawLine([sPt, this.ePts[i]], new THREE.Color(1, 0, 0));
      return [sPt, this.ePts[i]];
    });
    // // 2-2 collect obstacles
    const obstaclesGroup = this.sPts.map((sPt, i) => {
      const obstacles = this.collectObstacles(
        this.obstacleBoxes,
        sPt,
        this.ePts[i]
      );
      return obstacles;
    });

    // step 3 turn origin path
    for (const [i, obstacles] of obstaclesGroup.entries()) {
      console.log("line: ", i);
      // // if no obstacle
      if (obstacles.length === 0) {
        const modifiedLine = this.genLineWithoutObstacle(originLines[i]);
        this.DrawLine(modifiedLine, new THREE.Color(1, 1, 0));
      }
      // // if with obstacle
      else {
        const modifiedLine = this.genLineWithObstacle(
          originLines[i],
          obstacles
        );
        this.DrawLine(modifiedLine, new THREE.Color(1, 1, 0));
      }
    }
  };
  //-------------------

  DrawLine = (locations: THREE.Vector3[], color: THREE.Color) => {
    for (let i = 0; i < locations.length - 1; i++) {
      this.lines.push(
        new DebugLine(this.scene, locations[i], locations[i + 1], color)
      );
    }
  };

  DrawBox = (box: THREE.Box3, color: THREE.Color) => {
    const debugBox = new DebugBoxByMinMax(this.scene, box.min, box.max, color);
    this.debugBoxes.push(debugBox);
    // console.log("DrawBox!");
  };

  // DrawBox = (locations: THREE.Vector3[], color: THREE.Color) => {
  //   for (let i = 0; i < locations.length - 1; i++) {
  //     this.Boxes.push(new DebugBoxByMinMax(this.scene, min, max, new THREE.Color(0, 0, 1)););
  //   }
  // };

  genLineWithObstacle(originLine: THREE.Vector3[], obstacles: THREE.Box3[]) {
    console.log("with obstacle");

    console.log("originLine: ", originLine);
    // step 1 union obstacle (X)
    // const bound = obstacles[0];
    // for (const obstacle of obstacles) bound.union(obstacle);

    // sort obstacles (near spt --> far away spt)
    obstacles.sort(
      (a, b) =>
        a.distanceToPoint(originLine[0]) - b.distanceToPoint(originLine[0])
    );

    // combine nearObstacle
    const finalObstacles: THREE.Box3[] = [];
    if (obstacles.length > 1) {
      for (let i = obstacles.length - 1; i > 0; i--) {
        const thisObs = obstacles[i];
        const lastObs = obstacles[i - 1];
        if (
          areBoxesNeighbors(thisObs, lastObs) &&
          this.isCollided(thisObs, originLine[0]) &&
          this.isCollided(lastObs, originLine[0])
        ) {
          const lastObsClone = lastObs.clone();
          const unionBox = lastObsClone.union(thisObs);
          finalObstacles.push(unionBox);
          i--;
        } else {
          finalObstacles.push(thisObs);
          if (i === 1) finalObstacles.push(lastObs);
        }
      }
      finalObstacles.reverse();
    } else {
      finalObstacles.push(...obstacles);
    }

    // // del not used grid beam
    // if (finalObstacles.length >= 2) {
    //   if (
    //     finalObstacles[finalObstacles.length - 1].max.z.toFixed(3) ===
    //     finalObstacles[finalObstacles.length - 2].max.z.toFixed(3)
    //   ) {
    //     finalObstacles.splice(finalObstacles.length - 2, 1);
    //   }
    // }

    console.log("obstacles", obstacles);
    console.log("finalObstacles", finalObstacles);

    // const finalObstacles = [...obstacles];

    const turningNodes: (THREE.Vector3 | undefined)[] = [];
    //

    let sPt = originLine[0].clone();
    let ePt = originLine[1].clone();

    let r = 1;
    let g = 0;
    let b = 0;

    // loop for every obstacle
    for (let [index, obstacle] of finalObstacles.entries()) {
      console.log(`${index} 's obstacle: `, obstacle);
      // create the array of final path
      const thisNodes: (THREE.Vector3 | undefined)[] = [];

      // 如果是倒數第二個且倒數第二與倒數第一同高度(都是grid梁的話)
      // Case 1: if second from last and last one are in same height
      if (
        index === finalObstacles.length - 2 &&
        obstacle.max.z.toFixed(3) ===
          finalObstacles[finalObstacles.length - 1].max.z.toFixed(3)
      ) {
        console.log("Case 1");
        // --- 計算轉彎角度是否足夠 ---
        // Calculate if has enough angle to rotate
        const topTemp = new THREE.Vector3(sPt.x, sPt.y, obstacle.max.z);
        const angleDegreeTemp =
          90 - this.calculateVerticalAngle(topTemp, ePt, true);
        console.log("this is the final");
        console.log("angleDegreeTemp", angleDegreeTemp);
        // --- 計算轉彎角度是否足夠 ---
        // Calculate if has enough angle to rotate

        // 如果角度不夠的話, 把另一個更近的梁當作最後要通過的障礙物
        // if angle is not enough, consider another nearest grid to final obstacle
        if (angleDegreeTemp > 60) {
          const boxesClone = [...this.obstacleBoxes];
          const nearestBox = boxesClone.sort(
            (a, b) => a.distanceToPoint(ePt) - b.distanceToPoint(ePt)
          )[0];

          obstacle = nearestBox;
          console.log("nearestBox", nearestBox);
          console.log("obstacle", obstacle);
          // continue;
        } else {
          console.log("test!!!");
          const nearestPt = findNearestPoint(sPt, obstacle);
          console.log("nearestPt: ", nearestPt);

          const passPt = nearestPt.clone();
          passPt.z += obstacle.max.z - obstacle.min.z;
          // step 3 add turning point
          const turnPt1 = this.modifyPtByAngle(sPt, nearestPt);
          console.log("turnPt1: ", turnPt1);

          turningNodes.push(turnPt1!, nearestPt, passPt);
          break;
        }
      }

      // 如果沒有碰撞了的話
      // Case 2: if no collision
      if (!this.isCollided(obstacle, sPt, ePt)) {
        console.log("Case 2!");
        // not last one or
        if (
          obstacle !== finalObstacles[finalObstacles.length - 1] ||
          index === finalObstacles.length - 1
        ) {
          let path;
          if (ePt.z - sPt.z < 10) {
            path = this.genLineWithoutObstacle([sPt, ePt], true);
          } else {
            path = this.genLineWithoutObstacle([sPt, ePt]);
          }
          const nodes = path.slice(1, path.length - 1);
          console.log("path", path);
          console.log("node", nodes);
          thisNodes.push(...nodes);
          turningNodes.push(...thisNodes);

          sPt = nodes[nodes.length - 1];
          continue;
        }
        //
        else {
          console.log("not collide! but there's other beam to choose");
          let path;
          const nearestPt = findNearestPoint(ePt, obstacle);
          nearestPt.z = obstacle.max.z;
          path = this.genLineWithoutObstacle([sPt, nearestPt]);
          const nodes = path.slice(1);
          console.log("path", path);
          console.log("node", nodes);
          thisNodes.push(...nodes);

          const path2 = this.genLineWithoutObstacle([nearestPt, ePt], true);
          const nodes2 = path2.slice(1, path2.length - 1);
          thisNodes.push(...nodes2);

          turningNodes.push(...thisNodes);

          break;
        }
      }

      console.log("index", index);

      const nearestPt = findNearestPoint(sPt, obstacle);
      console.log("nearestPt: ", nearestPt);

      const passPt = nearestPt.clone();
      passPt.z += obstacle.max.z - obstacle.min.z;
      // step 3 add turning point
      const turnPt1 = this.modifyPtByAngle(sPt, nearestPt);
      console.log("turnPt1: ", turnPt1);

      thisNodes.push(turnPt1!, nearestPt, passPt);

      if (index === finalObstacles.length - 1) {
        const ePtTemp = new THREE.Vector3(ePt.x, ePt.y, ePt.z);
        const lastNode = thisNodes[thisNodes.length - 1];
        if (Math.abs(ePtTemp.z - lastNode!.z) < this.gapValue) {
          thisNodes.push(ePtTemp);
        } else {
          ePtTemp.z -= this.gapValue;
          const turnPt2 = this.modifyPtByAngle(passPt, ePtTemp);
          thisNodes.push(ePtTemp, turnPt2);
        }
      }
      // else {
      //   const turnPt2 = this.modifyPtByAngle(passPt, ePt);
      //   thisNodes.push(turnPt2);
      // }

      // console.log("nearestPt", nearestPt);
      // console.log("passPt", passPt);
      // console.log("ePtTemp", ePtTemp);
      // console.log("turnPt1", turnPt1);
      // console.log("turnPt2", turnPt2);

      if (!thisNodes.includes(undefined)) {
        turningNodes.push(...thisNodes);
        console.log("thisNodes", thisNodes);
        sPt = thisNodes[thisNodes.length - 1]!;
      } else {
        console.error("error when turning");
        break;
      }
    }

    if (!turningNodes.includes(undefined)) {
      // const originPts = [turnPt1, nearestPt, passPt, turnPt2];
      // const angle = this.calculateAngle(ePt, sPt);

      // const rotatedPts = originPts.map((pt) => {
      //   return rotatePoint(pt, sPt, -angle);
      // });

      const allPts = [
        originLine[0],
        ...turningNodes,
        originLine[1],
      ] as THREE.Vector3[];
      const modifiedLine = cullDuplicatedPts(allPts);
      console.log("modifyLine", modifiedLine);
      return modifiedLine;
    } else {
      console.error("error when turning path", originLine);
      return originLine;
    }

    function findNearestPoint(point: THREE.Vector3, box: THREE.Box3) {
      const leftXDist = box.min.x - point.x;
      const rightXDist = box.max.x - point.x;
      const bottomYDist = box.min.y - point.y;
      const topYDist = box.max.y - point.y;
      console.log("point", point);
      const distanceAll = [leftXDist, rightXDist, bottomYDist, topYDist];

      const minDistance = [...distanceAll].sort(
        (a, b) => Math.abs(a) - Math.abs(b)
      )[0];
      const minIndex = distanceAll.indexOf(minDistance);

      const nearestPt = point.clone();

      nearestPt.z = box.min.z;
      if (minIndex <= 1) {
        nearestPt.x += minDistance;
        // nearestPt.y = findPointByXValue([sPt, ePt], nearestPt.x).y;
      } else {
        nearestPt.y += minDistance;
        // nearestPt.x = findPointByYValue([sPt, ePt], nearestPt.y).x;
      }
      console.log("distanceAll", distanceAll);
      console.log("minDistance", minDistance);
      console.log("minIndex", minIndex);
      console.log("nearestPt", nearestPt);
      return nearestPt;
    }
  }

  genLineWithoutObstacle(
    originLine: THREE.Vector3[],
    ExcludeBeamDistance: boolean = false
  ) {
    console.log("without obstacle");
    console.log("originLine: ", originLine);
    const ePtTemp = originLine[1].clone();
    if (!ExcludeBeamDistance) ePtTemp.z -= this.gapValue;
    const turnPt = this.modifyPtByAngle(originLine[0], ePtTemp);
    if (turnPt) {
      const modifiedLine = [originLine[0], turnPt, ePtTemp, originLine[1]];

      // console.log("pts", pts);
      // console.log("modifyLine", modifiedLine);
      return modifiedLine;
    }
    // can not find turn pt
    else {
      console.error("error when turning path", originLine);
      return originLine;
    }
  }

  modifyPtByAngle(sPt: THREE.Vector3, ePt: THREE.Vector3) {
    console.log("sPt", sPt);
    console.log("ePt", ePt);
    let testDegree = 90 - this.calculateVerticalAngle(sPt, ePt, true);
    const angleDegree = isFinite(testDegree) ? testDegree : 0;

    console.log("angleDegree", angleDegree);

    // let angleDegree = _angleDegree;
    let outPt: THREE.Vector3 | undefined = undefined;

    //step2: get cotangent
    const cot60 = 1 / Math.tan(Math.PI / 3);
    const cot45 = 1 / Math.tan(Math.PI / 4);
    const cot30 = 1 / Math.tan(Math.PI / 6);
    const xLength = Math.abs(sPt.x - ePt.x);
    const yLength = Math.abs(sPt.y - ePt.y);

    const planLength = Math.sqrt(xLength ** 2 + yLength ** 2);
    //step3: determine
    if (angleDegree > 60) {
      // // not right <-------------------------------Todo: add error warning!
      // // selPts = [new THREE.Vector3(0, 0, 0)];
      // // panel.isHookUpGenSuccess = false;
      // //-------------------------------------------
      // let _zLength = _xLength * cot60;
      // const finalPt = new THREE.Vector3(
      //   bottom.x,
      //   bottom.y,
      //   topPoint.z + _zLength
      // );

      // const UBayLimitedHeight = 2;

      // const last2Pt = new THREE.Vector3(finalPt.x, finalPt.y, UBayLimitedHeight);

      // let moveDir = -1;
      // if (topPoint.x > last2Pt.x) moveDir = 1;

      // const ZDiff = finalPt.z - last2Pt.z;
      // const xDiff = ZDiff / cot60;
      // const xMove = xDiff * moveDir;
      // const last3Pt = new THREE.Vector3(last2Pt.x + xMove, last2Pt.y, last2Pt.z);

      // selPts = [last3Pt, last2Pt, finalPt];
      console.error("error in angle algorithm, angleDegree: ", angleDegree);
      return outPt;
    }
    // 0 ~ 60
    else if (angleDegree <= 60 && angleDegree >= 0) {
      //40~65 use 60
      if (angleDegree <= 60 && angleDegree > 45) {
        let _zLength = planLength * cot60;
        outPt = new THREE.Vector3(sPt.x, sPt.y, ePt.z - _zLength);
      }
      //30~45 use45
      else if (angleDegree <= 45 && angleDegree > 30) {
        let _zLength = planLength * cot45;
        outPt = new THREE.Vector3(sPt.x, sPt.y, ePt.z - _zLength);
      }
      //0~30 use 30
      else if (angleDegree <= 30 && angleDegree > 0) {
        let _zLength = planLength * cot30;
        outPt = new THREE.Vector3(sPt.x, sPt.y, ePt.z - _zLength);
      } else if (angleDegree === 0) {
        let _zLength = planLength * cot30;
        console.log("_zLength", _zLength);
        outPt = new THREE.Vector3(sPt.x, sPt.y, ePt.z - _zLength);
      }

      // const finalOutPt = findPointByZValue([sPt, ePt], outPt!.z);
      // console.log("ePt", ePt);
      // console.log("outPt", outPt);
      // console.log("finalOutPt", finalOutPt);
      return outPt;
    }
    // else if (angleDegree <= 15 && angleDegree > 0) {
    //   //use 15
    //   let _zLength = _xLength * cot15;
    //   selPts = [new THREE.Vector3(bottom.x, bottom.y, topPoint.z - _zLength)];
    //   return selPts;
    // } else {
    //   // use 0
    //   let _zLength = _xLength * cot15;
    //   selPts = [new THREE.Vector3(bottom.x, bottom.y, topPoint.z - _zLength)];
    //   return selPts;
    // }
    console.error("error in angle algorithm, angleDegree: ", angleDegree);
    return outPt;
  }

  calculateVerticalAngle(
    sPt: THREE.Vector3,
    ePt: THREE.Vector3,
    degree: boolean
  ) {
    const projectedEPt = new THREE.Vector3(ePt.x, ePt.y, sPt.z);
    const vec1 = new THREE.Vector3().subVectors(projectedEPt, sPt);
    const vec2 = new THREE.Vector3().subVectors(ePt, sPt);

    const dot = vec1.dot(vec2);

    const magnitudeA = vec1.length();
    const magnitudeB = vec2.length();

    const angleRadians = Math.acos(dot / (magnitudeA * magnitudeB));
    const angleDegrees = angleRadians * (180 / Math.PI);

    if (!degree) {
      // console.log(`angle(radians): ${angleRadians}`);
      return angleRadians;
    } else {
      // console.log(`angle(Degrees): ${angleDegrees}`);
      return angleDegrees;
    }
  }

  calculateAngle(ePt: THREE.Vector3, center: THREE.Vector3) {
    const vec1 = new THREE.Vector3(1, 0, 0);
    const vecTemp = new THREE.Vector3().subVectors(ePt, center);
    const vec2 = new THREE.Vector3(vecTemp.x, vecTemp.y, 0);

    const dot = vec1.dot(vec2);

    const magnitudeA = vec1.length();
    const magnitudeB = vec2.length();

    const angleRadians = Math.acos(dot / (magnitudeA * magnitudeB));

    return angleRadians;
  }

  collectObstacles(
    boxes: THREE.Box3[],
    sPt: THREE.Vector3,
    ePt?: THREE.Vector3
  ) {
    if (ePt) {
      return boxes.filter(
        (box) =>
          (box.max.x >= sPt.x &&
            box.min.x <= sPt.x &&
            box.max.y >= sPt.y &&
            box.min.y <= sPt.y &&
            box.max.z >= sPt.z &&
            box.min.z <= ePt.z) ||
          (box.max.x >= ePt.x &&
            box.min.x <= ePt.x &&
            box.max.y >= ePt.y &&
            box.min.y <= ePt.y &&
            box.max.z >= sPt.z &&
            box.min.z <= ePt.z)
      );
    }
    //
    else {
      return boxes.filter(
        (box) =>
          box.max.x >= sPt.x &&
          box.min.x <= sPt.x &&
          box.max.y >= sPt.y &&
          box.min.y <= sPt.y &&
          box.max.z >= sPt.z
      );
    }
  }
  isCollided(box: THREE.Box3, sPt: THREE.Vector3, ePt?: THREE.Vector3) {
    if (ePt) {
      return (
        (box.max.x >= sPt.x &&
          box.min.x <= sPt.x &&
          box.max.y >= sPt.y &&
          box.min.y <= sPt.y &&
          box.max.z >= sPt.z) ||
        (box.max.x >= ePt.x &&
          box.min.x <= ePt.x &&
          box.max.y >= ePt.y &&
          box.min.y <= ePt.y &&
          box.min.z <= ePt.z)
      );
    } else {
      return (
        box.max.x >= sPt.x &&
        box.min.x <= sPt.x &&
        box.max.y >= sPt.y &&
        box.min.y <= sPt.y &&
        box.max.z >= sPt.z
      );
    }
  }
}

// function findPointByZValue(line: THREE.Vector3[], zValue: number) {
//   const sortedLine = line.sort((a, b) => a.z - b.z);
//   const sPt = sortedLine[0];
//   const ePt = sortedLine[1];

//   // 计算参数t
//   const t = (zValue - sPt.z) / (ePt.z - sPt.z);

//   // 计算特定z坐标上的x和y坐标
//   const x = sPt.x + t * (ePt.x - sPt.x);
//   const y = sPt.y + t * (ePt.y - sPt.y);

//   const outputPt = new THREE.Vector3(x, y, zValue);
//   return outputPt;
// }

// function findPointByXValue(line: THREE.Vector3[], xValue: number) {
//   const sortedLine = line.sort((a, b) => a.z - b.z);
//   const sPt = sortedLine[0];
//   const ePt = sortedLine[1];

//   // 计算参数t
//   const t = (xValue - sPt.x) / (ePt.x - sPt.x);

//   // 计算特定z坐标上的x和y坐标
//   const y = sPt.y + t * (ePt.y - sPt.y);
//   const z = sPt.z + t * (ePt.z - sPt.z);

//   const outputPt = new THREE.Vector3(xValue, y, z);
//   return outputPt;
// }

// function findPointByYValue(line: THREE.Vector3[], yValue: number) {
//   const sortedLine = line.sort((a, b) => a.z - b.z);
//   const sPt = sortedLine[0];
//   const ePt = sortedLine[1];

//   // 计算参数t
//   const t = (yValue - sPt.y) / (ePt.y - sPt.y);

//   // 计算特定z坐标上的x和y坐标
//   const x = sPt.x + t * (ePt.x - sPt.x);
//   const z = sPt.z + t * (ePt.z - sPt.z);

//   const outputPt = new THREE.Vector3(x, yValue, z);
//   return outputPt;
// }

function cullDuplicatedPts(pts: THREE.Vector3[]) {
  const clonePts = [...pts];
  for (let i = clonePts.length - 1; i > 0; i--) {
    const thisPt = clonePts[i];
    const lastPt = clonePts[i - 1];
    if (
      thisPt.x === lastPt.x &&
      thisPt.y === lastPt.y &&
      thisPt.z === lastPt.z
    ) {
      clonePts.splice(i, 1);
    }
  }

  return clonePts;
}

// function rotatePoint(
//   point: THREE.Vector3,
//   center: THREE.Vector3,
//   angle: number
// ) {
//   // 将point移动到以center为原点的坐标系中
//   const relativePoint = point.clone().sub(center);

//   // 创建一个围绕z轴旋转的矩阵
//   const rotationMatrix = new THREE.Matrix4();
//   rotationMatrix.makeRotationZ(angle); // 对于不同的轴，可以使用makeRotationX或makeRotationY

//   // 使用旋转矩阵旋转点
//   relativePoint.applyMatrix4(rotationMatrix);

//   // 将点移回原来的坐标系
//   const finalPosition = relativePoint.add(center);

//   return finalPosition;
// }
