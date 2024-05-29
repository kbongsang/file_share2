import * as THREE from "three";
import { Point } from "../../../render/generic/point";
import { CurveObject } from "../../BIM/CurveObject";
import { HostObject } from "../../BIM/HostObject";
import {
  areBoxesNeighbors,
  findBranchNode,
  getRangeZAndSpaceBox,
  Range,
  splitRangeBySubRanges,
  VoxelManager,
} from "../../Dev/Voxel/VoxelManager";
import { aheadDir, propertyInfo, VoxelNode } from "../../Dev/Voxel/VoxelNode";
import Vec3 from "../../util/vec3";
import * as general from "./general";
import { hookupRouting } from "./main";
import { drawDebugPipe, drawNodeOfPL, drawPipe, drawPolyline } from "./render";
import { measureExecutionTime } from "../../Dev/General/Timer";
import { SmartElbowManager } from "../../Dev/SE/SmartElbow";
import * as SE_Module from "../../Dev/SE/SmartElbow";
import { mainPath } from "../../../components/side-tab-contents/routing-tab-contents/HookUpPhaseOne";
import { PointObject } from "../../BIM/PointObject";
import { cloneDeep, result } from "lodash";
import { LocationPoint } from "../../BIM/Location";
import { equipConnector, equipObject } from "../../BIM/RoutingObject";
import { Connector } from "../../../components/side-tab-contents/Routing";
import { GEManager } from "../../Dev/GE/GEManager";
import { PipeFitting } from "../../family/PipeFittings";
import { getEquipConnector } from "./general";
import { Cylinder } from "../../../render/generic/cylinder";
import { DebugBoxByMinMax } from "../../Dev/GE/DebugingGeometry";
import { GridObj } from "../../family/Grid";
import { HangObj } from "../../family/HangObj";

import { GPU } from "gpu.js";
const gpu = new GPU();

export var gEManager = new GEManager();

// Extend the type definition of the original class
declare module "./main" {
  interface hookupRouting {
    // init
    voxelize(
      auto?: boolean,
      inputBoundingBox?: THREE.Box3,
      inputManager?: VoxelManager
    ): Promise<void>;
    voxelize_waffle(
      auto?: boolean,
      inputBoundingBox?: THREE.Box3,
      inputManager?: VoxelManager
    ): Promise<void>;

    //#region not use now
    // route
    getSpt2_1(): Promise<void>;
    getSpt2_1Auto(
      fullAuto?: boolean,
      autoBox?: THREE.Box3,
      inputSPts1?: THREE.Vector3[],
      inputSObj1?: PipeFitting[]
    ): Promise<void>;
    getEndVoxel1(
      auto?: boolean,
      fullAuto?: boolean,
      equipInput?: HostObject,
      inputVoxelManager?: VoxelManager,
      inputSelVoxelArr?: VoxelNode[],
      inputEPts_1?: THREE.Vector3[],
      inputSObj_1?: PipeFitting[]
    ): Promise<void>;
    findPath(
      seInput?: SmartElbowManager,
      inputSPts1?: THREE.Vector3[],
      inputEPts1?: THREE.Vector3[],
      inputSObj_1?: PipeFitting[]
    ): Promise<void>;
    hideNodeAndVoxel(
      seInput?: SmartElbowManager,
      voxelManagerInput?: VoxelManager
    ): Promise<void>;
    divideSupportVoxels(voxelManagerInput?: VoxelManager): Promise<void>;
    getEndVoxel2_2(
      fullAuto?: boolean,
      inputSE1?: SmartElbowManager,
      inputSE2?: SmartElbowManager,
      equipInput?: HostObject,
      inputSelVoxel?: VoxelNode[],
      inputSObj_1?: PipeFitting[]
    ): Promise<void>;
    findPath2(
      inputSE1?: SmartElbowManager,
      inputSE2?: SmartElbowManager,
      inputSelVoxel?: VoxelNode[],
      inputSPts_2?: THREE.Vector3[],
      inputEPts_2?: THREE.Vector3[],
      inputSObj_2?: PipeFitting[]
    ): Promise<void>;
    setupGE(
      inputGE?: GEManager,
      inputSE1?: SmartElbowManager,
      inputSObj_1?: PipeFitting[]
    ): Promise<void>;
    runGE(
      inputGE?: GEManager,
      draw?: boolean,
      inputStartObjs_1?: PipeFitting[],
      inputSE2?: SmartElbowManager
    ): Promise<() => void>;

    reRunGE(): Promise<void>;

    drawRoutePipe(
      inputStartObjs_1?: PipeFitting[],
      inputGE?: GEManager,
      inputSE2?: SmartElbowManager
    ): Promise<void>;
    //#endregion

    voxelizeSpaces_simple(
      iter: number,
      minSize: number,
      obstacles: HostObject[],
      space: THREE.Box3,
      useVM: VoxelManager
    ): Promise<void>;

    voxelizeSpaces(
      iter: number,
      minSize: number,
      obstacles: HostObject[],
      space: THREE.Box3,
      useVM: VoxelManager,
      boundingBox: THREE.Box3
    ): Promise<THREE.Box3>;

    modifyPath(
      usedSE: SmartElbowManager,
      selectedConnector: equipConnector[]
    ): Promise<void>;
    setArrangeBranchPipe(
      startPosition: THREE.Vector3,
      supportVoxels: VoxelNode[]
    ): Promise<branchPipe[]>;
  }
}

//#region  not use now
// Task2-2 Voxels
hookupRouting.prototype.getSpt2_1 = async function () {
  console.log("pipeDataArray", this.userPipeObjArray);

  if (this.userPipeObjArray.length === 0) {
    alert("pipeData is empty! Please add pipeData.");
    throw new Error("pipeData is empty! Please add pipeData.");
  }
  // manually choose
  for (const pipeData of this.userPipeObjArray) {
    const fittingObj = pipeData as PipeFitting;

    // const newSPt = general.vec3ToVector3(fittingObj.EndPoint);
    if (!fittingObj) {
      console.error("this PipeFitting is undefined", fittingObj);
      throw new Error("this PipeFitting is undefined");
    }

    const newSPt = getFittingPt(fittingObj);
    this.sPts_1.push(newSPt);

    if (fittingObj) this.startObjs_1.push(fittingObj);
    else console.error("this curveObj is undefined", fittingObj);

    const newSPtVec1 = new Vec3(newSPt.x, newSPt.y, newSPt.z);
    new Point(newSPtVec1);
  }
};

hookupRouting.prototype.getSpt2_1Auto = async function (
  fullAuto: boolean = false,
  autoBox?: THREE.Box3,
  inputSPts1?: THREE.Vector3[],
  inputSObj1?: PipeFitting[]
) {
  console.warn("GetSpt2_1Auto begin");
  
  const useSPts_1 = inputSPts1 ? inputSPts1 : this.sPts_1;
  const useSObj_1 = inputSObj1 ? inputSObj1 : this.startObjs_1;

  console.log("pipeDataArray", this.userPipeObjArray);
  console.log("hostObjects when press", this.hostObjects);

  if (this.userPipeObjArray.length === 0) {
    // collect connector in bounding box
    //#region old method
    // const connectorList: Pipes[] = [];
    // for (const obj of this.hostObjects) {
    //   // if (obj instanceof CurveObject && obj.isConnection === true)
    //   if (obj.constructor.name === "Pipes") {
    //     const pipeObj = obj as Pipes;
    //     if (
    //       pipeObj.StartPoint.x.toFixed(0) === pipeObj.EndPoint.x.toFixed(0) &&
    //       pipeObj.StartPoint.y.toFixed(0) === pipeObj.EndPoint.y.toFixed(0) &&
    //       pipeObj.StartPoint.z.toFixed(0) !== pipeObj.EndPoint.z.toFixed(0)
    //     ) {
    //       const connector = obj as Pipes;
    //       const connectorBox = new THREE.Box3().setFromObject(
    //         connector.renderObjects[1].object3d
    //       );
    //       if (!fullAuto) {
    //         if (
    //           this.inputBoundingBox!.intersectsBox(connectorBox) ||
    //           this.inputBoundingBox!.containsBox(connectorBox)
    //         ) {
    //           console.log("not full auto");
    //           connectorList.push(connector);
    //         }
    //       }
    //       // fullAuto
    //       else {
    //         if (
    //           autoBox!.intersectsBox(connectorBox) ||
    //           autoBox!.containsBox(connectorBox)
    //         ) {
    //           console.log("full auto");
    //           connectorList.push(connector);
    //         }
    //       }
    //     }
    //   }
    // }
    //#endregion

    const connectorList: PipeFitting[] = [];
    for (const obj of this.hostObjects) {
      // if (obj instanceof CurveObject && obj.isConnection === true)
      if (obj.constructor.name === "PipeFitting") {
        const connector = obj as PipeFitting;

        const connectorBox = new THREE.Box3().setFromObject(
          connector.renderObjects[0].object3d
        );

        console.log("connectorBox test", connectorBox);
        if (!fullAuto) {
          if (
            this.inputBoundingBox!.intersectsBox(connectorBox) ||
            this.inputBoundingBox!.containsBox(connectorBox)
          ) {
            console.log("not full auto");
            connectorList.push(connector);
          }
        }
        // fullAuto
        else {

          if (
            autoBox!.intersectsBox(connectorBox) ||
            autoBox!.containsBox(connectorBox)
          ) {
            console.log("full auto");
            connectorList.push(connector);
          }
        }
      }
    }
    console.log("connectorList", connectorList);
    // const sPts = connectorList.map((c) => general.vec3ToVector3(c.EndPoint));

    const sPts = connectorList.map((fitting) => {
      return getFittingPt(fitting);
    });

    useSPts_1.push(...sPts);
    useSObj_1.push(...connectorList);

    console.log("sPts_1 after get spt2_1: ", useSPts_1);
    console.log("startObjs_1 after get spt2_1: ", useSObj_1);
    useSPts_1.map((c) => {
      new Point(general.Vector3ToVec3(c));
    });
  }

  if (this.userPipeObjArray.length !== 0) {
    alert("This is automation mode. please keep pipeData empty!");
    throw new Error("This is automation mode. please keep pipeData empty!");
  }

  console.warn("GetSpt2_1Auto finish");
};

hookupRouting.prototype.getEndVoxel1 = async function (
  auto: boolean = false,
  fullAuto: boolean = false,
  equipInput?: HostObject,
  inputVoxelManager?: VoxelManager,
  inputSelVoxelArr?: VoxelNode[],
  inputEPts_1?: THREE.Vector3[],
  inputSObj_1?: PipeFitting[]
) {
  console.warn("GetEndVoxel1 begin");

  const usedSObj_1 = inputSObj_1 ? inputSObj_1 : this.startObjs_1;

  console.log("usedSObj_1!!", usedSObj_1);
  console.log("inputSObj_1!!", inputSObj_1);
  console.log("startObjs_1!!", this.startObjs_1);

  const usedEPts_1 = inputEPts_1 ? inputEPts_1 : this.ePts_1;
  const usedSelVoxel = inputSelVoxelArr
    ? inputSelVoxelArr
    : this.selectedVoxels;

  console.log("selectedVoxels before find (should be empty)", [
    ...usedSelVoxel,
  ]);
  const usedVoxelManager = inputVoxelManager
    ? inputVoxelManager
    : this.globalVM;

  // usedSelVoxel.length = 0; // clear selectedVoxels

  if (!auto) {
    console.log("not auto");

    if (this.userVoxelArray.length === 0) {
      alert("The voxel array is empty! Please add voxels.");
      throw new Error("The voxel array is empty! Please add voxels.");
    }

    // input manually choose
    for (const voxel of this.userVoxelArray) {
      usedSelVoxel.push(voxel);
    }
  }

  if (auto) {
    console.log("auto");
    // console.log("selectedVoxels before", [...selectedVoxels]);

    let equip: HostObject | undefined;
    if (!fullAuto) {
      console.log("not full auto");
      equip = general.findEquip(this.hostObjects);
    } else {
      console.log("full auto");
      equip = equipInput;
    }

    const equipBox = new THREE.Box3().setFromObject(
      equip!.renderObjects[0].object3d
    );

    // get the voxels that can be used (not under the equip and with available neighbors)
    const filteredVoxels = usedVoxelManager.supportSpaceVoxels.filter(
      (voxel) => {
        console.warn("voxel: ", voxel);

        const filterNeighbors = voxel.neighbors.filter(
          (neighbor) =>
            neighbor.isAvailable === true &&
            !usedVoxelManager.supportSpaceVoxels.includes(neighbor)
        );
        console.log("filterNeighbors", [...filterNeighbors]);

        const neighborsOfNeighbor = filterNeighbors
          .map((neighbor) =>
            neighbor.neighbors.filter((n) => n.isAvailable === true)
          )
          .flat();

        return (
          !equipBox.containsBox(voxel.box) &&
          !equipBox.intersectsBox(voxel.box) &&
          neighborsOfNeighbor.length > 1
        );
      }
    );

    console.log("equipBox!! ", equipBox);
    console.log("usedVoxelManager!! ", usedVoxelManager);
    console.log("filteredVoxels!! ", filteredVoxels);

    // random choose
    if (usedSObj_1.length < 4) {
      const randomVoxels = general.randomSelect(
        filteredVoxels,
        usedSObj_1.length
      );
      usedSelVoxel.push(...randomVoxels);
    } else {
      const randomVoxels = general.randomSelect(
        filteredVoxels,
        usedSObj_1.length - 2
      );

      usedSelVoxel.push(...randomVoxels, randomVoxels[0], randomVoxels[1]);
    }
  }

  console.log("selectedVoxels", usedSelVoxel);

  for (const [i, voxel] of usedSelVoxel.entries()) {
    // TODO add sth to record path here

    console.log("startObjs_1 in GetEndVoxel1", usedSObj_1);
    // assigned path1 MEP connector
    const thisObj = usedSObj_1[i];
    console.log("thisObj", thisObj);

    if ("S5_Utility" in thisObj.meta) {
      // get property
      const typeStr = String(thisObj.meta["S5_Utility"]);
      // const index = typeStr.indexOf("-");
      // const propertyName = typeStr.substring(index + 1);

      console.log("typeStr", typeStr);
      // console.log("propertyName", propertyName);

      let isPropertyExist = false;
      for (const propertyInfo of voxel.branchInfo.assignProps) {
        if (propertyInfo.property.includes(typeStr)) {
          propertyInfo.amount++;
          isPropertyExist = true;
        }
      }
      if (!isPropertyExist) {
        const newPropertyInfo: propertyInfo = {
          property: typeStr,
          amount: 1,
          branchAmount: 0,
        };
        voxel.branchInfo.assignProps.push(newPropertyInfo);
        voxel.branchInfo.currentMainAmount++;
      }
    }
  }

  console.log("selectedVoxels", [...new Set(usedSelVoxel)]);
  console.log("selectedVoxels", [usedSelVoxel]);

  const newEPts = usedSelVoxel.map((voxel) => voxel.location);
  usedEPts_1.push(...newEPts);

  console.warn("GetEndVoxel1 finished");
};

hookupRouting.prototype.findPath = async function (
  seInput?: SmartElbowManager,
  inputSPts1?: THREE.Vector3[],
  inputEPts1?: THREE.Vector3[],
  inputSObj_1?: PipeFitting[]
) {
  console.warn("findPath1 start");

  const useSPts_1 = inputSPts1 ? inputSPts1 : this.sPts_1;
  const useEPts_1 = inputEPts1 ? inputEPts1 : this.ePts_1;
  const useSObj_1 = inputSObj_1 ? inputSObj_1 : this.startObjs_1;

  const runningSE = seInput ? seInput : this.globalSE1;
  const timer2 = measureExecutionTime();
  timer2.next();
  // console.log("sPts at find path", sPts);
  // console.log("ePts at find path", ePts);

  if (this.globalVM.voxelNodes) {
    // se1.voxelNodesSupport;
    await runningSE.run(useSPts_1, useEPts_1);
    console.log("se1.addConnector");
    console.log("startObjs_1", useSObj_1);
    await runningSE.addConnector(useSObj_1);
  }
  console.warn("SE Algorithm");
  timer2.next();

  console.warn("findPath1 finish");
};

hookupRouting.prototype.divideSupportVoxels = async function (
  voxelManagerInput?: VoxelManager
) {
  console.warn("divideSupportVoxels begin");
  const runningVM = voxelManagerInput ? voxelManagerInput : this.globalVM;

  //findBranchNode
  if (runningVM.supportSpaceVoxels) {
    runningVM.originSupportSpaceVoxels = runningVM.supportSpaceVoxels;
    runningVM.supportSpaceVoxels = await runningVM.divideVoxels(
      runningVM.supportSpaceVoxels,
      5
    );
    // runningVM.supportSpaceVoxels = runningVM.divideVoxels(
    //   runningVM.supportSpaceVoxels,
    //   1.1
    // );
    console.log("divided success");
  } else console.error("divided false");

  findBranchNode(runningVM.originSupportSpaceVoxels);
  console.log(
    "runningVM.OriginSupportSpaceVoxels",
    runningVM.originSupportSpaceVoxels
  );
  // console.log("selectedVoxels after divide", [...new Set(selectedVoxels)]);

  console.warn("divideSupportVoxels finish");
};

hookupRouting.prototype.hideNodeAndVoxel = async function (
  seInput?: SmartElbowManager,
  voxelManagerInput?: VoxelManager
) {
  console.warn("hideNodeAndVoxel start");

  const runningSE = seInput ? seInput : this.globalSE1;
  const runningVM = voxelManagerInput ? voxelManagerInput : this.globalVM;

  // collect index of voxel obj and hide it
  const hideIndexes = [...runningSE.nodeIndexesAll, ...runningVM.voxelIndexes];
  console.log("runningSE.nodeIndexes", runningSE.nodeIndexesAll);
  SE_Module.hideObjInScene(this.viewModel, hideIndexes);

  console.warn("hideNodeAndVoxel finish");
};

hookupRouting.prototype.getEndVoxel2_2 = async function (
  fullAuto: boolean = false,
  inputSE1?: SmartElbowManager,
  inputSE2?: SmartElbowManager,
  equipInput?: HostObject,
  inputSelVoxel?: VoxelNode[],
  inputSObj_1?: PipeFitting[]
) {
  console.warn("GetEndVoxel2_2 start");

  const usedSe2 = inputSE2 ? inputSE2 : this.globalSE2;
  console.log("usedSe2", usedSe2);
  const usedSe1 = inputSE1 ? inputSE1 : this.globalSE1;
  console.log("usedSe1", usedSe1);
  const usedSelVoxel = inputSelVoxel ? inputSelVoxel : this.selectedVoxels;
  console.log("inputSelVoxel", inputSelVoxel);
  console.log("selectedVoxels", this.selectedVoxels);
  console.log("usedSelVoxel", usedSelVoxel);
  const usedSObj_1 = inputSObj_1 ? inputSObj_1 : this.startObjs_1;
  console.log("usedSObj_1", usedSObj_1);

  console.log("usedSe1.connectorProperties !!! ", usedSe1.connectorProperties);
  const se1PathInfo = usedSe1.getInfoForGE();
  console.log("usedSe1PathInfo", [...se1PathInfo]);

  // const propertiesSet = [...new Set(se1Properties)];
  // const propertiesColors: colorRGB[] = propertiesSet.map(() =>
  //   getRandomColor()
  // );
  // const useProperties: string[] = [];
  // const branchingMainPathColor: colorRGB[] = [];
  // const branchingMainPaths: THREE.Vector3[][] = [];

  const branchingMainPaths: mainPath[] = [];
  // just input 1 equip, consider multiple
  const equipObjAll = this.hostObjects.filter(
    (obj) =>
      "Family" in obj.meta &&
      String(obj.meta["Family"]).includes(
        // "Semiconductor equipment_routing test - AP TO CR"
        "Samsung EQ Sample"
      )
  );

  let selectedEquip: HostObject | undefined;
  console.log("equipObjAll", equipObjAll);
  if (!fullAuto) {
    console.log("not fullAuto");
    selectedEquip = equipObjAll.find((equip) => {
      const equipObj = equip as PointObject;
      const equipPt = equipObj.location;
      const testPt = new THREE.Vector3(
        equipPt.origin.x,
        equipPt.origin.y,
        equipPt.origin.z
      );
      return this.inputBoundingBox!.distanceToPoint(testPt) === 0;
    });
  }
  // fullAuto
  else {
    console.log("fullAuto");
    console.log("equipInput", equipInput);
    selectedEquip = equipInput!;
    console.log("selectedEquip", selectedEquip);
  }

  if (!selectedEquip) {
    alert(
      "there is not equipment in user bounding box! Will use the first detected Box"
    );
    selectedEquip = equipObjAll[0];
    if (!selectedEquip) {
      alert("there is no any equipment in input model");

      throw new Error("there is no any equipment in input model");
    }
    // throw new Error("there is not equipment in user bounding box!");
  }

  const tempPt = cloneDeep(selectedEquip.location) as LocationPoint;
  tempPt.origin = tempPt.origin.multiply(100);
  const equip = new equipObject(selectedEquip.id, tempPt, selectedEquip.meta);

  //------------------------------------------------------------
  //------------------------------------------------------------
  //------------------------------------------------------------

  if ("Connectors" in equip.meta) {
    const thisConnectors = equip.meta["Connectors"] as object;
    // get connector key:value
    const equipConnectorsKey = Object.keys(thisConnectors);

    // pair connector
    for (const [i, connectorName] of equipConnectorsKey.entries()) {
      console.warn(`this is the key${i}: `, connectorName);
      // const index = connectorName.indexOf("-");
      // const connectorKey = connectorName.substring(index + 1);

      let isKeyFind = false;
      for (const [voxelIndex, voxel] of usedSelVoxel.entries()) {
        console.log(`this is the ${voxelIndex} voxel`, voxel);
        for (const [k, propInfo] of voxel.branchInfo.assignProps.entries()) {
          console.log(`this is the ${k} property info of Voxel`, propInfo);
          if (connectorName.includes(propInfo.property) && !isKeyFind) {
            console.log("match!");
            // find sPts of branch
            if (k < voxel.branchInfo.assignProps.length) {
              const mainOrder = k;
              console.warn("propertyInfo", propInfo);
              for (let infoI = 0; infoI < propInfo.amount; infoI++) {
                // face X
                if (voxel.branchInfo.aheadDir !== aheadDir.None) {
                  let selectedVoxel = general.findVoxelAndDir(
                    voxel,
                    voxel.dividedChildren,
                    mainOrder,
                    propInfo.branchAmount
                  );
                  console.warn("selectedVoxel", selectedVoxel);
                  propInfo.branchAmount++;
                  // ---------------------------------------------

                  if (selectedVoxel) {
                    console.log("voxel show!!!", voxel);
                    voxel.branchInfo.branchSPts.push(selectedVoxel.location);
                    voxel.branchInfo.propertyOrder.push(propInfo.property);
                    // add main
                    const testMainSPt = selectedVoxel.location;

                    general.setMainPath(
                      testMainSPt,
                      selectedVoxel,
                      voxel,
                      propInfo,
                      branchingMainPaths
                    );
                  }
                  // out of children voxel range
                  else console.error("can not found");
                }
                //
                else {
                  console.error("no dir");
                  console.error(
                    "voxel.branchInfo.aheadDir",
                    voxel.branchInfo.aheadDir
                  );
                }
              }
            }

            voxel.branchInfo.currentBranchAmount++;

            const connectorInfo = thisConnectors[
              connectorName as keyof typeof thisConnectors
            ] as object;

            const connector = getEquipConnector(connectorInfo);

            console.log("connector info", connector);
            console.log("equip.location.origin", equip.location.origin);

            // ePt
            const ePt = new THREE.Vector3(
              equip.location.origin.x + connector.X / 100,
              equip.location.origin.y + connector.Y / 100,
              equip.location.origin.z + connector.Z / 100
            );

            voxel.branchInfo.branchEPts.push(ePt);
            isKeyFind = true;
          } else console.log("not match");
        }
      }
    }

    console.log("paired!!!!", usedSelVoxel);
  }

  console.log("branchingMainPath", branchingMainPaths);
  usedSe2.branchingMainForSE2_2 = branchingMainPaths;

  // -------
  console.log("branchingMainPaths", branchingMainPaths);
  for (const [j, propertySE1] of usedSe1.connectorProperties.entries()) {
    console.log("main property", propertySE1);
    for (const branchingMainPath of branchingMainPaths) {
      console.log("branching main property", branchingMainPath.property);
      if (propertySE1 === branchingMainPath.property) {
        console.log("find match property");
        // y line, move x
        if (
          branchingMainPath.path[1].x.toFixed(3) ===
            branchingMainPath.path[0].x.toFixed(3) &&
          usedSe1.ePts[j] &&
          usedSe1.pathPtsGroup[j][usedSe1.pathPtsGroup[j].length - 1]
        ) {
          if (usedSe1.pathPtsGroup[j]) {
            console.warn("index", j);
            console.warn("move x!!!");
            console.warn("usedSe1.ePts[j] before", cloneDeep(usedSe1.ePts[j]));
            const newPt1 = new THREE.Vector3(
              branchingMainPath.path[0].x,
              usedSe1.pathPtsGroup[j][usedSe1.pathPtsGroup[j].length - 1].y,
              branchingMainPath.path[0].z
            );

            // usedSe1.ePts[j] = newPt1;
            const newEpt = [
              branchingMainPath.path[0],
              branchingMainPath.path[branchingMainPath.path.length - 1],
            ].sort(
              (a, b) =>
                a.distanceTo(usedSe1.ePts[j]) - b.distanceTo(usedSe1.ePts[j])
            )[0];
            usedSe1.ePts[j] = newEpt;
            // usedSe1.pathPts[j][usedSe1.pathPts[j].length - 1] = newPt1;
            // usedSe1.pathPts[j].splice(usedSe1.pathPts[j].length - 1, 1);

            branchingMainPath.path.push(newPt1);
            branchingMainPath.path.sort((a, b) => a.y - b.y);

            console.warn("usedSe1.ePts[j] after", newPt1);
          } else
            console.error(
              "the path is undefined: index:",
              j,
              "usedSe1.pathPts[j]",
              usedSe1.pathPtsGroup[j],
              usedSe1.pathPtsGroup
            );
          break;
        }
        // x line, move y
        else if (
          branchingMainPath.path[1].y.toFixed(3) ===
          branchingMainPath.path[0].y.toFixed(3)
        ) {
          console.warn("index", j);
          console.warn("move y!!!");
          console.warn("usedSe1.ePts[j] before", cloneDeep(usedSe1.ePts[j]));
          if (usedSe1.pathPtsGroup[j]) {
            const newPt1 = new THREE.Vector3(
              usedSe1.pathPtsGroup[j][usedSe1.pathPtsGroup[j].length - 1].x,
              branchingMainPath.path[0].y,
              branchingMainPath.path[0].z
            );

            // usedSe1.ePts[j] = newPt1;
            const newEpt = [
              branchingMainPath.path[0],
              branchingMainPath.path[branchingMainPath.path.length - 1],
            ].sort(
              (a, b) =>
                a.distanceTo(usedSe1.ePts[j]) - b.distanceTo(usedSe1.ePts[j])
            )[0];
            usedSe1.ePts[j] = newEpt;

            // usedSe1.pathPts[j][usedSe1.pathPts[j].length - 1] = newPt1;
            // usedSe1.pathPts[j].splice(usedSe1.pathPts[j].length - 1, 1);
            branchingMainPath.path.push(newPt1);
            branchingMainPath.path.sort((a, b) => a.x - b.x);
            console.warn("usedSe1.ePts[j] after", newPt1);
          } else
            console.error(
              "the path is undefined: index:",
              j,
              "usedSe1.pathPts[j]",
              usedSe1.pathPtsGroup[j],
              usedSe1.pathPtsGroup
            );

          break;
        }
      }
    }
  }
  // --

  // usedSe1.drawPath();
  // TODO check branchingMainPaths (splice)
  console.log("branchingMainPaths print", branchingMainPaths);
  console.log("branchingMainForSE2_2 print", usedSe2.branchingMainForSE2_2);

  for (const pathInfo of branchingMainPaths) {
    drawPolyline(pathInfo.path);
    drawNodeOfPL(pathInfo.path);
  }

  usedSe2.getMainPathSize(usedSObj_1);
  console.warn("GetEndVoxel2_2 finish");
};

hookupRouting.prototype.findPath2 = async function (
  inputSE1?: SmartElbowManager,
  inputSE2?: SmartElbowManager,
  inputSelVoxel?: VoxelNode[],
  inputSPts_2?: THREE.Vector3[],
  inputEPts_2?: THREE.Vector3[],
  inputSObj_2?: PipeFitting[]
) {
  console.warn("findPath2 start");

  const useSObj_2 = inputSObj_2 ? inputSObj_2 : this.startObjs_2;
  const usedSPts_2 = inputSPts_2 ? inputSPts_2 : this.sPts_2;
  const usedEPts_2 = inputEPts_2 ? inputEPts_2 : this.ePts_2;
  const usedSelVoxel = inputSelVoxel ? inputSelVoxel : this.selectedVoxels;

  const useSE1 = inputSE1 ? inputSE1 : this.globalSE1;
  console.log("SE1 in finPath2", useSE1);

  let se1PathInfos = useSE1.getInfoForGE();
  console.log("se1.getInfoForGE()", se1PathInfos);

  const useSE2 = inputSE2 ? inputSE2 : this.globalSE2;
  console.log("SE2 in finPath2", useSE2);

  // console.log("selectedVoxels", selectedVoxels);
  // console.log("[...new Set(selectedVoxels)]", [...new Set(selectedVoxels)]);
  console.log("selectedVoxels", usedSelVoxel);
  console.log("[...new Set(selectedVoxels)]", [...new Set(usedSelVoxel)]);

  for (const voxel of [...new Set(usedSelVoxel)]) {
    for (const [i, sPt] of voxel.branchInfo.branchSPts.entries()) {
      usedSPts_2.push(sPt);
      console.log("usedSPts_2", usedSPts_2);
      console.log("usedSPts_2 length", usedSPts_2.length);

      const thisProperty = voxel.branchInfo.propertyOrder[i];
      console.log("se1PathInfos", se1PathInfos);
      console.log("thisProperty", thisProperty);
      const chooseObj = se1PathInfos.find((info) =>
        thisProperty.includes(info.property)
      )?.connector! as PipeFitting;
      if (chooseObj) {
        useSObj_2.push(chooseObj);
        console.warn("add new obj", chooseObj);
      }
      // temp
      else {
        useSObj_2.push(se1PathInfos[0].connector! as PipeFitting);
        console.warn("temp use random obj here!", se1PathInfos[0].connector!);
      }

      console.log("chooseObj", chooseObj);

      // new Point(new Vec3(sPt.x, sPt.y, sPt.z), {
      //   r: 1,
      //   g: 0,
      //   b: 0,
      // });
    }
    for (const ePt of voxel.branchInfo.branchEPts) {
      usedEPts_2.push(ePt);
      new Point(new Vec3(ePt.x, ePt.y, ePt.z)), { r: 1, g: 1, b: 0 };
    }
  }

  console.log(`find path with sPts: `, usedSPts_2);
  console.log(`find path with ePts: `, usedEPts_2);
  const timer2 = measureExecutionTime();
  timer2.next();
  // console.log("sPts at find path", sPts);
  // console.log("ePts at find path", ePts);

  if (this.globalVM.voxelNodes) {
    console.log("useSObj_2", useSObj_2);
    await useSE2.run(usedSPts_2, usedEPts_2, true);
    console.log("se2.addConnector");
    console.log("useSObj_2", useSObj_2);
    useSE2.addConnector(useSObj_2);
  }

  console.warn("SE Algorithm");
  timer2.next();

  // modify path of se2 at equip connector
  const color: SE_Module.colorRGB = { r: 1, g: 1, b: 0 };
  const paths = useSE2.pathPtsGroup;

  for (const path of paths) {
    for (let pathIndex = path.length - 2; pathIndex >= 1; pathIndex--) {
      const lastPt = path[pathIndex - 1];
      const thisPt = path[pathIndex];
      const nextPt = path[pathIndex + 1];
      // console.log("path.length before", path.length);
      if (SE_Module.areCollinear(lastPt, thisPt, nextPt)) {
        path.splice(pathIndex, 1);
      }
    }
  }

  // modify path to adapt final connector

  //#region new method
  console.log("paths", paths);
  console.log("useSE2.pathPtsGroup", useSE2.pathPtsGroup);
  for (const [iter, path] of paths.entries()) {
    console.log(`this is ${iter} path`);
    let modifyIndex = -1;

    const reversePath = [...path].reverse();
    for (const [index, pt] of reversePath.entries()) {
      if (index === reversePath.length - 1) continue;
      const nextPt = reversePath[index + 1];
      // console.log("pt", pt);
      // console.log("nextPt", nextPt);
      if (pt.z.toFixed(3) === nextPt.z.toFixed(3)) {
        console.log("match! ");
        modifyIndex = path.indexOf(pt);
        break;
      }
    }
    if (modifyIndex === -1) console.error("no modifyIndex");

    console.log("modifyIndex", modifyIndex);
    console.log("path", [...path]);

    for (let i = path.length - 1; i >= 0; i--) {
      if (i > modifyIndex && i !== path.length - 1) {
        console.log("final index", path.length - 1);
        console.log("delete index", i, path[i]);
        path.splice(i, 1);
        i--;
      }

      if (i === modifyIndex) {
        const finalIndex = path.length - 1;
        console.log("path now", [...path]);
        console.log(`modify index ${i}, ${path[i]}`);
        path[i] = new THREE.Vector3(
          path[finalIndex].x,
          path[finalIndex].y,
          path[i].z
        );
      }

      if (i === modifyIndex - 1) {
        const lastPt = path[modifyIndex - 1];
        const thisPt = path[modifyIndex];
        const lastLastPt = path[modifyIndex - 2];

        if (Math.abs(lastPt.x - thisPt.x) > Math.abs(lastPt.y - thisPt.y)) {
          path[modifyIndex - 1] = new THREE.Vector3(
            path[modifyIndex - 1].x,
            path[modifyIndex].y,
            path[modifyIndex - 1].z
          );

          if (!lastLastPt) continue;
          if (lastLastPt.z.toFixed(3) !== lastPt.z.toFixed(3)) {
            path[modifyIndex - 2] = new THREE.Vector3(
              path[modifyIndex - 1].x,
              path[modifyIndex - 1].y,
              path[modifyIndex - 2].z
            );
          }
        }

        if (Math.abs(lastPt.x - thisPt.x) < Math.abs(lastPt.y - thisPt.y)) {
          path[modifyIndex - 1] = new THREE.Vector3(
            thisPt.x,
            lastPt.y,
            lastPt.z
          );
          if (!lastLastPt) continue;
          if (lastLastPt.z.toFixed(3) !== lastPt.z.toFixed(3)) {
            path[modifyIndex - 2] = new THREE.Vector3(
              path[modifyIndex - 1].x,
              path[modifyIndex - 1].y,
              path[modifyIndex - 2].z
            );
          }
        }
      }
    }
  }
  //#endregion

  //#region old method
  // for (const path of paths) {
  //   const finalPt = path[path.length - 1];
  //   const last2Pt = path[path.length - 2];
  //   const newLast3Pt = new THREE.Vector3(finalPt.x, last2Pt.y, last2Pt.z);
  //   const newLast2Pt = new THREE.Vector3(finalPt.x, finalPt.y, last2Pt.z);

  //   path.splice(path.length - 1, 0, newLast3Pt, newLast2Pt);

  //   // cull dull
  //   const newLast3 = path[path.length - 3];
  //   const newLast4 = path[path.length - 4];
  //   const newLast5 = path[path.length - 5];
  //   if (
  //     (newLast3.x.toFixed(3) === newLast4.x.toFixed(3) &&
  //       newLast4.x.toFixed(3) === newLast5.x.toFixed(3) &&
  //       newLast4.z.toFixed(3) === newLast5.z.toFixed(3) &&
  //       newLast3.z.toFixed(3) === newLast5.z.toFixed(3)) ||
  //     (newLast3.y.toFixed(3) === newLast4.y.toFixed(3) &&
  //       newLast4.y.toFixed(3) === newLast5.y.toFixed(3) &&
  //       newLast4.z.toFixed(3) === newLast5.z.toFixed(3) &&
  //       newLast3.z.toFixed(3) === newLast5.z.toFixed(3))
  //   ) {
  //     path.splice(path.length - 4, 1);
  //   }
  // }
  //#endregion

  useSE2.drawPath();
  // dummy fitting and radius

  // const se2paths = se2.paths;
  // console.warn("se2paths", se2paths);
  // const se2Connectors = se2.connectors;
  // console.warn("se2Connectors", se2Connectors);
  // const se2PathInfo = se2.getInfoForGE();
  // console.warn("se2PathInfo", se2PathInfo);
  console.warn("findPath2 finished");
};

hookupRouting.prototype.setupGE = async function (
  inputGE?: GEManager,
  inputSE1?: SmartElbowManager,
  inputSObj_1?: PipeFitting[]
) {
  const usedGE = inputGE ? inputGE : this.globalGE;
  const usedSE_1 = inputSE1 ? inputSE1 : this.globalSE1;
  const usedSObj_1 = inputSObj_1 ? inputSObj_1 : this.startObjs_1;

  // setGEManager(new GEManager(viewModel.scene));
  if (!this.isGESetup) {
    console.log("se.paths", usedSE_1.paths);

    const infoForGE = usedSE_1.getInfoForGE();
    console.log("infoForGE", infoForGE);

    usedGE?.Setup(infoForGE, usedSObj_1);
    gEManager = usedGE;

    // console.log("Setup");
    this.isGESetup = true;
  }

  if (this.isGESetup) {
    console.log("isSetup");
    console.log("FinalPath", usedGE?.Step());
  }

  console.log("managerGE", usedGE);
};

hookupRouting.prototype.runGE = async function (
  inputGE?: GEManager,
  draw: boolean = false,
  inputStartObjs_1?: PipeFitting[],
  inputSE2?: SmartElbowManager
) {
  const usedGEManager = inputGE ? inputGE : this.globalGE;
  console.warn("start run GE");

  let t = 0;
  const intervalId = setInterval(() => {
    // Code to run on every tick
    if (t < 5) {
      console.log("iter: ", t++);
      const msg = usedGEManager.Step();
      console.log("FinalPath", msg);
    }
    if (t === 5) {
      console.log("usedGEManager after running", usedGEManager);
      t++;
      // dispatch(APP_SET_ISLOADING(false));
      console.warn("finish run GE");
      if (draw) this.drawRoutePipe(inputStartObjs_1!, usedGEManager, inputSE2!);
    }
  }, 0); // Interval in milliseconds

  // isGEFinish = true;

  return () => {
    // Cleanup function to clear the interval when the component unmounts
    clearInterval(intervalId);
  };
};

hookupRouting.prototype.drawRoutePipe = async function (
  inputStartObjs_1?: PipeFitting[],
  inputGE?: GEManager,
  inputSE2?: SmartElbowManager
) {
  console.warn("start drawRoutePipe");
  const useGE = inputGE ? inputGE : this.globalGE;
  const useSE2 = inputSE2 ? inputSE2 : this.globalSE2;

  const route2_1FinalPathGE = useGE.ExportFinalPath(); //Main
  const route2_2FinalPathSE = useSE2.exportFinalPathBranch(); //Branch
  const useStartObjs_1 = inputStartObjs_1 ? inputStartObjs_1 : this.startObjs_1;
  const route2_2FinalPathSEMain = useSE2.exportFinalPathMain(useStartObjs_1); // Sub

  await drawDebugPipe(route2_1FinalPathGE);

  await drawDebugPipe(
    route2_2FinalPathSEMain,
    new THREE.MeshStandardMaterial({
      color: 0xffff00,
    })
  );

  await drawDebugPipe(
    route2_2FinalPathSE,
    new THREE.MeshStandardMaterial({
      color: 0xff9900,
    })
  );

  console.warn("finish drawRoutePipe");
};

hookupRouting.prototype.voxelize = async function (
  auto: boolean = false,
  inputBoundingBox?: THREE.Box3,
  inputManager?: VoxelManager
) {
  console.warn("voxelize begin");
  const useVM = inputManager ? inputManager : this.globalVM;
  const usedBoundingBox = inputBoundingBox
    ? inputBoundingBox
    : this.inputBoundingBox!;

  const timer = measureExecutionTime();
  timer.next();
  // Use user input bounding box
  if (!auto)
    useVM.run(5, 3); // TODO: should accessible from UI
  // auto gen bounding box
  else {
    if (!inputManager)
      useVM.run(5, 3, true, usedBoundingBox); // TODO: should accessible from UI
    else inputManager.run(5, 3, true, usedBoundingBox); // TODO: should accessible from UI
  }
  timer.next();

  let voxelInfo;
  if (!inputManager) voxelInfo = useVM.GetVoxelsInfo();
  else voxelInfo = inputManager.GetVoxelsInfo();

  console.log("voxelInfo", voxelInfo);
  // useVM.showVoxels();
  // useVM.showObstacleBoxes();
  console.warn("voxelize finish");

  // post processing to prevent the no ok object
  useVM.voxelNodes = useVM.voxelNodes.filter(
    (voxel) =>
      (usedBoundingBox.containsBox(voxel.box) ||
        usedBoundingBox.intersectsBox(voxel.box)) &&
      voxel.box.min.z > usedBoundingBox.min.z
  );
};

hookupRouting.prototype.reRunGE = async function () {
  if (this.globalGE) {
    this.runGE();
  }
  // const boxMesh = ReduxStore.getState().BoundBoxSlice.boundBox;
  // const boundingBox = new THREE.Box3().setFromObject(boxMesh);
  // console.log("boundingBox", boundingBox);
  // console.log(
  //   "is ok to use?",
  //   isFinite(boundingBox.max.x) &&
  //   isFinite(boundingBox.max.y) &&
  //   isFinite(boundingBox.max.z)
  // );
};

hookupRouting.prototype.voxelize_waffle = async function (
  auto: boolean = false,
  inputBoundingBox?: THREE.Box3,
  inputManager?: VoxelManager
) {
  console.warn("voxelize_waffle begin");
  const useVM = inputManager ? inputManager : this.globalVM;
  const usedBoundingBox = inputBoundingBox
    ? inputBoundingBox
    : this.inputBoundingBox!;

  const timer = measureExecutionTime();
  timer.next();
  // Use user input bounding box
  if (!auto)
    useVM.run_waffle(1, 3); // TODO: should accessible from UI
  // auto gen bounding box
  else {
    if (!inputManager) useVM.run_waffle(1, 3, true, usedBoundingBox);
    // TODO: should accessible from UI
    else inputManager.run_waffle(1, 3, true, usedBoundingBox); // TODO: should accessible from UI
  }
  timer.next();

  let voxelInfo;
  if (!inputManager) voxelInfo = useVM.GetVoxelsInfo();
  else voxelInfo = inputManager.GetVoxelsInfo();

  console.log("voxelInfo", voxelInfo);
  // useVM.showVoxels();
  // useVM.showObstacleBoxes();
  console.warn("voxelize finish");

  // post processing to prevent the no ok object
  useVM.voxelNodes = useVM.voxelNodes.filter(
    (voxel) =>
      (usedBoundingBox.containsBox(voxel.box) ||
        usedBoundingBox.intersectsBox(voxel.box)) &&
      voxel.box.min.z > usedBoundingBox.min.z
  );
};
//#endregion

hookupRouting.prototype.voxelizeSpaces_simple = async function (
  iter: number,
  minSize: number,
  obstacles: HostObject[],
  space: THREE.Box3,
  voxelManager: VoxelManager
) {
  console.warn("voxelize begin");
  const usedBoundingBox = space;

  const timer = measureExecutionTime();
  timer.next();
  voxelManager.voxelizeSpacesByObstacle(iter, minSize, obstacles, [
    usedBoundingBox,
  ]);
  timer.next();
};

hookupRouting.prototype.voxelizeSpaces = async function (
  iter: number,
  minSize: number,
  hostObjects: HostObject[],
  space: THREE.Box3,
  voxelManager: VoxelManager,
  boundingBox: THREE.Box3
): Promise<THREE.Box3> {
  hostObjects.filter((obj) => {
    if ("Family and Type" in obj.meta) {
      if (
        String(obj.meta["Family and Type"]).includes("H: Q-41D_Modular, ST'L")
      ) {
        return false;
      } else return true;
    }
  });

  // 1. separate input objects
  const waffleObjs: HostObject[] = [];
  const spFloorObj: HostObject[] = [];
  const [
    supBeamObjs,
    normalObjs,
    floorObjs,
    supportObjs,
    tileObjs,
    hangObjsOrigin,
  ] = voxelManager.SeparateObjs(hostObjects, waffleObjs, spFloorObj);

  console.log("waffles", waffleObjs);
  console.log("spFloor", spFloorObj);

  // 2. create bounding boxes
  const [waffleRangeZ, waffleSpaceBox] = getRangeZAndSpaceBox(
    waffleObjs,
    boundingBox
  );

  const [spFloorRangeZ, spFloorSpaceBox] = getRangeZAndSpaceBox(
    spFloorObj,
    boundingBox
  );

  const [supportRangeZ, supportSpaceBox] = getRangeZAndSpaceBox(
    supportObjs,
    boundingBox
  );

  // 3. split ranges and create boxes
  const subRanges = [waffleRangeZ, spFloorRangeZ, supportRangeZ];
  const boundingBoxRange: Range = {
    min: boundingBox.min.z,
    max: boundingBox.max.z,
  };
  const splitRanges = splitRangeBySubRanges(boundingBoxRange, subRanges);

  const finalSpaces: THREE.Box3[] = [];

  for (const range of splitRanges) {
    const usedBox = cloneDeep(boundingBox);
    usedBox.min.z = range.min;
    usedBox.max.z = range.max;
    finalSpaces.push(usedBox);
  }

  // test render
  // finalSpaces.map((box) => {
  //   new DebugBoxByMinMax(
  //     this.viewModel.scene,
  //     box.min,
  //     box.max,
  //     new THREE.Color(0x00ffff)
  //   );
  // });

  // 4. create waffleSpaceBox, spFloorSpaceBox,supportSpaceBox by hard code

  // 4-1 create waffles and waffleRestSpace
  const waffles = waffleObjs.map((waffleObj) => {
    return new GridObj(
      waffleObj.id,
      waffleObj.location as LocationPoint,
      waffleObj.meta
    );
  });
  // filter cut waffles
  const filteredWaffles = waffles.filter((waffle) => {
    return boundingBox.containsPoint(waffle.centralPt);
  });
  const waffleRestSpace = filteredWaffles
    .map((waffle) => {
      return waffle.restSpaces;
    })
    .flat();

  //#region debug show
  // for (const waffle of filteredWaffles) {
  //   for (const space of waffle.restSpaces) {
  //     new DebugBoxByMinMax(
  //       this.viewModel.scene,
  //       space.min,
  //       space.max,
  //       new THREE.Color(0xff0000)
  //     );
  //   }
  //   const pt = waffle.location as LocationPoint;
  //   new Point(
  //     new Vec3(pt.origin.x * 100, pt.origin.y * 100, pt.origin.z * 100),
  //     new THREE.Color(0xff0000)
  //   );
  // }
  //#endregion

  // 4-2 create spFloorSpaceBox and spFloorRestSpace
  const spFloors = spFloorObj.map((waffleObj) => {
    return new GridObj(
      waffleObj.id,
      waffleObj.location as LocationPoint,
      waffleObj.meta
    );
  });
  const filteredSpFloor = spFloors.filter((waffle) => {
    return boundingBox.containsPoint(waffle.centralPt);
  });
  const spFloorsRestSpace = filteredSpFloor
    .map((waffle) => {
      return waffle.restSpaces;
    })
    .flat();

  //#region debug show
  // for (const spFloor of filteredSpFloor) {
  //   for (const space of spFloor.restSpaces) {
  //     new DebugBoxByMinMax(
  //       this.viewModel.scene,
  //       space.min,
  //       space.max,
  //       new THREE.Color(0xff0000)
  //     );
  //   }
  //   const pt = spFloor.location as LocationPoint;
  //   new Point(
  //     new Vec3(pt.origin.x * 100, pt.origin.y * 100, pt.origin.z * 100),
  //     new THREE.Color(0xff0000)
  //   );
  // }
  //#endregion

  // 4-3 create supportSpaceBox and supportRestSpace
  const supRestSpace = dividedSupportSpace(supportObjs, supportSpaceBox);
  // console.log("supRestBox", supRestSpace);

  // 4-4 create supportSpaceBox and supportRestSpace
  const hangObjs = hangObjsOrigin.map(
    (obj) => new HangObj(obj.id, obj.location as LocationPoint, obj.meta)
  );

  const allHangBoxes: THREE.Box3[] = [];
  hangObjs.map((hangObj) => {
    // ---debug render---
    // const pt = hangObj.location as LocationPoint;
    // new Point(pt.origin.multiply(100), { r: 1, g: 0, b: 0 });
    // const pt2 = new THREE.Vector3();
    // hangObj.boundingBox.getCenter(pt2);
    // new Point(pt2, { r: 0, g: 1, b: 0 });
    hangObj.obstacleBoxes.map((box) => {
      new DebugBoxByMinMax(
        this.viewModel.scene,
        box.min,
        box.max,
        new THREE.Color(0xffffff)
      );
    });
    hangObj.obstacleBoxes.map((box) => allHangBoxes.push(box));
  });

  // 5. collect space
  // finalSpaces.push(waffleSpaceBox, spFloorSpaceBox, supportSpaceBox);
  finalSpaces.push(...waffleRestSpace, ...spFloorsRestSpace, ...supRestSpace);

  const supSpaceHeight = supRestSpace[0].max.z;
  const spFloorSpaceHeight = spFloorsRestSpace[0].min.z;

  // cull upper space
  for (let i = finalSpaces.length - 1; i > 0; i--) {
    if (finalSpaces[i].max.z > supSpaceHeight) {
      finalSpaces.splice(i, 1);
    }
  }
  // cull below space
  for (let i = finalSpaces.length - 1; i > 0; i--) {
    if (finalSpaces[i].min.z < spFloorSpaceHeight) {
      finalSpaces.splice(i, 1);
    }
  }

  // 6. voxelize by obstacle
  console.warn("voxelize begin");
  const usedBoundingBox = space;

  const timer = measureExecutionTime();
  timer.next();
  // voxelManager.voxelizeSpacesByObstacle(iter, minSize, obstacles, [
  //   usedBoundingBox,
  // ]);
  voxelManager.voxelizeSpacesByObstacle(
    iter,
    minSize,
    normalObjs,
    [...finalSpaces],
    allHangBoxes
  );
  timer.next();

  const supSpaceMin = supRestSpace[0].min.z;
  voxelManager.voxelNodes.map((node) => {
    if (node.box.max.z > supSpaceMin)
      voxelManager.supportSpaceVoxels.push(node);
  });

  return supportSpaceBox;
};

hookupRouting.prototype.modifyPath = async function (
  usedSE: SmartElbowManager,
  selectedConnector: equipConnector[]
) {
  const paths = usedSE.pathPtsGroup;

  // cull collinear point
  for (const path of paths) {
    for (let pathIndex = path.length - 2; pathIndex >= 1; pathIndex--) {
      const lastPt = path[pathIndex - 1];
      const thisPt = path[pathIndex];
      const nextPt = path[pathIndex + 1];
      // console.log("path.length before", path.length);
      // if (pathIndex === 2) continue;
      if (SE_Module.areCollinear(lastPt, thisPt, nextPt)) {
        path.splice(pathIndex, 1);
      }
    }
  }

  console.log("paths", paths);
  console.log("useSE2.pathPtsGroup", usedSE.pathPtsGroup);

  // modify path
  for (const [iter, path] of paths.entries()) {
    console.log(`this is ${iter} path`);
    let modifyIndex = -1;

    const reversePath = [...path].reverse();
    for (const [index, pt] of reversePath.entries()) {
      if (index === reversePath.length - 1) continue;
      const nextPt = reversePath[index + 1];
      // console.log("pt", pt);
      // console.log("nextPt", nextPt);
      if (pt.z.toFixed(3) === nextPt.z.toFixed(3)) {
        console.log("match! ");
        modifyIndex = path.indexOf(pt);
        break;
      }
    }

    if (modifyIndex === -1) console.error("no modifyIndex");

    console.log("modifyIndex", modifyIndex);
    console.log("path", [...path]);

    for (let i = path.length - 1; i >= 0; i--) {
      if (i > modifyIndex && i !== path.length - 1) {
        console.log("final index", path.length - 1);
        console.log("delete index", i, path[i]);
        path.splice(i, 1);
        i--;
      }

      if (i === modifyIndex) {
        const finalIndex = path.length - 1;
        console.log("path now", [...path]);
        console.log(`modify index ${i}, ${path[i]}`);
        path[i] = new THREE.Vector3(
          path[finalIndex].x,
          path[finalIndex].y,
          path[i].z
        );
      }

      if (i === modifyIndex - 1) {
        const lastPt = path[modifyIndex - 1];
        const thisPt = path[modifyIndex];
        const lastLastPt = path[modifyIndex - 2];

        if (Math.abs(lastPt.x - thisPt.x) > Math.abs(lastPt.y - thisPt.y)) {
          path[modifyIndex - 1] = new THREE.Vector3(
            path[modifyIndex - 1].x,
            path[modifyIndex].y,
            path[modifyIndex - 1].z
          );

          if (!lastLastPt) continue;
          if (lastLastPt.z.toFixed(3) !== lastPt.z.toFixed(3)) {
            path[modifyIndex - 2] = new THREE.Vector3(
              path[modifyIndex - 1].x,
              path[modifyIndex - 1].y,
              path[modifyIndex - 2].z
            );
          }
        }

        if (Math.abs(lastPt.x - thisPt.x) < Math.abs(lastPt.y - thisPt.y)) {
          path[modifyIndex - 1] = new THREE.Vector3(
            thisPt.x,
            lastPt.y,
            lastPt.z
          );
          if (!lastLastPt) continue;
          if (lastLastPt.z.toFixed(3) !== lastPt.z.toFixed(3)) {
            path[modifyIndex - 2] = new THREE.Vector3(
              path[modifyIndex - 1].x,
              path[modifyIndex - 1].y,
              path[modifyIndex - 2].z
            );
          }
        }
      }
    }
  }

  // add point from beginning
  for (const path of paths) {
    const sPt = path[0];
    const pt2 = path[1];
    const newPt1 = new THREE.Vector3(sPt.x, sPt.y, pt2.z);
    const newPt2 = new THREE.Vector3(sPt.x, pt2.y, pt2.z);
    path.splice(1, 0, newPt1, newPt2);
  }

  // for the horizontal connector, add the original point back
  for (const [i, path] of paths.entries()) {
    if (!selectedConnector[i].isVertical)
      path.push(selectedConnector[i].location);
  }
};

hookupRouting.prototype.setArrangeBranchPipe = async function (
  startPosition: THREE.Vector3,
  supportVoxels: VoxelNode[]
) {
  console.log("start setArrangeBranchPipe!");
  const branchPipes: branchPipe[] = [];
  //#region  set dummy data
  // 3 X PA
  const bP_PA: branchPipe = {
    property: "PA",
    size: 0.25,
    offset: 0.4,
    path: [],
    equipConnectorAmount: 0,
  };
  for (let i = 0; i < 3; i++) branchPipes.push(cloneDeep(bP_PA));

  // 1 X GN2
  const bP_GN2: branchPipe = {
    property: "GN2",
    size: 0.25,
    offset: 0.4,
    path: [],
    equipConnectorAmount: 0,
  };
  branchPipes.push(cloneDeep(bP_GN2));

  // 1 X PV
  const bP_PV: branchPipe = {
    property: "PV",
    size: 0.13,
    offset: 0.2,
    path: [],
    equipConnectorAmount: 0,
  };
  branchPipes.push(cloneDeep(bP_PV));

  // 7 X PN2
  const bP_PN2: branchPipe = {
    property: "PN2",
    size: 0.13,
    offset: 0.2,
    path: [],
    equipConnectorAmount: 0,
  };
  for (let i = 0; i < 7; i++) branchPipes.push(cloneDeep(bP_PN2));

  // 5 X AR
  const bP_AR: branchPipe = {
    property: "AR",
    size: 0.13,
    offset: 0.2,
    path: [],
    equipConnectorAmount: 0,
  };
  for (let i = 0; i < 5; i++) branchPipes.push(cloneDeep(bP_AR));

  // 1 X O2
  const bP_O2: branchPipe = {
    property: "O2",
    size: 0.13,
    offset: 0.2,
    path: [],
    equipConnectorAmount: 0,
  };
  branchPipes.push(cloneDeep(bP_O2));
  //#endregion

  console.log("branchPipes pushed: ", branchPipes);

  // --------------------------------------------
  // selected the parent voxels
  const parentVoxels: VoxelNode[] = [];
  supportVoxels.map((v) => {
    if (!parentVoxels.includes(v.dividedParentNode!))
      parentVoxels.push(v.dividedParentNode!);
  });

  // filter the voxels by point
  const filterVoxels = [...parentVoxels].filter(
    (v) => v.box.min.x > startPosition.x
  );
  // this.globalVM.showVoxels(filterVoxels);

  // group the voxels by X coordinate to make row groups
  const voxelGroups: VoxelNode[][] = [];
  filterVoxels.map((voxel) => {
    let insideGroup = false;
    for (const [index, group] of voxelGroups.entries()) {
      if (group[0].box.min.x.toFixed(3) === voxel.box.min.x.toFixed(3)) {
        voxelGroups[index].push(voxel);
        insideGroup = true;
      }
    }
    if (!insideGroup) voxelGroups.push([voxel]);
  });

  console.log("voxelGroups", voxelGroups);
  // get X range of the rows
  const xRanges = voxelGroups.map((group) => {
    const minX = group[0].box.min.x;
    const maxX = group[0].box.max.x;
    return { min: minX, max: maxX };
  });
  console.log("xRanges", xRanges);

  // --------------------------------------------

  //get the y and z position
  const boundingBox = new THREE.Box3();
  voxelGroups[0].map((v) => boundingBox.union(v.box));
  const minY = boundingBox.min.y;
  const maxY = boundingBox.max.y;
  const minZ = boundingBox.min.z;

  // arrange the pipe in the range
  for (const branchPipe of branchPipes) {
    const pipeOccupied = branchPipe.size + branchPipe.offset;
    let isArranged = false;

    for (const [index, xRange] of xRanges.entries()) {
      if (isArranged) break;

      const xRest = xRange.max - xRange.min;
      if (xRest > pipeOccupied) {
        const sPt = new THREE.Vector3(
          xRange.min + branchPipe.size / 2,
          minY,
          minZ + branchPipe.size / 2
        );
        const ePt = new THREE.Vector3(
          xRange.min + branchPipe.size / 2,
          maxY,
          minZ + branchPipe.size / 2
        );

        // Set path Pts
        branchPipe.path = [sPt, ePt];

        xRange.min += pipeOccupied;
        isArranged = true;
      }
    }
  }
  console.log("branchPipes arranged: ", branchPipes);

  // drawPipe
  branchPipes.map((bP) => {
    // drawPolyline(bP.path!, 0xff0000);
    const pipe = new Cylinder(
      bP.size / 2,
      general.Vector3ToVec3(bP.path[0]),
      general.Vector3ToVec3(bP.path[1]),
      new THREE.MeshStandardMaterial({ color: 0xf00ff00 })
    );
    bP.mesh = pipe.mesh;
  });

  return branchPipes;
};

export interface branchPipe {
  property: string;
  size: number;
  offset: number;
  equipConnectorAmount: number;
  path: THREE.Vector3[];
  mesh?: THREE.Mesh;
  connector?: equipConnector[];
}
// ---------------------------
// ---------------------------
// ---------------------------

function dividedSupportSpace(
  supportObjs: HostObject[],
  originSpace: THREE.Box3
) {
  // group supportObj
  const supArray: HostObject[][] = [];
  for (const obj of supportObjs) {
    if (supArray.length === 0) {
      supArray.push([obj]);
      continue;
    }
    const objY = general.getObjLocation(obj).y;
    let isArranged = false;
    for (const row of supArray) {
      const rowY = general.getObjLocation(row[0]).y;
      if (parseFloat(objY.toFixed(3)) === parseFloat(rowY.toFixed(3))) {
        row.push(obj);
        isArranged = true;
        break;
      }
    }
    if (!isArranged) supArray.push([obj]);
  }

  // sort supportObj
  const sortedArray: HostObject[][] = [];

  supArray
    .sort((a, b) => {
      const aX = general.getObjLocation(a[0]).y;
      const bX = general.getObjLocation(b[0]).y;
      return parseFloat(aX.toFixed(3)) - parseFloat(bX.toFixed(3));
    })
    .map((arr) => {
      arr.sort((a, b) => {
        const aY = general.getObjLocation(a).x;
        const bY = general.getObjLocation(b).x;
        return parseFloat(aY.toFixed(3)) - parseFloat(bY.toFixed(3));
      });
      sortedArray.push(arr);
    });

  console.log("supArray", supArray);
  console.log("sortedArray", sortedArray);

  // create bounding box of support object
  const supBoxArray = sortedArray.map((row) => {
    const rowBox = row.map((obj) => {
      const boundingBox = new THREE.Box3();
      for (const renderObj of obj.renderObjects) {
        if (renderObj.object3d instanceof THREE.Mesh)
          boundingBox.expandByObject(renderObj.object3d);
      }
      return boundingBox;
    });
    return rowBox;
  });

  // create box of the rest of support space
  const supRestSpace: THREE.Box3[] = [];

  for (let rowIndex = 0; rowIndex < supBoxArray.length - 1; rowIndex++) {
    const row = supBoxArray[rowIndex];
    const nextRow = supBoxArray[rowIndex + 1];
    for (let boxIndex = 0; boxIndex < row.length - 1; boxIndex++) {
      const box = row[boxIndex];
      const nextIndex = boxIndex + 1;
      const usedBox = nextRow[nextIndex];

      const restBoxMin = new THREE.Vector3(
        box.max.x,
        box.max.y,
        originSpace.min.z
      );
      const restBoxMax = new THREE.Vector3(
        usedBox.min.x,
        usedBox.min.y,
        originSpace.max.z
      );
      const restSpaceBox = new THREE.Box3(restBoxMin, restBoxMax);

      supRestSpace.push(restSpaceBox);
    }
  }

  //   // find neighbor
  //  for(const box of supRestSpace){
  //   for(const comparedBox of supRestSpace){
  //     if(box === comparedBox) continue;
  //     const isNeighbor = areBoxesNeighbors(box, comparedBox, true);

  //   }
  //  }

  return supRestSpace;
}

export async function arrangeRows(voxelNodes: VoxelNode[]) {
  const rows: VoxelNode[][] = [];
  const rowPos: string[] = [];
  for (const voxel of voxelNodes) {
    // row exist, add to row
    if (rowPos.includes(voxel.location.x.toFixed(3))) {
      const index = rowPos.indexOf(voxel.location.x.toFixed(3));
      rows[index].push(voxel);
      continue;
    }

    // not contains row, add new
    rows.push([voxel]);
    rowPos.push(voxel.location.x.toFixed(3));
  }

  const rowRanges = rows.map((row) => {
    return {
      Min: row[0].box.min.x,
      Max: row[0].box.max.x,
    };
  });
  console.log("rows", rows);
  console.log("rowPos", rowPos);
  console.log("rowRanges", rowRanges);

  return {
    rows,
    rowPos,
    rowRanges,
  };
}

export async function getUniqueFittingByIndex(
  fittings: PipeFitting[],
  localSPts_1: THREE.Vector3[],
  selIndex: number
): Promise<[PipeFitting[], THREE.Vector3[]]> {
  const fittingGroups: PipeFitting[][] = [];
  const sPtGroups: THREE.Vector3[][] = [];

  const existProps: string[] = [];
  for (const [i, fitting] of fittings.entries()) {
    const property = getFittingProperty(fitting);
    // not exist, create new group
    if (!existProps.includes(property)) {
      fittingGroups.push([fitting]);
      existProps.push(property);
      sPtGroups.push([localSPts_1[i]]);
    }
    // exist, push to group
    else {
      const index = existProps.indexOf(property);
      fittingGroups[index].push(fitting);
      sPtGroups[index].push(localSPts_1[i]);
    }
  }

  // fittingGroups.sort((a, b) =>
  //   getFittingProperty(a[0])
  //     .toLowerCase()
  //     .localeCompare(getFittingProperty(b[0]).toLowerCase())
  // );

  const indexedFittingGroups = fittingGroups.map((group, index) => ({
    group,
    index,
  }));

  // sort, keep index
  indexedFittingGroups.sort((a, b) =>
    getFittingProperty(a.group[0])
      .toLowerCase()
      .localeCompare(getFittingProperty(b.group[0]).toLowerCase())
  );

  // get sorted fittingGroups
  const sortedFittingGroups = indexedFittingGroups.map((item) => item.group);
  // update labels to suit new order
  const sortedLabels = indexedFittingGroups.map((item) => item.index);
  const sortedSPts = sortedLabels.map((index) => sPtGroups[index]);

  // console.log("sortedFittingGroups", sortedFittingGroups);
  // console.log("sortedLabels", sortedLabels);
  // console.log("sortedSPts", sortedSPts);
  const selectedFittings = sortedFittingGroups.map((group) => group[selIndex]);
  const selectedSPts = sortedSPts.map((group) => group[selIndex]);

  return [selectedFittings, selectedSPts];
}

export function getFittingPt(fittingObj: PipeFitting) {
  let newSPt = general.vec3ToVector3(fittingObj.location.origin);
  if ("Connectors" in fittingObj.meta) {
    const connectors = fittingObj.meta["Connectors"] as Connector[];
    const usedConnector = connectors.sort((a, b) => a.Z - b.Z)[
      connectors.length - 1
    ];
    const usedPt = new THREE.Vector3(
      usedConnector.X,
      usedConnector.Y,
      usedConnector.Z
    );
    newSPt = newSPt.add(usedPt.divideScalar(100));
  }

  return newSPt;
}

export function getFittingProperty(fittingObj: PipeFitting) {
  if ("S5_Utility" in fittingObj.meta)
    return fittingObj.meta["S5_Utility"] as string;
  else return "None";
}

export function getFittingSize(fittingObj: PipeFitting) {
  if ("Size" in fittingObj.meta)
    return parseFloat(fittingObj.meta["Size"] as string);
  else return 0;
}

export interface arrangedPipe {
  endPts: THREE.Vector3[];
  size: number;
  meta: object;
  rowIndex: number;
}

export async function arrangeBranches(
  selectedGridSpace: VoxelNode[],
  uniqueFitting: PipeFitting[],
  boundingBox: THREE.Box3
) {
  const dummySpace = 0.1;
  const height = selectedGridSpace[0].box.min.z;

  const rowInfo = await arrangeRows(selectedGridSpace);
  console.log("rowInfo", rowInfo);

  const fittingSizes = uniqueFitting.map(
    (fitting) => getFittingSize(fitting) / 100
  );
  console.log("fittingSizes", fittingSizes);
  const maxY = boundingBox.max.y;
  const minY = boundingBox.min.y;

  const arrangedPipes: arrangedPipe[] = [];
  const ranges = [...rowInfo.rowRanges];
  for (const [i, fittingSize] of fittingSizes.entries()) {
    let isArranged = false;
    for (const [j, range] of ranges.entries()) {
      const rangeSize = range.Max - range.Min;
      // can contain, add new pipe
      if (rangeSize >= fittingSize) {
        const radius = fittingSize / 2;
        const newPipe: arrangedPipe = {
          endPts: [
            new THREE.Vector3(range.Min + radius, minY, height + radius),
            new THREE.Vector3(range.Min + radius, maxY, height + radius),
          ],
          size: fittingSize,
          meta: uniqueFitting[i].meta,
          rowIndex: j,
        };
        arrangedPipes.push(newPipe);
        range.Min += fittingSize + dummySpace;
        isArranged = true;
        break;
      }
    }
    if (!isArranged) console.error("can not arrange pipe", uniqueFitting[i]);
  }

  // rendering
  for (const pipe of arrangedPipes) {
    new Cylinder(
      pipe.size / 2,
      general.Vector3ToVec3(pipe.endPts[0]),
      general.Vector3ToVec3(pipe.endPts[1]),
      new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
  }
  console.log("arrangedPipes", arrangedPipes);
  return arrangedPipes;
}

export async function getEndVoxelNew(
  rows: VoxelNode[][],
  arrangePipes: arrangedPipe[],
  localSelectedVoxels: VoxelNode[],
  localEPts_1: THREE.Vector3[]
) {
  const randomList: VoxelNode[] = [];
  let testIndex = 3;
  for (const row of rows) {
    //random
    // const randomVoxel = general.randomSelect(row, 1);
    // randomList.push(randomVoxel[0]);
    //manually
    randomList.push(row[testIndex]);
    if (testIndex === 3) testIndex += 4;
    if (testIndex === 7) testIndex += 1;
  }
  for (const arrangePipe of arrangePipes) {
    localSelectedVoxels.push(randomList[arrangePipe.rowIndex]);
    let ePt = new THREE.Vector3();
    randomList[arrangePipe.rowIndex].box.getCenter(ePt);
    localEPts_1.push(ePt);
  }
}

export interface Connector2 {
  property: string;
  pt: THREE.Vector3;
}

// --------------------------------------------------------
// TODO: Myunggyun
// --------------------------------------------------------
interface pipeGroup {
  spts: THREE.Vector3[][];
  groupPoint: THREE.Vector3[][];
  pipeGroup: PipeFitting[][];
}
// export async function getGroups() {}
export const GetGroups = async function (
  localStartObjs_1: PipeFitting[],
  localSPts_1: THREE.Vector3[]
) {
  const result: pipeGroup = {
    spts: [],
    groupPoint: [],
    pipeGroup: [],
  };

  const groups: string[][] = [];
  const group1 = ["PA", "GN2", "PV", "PN2", "Ar", "O2"];
  const group2 = ["PCW(S)", "PCW(R)"];
  const group3 = ["Coolant(S)", "Coolant(R)"];
  const group4 = ["NH3", "N2O", "NF3"];
  const group5 = ["SiH4", "TEOS"];
  groups.push(group1);
  groups.push(group2);
  groups.push(group3);
  groups.push(group4);
  groups.push(group5);

  const spts: THREE.Vector3[][] = [[], [], [], [], []];
  const groupingPoint: THREE.Vector3[][] = [[], [], [], [], []];
  const pipeGroups: PipeFitting[][] = [[], [], [], [], []];
  let idx = 0;
  // TODO: Check TotalDiameter for voxelsize checking (only horizontal)
  // let totalDiameter = 0;
  localStartObjs_1.forEach((element) => {
    if ("S5_Utility" in element.meta) {
      for (let i = 0; i < groups.length; i++) {
        for (let j = 0; j < groups[i].length; j++) {
          if (element.meta["S5_Utility"] == groups[i][j]) {
            pipeGroups[i].push(element);
            spts[i].push(localSPts_1[idx].clone());
            // TODO: Grouping Point Set
            groupingPoint[i].push(new THREE.Vector3(1946, 1389, 110));

            idx++;
            break;
          }
        }
      }
    }
  });

  result.spts = spts;
  result.groupPoint = groupingPoint;
  result.pipeGroup = pipeGroups;

  return result;
};

// --------------------------------------------------------
// Finish
// --------------------------------------------------------

// export async function findPath2New(
//   arrangePipes: arrangedPipe[],
//   selectedEquip: HostObject
// ) {
//   // equip connectors
//   const tempPt = cloneDeep(selectedEquip.location) as LocationPoint;
//   tempPt.origin = tempPt.origin.multiply(100);
//   const equip = new RoutingObject(selectedEquip.id, tempPt, selectedEquip.meta);
//   const equipPt = general.vec3ToVector3(equip.location.origin);
//   const useConnector: Connector2 = {
//     property: "none",
//     pt: equipPt,
//   };

//   if ("Connectors" in equip.meta) {
//     const thisConnectors = equip.meta["Connectors"] as object;
//     console.log("thisConnectors", thisConnectors);

//     if ("location" in thisConnectors) {
//       const connector = thisConnectors["location"] as Connector;
//       const connectorPt = new THREE.Vector3(
//         connector.X,
//         connector.Y,
//         connector.Z
//       );
//       const finalPt = equipPt.add(connectorPt);
//       useConnector.pt = finalPt;
//       useConnector.property =  Object.keys(thisConnectors) as string;
//     }
//     //no location
//     else {
//       console.error("cannot find connector location");
//     }
//   }
//   // no connector
//   else {
//     console.error("cannot find connector");
//   }

//   // pair data
// }
// -----------------------
// function dispatch(arg0: any) {
//   throw new Error("Function not implemented.");
// }

// function drawRoutePipe(
//   arg0: CurveObject[],
//   usedGEManager: GEManager,
//   arg2: SmartElbowManager
// ) {
//   throw new Error("Function not implemented.");
// }
// -----------------------
