import * as THREE from "three";
import Vec3 from "../../util/vec3";
import { aheadDir, propertyInfo, VoxelNode } from "../../Dev/Voxel/VoxelNode";
import { mainPath } from "../../../components/side-tab-contents/routing-tab-contents/HookUpPhaseOne";
import { HostObject } from "../../BIM/HostObject";
import { ReduxStore } from "../../../app/redux-store";
import { PointObject } from "../../BIM/PointObject";
import { VoxelManager } from "../../Dev/Voxel/VoxelManager";
import { DebugBoxByMinMax } from "../../Dev/GE/DebugingGeometry";
import { ViewModel } from "../../view-model";
import { Connector } from "../../../components/side-tab-contents/Routing";
import { LocationPoint } from "../../BIM/Location";

// ============================ convert data=================================
//
export function vec3sToVector3(vec3: Vec3[]) {
  return vec3.map((v) => new THREE.Vector3(v.x, v.y, v.z));
}
export function vec3ToVector3(vec3: Vec3) {
  return new THREE.Vector3(vec3.x, vec3.y, vec3.z);
}
export function Vector3sToVec3(vector3s: THREE.Vector3[]) {
  return vector3s.map((v) => new Vec3(v.x, v.y, v.z));
}
export function Vector3ToVec3(vector3: THREE.Vector3) {
  return new Vec3(vector3.x, vector3.y, vector3.z);
}
// =========================== convert data ==================================
export async function filterBranchVoxel(
  viewModel: ViewModel,
  boundBox: THREE.Box3,
  voxelManager: VoxelManager
) {
  console.log("Test");
  console.log("boundBox", boundBox);
  const testBoxMin = new THREE.Vector3(
    boundBox.min.x - 4.5,
    boundBox.min.y - 3.8,
    boundBox.min.z + 75
  );
  const testBoxMax = new THREE.Vector3(
    boundBox.max.x - 55,
    boundBox.max.y,
    boundBox.max.z - 25
  );
  const usableBox = new THREE.Box3(testBoxMin, testBoxMax);
  // new DebugBoxByMinMax(this.viewModel.scene, usableBox.min, usableBox.max);

  const gridVoxel = voxelManager.voxelNodes.filter((voxel) => voxel.isGrid);
  console.log("gridVoxel", gridVoxel);

  const supportVoxel = voxelManager.supportSpaceVoxels;
  console.log("supportVoxel", supportVoxel);

  const selectedGridSpace = gridVoxel.filter(
    (voxel) =>
      usableBox.intersectsBox(voxel.box) || usableBox.containsBox(voxel.box)
  );
  console.log("selectedGridSpace", selectedGridSpace);

  // selectedGridSpace.map(
  //   (voxel) =>
  //     new DebugBoxByMinMax(
  //       viewModel.scene,
  //       voxel.box.min,
  //       voxel.box.max,
  //       new THREE.Color(0xff0000)
  //     )
  // );

  const selectedSupportSpace = supportVoxel.filter(
    (voxel) =>
      usableBox.intersectsBox(voxel.box) || usableBox.containsBox(voxel.box)
  );
  console.log("selectedSupportSpace", selectedSupportSpace);
  // selectedSupportSpace.map(
  //   (voxel) =>
  //     new DebugBoxByMinMax(
  //       viewModel.scene,
  //       voxel.box.min,
  //       voxel.box.max,
  //       new THREE.Color(0x00ff00)
  //     )
  // );

  return { selectedGridSpace, selectedSupportSpace };
}

export function randomSelect<T>(
  elements: T[],
  amount: number,
  cullDuplicated = false
): T[] {
  const useForTest = [...elements];
  const selected: T[] = [];

  for (let i = 0; i < amount; i++) {
    const index = Math.floor(Math.random() * useForTest.length);
    selected.push(useForTest[index]);
    if (cullDuplicated) useForTest.splice(index, 1);
  }
  return selected;
}

export const findVoxelAndDir = (
  parentVoxel: VoxelNode,
  childrenVoxels: VoxelNode[],
  mainOrder: number,
  branchIndex: number
) => {
  let childIndex: THREE.Vector3 | undefined = undefined;
  const divideShape = parentVoxel.childrenShape;
  const situation = parentVoxel.branchInfo.aheadDir;

  switch (situation) {
    case aheadDir.X:
      const inverseIndexX = divideShape.x - 1 - mainOrder;
      childIndex = new THREE.Vector3(inverseIndexX, branchIndex, mainOrder);
      break;

    case aheadDir.XMinus:
      childIndex = new THREE.Vector3(mainOrder, branchIndex, mainOrder);
      break;

    case aheadDir.Y:
      const inverseIndexY = divideShape.y - 1 - mainOrder;
      childIndex = new THREE.Vector3(branchIndex, inverseIndexY, mainOrder);
      break;

    case aheadDir.YMinus:
      childIndex = new THREE.Vector3(branchIndex, mainOrder, mainOrder);
      break;
  }

  if (childIndex) {
    const selectedVoxel = childrenVoxels.find(
      (child) => +child.positionInParent.distanceTo(childIndex).toFixed(3) === 0
    );
    return selectedVoxel;
  }

  // if there is no child, return undefined
  else {
    throw new Error("childIndex is undefined");
  }
};

export const setMainPath = (
  testMainSPt: THREE.Vector3,
  selectedVoxel: VoxelNode,
  voxel: VoxelNode,
  propInfo: propertyInfo,
  branchingMainPaths: mainPath[]
) => {
  const situation = voxel.branchInfo.aheadDir;
  let tempPt: THREE.Vector3 | undefined = undefined;

  // --- 1. set initial point of Main Path ---
  if (situation === aheadDir.X || situation === aheadDir.XMinus) {
    tempPt = new THREE.Vector3(
      testMainSPt.x,
      selectedVoxel.dividedParentNode!.box.max.y,
      testMainSPt.z
    );
  }
  //
  else if (situation === aheadDir.Y || situation === aheadDir.YMinus) {
    tempPt = new THREE.Vector3(
      selectedVoxel.dividedParentNode!.box.max.x,
      testMainSPt.y,
      testMainSPt.z
    );
  }
  // none dir
  else {
    return undefined;
  }

  // --- 2. set end point of Main Path ---
  let testMainEPt = tempPt;
  let tempDist = Infinity;
  for (const voxel of selectedVoxel.dividedChildren) {
    if (voxel.location.distanceTo(testMainEPt!) < tempDist) {
      tempDist = voxel.location.distanceTo(testMainEPt!);
      testMainEPt = voxel.location;
    }
  }
  // if it is the first branch, add main path
  if (propInfo.branchAmount === 1) {
    const newMainPath: mainPath = {
      path: [testMainSPt, testMainEPt!],
      property: propInfo.property,
      branchVoxel: [voxel],
      branchSize: [],
    };
    branchingMainPaths.push(newMainPath);
  }

  // if it is not the first branch, add branch to main path info
  else {
    const main = branchingMainPaths.find(
      (main) => main.property === propInfo.property
    );
    if (main) {
      main.branchVoxel.push(selectedVoxel);
      main.path.splice(main.path.length - 1, 0, selectedVoxel.location);
      main.branchSize.push(50);
    }
  }
};

export const findEquip = (hostObjects: HostObject[]) => {
  const boxMesh = ReduxStore.getState().BoundBoxSlice.boundBox;
  const inputBoundingBox = new THREE.Box3().setFromObject(boxMesh);

  const equipObjAll = getAllEquip(hostObjects);
  console.log("equipObjAll", equipObjAll);

  let selectedEquip = equipObjAll.find((equip) => {
    const equipObj = equip as PointObject;
    const equipPt = equipObj.location;
    const testPt = new THREE.Vector3(
      equipPt.origin.x,
      equipPt.origin.y,
      equipPt.origin.z
    );
    return inputBoundingBox.distanceToPoint(testPt) === 0;
  });

  if (!selectedEquip) {
    alert(
      "there is not equipment in user bounding box! Will use the first detected Box"
    );
    selectedEquip = equipObjAll[0];
    if (!selectedEquip) {
      alert("there is no any equipment in input model");
      throw new Error("there is no any equipment in input model");
    }
  }

  return selectedEquip;
};

export const getAllEquip = (hostObjects: HostObject[]) => {
  const equipObjAll = hostObjects.filter(
    (obj) =>
      "Family" in obj.meta &&
      String(obj.meta["Family"]).includes(
        // "Semiconductor equipment_routing test - AP TO CR"
        "Samsung EQ Sample"
      )
  );
  return equipObjAll;
};

export const getEquipConnector = (connectorInfo: object) => {
  let connector: Connector = { X: 0, Y: 0, Z: 0 };
  if ("location" in connectorInfo)
    connector = connectorInfo["location"] as Connector;
  else {
    console.error('there is no "location" in connectorInfo');
    throw new Error('there is no "location" in connectorInfo');
  }

  return connector;
};

export function getObjLocation(obj: HostObject) {
  const location = obj.location as LocationPoint;
  return location.origin;
}

export function getRandomPointsInBox(
  box: THREE.Box3,
  numberOfPoints: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];

  for (let i = 0; i < numberOfPoints; i++) {
    const x = THREE.MathUtils.randFloat(box.min.x, box.max.x);
    const y = THREE.MathUtils.randFloat(box.min.y, box.max.y);
    const z = THREE.MathUtils.randFloat(box.min.z, box.max.z);
    points.push(new THREE.Vector3(x, y, z));
  }

  return points;
}

export function convertBoxToMesh(box: THREE.Box3) {
  const size = new THREE.Vector3();
  box.getSize(size);
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const mesh = new THREE.Mesh(geometry, material);

  return mesh;
}
