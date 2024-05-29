import * as THREE from "three";
import {
  DebugBox,
  DebugBoxByMinMax,
  DebugCapsule,
  DebugLine,
  DebugSphere,
  DrawLines,
} from "./DebugingGeometry";
import { GENode, NodeType } from "./GENode";
import { AvoidAlgorithm } from "./AvoidAlgorithm";
import { TiltedPolylineToPerpendicular } from "./PerpendicularAlgorithm";
import { VoxelNode } from "../Voxel/VoxelNode";
import {
  AddPerpendicularFromTwoPoints,
  CheckNodeOverlap as CheckPointOverlap,
  FindVoxelPoint,
  //ConfineNodeToBox,
  LongestDirectionByNode,
} from "./GEFunctions";
import { PathInfo } from "../SE/PathInfo";
import { Point } from "../../../render/generic/point";
import { ParallelLines } from "./ParallelAlgorithm";
import { CurveObject } from "../../BIM/CurveObject";
import { PipeFitting } from "../../family/PipeFittings";

// GE Algorithm == Avoiding Algorithm + Perpendicular Algorithm
export class GEManager {
  // Input
  lineLength: number = 2;
  maxBending: number = 0;
  priority: number = 0;

  // Use
  allPath: PathInfo[] = [];
  obstacleNodes: GENode[][] = [];
  normalNodes: GENode[][] = [];
  avoidAlgorithm: AvoidAlgorithm[] = [];
  perpendicularAlgorithm: TiltedPolylineToPerpendicular[] = [];
  finishedCalculate: Boolean = false;
  offset: number = 0.5;
  steps: number = 0;
  standardLineIndex: number = 0;

  eptsMask: number[] = [];

  // InputNodes
  SPT: THREE.Vector3[] = [];
  EPT: THREE.Vector3[] = [];
  obstacles: THREE.Vector3[][] = [];
  obstaclesRadius: number[][] = [];
  divide: number = 5;
  middleNodes: THREE.Vector3[][] = [];
  voxelNodes: VoxelNode[][] = [];
  obstacleVoxelNodes: VoxelNode[][] = [];
  emptyVoxelNodes: VoxelNode[] = [];

  subSPT: THREE.Vector3[][] = [];
  subEPT: THREE.Vector3[][] = [];
  subNodeLocations: THREE.Vector3[][][] = [];
  finalSubPath: THREE.Vector3[][] = [];

  // Strength
  avoidStrength: number = 10;
  perpendicularStrength: number = 5;
  perpendicularThreshold: number = 0.001;

  obj: PipeFitting[] = [];
  objs: PipeFitting[][] = [];

  finalObj: PipeFitting[] = [];

  // Debuging
  DebugMode: boolean = true;
  scene: THREE.Scene;
  boxes: Point[] = [];
  spheres: DebugSphere[] = [];
  lines: DebugLine[] = [];
  capsules: DebugCapsule[] = [];
  debugBoxes: DebugBox[] = [];
  minmaxBoxes: DebugBoxByMinMax[] = [];
  points: Point[] = [];

  constructor(scene: THREE.Scene = new THREE.Scene()) {
    this.scene = scene;
  }

  Init = () => {
    //this.Grouping();

    // for (const i of this.eptsMask) {
    //   this.SPT.push(this.allPath[i].sPt);
    //   this.EPT.push(this.allPath[i].ePt);
    //   this.middleNodes.push(this.allPath[i].pathPts);
    //   this.voxelNodes.push(this.allPath[i].voxelNodes);
    //   this.obstacleVoxelNodes.push(this.allPath[i].obstacleVoxel);
    //   this.obstacleNodes.push([]);
    // }

    this.allPath.forEach((path) => {
      this.SPT.push(path.sPt);
      this.EPT.push(path.ePt);
      this.middleNodes.push(path.pathPts);
      this.voxelNodes.push(path.voxelNodes);
      this.obstacleVoxelNodes.push(path.obstacleVoxel);
      this.obstacleNodes.push([]);
    });
  };

  // Grouping
  // If Same EndPoints then whill be groups
  // ---------------------------------------------
  Grouping = () => {
    const mask = [];
    const spts: THREE.Vector3[][] = [];
    const epts: THREE.Vector3[][] = [];
    const tempObjs: PipeFitting[][] = [];
    const tempObj: PipeFitting[] = [];
    // mask.push(this.allPath[0].ePt);
    this.eptsMask.push(0);
    tempObj.push(this.obj[0]);

    // Grouped By EndVoxel Point
    const location = FindVoxelPoint(
      this.allPath[0].ePt,
      this.allPath[0].voxelNodes
    );
    if (location) mask.push(location);

    for (let i = 0; i < this.allPath.length; i++) {
      spts.push([]);
      epts.push([]);
      tempObjs.push([]);
    }

    for (let i = 1; i < this.allPath.length; i++) {
      for (let j = 0; j < mask.length; j++) {
        const location = FindVoxelPoint(
          this.allPath[i].ePt,
          this.allPath[i].voxelNodes
        );
        if (location)
          if (mask[j].equals(location)) {
            spts[j].push(this.allPath[i].sPt);
            epts[j].push(this.allPath[i].ePt);
            tempObjs[j].push(this.obj[i]);
            console.log("obj", this.obj);
            console.log("ept", this.allPath[i].ePt);
            console.log("spts: ", spts);
            console.log("Mask: ", mask);
            break;
          } else if (j == mask.length - 1) {
            mask.push(location);
            this.eptsMask.push(i);
            tempObj.push(this.obj[i]);
            break;
          }
      }
    }

    tempObj.forEach((element) => {
      this.finalObj.push(element);
    });

    tempObjs.forEach((element) => {
      element.forEach((t) => {
        if (element) this.finalObj.push(t);
      });
    });

    for (let i = 0; i < spts.length; i++) {
      this.subSPT.push(spts[i]);
      this.subEPT.push(epts[i]);
    }
    // console.log("spts: ", spts);
    // console.log("subSPT: ", this.subSPT);

    // console.log("eptsMask", mask);
    // console.log("eptsMask", this.eptsMask);

    // console.log("EPTsarray");
  };

  // 1. Call from Event
  Setup = (pathInfoAll: PathInfo[], obj?: PipeFitting[]) => {
    if (pathInfoAll) this.allPath = pathInfoAll;
    console.log("PathInfos", pathInfoAll);

    if (obj) this.obj = obj; // need to use pipeFitting

    //
    // 1-1. Initialize
    //
    this.Init();

    // console.log("sPt", this.SPT);
    // console.log("ePt", this.EPT);

    const startPoint = this.SPT;
    const endPoint = this.EPT;
    //
    //
    //

    //
    // 1-2. Generate Lines & Setup
    //
    for (let i = 0; i < this.SPT.length; i++) {
      this.normalNodes?.push([]);
    }

    {
      for (let i = 0; i < this.SPT.length; i++) {
        const dir = endPoint[i].clone().sub(startPoint[i]);

        let divideCount;
        if (this.middleNodes[i]) {
          divideCount = this.middleNodes[i].length + 2;
        } else {
          divideCount = 2;
        }

        dir.divideScalar(divideCount - 1);

        //Init Normal
        for (let j = 0; j < divideCount; j++) {
          const node = new GENode();
          node.radius = this.lineLength / 2;
          this.normalNodes[i]?.push(node);
          for (let k = 0; k < this.obstacleNodes.length; k++) {
            if (i != k) {
              if (i == this.standardLineIndex) {
                continue;
              }
              this.obstacleNodes[k].push(node);
            }
          }

          // console.log("ObstacleNodes", this.obstacleNodes);
          //console.log(sPt.length);

          if (j == 0) {
            node.isSPT = true;
            node.Setup(
              i,
              NodeType.None,
              this.SPT[i].clone(),
              this.voxelNodes[i][j]
            );
          } // Init Start Node
          else if (j == divideCount - 1) {
            node.isEPT = true;
            node.Setup(
              i,
              NodeType.None,
              this.EPT[i].clone(),
              this.voxelNodes[i][j]
            );
          } // Init End Node
          else {
            if (j > 0) {
              //console.log(middleNodes[i].length);
              node.Setup(
                i,
                NodeType.None,
                this.middleNodes[i][j - 1],
                this.voxelNodes[i][j]
              );
              this.normalNodes[i][j - 1].direction = LongestDirectionByNode(
                this.normalNodes[i][j - 1],
                this.normalNodes[i][j]
              );
            }
          } // Setup Normal Middle Node
          node.finalVector = node.location;
        }

        console.log("ObstacleNodes-input to Algorithm", this.obstacleNodes);
        this.avoidAlgorithm.push(
          new AvoidAlgorithm(
            this.normalNodes[i],
            this.obstacleNodes[i],
            this.avoidStrength,
            this.obstacleVoxelNodes[i]
          )
        );
        this.avoidAlgorithm[i].scene = this.scene;
        this.perpendicularAlgorithm.push(
          new TiltedPolylineToPerpendicular(
            this.normalNodes[i],
            this.perpendicularStrength,
            this.perpendicularThreshold,
            this.obstacleVoxelNodes[i],
            i
          )
        );
        this.perpendicularAlgorithm[i].scene = this.scene;
      }
      //
      //
      //

      console.log("Normal Nodes: ", this.normalNodes);

      console.log(this.avoidAlgorithm);

      // Debug Lines & Points Generate
      this.UpdateDebug();
      this.SetupDebug();
    }
  };

  // Call from Event(Update)
  Step = () => {
    if (this.avoidAlgorithm) {
      for (let i = 0; i < this.avoidAlgorithm.length; i++) {
        // Avoid Algorithm Run
        this.avoidAlgorithm[i].Run();
        this.UpdateNode();

        for (let j = 0; j < this.normalNodes.length; j++) {
          // console.log("AfterAvoid: ",this.nodeCollection[i].totalMove);
        }

        if (this.perpendicularAlgorithm)
          this.perpendicularAlgorithm[i].Run();
        
            //this.UpdateNode();
            // for (let j = 0; j < this.normalNodes.length; j++) {
            //   // console.log("AfterPerpendicular", this.nodeCollection[i].totalMove);
            //   // console.log("finalVector : ", this.normalNodes[i][j].finalVector);
            // }

        console.log(this.normalNodes);

        this.UpdateDebug();
      }
    } else {
      console.log("algorithmNull");
    }

    this.steps++;

    return this.ExportFinalPath();
  };

  ExportFinalPath = (): [THREE.Vector3[][], any[], number, object[]] => {
    const finalpath: THREE.Vector3[][] = [];
    const finalobjs: PipeFitting[] = this.obj;

    for (let i = 0; i < this.normalNodes.length; i++) {
      finalpath.push([]);
    }

    for (let i = 0; i < this.normalNodes.length; i++) {
      for (let j = 0; j < this.normalNodes[i].length; j++) {
        finalpath[i].push(this.normalNodes[i][j].location);
      }
      finalobjs.push(this.obj[i]);
    }

    this.finalSubPath.forEach((sublines) => {
      finalpath.push(sublines);
    });

    const radius: any[] = [];
    const meta: object[] = [];
    const type = 2;

    console.log("FinalObjs: ", this.finalObj);
    this.finalObj.forEach((curveObj) => {
      if ("Size" in curveObj.meta) {
        const size = curveObj.meta["Size"];
        radius.push(size);
      }
      meta.push(curveObj.meta);
    });

    console.log("FinalPath", finalpath);
    console.log("NormalNodes", this.normalNodes);
    console.log("subLines", this.subNodeLocations);

    return [finalpath, radius, type, meta];
  };

  // Apply Movement on Node
  UpdateNode = () => {
    // Avoiding
    for (const eachnormalNodes of this.normalNodes) {
      for (const normalNode of eachnormalNodes)
        if (!normalNode.isSPT || !normalNode.isEPT) {
          if (normalNode.voxelNode) {
            //if finalvector contain other voxel voxel node change

            CheckPointOverlap(normalNode, this.emptyVoxelNodes);
            normalNode.location.add(normalNode.totalMove);

            // const dir = normalNode.totalMove.clone().sub(normalNode.finalVector)
            // normalNode.location.add(dir.multiplyScalar(this.perpendicularStrength*0.001))

            // if (
            //   normalNode.location.distanceTo(normalNode.finalVector) <=
            //   this.perpendicularThreshold
            // ) {
            //   normalNode.location = normalNode.finalVector;
            // }

            // Stoped Confine Node to box
            // ConfineNodeToBox(normalNode);
          }
        }
    }
    console.log(this.normalNodes);
  };

  SetupDebug = () => {
    if (!this.DebugMode) {
      return;
    }
    //this.StaticDebug();
  };

  //
  // Debug Objs that not change in runtime
  // ---------------------------------------------
  StaticDebug = () => {
    //console.log(this.voxelNodes);
    for (let i = 0; i < this.voxelNodes.length; i++) {
      for (let j = 0; j < this.voxelNodes[i].length; j++) {
        const voxelNode = this.voxelNodes[i][j];
        const min = voxelNode.box.min;
        const max = voxelNode.box.max;

        if (min && max) {
          this.minmaxBoxes.push(
            new DebugBoxByMinMax(
              this.scene,
              min,
              max,
              new THREE.Color(0.1, 0.1, 0.1)
            )
          );
          this.emptyVoxelNodes.push(voxelNode);
        }
      }
    }
    for (let i = 0; i < this.obstacleVoxelNodes.length; i++) {
      for (let j = 0; j < this.obstacleVoxelNodes[i].length; j++) {
        const voxelNode = this.obstacleVoxelNodes[i][j];
        const min = voxelNode.box.min;
        const max = voxelNode.box.max;

        if (min && max)
          new DebugBoxByMinMax(
            this.scene,
            min,
            max,
            new THREE.Color(0.5, 0, 0)
          );
      }
    }
  };

  UpdateDebug = () => {
    //Initialzize
    if (!this.DebugMode) {
      return;
    }

    for (let i = 0; i < this.lines.length; i++) {
      this.scene.remove(this.lines[i].line);
    }
    for (let i = 0; i < this.capsules.length; i++) {
      this.scene.remove(this.capsules[i].capsule);
    }
    for (let i = 0; i < this.debugBoxes.length; i++) {
      this.scene.remove(this.debugBoxes[i].cube);
    }
    for (let i = 0; i < this.boxes.length; i++) {
      this.scene.remove(this.boxes[i].object3d);
    }
    for (let i = 0; i < this.spheres.length; i++) {
      this.scene.remove(this.spheres[i].sphere);
    }

    for (const minmaxBoxes of this.minmaxBoxes) {
      this.scene.remove(minmaxBoxes.cube);
    }

    //console.log(this.obstacleNodes);

    // Obstacle(Red): each fath`s Obstacle
    let color = new THREE.Color(1, 0, 0);
    // for (const obstacleNodeList of this.obstacleNodes) {
    //   for (const obstacleNode of obstacleNodeList) {
    //     this.boxes.push(
    //       new DebugBox(this.scene, 1, obstacleNode.location, color)
    //     );
    //   }
    // }

    for (let j = 0; j < this.emptyVoxelNodes.length; j++) {
      const voxelNode = this.emptyVoxelNodes[j];
      const min = voxelNode.box.min;
      const max = voxelNode.box.max;

      if (min && max) {
        this.minmaxBoxes.push(
          new DebugBoxByMinMax(
            this.scene,
            min,
            max,
            new THREE.Color(0.1, 0.1, 0.1)
          )
        );
      }
    }

    // Path and Node on Path
    // (TODO) Seperate Subline Generator
    const normalNodeLocation: THREE.Vector3[][] = [];
    for (let i = 0; i < this.normalNodes.length; i++) {
      normalNodeLocation.push([]);
      
    // const subNodeLocations: THREE.Vector3[][][] = [];
    // this.finalSubPath = [];
    // for (let i = 0; i < this.SPT.length; i++) {
    //   subNodeLocations.push([]);
    // }

    //   for (const normalNode of this.normalNodes[i]) {
    //     normalNodeLocation[i].push(normalNode.location);
    //   }

    //   for (let j = 0; j < 5; j++) {
    //     subNodeLocations[i].push(
    //       ParallelLines(
    //         normalNodeLocation[i],
    //         new THREE.Vector3(0, 1, 0),
    //         0.5 * (j + 1)
    //       )
    //     );
    //   }

    //   this.subNodeLocations = subNodeLocations;

    //   subNodeLocations.forEach((sub) => {
    //     sub.forEach((test) => {
    //       const debuglines = DrawLines(this.scene, test);

    //       debuglines.forEach((element) => {
    //         this.lines.push(element);
    //       });
    //     });
    //   });

      for (let j = 0; j < this.normalNodes[i].length; j++) {
        const startPoint = this.normalNodes[i][j];
        const endPoint = this.normalNodes[i][j + 1];
        color = new THREE.Color(0, 1, 1);
        // path
        if (j < this.normalNodes[i].length - 1) {
          this.lines.push(
            new DebugLine(
              this.scene,
              startPoint.location,
              endPoint.location,
              color
            )
          );
        }

        // Nodes On path
        if (startPoint.isSPT || startPoint.isEPT)
          color = new THREE.Color(0, 0, 0);
        if (startPoint.flag) color = new THREE.Color(0, 0, 0);
        if (startPoint.mid) color = new THREE.Color(0, 0, 1);
        else if (startPoint.lastStart || startPoint.lastEnd)
          color = new THREE.Color(0, 1, 1);

        this.normalNodes[i][j].SetPointPosition();
        color = new THREE.Color(0, 1, 0);
      }
    }
    // console.log("SubLocation", subNodeLocations);
    // console.log("subSPT", this.subSPT);
    // Subline Generate
    // if (subNodeLocations)
    //   for (let i = 0; i < subNodeLocations.length; i++) {
    //     if (i < this.subSPT.length) {
    //       for (let j = 0; j < subNodeLocations[i].length; j++) {
    //         if (j < this.subSPT[i].length) {
    //           if (subNodeLocations[i][j][1] === undefined) {
    //             continue;
    //           }
    //           if (subNodeLocations[i][j].length > 5) {
    //             subNodeLocations[i][j].splice(0, 5);
    //           } else {
    //             subNodeLocations[i][j].splice(
    //               0,
    //               subNodeLocations[i][j].length - 1
    //             );
    //           }
    //           subNodeLocations[i][j].splice(0, 0, this.subSPT[i][j]);
    //           let zDir = new THREE.Vector3(0, 0, 1);

    //           let count = 0;
    //           for (let k = 1; k < subNodeLocations[i][j].length; k++) {
    //             if (subNodeLocations[i][j][k].z < this.subSPT[i][j].z) {
    //               console.log("sublinez", subNodeLocations[i][j][k].z);
    //               console.log("subz", this.subSPT[i][j].z);
    //               count += 1;
    //             } else {
    //               break;
    //             }
    //           }

    //           subNodeLocations[i][j].splice(1, count);

    //           count = 0;

    //           // WeirdPoint Remove
    //           for (let k = 1; k < subNodeLocations[i][j].length - 1; k++) {
    //             const targetPoint = subNodeLocations[i][j][k];
    //             if (
    //               (targetPoint.x < subNodeLocations[i][j][k + 1].x &&
    //                 targetPoint.x < this.subSPT[i][j].x) ||
    //               (targetPoint.x > subNodeLocations[i][j][k + 1].x &&
    //                 targetPoint.x > this.subSPT[i][j].x)
    //             ) {
    //               count += 1;
    //             } else if (
    //               (targetPoint.y < subNodeLocations[i][j][k + 1].y &&
    //                 targetPoint.y < this.subSPT[i][j].y) ||
    //               (targetPoint.y > subNodeLocations[i][j][k + 1].y &&
    //                 targetPoint.y > this.subSPT[i][j].y)
    //             ) {
    //               count += 1;
    //             } else {
    //               break;
    //             }
    //           }

    //           subNodeLocations[i][j].splice(1, count);

    //           // Subline Start Perpendicular
    //           const result = AddPerpendicularFromTwoPoints(
    //             this.subSPT[i][j],
    //             subNodeLocations[i][j][1],
    //             zDir
    //           );

    //           if (result) {
    //             const newPoints: THREE.Vector3[] = result.locations;
    //             console.log(newPoints);
    //             subNodeLocations[i][j].splice(1, 0, newPoints[0]);
    //             subNodeLocations[i][j].splice(2, 0, newPoints[1]);
    //           }

    //           // Subline End Perpendicular
    //           const result2 = AddPerpendicularFromTwoPoints(
    //             subNodeLocations[i][j][subNodeLocations[i][j].length - 1],
    //             this.subEPT[i][j]
    //           );

    //           const newPoints2 = result2.locations;

    //           subNodeLocations[i][j].splice(
    //             subNodeLocations[i][j].length,
    //             1,
    //             newPoints2[0]
    //           );

    //           subNodeLocations[i][j].splice(
    //             subNodeLocations[i][j].length,
    //             0,
    //             newPoints2[1]
    //           );

    //           subNodeLocations[i][j].splice(
    //             subNodeLocations[i][j].length,
    //             0,
    //             this.subEPT[i][j]
    //           );

    //           for (let k = 0; k < subNodeLocations[i][j].length - 1; k++) {
    //             const startPoint = subNodeLocations[i][j][k];
    //             const endPoint = subNodeLocations[i][j][k + 1];
    //             color = new THREE.Color(0, 1, 1);
    //             // path
    //             this.lines.push(
    //               new DebugLine(this.scene, startPoint, endPoint, color)
    //             );
    //           }

    //           this.finalSubPath.push(subNodeLocations[i][j]);
    //         }
    //       }
    //     }
    //   }
  };

  UpdateNodeLocation = () => {
    for (const normalNodeList of this.normalNodes) {
      for (const normalNode of normalNodeList) {
        normalNode.SetNodeLocation();
      }
    }
    console.log("test");
    this.UpdateDebug();
  };

  // TODO: Seperate GenerateSubLine
  GenerateSubLine = () => {};
}
