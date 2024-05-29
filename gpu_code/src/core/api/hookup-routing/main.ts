import { APP_SET_ISLOADING } from "../../../app/loading-slice";
import { SmartElbowManager } from "../../Dev/SE/SmartElbow";
import { ReduxStore } from "../../../app/redux-store";
import { VoxelManager } from "../../Dev/Voxel/VoxelManager";
import { GEManager } from "../../Dev/GE/GEManager";
import { HostObject } from "../../BIM/HostObject";
import { CurveObject } from "../../BIM/CurveObject";
import { VoxelNode } from "../../Dev/Voxel/VoxelNode";
import { ViewModel } from "../../view-model";
import {
  filterBranchVoxel,
  getAllEquip,
  getRandomPointsInBox,
  randomSelect,
  vec3ToVector3,
  Vector3ToVec3,
} from "./general";

import { GPU } from "gpu.js";

import * as THREE from "three";
import { PipeFitting } from "../../family/PipeFittings";
import { DebugBoxByMinMax } from "../../Dev/GE/DebugingGeometry";
import {
  arrangeBranches,
  arrangeRows,
  getEndVoxelNew,
  GetGroups,
  getUniqueFittingByIndex,
} from "./functions";
import Routing from "../../../components/side-tab-contents/Routing";
import { equipObject } from "../../BIM/RoutingObject";
import { LocationPoint } from "../../BIM/Location";
import { Point } from "../../../render/generic/point";
import { cloneDeep } from "lodash";
import { bool } from "three/examples/jsm/nodes/shadernode/ShaderNode.js";

export interface path {
  property: string;
  connector: HostObject;
  group: number;
  equipmentCon: HostObject;
  path1: { pt: THREE.Vector3; property: string };
  path2: { pt: THREE.Vector3; property: string };
  path3: { pt: THREE.Vector3; property: string };
  totalPath: { pts: THREE.Vector3[] };
}

export class hookupRouting {
  inputBoundingBox?: THREE.Box3;
  viewModel: ViewModel;

  // manager
  globalVM: VoxelManager;
  globalSE1: SmartElbowManager;
  globalSE2: SmartElbowManager;
  globalGE: GEManager;
  isGESetup: boolean = false;

  // object
  selectedVoxels: VoxelNode[] = [];
  hostObjects: HostObject[] = ReduxStore.getState().BIMSlice.hostObjects;
  userPipeObjArray: HostObject[] = [];
  userVoxelArray: VoxelNode[] = [];

  // var for task 2-1
  sPts_1: THREE.Vector3[] = [];
  ePts_1: THREE.Vector3[] = [];
  startObjs_1: PipeFitting[] = [];

  // var for task 2-2
  sPts_2: THREE.Vector3[] = [];
  ePts_2: THREE.Vector3[] = [];
  startObjs_2: PipeFitting[] = [];

  constructor(_viewModel: ViewModel) {
    this.viewModel = _viewModel;
    this.globalVM = new VoxelManager(this.viewModel);
    this.globalSE1 = new SmartElbowManager(this.viewModel, this.globalVM);
    this.globalSE2 = new SmartElbowManager(this.viewModel, this.globalVM);
    this.globalGE = new GEManager(this.viewModel.scene);
  }

  initialize = async () => {

    console.warn("initialize run !!");
    this.isGESetup = false;

    const newVM = new VoxelManager(this.viewModel);
    this.globalVM = newVM;

    const newSE1 = new SmartElbowManager(this.viewModel, this.globalVM);
    this.globalSE1 = newSE1;

    const newSE2 = new SmartElbowManager(this.viewModel, this.globalVM);
    this.globalSE2 = newSE2;

    const newGE = new GEManager(this.viewModel.scene);
    this.globalGE = newGE;

    this.sPts_1 = [];
    this.startObjs_1 = [];
    this.ePts_1 = [];

    this.sPts_2 = [];
    this.startObjs_2 = [];
    this.ePts_2 = [];

    this.selectedVoxels = [];
    console.warn("initialize FIN !!");
  };

  generateRoutes = async (
    _userPipeObjArray: HostObject[],
    _userVoxelArray: VoxelNode[]
  ) => {
    try {
      this.userPipeObjArray = _userPipeObjArray;
      this.userVoxelArray = _userVoxelArray;
      //Todo connecting loading-component
      //   dispatch(APP_SET_ISLOADING(true));
      console.log("voxelManager", this.globalVM);
      // 1. GetSpt
      await this.getSpt2_1();
      // 2. GetEpt
      await this.getEndVoxel1();
      // 3. FindPath
      await this.findPath();

      // se1.drawPath();
      console.log("se1", this.globalSE1);
      console.log("se1.sPts", this.globalSE1.sPts);
      console.log("se1.startNodes", this.globalSE1.startNodes);
      console.log("se1.ePts", this.globalSE1.ePts);
      console.log("se1.endNodes", this.globalSE1.endNodes);
      // se1.drawLink();
      // return;
      // 4. Hide_Node_And_Voxel
      await this.hideNodeAndVoxel();

      // Task 2-2
      // 7. Voxels
      await this.divideSupportVoxels();
      // voxelManager.showVoxels();

      // 8. Get End Voxel
      console.warn("start GetEndVoxel2_2");
      await this.getEndVoxel2_2();

      console.warn("start find path2");
      // 9. findPAth
      await this.findPath2();

      console.log("final se1", this.globalSE1);
      // return;
      // se1.drawPath();

      // Task 2-1
      // 5. GE_Setup
      await this.setupGE();
      // return;

      // 6. Run GE
      if (this.globalGE) {
        await this.runGE();
      }
      // ------------

      console.log("TEST");
      //alert("Click!")
    } catch (error) {
      console.error(error);
      //   dispatch(APP_SET_ISLOADING(false));
    }
  };

  generateRoutesAuto = async () => {
    console.log("voxelManager", this.globalVM);
    // 1. GetSpt
    await this.getSpt2_1Auto();
    // 2. GetEpt
    await this.getEndVoxel1(true);
    // 3. FindPath
    await this.findPath();

    // se1.drawPath();
    console.log("se1", this.globalSE1);
    console.log("se1.sPts", this.globalSE1.sPts);
    console.log("se1.startNodes", this.globalSE1.startNodes);
    console.log("se1.ePts", this.globalSE1.ePts);
    console.log("se1.endNodes", this.globalSE1.endNodes);
    // se1.drawLink();
    // return;
    // 4. Hide_Node_And_Voxel
    await this.hideNodeAndVoxel();

    // Task 2-2
    // 7. Voxels
    await this.divideSupportVoxels();
    // voxelManager.showVoxels();
    // 8. Get End Voxel
    console.warn("start GetEndVoxel2_2");
    await this.getEndVoxel2_2();

    console.warn("start find path2");
    // 9. findPAth
    await this.findPath2();

    console.log("final se1", this.globalSE1);
    // se1.drawPath();
    // return;

    // Task 2-1
    // 5. GE_Setup
    await this.setupGE();
    // return;

    // 6. Run GE
    if (this.globalGE) {
      await this.runGE();
    }
    // ------------

    console.log("TEST");
    //alert("Click!")
  };

  GenerateRoutesOneClick = async () => {
    console.log("GenerateRoutesOneClick");
    const allEquip = getAllEquip(this.hostObjects);
    const tempBoundingBoxed = allEquip.map((equip) => {
      const box = new THREE.Box3().setFromObject(
        equip.renderObjects[0].object3d
      );
      box.max.x += 25.5;
      box.max.y += 7.7;
      box.max.z += 4.85;
      box.min.x -= 24;
      box.min.y -= 8.7;
      box.min.z -= 93.9;
      return box;
    });

    // new DebugBoxByMinMax(
    //   viewModel.scene,
    //   tempBoundingBoxed[0].min,
    //   tempBoundingBoxed[0].max
    // );

    // return;

    for (const [index, boundingBox] of tempBoundingBoxed.entries()) {
      // if (index > 0) blockDelay(1000);
      // setTimeout(() => {
      console.log(`this is ${index} iteration, boundingBox: `, boundingBox);
      // new DebugBoxByMinMax(viewModel.scene, boundingBox.min, boundingBox.max);
      await this.initialize(); //FIXME cannot use this function （ASYNC ISSUE)

      // ---initialize manually---
      const localVoxelManager = new VoxelManager(this.viewModel);
      const localSe1 = new SmartElbowManager(this.viewModel, localVoxelManager);
      const localSe2 = new SmartElbowManager(this.viewModel, localVoxelManager);

      const localSelectedVoxels: VoxelNode[] = [];

      const localSPts_1: THREE.Vector3[] = [];
      const localStartObjs_1: PipeFitting[] = [];
      const localEPts_1: THREE.Vector3[] = [];

      const localSPts_2: THREE.Vector3[] = [];
      const localStartObjs_2: PipeFitting[] = [];
      const localEPts_2: THREE.Vector3[] = [];

      const localManagerGE = new GEManager(this.viewModel.scene);
      // ---initialize manually---

      //   console.log(`this is ${index} iteration, se1: `, se1);
      //   console.log(`this is ${index} iteration, se2: `, se2);

      await this.voxelize(true, boundingBox, localVoxelManager);

      console.log("localVoxelManager", localVoxelManager);
      console.log("voxelManager", this.globalVM);

      // console.log("selectedVoxels after voxelize", [...selectedVoxels]);

      // 1. GetSpt
      await this.getSpt2_1Auto(
        true,
        boundingBox,
        localSPts_1,
        localStartObjs_1
      );
      // 2. GetEpt
      await this.getEndVoxel1(
        true,
        true,
        allEquip[index],
        localVoxelManager,
        localSelectedVoxels,
        localEPts_1,
        localStartObjs_1
      );
      // 3. FindPath
      await this.findPath(localSe1, localSPts_1, localEPts_1, localStartObjs_1);

      // localSe1.drawPath();
      // se1.drawPath();
      console.log("se1", localSe1);
      console.log("se1.sPts", localSe1.sPts);
      console.log("se1.startNodes", localSe1.startNodes);
      console.log("se1.ePts", localSe1.ePts);
      console.log("se1.endNodes", localSe1.endNodes);
      // se1.drawLink();

      // localSe1.drawPath();
      // continue;
      // return;
      // 4. Hide_Node_And_Voxel
      await this.hideNodeAndVoxel(localSe1, localVoxelManager);

      // Task 2-2
      // 7. Voxels
      await this.divideSupportVoxels(localVoxelManager);
      // voxelManager.showVoxels();
      // 8. Get End Voxel
      console.warn("start GetEndVoxel2_2");
      console.warn("allEquip[index]", allEquip[index]);
      await this.getEndVoxel2_2(
        true,
        localSe1,
        localSe2,
        allEquip[index],
        localSelectedVoxels
      );

      console.warn("start find path2");
      // 9. findPath
      await this.findPath2(
        localSe1,
        localSe2,
        localSelectedVoxels,
        localSPts_2,
        localEPts_2,
        localStartObjs_2
      );

      // localSe1.drawPath();

      // return;
      // continue;
      // se1.drawPath();

      // Task 2-1
      // 5. GE_Setup
      await this.setupGE(localManagerGE, localSe1, localStartObjs_1);
      // return;
      // continue;

      // 6. Run GE
      if (this.globalGE) {
        await this.runGE(localManagerGE, true, localStartObjs_1, localSe2);
      }

      console.log("TEST");
    }
  };

  GenerateRoutesNewOld = async () => {
    console.log("GenerateRoutesOneClick");
    const allEquip = getAllEquip(this.hostObjects);
    const tempBoundingBoxes = allEquip.map((equip) => {
      const box = new THREE.Box3().setFromObject(
        equip.renderObjects[0].object3d
      );
      box.max.x += 25.5;
      box.max.y += 7.7;
      box.max.z += 4.85;
      box.min.x -= 24;
      box.min.y -= 8.7;
      box.min.z -= 93.9;
      return box;
    });

    // new DebugBoxByMinMax(
    //   viewModel.scene,
    //   tempBoundingBoxes[0].min,
    //   tempBoundingBoxes[0].max
    // );

    // return;

    for (const [iterIndex, boundingBox] of tempBoundingBoxes.entries()) {
      // if (index > 0) blockDelay(1000);
      // setTimeout(() => {
      console.log(`this is ${iterIndex} iteration, boundingBox: `, boundingBox);
      // new DebugBoxByMinMax(viewModel.scene, boundingBox.min, boundingBox.max);
      await this.initialize(); //FIXME cannot use this function （ASYNC ISSUE)

      // ---initialize manually---
      const localVoxelManager = new VoxelManager(this.viewModel);
      const localSe1 = new SmartElbowManager(this.viewModel, localVoxelManager);
      const localSe2 = new SmartElbowManager(this.viewModel, localVoxelManager);

      const localSelectedVoxels: VoxelNode[] = [];

      const localSPts_1: THREE.Vector3[] = [];
      const localStartObjs_1: PipeFitting[] = [];
      const localEPts_1: THREE.Vector3[] = [];

      const localSPts_2: THREE.Vector3[] = [];
      const localStartObjs_2: PipeFitting[] = [];
      const localEPts_2: THREE.Vector3[] = [];

      const localManagerGE = new GEManager(this.viewModel.scene);
      // ---initialize manually---

      //   console.log(`this is ${index} iteration, se1: `, se1);
      //   console.log(`this is ${index} iteration, se2: `, se2);

      await this.voxelize(true, boundingBox, localVoxelManager);
      console.log("localVoxelManager", localVoxelManager);
      console.log("voxelManager", this.globalVM);
      // console.log("selectedVoxels after voxelize", [...selectedVoxels]);

      const filterVoxels = await filterBranchVoxel(
        this.viewModel,
        boundingBox,
        localVoxelManager
      );
      // console.log("filterVoxels", filterVoxels);

      // 1. GetSpt
      await this.getSpt2_1Auto(
        true,
        boundingBox,
        localSPts_1,
        localStartObjs_1
      );
      // console.log("localStartObjs_1 !!", localStartObjs_1);

      const [selectedFittings, selectedSPts] = await getUniqueFittingByIndex(
        localStartObjs_1,
        localSPts_1,
        0
      );
      // console.log("uniqueFitting", uniqueFitting);

      const rowInfo = await arrangeRows(filterVoxels.selectedSupportSpace);

      // continue;

      // generate static pipes
      const arrangePipes = await arrangeBranches(
        filterVoxels.selectedSupportSpace,
        selectedFittings,
        boundingBox
      );

      console.log("arrangePipe", arrangePipes);

      await getEndVoxelNew(
        rowInfo.rows,
        arrangePipes,
        localSelectedVoxels,
        localEPts_1
      );
      //-----

      //#region not used for new task
      // 2. GetEpt
      // await this.getEndVoxel1(
      //   true,
      //   true,
      //   allEquip[index],
      //   localVoxelManager,
      //   localSelectedVoxels,
      //   localEPts_1,
      //   localStartObjs_1
      // );
      //#endregion

      // 3. FindPath
      await this.findPath(
        localSe1,
        selectedSPts,
        localEPts_1,
        localStartObjs_1
      );
      // await this.findPath(localSe1, localSPts_1, localEPts_1, localStartObjs_1);

      // se1.drawPath();
      localSe1.drawPath();
      // continue;

      console.log("se1", localSe1);
      console.log("se1.sPts", localSe1.sPts);
      console.log("se1.startNodes", localSe1.startNodes);
      console.log("se1.ePts", localSe1.ePts);
      console.log("se1.endNodes", localSe1.endNodes);
      // se1.drawLink();

      // localSe1.drawPath();
      // return;
      // await findPath2New(arrangePipes, allEquip[iterIndex]);
      continue;

      //#region old task 2
      // 4. Hide_Node_And_Voxel
      await this.hideNodeAndVoxel(localSe1, localVoxelManager);

      // Task 2-2
      // 7. Voxels
      await this.divideSupportVoxels(localVoxelManager);
      // voxelManager.showVoxels();
      // 8. Get End Voxel
      console.warn("start GetEndVoxel2_2");
      console.warn("allEquip[index]", allEquip[iterIndex]);
      await this.getEndVoxel2_2(
        true,
        localSe1,
        localSe2,
        allEquip[iterIndex],
        localSelectedVoxels
      );

      console.warn("start find path2");
      // 9. findPath
      await this.findPath2(
        localSe1,
        localSe2,
        localSelectedVoxels,
        localSPts_2,
        localEPts_2,
        localStartObjs_2
      );

      localSe1.drawPath();
      // continue;

      // return;
      // se1.drawPath();

      // Task 2-1
      // 5. GE_Setup
      await this.setupGE(localManagerGE, localSe1, localStartObjs_1);
      // return;
      // continue;
      //#endregion

      // 6. Run GE
      if (this.globalGE) {
        await this.runGE(localManagerGE, true, localStartObjs_1, localSe2);
      }

      console.log("TEST");
    }
  };

  GenerateRoutesNew = async () => {
    console.log("GenerateRoutesNew");
    const allEquip = getAllEquip(this.hostObjects);
    const tempBoundingBoxes = allEquip.map((equip) => {
      const box = new THREE.Box3().setFromObject(
        equip.renderObjects[0].object3d
      );
      box.max.x += 25.5;
      box.max.y += 7.7;
      box.max.z += 4.85;
      box.min.x -= 24;
      box.min.y -= 8.7;
      box.min.z -= 93.9;
      return box;
    });

    // new DebugBoxByMinMax(
    //   viewModel.scene,
    //   tempBoundingBoxes[0].min,
    //   tempBoundingBoxes[0].max
    // );

    // return;

    for (const [iterIndex, boundingBox] of tempBoundingBoxes.entries()) {
      // if (index > 0) blockDelay(1000);
      // setTimeout(() => {
      console.log(`this is ${iterIndex} iteration, boundingBox: `, boundingBox);
      // new DebugBoxByMinMax(viewModel.scene, boundingBox.min, boundingBox.max);
      await this.initialize(); // //FIXME cannot use this function （ASYNC ISSUE)

      // ---initialize manually---
      const localVoxelManager = new VoxelManager(this.viewModel);
      const localSe1 = new SmartElbowManager(this.viewModel, localVoxelManager);
      const localSe2 = new SmartElbowManager(this.viewModel, localVoxelManager);

      const localSelectedVoxels: VoxelNode[] = [];

      const localSPts_1: THREE.Vector3[] = [];
      const localStartObjs_1: PipeFitting[] = [];
      const localEPts_1: THREE.Vector3[] = [];

      const localSPts_2: THREE.Vector3[] = [];
      const localStartObjs_2: PipeFitting[] = [];
      const localEPts_2: THREE.Vector3[] = [];

      const localManagerGE = new GEManager(this.viewModel.scene);
      // ---initialize manually---

      //   console.log(`this is ${index} iteration, se1: `, se1);
      //   console.log(`this is ${index} iteration, se2: `, se2);

      // 1. voxelize
      await this.voxelizeSpaces(
        3,
        3,
        this.hostObjects,
        boundingBox,
        localVoxelManager,
        boundingBox
      );

      // localVoxelManager.showVoxels();
      // localSe1.drawLink();
      // localSe1.drawNodes();

      // continue;

      // console.log("selectedVoxels after voxelize", [...selectedVoxels]);

      const properties = ["testProp1"];

      // this getFittingProperty() could get property of pipe fitting
      // const properties = [
      //   getFittingProperty(this.hostObjects[0] as PipeFitting),
      // ];
      const connectors = [this.hostObjects[0]];

      // Debuging : Myung
      // const spts = []
      // const epts = []

      // localSe1.run([sPt1], [ePt1]); // with optional true, use turn penalty
      // localSe1.drawPath(0x00ff00);

      // 2. branching pipe arrange
      // TODO

      // Get Points
      await this.getSpt2_1Auto(
        true,
        boundingBox,
        localSPts_1,
        localStartObjs_1
      );

      // Grouping
      const groups = await GetGroups(localStartObjs_1, localSPts_1);
      const groupingPoint = groups.groupPoint;
      const spts = groups.spts;
      const pipeGroups = groups.pipeGroup;

      // TODO: TransferPoint1 Set (Grouping in Air Planum)
      const transferPoint1: THREE.Vector3[] = [];
      const transferPoint2: THREE.Vector3[] = [];
      groupingPoint.forEach((groupPoint) => {
        for (let i = 0; i < groupPoint.length; i++) {
          transferPoint1.push(groupPoint[i].clone());
          transferPoint2.push(
            groupPoint[i].clone().add(new THREE.Vector3(200, 0, 0))
          );
        }
      });

      console.log("spts", spts);
      console.log("PipeGroups", pipeGroups);

      // 3. findPath(from pipe to branching)
      // TODO

      // TODO: Generate path from nozzle to airplanum grouping site
      await localSe1.run(
        spts[0],
        groupingPoint[0],
        false,
        false,
        properties,
        connectors
      ); // must await here
      // await localSe1.run([sPt1], [ePt1]); // must await here
      const pathInfo = localSe1.getInfoForGE();

      // TODO: Generate path from grouping site finish line to under waffle beam
      await localSe2.run(transferPoint1, transferPoint2, false); // must await here

      localSe1.drawPath();
      localSe1.drawPath(0xff0000); // optional input color
      localSe2.drawPath();
      localSe2.drawPath(0xff0000); // optional input color
      console.log("pathInfo test", pathInfo);

      // TODO: Generate path from Under waffle beam to branching
      this.setupGE(localManagerGE, localSe1);
      localManagerGE.Step();

      // 4. findPath(from branching to valve)
      // TODO

      //-------------------------------------------------------------------------------

      // TODO: Valve Point Set

      // 5. findPath(from valve to equipment)
      // TODO

      // 6. findPath(directly connection)
      // TODO

      // 6-1 get property
      const equipsObj = this.hostObjects.filter((obj) => {});
      // 6-2 pair connector property
      // 6-3 run
    }
  };

  GenerateRoutesNewForTest = async () => {

    console.log('GenerateRoutesNewForTest start');

    console.log("GenerateRoutesNew 1233");
    const allEquip = getAllEquip(this.hostObjects);
    const tempBoundingBoxes = allEquip.map((equip) => {
      const box = new THREE.Box3().setFromObject(
        equip.renderObjects[0].object3d
      );
      box.max.x += 25.5;
      box.max.y += 50;
      // box.max.y += 7.7;
      box.max.z += 4.85;
      box.min.x -= 24;
      box.min.y -= 8.7;
      box.min.z -= 93.9;
      return box;
    });




  const gpu = new GPU();
  const kernel = gpu.createKernel(function(a: number, b: number ) {
    return Math.abs(a-b);
  }).setOutput([1]);

  const absX1 = kernel(222.222, 1.2222222222222222)[0];
  // const absY = kernel(node1.location.y, node2.location.y)[0];
  // const absZ = kernel(node1.location.z, node2.location.z)[0];
  gpu.destroy();


    // new DebugBoxByMinMax(
    //   viewModel.scene,
    //   tempBoundingBoxes[0].min,
    //   tempBoundingBoxes[0].max
    // );

    // return;

    for (const [iterIndex, boundingBox] of tempBoundingBoxes.entries()) {
      // if (index > 0) blockDelay(1000);
      // setTimeout(() => {
      console.log(`this is ${iterIndex} iteration, boundingBox: `, boundingBox);
      const thisEquip = allEquip[iterIndex];
      const equip = new equipObject(
        thisEquip.id,
        thisEquip.location as LocationPoint,
        thisEquip.meta
      );
      equip.connectors;
      // new DebugBoxByMinMax(viewModel.scene, boundingBox.min, boundingBox.max);
      await this.initialize(); // //FIXME cannot use this function （ASYNC ISSUE)

      // ---initialize manually---
      const localVoxelManager = new VoxelManager(this.viewModel);
      const localSe1 = new SmartElbowManager(this.viewModel, localVoxelManager);
      const localSe2 = new SmartElbowManager(this.viewModel, localVoxelManager);
      const localSe3 = new SmartElbowManager(this.viewModel, localVoxelManager);

      const localSelectedVoxels: VoxelNode[] = [];

      const localSPts_1: THREE.Vector3[] = [];
      const localStartObjs_1: PipeFitting[] = [];
      const localEPts_1: THREE.Vector3[] = [];

      const localSPts_2: THREE.Vector3[] = [];
      const localStartObjs_2: PipeFitting[] = [];
      const localEPts_2: THREE.Vector3[] = [];

      const localManagerGE1 = new GEManager(this.viewModel.scene);
      const localManagerGE2 = new GEManager(this.viewModel.scene);
      const localManagerGE3 = new GEManager(this.viewModel.scene);
      // ---initialize manually---

      //   console.log(`this is ${index} iteration, se1: `, se1);
      //   console.log(`this is ${index} iteration, se2: `, se2);

      // 1. voxelize
      const supportSpace = await this.voxelizeSpaces(
        5,
        3,
        this.hostObjects,
        boundingBox,
        localVoxelManager,
        boundingBox
      );

      // localVoxelManager.showVoxels();
      // localSe1.drawLink();
      // localSe1.drawNodes();

      // continue;

      // console.log("selectedVoxels after voxelize", [...selectedVoxels]);

      const properties = ["testProp1"];

      // this getFittingProperty() could get property of pipe fitting
      // const properties = [
      //   getFittingProperty(this.hostObjects[0] as PipeFitting),
      // ];
      const connectors = [this.hostObjects[0]];
      
      
      // Debuging : Myung
      // const spts = []
      // const epts = []

      // localSe1.run([sPt1], [ePt1]); // with optional true, use turn penalty
      // localSe1.drawPath(0x00ff00);

      // 2. branching pipe arrange
      // TODO

      // new DebugBoxByMinMax(this.viewModel.scene, boundingBox.min, boundingBox.max);
      console.log("boundingBox info: ", boundingBox);
      // Get Points
      await this.getSpt2_1Auto(
        true,
        boundingBox,
        localSPts_1,
        localStartObjs_1
      );
      
      console.log("getSpt2_1Auto ok ");

      // Grouping
      const groups = await GetGroups(localStartObjs_1, localSPts_1);
      const groupingPoint = groups.groupPoint;
      const spts = groups.spts;
      const pipeGroups = groups.pipeGroup;

      // TODO: TransferPoint1 Set (Grouping in Air Planum)
      const transferPoint1: THREE.Vector3[] = [];
      const transferPoint2: THREE.Vector3[] = [];
      const transferPoint3: THREE.Vector3[] = [];

      const equipLocation: THREE.Vector3 = new THREE.Vector3(
        equip.location.origin.x,
        equip.location.origin.y,
        equip.location.origin.z
      ).multiplyScalar(100);
      const branchingStart = equipLocation
        .clone()
        .add(new THREE.Vector3(40, -25, -5));
      const branchingEnd = equipLocation
        .clone()
        .add(new THREE.Vector3(40, -25, -5));

      groupingPoint.forEach((groupPoint) => {
        for (let i = 0; i < groupPoint.length; i++) {
          const groupingPoint = groupPoint[i].clone();
          transferPoint1.push(groupingPoint); // Grouping Point (Under Waffle Beam)
          transferPoint2.push(branchingStart); // Branching Start (Group1)
          transferPoint3.push(branchingEnd); // Branching End (Group1)
        }
      });

      console.log("spts", spts);
      console.log("PipeGroups", pipeGroups);

      // 3. findPath(from pipe to branching)
      // TODO

      // TODO: Generate path from nozzle to airplanum grouping site
      await localSe1.run(
        spts[0],
        groupingPoint[0],
        false,
        false,
        properties,
        connectors
      ); // must await here
      // await localSe1.run([sPt1], [ePt1]); // must await here

      // TODO: Generate path from grouping site finish line to under waffle beam
      await localSe2.run(transferPoint1, transferPoint2, false); // must await here
      await localSe3.run(transferPoint2, transferPoint3, false); // must await here
      const pathInfo = localSe1.getInfoForGE();
      const pathInfo2 = localSe2.getInfoForGE();
      const pathInfo3 = localSe3.getInfoForGE();

      localSe1.drawPath();
      localSe2.drawPath();
      localSe3.drawPath();
      localSe1.drawPath(0xff0000); // optional input color
      localSe2.drawPath(0xff0000); // optional input color
      localSe3.drawPath(0xff0000); // optional input color
      console.log("pathInfo test", pathInfo);

      // TODO: Generate path from Under waffle beam to branching
      localManagerGE1.Setup(pathInfo);
      localManagerGE2.Setup(pathInfo2);
      localManagerGE3.Setup(pathInfo3);

      // TODO: Generate path from Under waffle beam to AccessFloor
      for(let i = 0; i <5 ; i++){
        localManagerGE1.Step();
        localManagerGE2.Step();
        localManagerGE3.Step();
      }
      console.log('GenerateRoutesNewForTest end 1112');
      
      localVoxelManager.showVoxels();



    //   //-------------------------------------------------------------------------------
    //   // 5. findPath(from valve to equipment)
    //   // TODO

    //   // // 1. set new voxel space
    //   const dummyVM = new VoxelManager(this.viewModel);
    //   dummyVM.voxelNodes = await localVoxelManager.divideVoxels(
    //     localVoxelManager.supportSpaceVoxels,
    //     4
    //   );

    //   // dummyVM.showVoxels();

    //   const newSE = new SmartElbowManager(this.viewModel, dummyVM);
    //   // newSE.voxelManager.showVoxels();

    //   const testAmount = 10;
    //   const selectConnector = randomSelect(equip.connectors, testAmount, true);
    //   const dummyEPts = selectConnector.map((c) => c.location);
    //   dummyEPts.map((pt) => new Point(Vector3ToVec3(pt), { r: 0, g: 0, b: 1 }));

    //   const basicX = supportSpace.min.x - 50;
    //   const basicY = supportSpace.min.y;
    //   const basicZ = supportSpace.min.z;
    //   const dummySPts: THREE.Vector3[] = [];

    //   for (let i = 0; i < selectConnector.length; i++) {
    //     const newTestPoint = new THREE.Vector3(
    //       basicX,
    //       basicY + 5 * (i + 1),
    //       basicZ
    //     );
    //     dummySPts.push(newTestPoint);
    //     new Point(Vector3ToVec3(newTestPoint), { r: 0, g: 0, b: 1 });
    //   }
    //   console.log("dummySPts", dummySPts);
    //   console.log("dummyEPts", dummyEPts);

    //   await newSE.run(dummySPts, dummyEPts, true);
    //   newSE.drawPath(0xfffff);

    //   // localSe1.drawLink();

    //   // 6. findPath(directly connection)
    //   // TODO

    //   // 6-1 get property

    //   // set dummy data
    //   const randomBox = cloneDeep(boundingBox).translate(
    //     new THREE.Vector3(300, 0, -50)
    //   );

    //   const dummyPts = getRandomPointsInBox(randomBox, 5);
    //   console.log("dummyPts", dummyPts);
    //   const randomConnectors = randomSelect(equip.connectors, 5, true);

    //   const testConnectorPts = randomConnectors.map((c) => c.location);
    //   await localSe1.run([...dummyPts], [...testConnectorPts]);
    //   localSe1.drawPath();
    //   // localSe1.voxelManager.showVoxels();
    //   // localSe1.drawLink();
    //   // this.setupGE(localManagerGE, localSe1);
    //   // this.runGE(localManagerGE);

    //   for (const pt of dummyPts) {
    //     new Point(Vector3ToVec3(pt), { r: 0, g: 0, b: 1 });
    //   }
    //   console.log("equip", equip);

    //   // TODO how to use GE?
    //   // 6-2 pair connector property
    //   // 6-3 run
    }

  
  };
}

// function dispatch(arg0: {
//   payload: any;
//   type: "loading-slice/APP_SET_ISLOADING";
// }) {
//   throw new Error("Function not implemented.");
// }
