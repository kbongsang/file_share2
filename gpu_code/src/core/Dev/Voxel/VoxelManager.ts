import { ViewModel } from "../../view-model";
import * as THREE from "three";
import { MeshBVH, acceleratedRaycast } from "three-mesh-bvh";
import { aheadDir, VoxelNode } from "./VoxelNode";
import { ReduxStore } from "../../../app/redux-store";
import { HostObject } from "../../BIM/HostObject";
import { Beam } from "../../family/Beam";
import { Object3D } from "../../../render/generic/object-3d";
import { cloneDeep } from "lodash";
import { Floor } from "../../family/Floor";
import { PointObject } from "../../BIM/PointObject";
import { Point } from "../../../render/generic/point";
import Vec3 from "../../util/vec3";
import { DebugBoxByMinMax } from "../GE/DebugingGeometry";
import { LocationPoint } from "../../BIM/Location";

declare module "three" {
  interface Raycaster {
    firstHitOnly?: boolean;
  }
}

export interface VoxelsInfo {
  iter: number;
  maxSize: THREE.Vector3;
  minSize: THREE.Vector3;
  allSizes: THREE.Vector3[];
}

export type Range = { min: number; max: number };

export class VoxelManager {
  viewModel: ViewModel;
  raycaster: THREE.Raycaster;
  voxelNodes: VoxelNode[] = [];
  nodeCount: number = 0;
  iter: number = 0;
  voxelIndexes: number[] = [];
  beamWidth: number = 150;
  voxelizeObjDivider: number = 3;
  supportSpaceVoxels: VoxelNode[] = [];
  originSupportSpaceVoxels: VoxelNode[] = [];
  occupyStartObjs: HostObject[] = [];
  obstacleBoxes: THREE.Box3[] = [];

  voxelMaterialInside: THREE.MeshStandardMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.2,
    });
  voxelMaterialEmpty: THREE.MeshStandardMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.2,
    });
  voxelMaterialTest: THREE.MeshStandardMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xff3e1c,
      transparent: true,
      opacity: 0.3,
    });
  voxelMaterialNear: THREE.MeshStandardMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xff3e1c,
      transparent: true,
      opacity: 0.1,
    });
  voxelMaterialEdge: THREE.MeshStandardMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xfcf403,
      transparent: true,
      opacity: 0.1,
    });

  constructor(viewModel: ViewModel) {
    this.viewModel = viewModel;

    THREE.Mesh.prototype.raycast = acceleratedRaycast;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.firstHitOnly = true;
  }
  //#region not use now
  run = (
    iter: number,
    minimum: number,
    auto: boolean = false,
    autoBoundingArea?: THREE.Box3
  ) => {
    // this.InputMeshes();
    const [beamObjs, normalObjs, floorObjs, supportObjs, tileObjs] =
      this.SeparateObjs();

    console.log("supportObjs", supportObjs);
    console.log("tileObjs", tileObjs);
    // const boundingBoxLimit = this.CreateBoundingBox(normalObjs);
    ``;
    const boundingBoxForZ = VoxelManager.createBoundingBoxOfObjs([
      ...normalObjs,
      ...beamObjs,
    ]);
    // areaLimitedBox
    // TODO select biggest floor
    // const selectFloor = [...floorObjs].sort((a,b)=>{
    //   const boxA = a.met
    // })
    const floorBox = new THREE.Box3().setFromObject(
      floorObjs[0].renderObjects[0].object3d
    );
    let areaLimitedBox = floorBox;

    // use user input bounding box
    if (!auto) {
      const boxMesh = ReduxStore.getState().BoundBoxSlice.boundBox;
      const inputBoundingBox = new THREE.Box3().setFromObject(boxMesh);
      console.warn("inputBoundingBox when voxel", inputBoundingBox);
      if (
        isFinite(inputBoundingBox.max.x) &&
        isFinite(inputBoundingBox.max.y) &&
        isFinite(inputBoundingBox.max.z)
      ) {
        areaLimitedBox = inputBoundingBox;
      }
      console.log("boundingBox", areaLimitedBox);
    }
    // auto gen bounding box
    else {
      areaLimitedBox = autoBoundingArea!;
    }

    // boundingBoxLimit
    let boundingBoxLimit = new THREE.Box3();
    if (floorObjs.length > 0) {
      boundingBoxLimit = new THREE.Box3().setFromObject(
        floorObjs[0].renderObjects[0].object3d
      );
      boundingBoxLimit.min.z = boundingBoxForZ.min.z;
      boundingBoxLimit.max.z = boundingBoxForZ.max.z;
      console.log("boundingBoxLimit", boundingBoxLimit);
    } else boundingBoxLimit = boundingBoxForZ;

    console.log("boundingBoxAllObj", boundingBoxForZ);

    let boundingBoxLimit2 = cloneDeep(boundingBoxLimit);

    if (tileObjs.length > 0) {
      const tileBoxes = tileObjs.map((tile) =>
        new THREE.Box3().setFromObject(tile.renderObjects[0].object3d)
      );

      const filteredBoxes = tileBoxes.filter(
        (box) =>
          areaLimitedBox.intersectsBox(box) || areaLimitedBox.containsBox(box)
      );

      const finalPanelBox = filteredBoxes[0];
      for (const filteredBox of filteredBoxes) {
        finalPanelBox.union(filteredBox);
      }

      boundingBoxLimit2 = finalPanelBox;

      boundingBoxLimit.max.x = finalPanelBox.max.x;
      boundingBoxLimit.min.x = finalPanelBox.min.x;
      boundingBoxLimit.max.y = finalPanelBox.max.y;
      boundingBoxLimit.min.y = finalPanelBox.min.y;
    }

    // input
    // new DebugBoxByMinMax(
    //   this.viewModel.scene,
    //   areaLimitedBox.min,
    //   areaLimitedBox.max,
    //   new THREE.Color(0, 1, 1)
    // );

    // input limit withHeight
    // new DebugBoxByMinMax(
    //   this.viewModel.scene,
    //   boundingBoxLimit.min,
    //   boundingBoxLimit.max,
    //   new THREE.Color(1, 1, 0)
    // );

    // panel area
    // new DebugBoxByMinMax(
    //   this.viewModel.scene,
    //   boundingBoxLimit2.min,
    //   boundingBoxLimit2.max,
    //   new THREE.Color(1, 0, 0)
    // );
    console.log("boundingBoxLimit2", boundingBoxLimit2);

    const beamBoundingBoxes: THREE.Box3[] = [];
    const [beamObstaclesGroups, beamSpaceGroups] = this.#calculateBeamSpace(
      beamObjs,
      boundingBoxLimit2,
      beamBoundingBoxes
    );

    beamObstaclesGroups.sort((a, b) => a[0].max.z - b[0].max.z);
    beamSpaceGroups.sort((a, b) => a[0].max.z - b[0].max.z);

    const voxelNodes = this.#VoxelizeSpace(
      iter,
      minimum,
      normalObjs,
      boundingBoxLimit,
      beamSpaceGroups,
      beamObstaclesGroups,
      beamBoundingBoxes,
      areaLimitedBox,
      supportObjs,
      tileObjs
    );
    console.log("voxelNodes", voxelNodes);
    console.warn("Voxelization");

    // reset support space
    // // limit height
    const hostObjects = ReduxStore.getState().BIMSlice.hostObjects;
    const equipObj = hostObjects.filter((obj) => {
      if ("Family" in obj.meta)
        return String(obj.meta["Family"]).includes(
          // "Semiconductor equipment_routing test"
          "Samsung EQ Sample"
        );
    })[0];
    console.log("equipObj", equipObj);
    const equipBox = new THREE.Box3().setFromObject(
      equipObj.renderObjects[0].object3d
    );
    for (const voxel of this.supportSpaceVoxels) {
      voxel.box.max.z = equipBox.min.z;
    }

    // expand support space
    this.#expandVoxels(supportObjs);

    // set neighbor of support voxel
    for (const voxel of this.supportSpaceVoxels) {
      for (const voxelCompare of this.supportSpaceVoxels) {
        // not added, not self
        if (voxel.neighbors.includes(voxelCompare)) continue;
        if (voxel === voxelCompare) continue;

        // same x or same y
        if (
          voxel.location.x.toFixed(3) === voxelCompare.location.x.toFixed(3) ||
          voxel.location.y.toFixed(3) === voxelCompare.location.y.toFixed(3)
        ) {
          // distance < beam width
          if (
            +distanceOfBoxes(voxel.box, voxelCompare.box).toFixed(3) <=
            this.beamWidth / 100
          ) {
            voxel.neighbors.push(voxelCompare);
            voxelCompare.neighbors.push(voxel);
          }
        }
      }
    }

    console.log("supportSpaceVoxels", this.supportSpaceVoxels);
    // reset support space

    this.showVoxels();

    return voxelNodes;
  };

  run_waffle = (
    iter: number,
    minimum: number,
    auto: boolean = false,
    autoBoundingArea?: THREE.Box3
  ) => {
    console.log("run waffle");
    // this.InputMeshes();

    // 1. separate input objects
    const waffles: HostObject[] = [];
    const [beamObjs, normalObjs, floorObjs, supportObjs, tileObjs] =
      this.SeparateObjs(waffles);

    console.log("beamObjs", beamObjs);
    console.log("waffles", waffles);
    console.log("supportObjs", supportObjs);
    console.log("tileObjs", tileObjs);
    // const boundingBoxLimit = this.CreateBoundingBox(normalObjs);
    // const allBeam = [...beamObjs, ...waffles];

    // ---3. get bounding box of all objects---
    const boundingBoxForZ = VoxelManager.createBoundingBoxOfObjs([
      ...normalObjs,
      ...beamObjs,
    ]);

    // get areaLimitedBox
    const floorBox = new THREE.Box3().setFromObject(
      floorObjs[0].renderObjects[0].object3d
    );
    let areaLimitedBox = floorBox;

    //#region use user input bounding box
    if (!auto) {
      const boxMesh = ReduxStore.getState().BoundBoxSlice.boundBox;
      const inputBoundingBox = new THREE.Box3().setFromObject(boxMesh);
      console.warn("inputBoundingBox when voxel", inputBoundingBox);
      if (
        isFinite(inputBoundingBox.max.x) &&
        isFinite(inputBoundingBox.max.y) &&
        isFinite(inputBoundingBox.max.z)
      ) {
        areaLimitedBox = inputBoundingBox;
      }
      console.log("boundingBox", areaLimitedBox);
    }
    //#endregion

    // auto gen bounding box
    else {
      areaLimitedBox = autoBoundingArea!;
    }

    // get boundingBoxLimit
    let boundingBoxLimit = new THREE.Box3();
    // if there are floors, use floor xy range and box z range
    if (floorObjs.length > 0) {
      console.log("with floor obj", floorObjs);
      boundingBoxLimit = new THREE.Box3().setFromObject(
        floorObjs[0].renderObjects[0].object3d
      );
      boundingBoxLimit.min.z = boundingBoxForZ.min.z;
      boundingBoxLimit.max.z = boundingBoxForZ.max.z;
      console.log("boundingBoxLimit", boundingBoxLimit);
    }
    // if no floor, just use bounding box range
    else {
      boundingBoxLimit = boundingBoxForZ;
      console.log("no floor obj, use bounding box", boundingBoxForZ);
    }

    console.log("boundingBoxAllObj", boundingBoxForZ);

    let boundingBoxLimit2 = cloneDeep(boundingBoxLimit);

    if (tileObjs.length > 0) {
      const tileBoxes = tileObjs.map((tile) =>
        new THREE.Box3().setFromObject(tile.renderObjects[0].object3d)
      );

      const filteredBoxes = tileBoxes.filter(
        (box) =>
          areaLimitedBox.intersectsBox(box) || areaLimitedBox.containsBox(box)
      );

      const finalPanelBox = filteredBoxes[0];
      for (const filteredBox of filteredBoxes) {
        finalPanelBox.union(filteredBox);
      }

      boundingBoxLimit2 = finalPanelBox;

      boundingBoxLimit.max.x = finalPanelBox.max.x;
      boundingBoxLimit.min.x = finalPanelBox.min.x;
      boundingBoxLimit.max.y = finalPanelBox.max.y;
      boundingBoxLimit.min.y = finalPanelBox.min.y;
    }
    // ---3. get bounding box of all objects---

    console.log("boundingBoxLimit2", boundingBoxLimit2);

    const beamBoundingBoxes: THREE.Box3[] = [];
    const [beamObstaclesGroups, beamSpaceGroups] = this.#calculateBeamSpace(
      beamObjs,
      boundingBoxLimit2,
      beamBoundingBoxes
    );

    beamObstaclesGroups.sort((a, b) => a[0].max.z - b[0].max.z);
    beamSpaceGroups.sort((a, b) => a[0].max.z - b[0].max.z);

    const voxelNodes = this.#VoxelizeSpace(
      iter,
      minimum,
      normalObjs,
      boundingBoxLimit,
      beamSpaceGroups,
      beamObstaclesGroups,
      beamBoundingBoxes,
      areaLimitedBox,
      supportObjs,
      tileObjs
    );
    console.log("voxelNodes", voxelNodes);
    console.warn("Voxelization");

    // reset support space
    // // limit height
    const hostObjects = ReduxStore.getState().BIMSlice.hostObjects;
    const equipObj = hostObjects.filter((obj) => {
      if ("Family" in obj.meta)
        return String(obj.meta["Family"]).includes(
          // "Semiconductor equipment_routing test"
          "Samsung EQ Sample"
        );
    })[0];
    console.log("equipObj", equipObj);
    const equipBox = new THREE.Box3().setFromObject(
      equipObj.renderObjects[0].object3d
    );
    for (const voxel of this.supportSpaceVoxels) {
      voxel.box.max.z = equipBox.min.z;
    }

    // expand support space
    //TODO here
    this.#expandVoxels(supportObjs);

    // set neighbor of support voxel
    for (const voxel of this.supportSpaceVoxels) {
      for (const voxelCompare of this.supportSpaceVoxels) {
        // not added, not self
        if (voxel.neighbors.includes(voxelCompare)) continue;
        if (voxel === voxelCompare) continue;

        // same x or same y
        if (
          voxel.location.x.toFixed(3) === voxelCompare.location.x.toFixed(3) ||
          voxel.location.y.toFixed(3) === voxelCompare.location.y.toFixed(3)
        ) {
          // distance < beam width
          if (
            +distanceOfBoxes(voxel.box, voxelCompare.box).toFixed(3) <=
            this.beamWidth / 100
          ) {
            voxel.neighbors.push(voxelCompare);
            voxelCompare.neighbors.push(voxel);
          }
        }
      }
    }

    console.log("supportSpaceVoxels", this.supportSpaceVoxels);
    // reset support space

    this.showVoxels();

    return voxelNodes;
  };

  divideVoxels = async (voxels: VoxelNode[], division: number) => {
    const newVoxelsAll: VoxelNode[] = [];
    console.log("originalVoxels", voxels);
    for (const originalVoxel of voxels) {
      const thisNewVoxels: VoxelNode[] = [];
      const size = new THREE.Vector3();
      originalVoxel.box.getSize(size);

      // const numDivisionsX = Math.max(1, Math.floor(size.x / minSize));
      // const numDivisionsY = Math.max(1, Math.floor(size.y / minSize));
      // const numDivisionsZ = Math.max(1, Math.floor(size.z / minSize));
      // console.log("minSize", minSize);

      // TODO ===== temp use for branch =====
      const numDivisionsX = division;
      // const numDivisionsX = 4;
      const numDivisionsY = division;
      // const numDivisionsY = 4;
      const numDivisionsZ = division;
      // const numDivisionsZ = 4;
      // TODO ===== temp use for branch =====

      // console.log("size", size);
      // console.log("numDivisionsX", numDivisionsX);
      // console.log("numDivisionsY", numDivisionsY);
      // console.log("numDivisionsZ", numDivisionsZ);

      const stepX = size.x / numDivisionsX;
      const stepY = size.y / numDivisionsY;
      const stepZ = size.z / numDivisionsZ;
      // console.log("stepX", stepX);
      // console.log("stepY", stepY);
      // console.log("stepZ", stepZ);

      originalVoxel.childrenShape.x = numDivisionsX;
      originalVoxel.childrenShape.y = numDivisionsY;
      originalVoxel.childrenShape.z = numDivisionsZ;

      // create voxel
      // let count = 0;
      for (let i = 0; i < numDivisionsX; i++) {
        for (let j = 0; j < numDivisionsY; j++) {
          for (let k = 0; k < numDivisionsZ; k++) {
            const newMin = new THREE.Vector3(
              originalVoxel.box.min.x + i * stepX,
              originalVoxel.box.min.y + j * stepY,
              originalVoxel.box.min.z + k * stepZ
            );
            const newMax = new THREE.Vector3(
              newMin.x + stepX,
              newMin.y + stepY,
              newMin.z + stepZ
            );
            const newVoxel = new VoxelNode(new THREE.Box3(newMin, newMax));
            newVoxel.nodeId = this.voxelNodes.length;
            originalVoxel.dividedChildren.push(newVoxel);
            newVoxel.dividedParentNode = originalVoxel;
            newVoxel.positionInParent = new THREE.Vector3(i, j, k);
            thisNewVoxels.push(newVoxel);
            this.voxelNodes.push(newVoxel);
          }
        }
      }

      // find neighbor
      for (const newVoxel of thisNewVoxels) {
        // get neighbor each other
        for (const newVoxelCompared of thisNewVoxels) {
          if (newVoxel === newVoxelCompared) continue;
          if (newVoxel.neighbors.includes(newVoxelCompared)) continue;
          if (areBoxesNeighbors(newVoxel.box, newVoxelCompared.box)) {
            newVoxel.neighbors.push(newVoxelCompared);
            newVoxelCompared.neighbors.push(newVoxel);
          }
        }
        // get neighbor from original voxel
        for (const originalNeighbor of originalVoxel.neighbors) {
          for (const neighborChild of originalNeighbor.dividedChildren) {
            if (
              newVoxel.location.z.toFixed(0) ===
                neighborChild.location.z.toFixed(0) &&
              (newVoxel.location.x.toFixed(0) ===
                neighborChild.location.x.toFixed(0) ||
                newVoxel.location.y.toFixed(0) ===
                  neighborChild.location.y.toFixed(0))
            ) {
              if (
                +distanceOfBoxes(newVoxel.box, neighborChild.box).toFixed(3) <=
                  this.beamWidth / 100 &&
                !neighborChild.neighbors.includes(newVoxel)
              ) {
                newVoxel.neighbors.push(neighborChild);
                neighborChild.neighbors.push(newVoxel);
              }
            }
          }
        }
      }
      newVoxelsAll.push(...thisNewVoxels);
    }
    console.log("newVoxelsAll", newVoxelsAll);
    return newVoxelsAll;
  };

  #expandVoxels = (supportObjs: HostObject[]) => {
    for (const voxel of this.supportSpaceVoxels) {
      const min = voxel.box.min;
      const max = voxel.box.max;
      const leftBottom = new THREE.Vector3(min.x, min.y, min.z);
      const rightBottom = new THREE.Vector3(max.x, min.y, min.z);
      const leftTop = new THREE.Vector3(min.x, max.y, min.z);
      const rightTop = new THREE.Vector3(max.x, max.y, min.z);
      const voxelPts = [leftBottom, rightBottom, leftTop, rightTop];

      let leftBackSupportBox: THREE.Box3 | undefined = undefined;
      let rightBackSupportBox: THREE.Box3 | undefined = undefined;
      let leftTopSupportBox: THREE.Box3 | undefined = undefined;
      let rightTopSupportBox: THREE.Box3 | undefined = undefined;

      let LBDist = Infinity;
      let RBDist = Infinity;
      let LTDist = Infinity;
      let RTDist = Infinity;

      // every point find nearest box
      for (const obj of supportObjs) {
        // get bounding box
        const objBox = new THREE.Box3().setFromObject(
          obj.renderObjects[0].object3d
        );
        // find nearest box of each point
        if (objBox.distanceToPoint(leftBottom) < LBDist) {
          LBDist = objBox.distanceToPoint(leftBottom);
          leftBackSupportBox = objBox;
        }
        if (objBox.distanceToPoint(rightBottom) < RBDist) {
          RBDist = objBox.distanceToPoint(rightBottom);
          rightBackSupportBox = objBox;
        }
        if (objBox.distanceToPoint(leftTop) < LTDist) {
          LTDist = objBox.distanceToPoint(leftTop);
          leftTopSupportBox = objBox;
        }
        if (objBox.distanceToPoint(rightTop) < RTDist) {
          RTDist = objBox.distanceToPoint(rightTop);
          rightTopSupportBox = objBox;
        }
      }

      const nearBoxes: (THREE.Box3 | undefined)[] = [
        leftBackSupportBox,
        rightBackSupportBox,
        leftTopSupportBox,
        rightTopSupportBox,
      ];
      // console.log("nearBoxes", nearBoxes);
      const cullDuplicated = [...new Set(nearBoxes)];
      // console.log("cullDuplicated", cullDuplicated);

      if (cullDuplicated.length === 4) {
        // console.log("4 situation");
        voxel.box.min.x = leftBackSupportBox!.max.x;
        voxel.box.min.y = leftBackSupportBox!.max.y;
        voxel.box.max.x = rightTopSupportBox!.min.x;
        voxel.box.max.y = rightTopSupportBox!.min.y;
      }

      if (cullDuplicated.length === 2) {
        // console.log("2 situation");
        const nearBox1 = cullDuplicated[0];
        const nearBox2 = cullDuplicated[1];
        // console.log("nearBox1", nearBox1);
        // console.log("nearBox2", nearBox2);
        if (nearBox1!.max.x.toFixed(0) === nearBox2!.max.x.toFixed(0)) {
          if (nearBox1!.min.x > rightTop.x) {
            voxel.box.max.x = nearBox1!.min.x;
          }
          if (nearBox1!.max.x < leftBottom.x) {
            voxel.box.min.x = nearBox1!.max.x;
          }
          const topY =
            nearBox1!.min.y > nearBox2!.min.y
              ? nearBox1!.min.y
              : nearBox2!.min.y;
          const bottomY =
            nearBox1!.max.y < nearBox2!.max.y
              ? nearBox1!.max.y
              : nearBox2!.max.y;

          voxel.box.min.y = bottomY;
          voxel.box.max.y = topY;
        }
        if (nearBox1!.max.y.toFixed(0) === nearBox2!.max.y.toFixed(0)) {
          if (nearBox1!.min.y > rightTop.y) {
            voxel.box.max.y = nearBox1!.min.y;
          }
          if (nearBox1!.max.y < leftBottom.y) {
            voxel.box.min.y = nearBox1!.max.y;
          }
          const rightX =
            nearBox1!.min.x > nearBox2!.min.x
              ? nearBox1!.min.x
              : nearBox2!.min.x;
          const leftX =
            nearBox1!.max.x < nearBox2!.max.x
              ? nearBox1!.max.x
              : nearBox2!.max.x;

          voxel.box.min.x = leftX;
          voxel.box.max.x = rightX;
        }
      }

      if (cullDuplicated.length === 1) {
        // console.log("1 situation");
        const nearBox = cullDuplicated[0];
        const ptsClone = [...voxelPts];
        const nearPoint = ptsClone.sort(
          (a, b) => nearBox!.distanceToPoint(a) - nearBox!.distanceToPoint(b)
        )[0];
        const nearIndex = voxelPts.findIndex((pt) => pt === nearPoint);
        if (nearIndex === 0) {
          voxel.box.min.x = nearBox!.max.x;
          voxel.box.min.y = nearBox!.max.y;
        }
        if (nearIndex === 1) {
          voxel.box.max.x = nearBox!.min.x;
          voxel.box.min.y = nearBox!.max.y;
        }
        if (nearIndex === 2) {
          voxel.box.min.x = nearBox!.max.x;
          voxel.box.max.y = nearBox!.min.y;
        }
        if (nearIndex === 3) {
          voxel.box.max.x = nearBox!.min.x;
          voxel.box.max.y = nearBox!.min.y;
        }
      }
    }
  };

  #calculateBeamSpace(
    hostObjs: HostObject[],
    boundingBoxLimit: THREE.Box3,
    beamBoundingBoxes: THREE.Box3[]
  ) {
    const beamRenderObjGroups: Object3D[][] = [];
    const heightList: number[] = [];
    console.log("boundingBoxLimit", boundingBoxLimit);
    // for (const box of beamBoundingBoxes) {
    // new DebugBoxByMinMax(
    //   this.viewModel.scene,
    //   boundingBoxLimit.min,
    //   boundingBoxLimit.max,
    //   new THREE.Color(1, 1, 0)
    // );
    // }

    // --- step1 collect and group BEAM data ---
    for (const hostObj of hostObjs) {
      const beam = hostObj as Beam;
      if (beam) {
        const height = parseFloat(beam.StartPoint.z.toFixed(3));
        // if the height is not exist, create new group
        if (!heightList.includes(height)) {
          const beamRenderObjs: Object3D[] = [];
          for (const renderObj of beam.renderObjects) {
            beamRenderObjs.push(renderObj);
          }
          beamRenderObjGroups.push(beamRenderObjs);

          heightList.push(height);
        }
        // if the height is exist, push to the group
        else {
          const index = heightList.findIndex((h) => h === height);
          for (const renderObj of beam.renderObjects) {
            beamRenderObjGroups[index].push(renderObj);
          }
        }
      }
    }
    console.log("beamRenderObjGroups", beamRenderObjGroups);

    // --- step2 create bounding box ---
    const beamObstaclesGroups: THREE.Box3[][] = [];
    const boundingBoxes: THREE.Box3[] = [];
    for (const beamRenderObjs of beamRenderObjGroups) {
      const boundingBox = new THREE.Box3().setFromObject(
        beamRenderObjs[0].object3d
      );
      const beamObstaclesGroup: THREE.Box3[] = [];
      for (const obj of beamRenderObjs) {
        boundingBox.expandByObject(obj.object3d);
        const beamObstacle = new THREE.Box3().setFromObject(obj.object3d);
        if (beamObstacle.max.z > boundingBox.min.z)
          beamObstaclesGroup.push(beamObstacle);
      }
      beamObstaclesGroups.push(beamObstaclesGroup);

      for (const existingBox of boundingBoxes) {
        boundingBox.min.x =
          existingBox.min.x < boundingBox.min.x
            ? existingBox.min.x
            : boundingBox.min.x;
        boundingBox.min.y =
          existingBox.min.y < boundingBox.min.y
            ? existingBox.min.y
            : boundingBox.min.y;
        boundingBox.max.x =
          existingBox.max.x > boundingBox.max.x
            ? existingBox.max.x
            : boundingBox.max.x;
        boundingBox.max.y =
          existingBox.max.y > boundingBox.max.y
            ? existingBox.max.y
            : boundingBox.max.y;
      }

      boundingBox.min.x = boundingBoxLimit.min.x;
      boundingBox.max.x = boundingBoxLimit.max.x;
      boundingBox.min.y = boundingBoxLimit.min.y;
      boundingBox.max.y = boundingBoxLimit.max.y;

      // new DebugBoxByMinMax(
      //   this.viewModel.scene,
      //   boundingBox.min,
      //   boundingBox.max,
      //   new THREE.Color(1, 1, 0)
      // );
      console.log("boundingBox", boundingBox);
      boundingBoxes.push(boundingBox);
    }
    console.log("boundingBoxes", [...boundingBoxes]);
    beamBoundingBoxes.push(...boundingBoxes);

    // --- step3 divide bounding box ---
    //--------------------------------------------------!!!!!
    const spaceGroups: THREE.Box3[][] = [];
    for (const [i, boundingBox] of boundingBoxes.entries()) {
      // new DebugBoxByMinMax(
      //   this.viewModel.scene,
      //   boundingBox.min,
      //   boundingBox.max,
      //   new THREE.Color(1, 1, 0)
      // );

      const spaces: THREE.Box3[] = [];
      const xRanges: { min: number; max: number }[] = [];
      const yRanges: { min: number; max: number }[] = [];

      // 3-1 get range of boundingBox
      const bBoxXRange: Range = {
        min: boundingBox.min.x,
        max: boundingBox.max.x,
      };
      const bBoxYRange: Range = {
        min: boundingBox.min.y,
        max: boundingBox.max.y,
      };

      // 3-2 get grid range
      for (const beamObj of beamRenderObjGroups[i]) {
        const beamBox = new THREE.Box3().setFromObject(beamObj.object3d);
        const size = new THREE.Vector3();
        beamBox.getSize(size);
        // y dir beam
        if (size.y > size.x) {
          if (
            beamBox.max.x > bBoxXRange.min &&
            beamBox.min.x < bBoxXRange.max
          ) {
            const boxXRange: Range = { min: beamBox.min.x, max: beamBox.max.x };
            xRanges.push(boxXRange);
          }
        }
        // x dir beam
        else if (size.x > size.y) {
          if (
            beamBox.max.y > bBoxYRange.min &&
            beamBox.min.y < bBoxYRange.max
          ) {
            const boxYRange: Range = { min: beamBox.min.y, max: beamBox.max.y };
            yRanges.push(boxYRange);
          }
        }
        // console.log("newBox3", newBox3);
      }
      // console.log("xRanges", xRanges);
      // console.log("yRanges", yRanges);

      console.log("bBoxXRange", bBoxXRange);
      console.log("bBoxYRange", bBoxYRange);

      // 3-3 divide the range
      const gridSpaceXRange = splitRangeBySubRanges(bBoxXRange, xRanges);
      const gridSpaceYRange = splitRangeBySubRanges(bBoxYRange, yRanges);
      console.log("gridSpaceXRange", gridSpaceXRange);
      console.log("gridSpaceYRange", gridSpaceYRange);

      // 3-4 make sub box
      for (const subBoxX of gridSpaceXRange) {
        for (const subBoxY of gridSpaceYRange) {
          const newMin = new THREE.Vector3(
            subBoxX.min,
            subBoxY.min,
            boundingBox.min.z
          );
          const newMax = new THREE.Vector3(
            subBoxX.max,
            subBoxY.max,
            boundingBox.max.z
          );
          const newSubBox = new THREE.Box3(newMin, newMax);
          spaces.push(newSubBox);
        }
      }

      spaceGroups.push(spaces);
    }
    console.log("spaceGroups", spaceGroups);

    return [beamObstaclesGroups, spaceGroups];
  }

  #VoxelizeSpace(
    iter: number,
    minSize: number,
    normalObjs: HostObject[],
    boundingBox: THREE.Box3,
    spaceGroupsOfBeam: THREE.Box3[][],
    beamObstaclesGroups: THREE.Box3[][],
    boundingBoxesOfBeamGroup: THREE.Box3[],
    areaLimitedBox: THREE.Box3,
    supportObjs: HostObject[],
    tileObjs: HostObject[]
  ) {
    console.log("beamObstaclesGroups", beamObstaclesGroups);
    this.iter = iter;

    if (normalObjs.length > 0) {
      // console.log("normalObj", hostObjects);
      const meshObjs: THREE.Mesh[] = [];
      for (const obj of normalObjs) {
        for (const renderingObj of obj.renderObjects) {
          const mesh = renderingObj.object3d as THREE.Mesh;
          if (mesh) meshObjs.push(mesh);
        }
      }
      // ----- step 0. clear original mesh -----
      // for (let i = this.viewModel.scene.children.length - 1; i >= 0; i--) {
      //   const obj = this.viewModel.scene.children[i];
      //   if (obj.type === "Mesh" && obj.name !== "sky")
      //     this.viewModel.scene.remove(this.viewModel.scene.children[i]);
      // }

      // ----- step 1. modify bounding box -----
      const boundingBoxZRange: Range = {
        min: boundingBox.min.z,
        max: boundingBox.max.z,
      };

      const beamAndSupportOccupiedRange: Range[] = [];
      for (const beamSpaceGroup of spaceGroupsOfBeam) {
        const beamRange: Range = {
          min: beamSpaceGroup[0].min.z,
          max: beamSpaceGroup[0].max.z,
        };
        beamAndSupportOccupiedRange.push(beamRange);
      }

      // separate support space
      const supportObjBox = new THREE.Box3();
      if (supportObjs.length > 0) {
        supportObjBox.setFromObject(supportObjs[0].renderObjects[0].object3d);
        for (const support of supportObjs) {
          supportObjBox.expandByObject(support.renderObjects[0].object3d);
        }
      }

      if (tileObjs.length > 0)
        supportObjBox.expandByObject(tileObjs[0].renderObjects[0].object3d);

      const supportHeightRange: Range = {
        min: supportObjBox.min.z,
        max: supportObjBox.max.z,
      };

      const cloneBoxes = cloneDeep(spaceGroupsOfBeam);
      const nearSupportSpaceGroup = cloneBoxes.sort(
        (a, b) =>
          Math.abs(a[0].min.z - supportHeightRange.max) -
          Math.abs(b[0].min.z - supportHeightRange.max)
      )[0];

      // find nearest space of support space
      const supportSpaceAll = nearSupportSpaceGroup.map((space) => {
        const newMax = new THREE.Vector3(
          space.max.x,
          space.max.y,
          supportHeightRange.max
        );
        const newMin = new THREE.Vector3(
          space.min.x,
          space.min.y,
          supportHeightRange.min
        );
        const newBox = new THREE.Box3(newMin, newMax);
        return newBox;
      });

      beamAndSupportOccupiedRange.push(supportHeightRange);

      // split original space
      const newZRanges = splitRangeBySubRanges(
        boundingBoxZRange,
        beamAndSupportOccupiedRange
      );

      console.log("boundingBoxZRange", boundingBoxZRange);
      console.log("beamAndSupportOccupiedRange", beamAndSupportOccupiedRange);
      console.log("newZRanges", newZRanges);

      const newBoundingBoxes: THREE.Box3[] = [];
      for (const newZRange of newZRanges) {
        const newMin = new THREE.Vector3(
          areaLimitedBox.min.x,
          areaLimitedBox.min.y,
          newZRange.min
        );
        const newMax = new THREE.Vector3(
          areaLimitedBox.max.x,
          areaLimitedBox.max.y,
          newZRange.max
        );
        const newBoundingBox = new THREE.Box3(newMin, newMax);

        newBoundingBoxes.push(newBoundingBox);

        // for test
        new DebugBoxByMinMax(
          this.viewModel.scene,
          newBoundingBox.min,
          newBoundingBox.max,
          new THREE.Color(1, 0, 0)
        );
      }

      // //#region  --test draw--
      // for (const space of newBoundingBoxes) {
      //   const size = new THREE.Vector3();
      //   const center = new THREE.Vector3();
      //   space.getSize(size);
      //   space.getCenter(center);

      //   const boxGeometry = new THREE.BoxGeometry(
      //     size.x - 1,
      //     size.y - 1,
      //     size.z - 1
      //   );
      //   let material: THREE.Material = this.voxelMaterialEmpty;
      //   const boxMesh = new THREE.Mesh(boxGeometry, material);
      //   boxMesh.position.copy(center);
      //   this.voxelIndexes.push(this.viewModel.scene.children.length);
      //   this.viewModel.scene.children.push(boxMesh);
      // }
      // //#endregion --test draw--

      // ----- step 2. create bounding box for each mesh -----
      const objBoundingBoxes: THREE.Box3[] = [];

      for (const mesh of meshObjs) {
        //#region Drop.
        // // method1 simple bounding box
        // const meshBox = new THREE.Box3().setFromObject(mesh);
        // meshBoundingBoxes.push(meshBox);
        //#endregion

        // method2 voxelize the object
        objBoundingBoxes.push(...VoxelizeObj(mesh, this.voxelizeObjDivider));
      }

      this.obstacleBoxes = objBoundingBoxes;
      console.log("meshBoundingBoxes", objBoundingBoxes);

      // ----- step 3. cut bounding box of space (AABB) -----
      const allNodesGeneration: VoxelNode[] = [];
      const includedIndex: number[] = [];
      const inputBoxGroup: VoxelNode[][] = [];

      // set voxel of support space
      const supportVoxels = supportSpaceAll.map(
        (supportSpace) => new VoxelNode(supportSpace)
      );

      // TODO here
      // this.supportSpaceVoxels = supportVoxels;
      // allNodesGeneration.push(...supportVoxels);

      for (const [i, boundingBox] of newBoundingBoxes.entries()) {
        // --- cull voxel upon the panel ---
        if (i === newBoundingBoxes.length - 1) continue;
        // --- cull voxel upon the panel ---

        let allNodes: VoxelNode[] = [];
        const firstTestVoxel = new VoxelNode(boundingBox);
        for (const supportVoxel of supportVoxels) {
          if (areBoxesNeighbors(supportVoxel.box, firstTestVoxel.box)) {
            supportVoxel.neighbors.push(firstTestVoxel);
            firstTestVoxel.neighbors.push(supportVoxel);
          }
        }

        allNodes.push(firstTestVoxel);
        // console.log("mesh bounding box", index, boundingBox);

        for (const [i, beamBoxes] of spaceGroupsOfBeam.entries()) {
          // console.log(
          //   `boundingBoxesOfBeamGroup ${i}`,
          //   boundingBoxesOfBeamGroup[i]
          // );
          // console.log(
          //   "is neighbor? ",
          //   areBoxesNeighbors(boundingBoxesOfBeamGroup[i], boundingBox)
          // );

          // if beam layer and the space is neighbor
          if (areBoxesNeighbors(boundingBoxesOfBeamGroup[i], boundingBox)) {
            // if the layer is inside
            if (!includedIndex.includes(i)) {
              includedIndex.push(i);
              const inputBoxes: VoxelNode[] = [];

              // input rest space
              for (const beamRestSpaceBox of beamBoxes) {
                const beamRestSpaceVoxel = new VoxelNode(beamRestSpaceBox);
                beamRestSpaceVoxel.isGrid = true;
                // add support space neighbor
                for (const supportVoxel of supportVoxels) {
                  if (
                    areBoxesNeighbors(supportVoxel.box, beamRestSpaceVoxel.box)
                  ) {
                    supportVoxel.neighbors.push(beamRestSpaceVoxel);
                    beamRestSpaceVoxel.neighbors.push(supportVoxel);
                  }
                }

                beamRestSpaceVoxel.neighbors.push(firstTestVoxel);
                firstTestVoxel.neighbors.push(beamRestSpaceVoxel);

                inputBoxes.push(beamRestSpaceVoxel);
                allNodes.push(beamRestSpaceVoxel);
              }

              // input beam obstacles
              for (const beamObstacles of beamObstaclesGroups[i]) {
                const firstGenerationObstacle = new VoxelNode(beamObstacles);
                firstGenerationObstacle.canBeDivided = false;
                firstGenerationObstacle.isAvailable = false;
                for (const firstGenerationBox of inputBoxes) {
                  if (
                    areBoxesNeighbors(
                      firstGenerationBox.box,
                      firstGenerationObstacle.box
                    )
                  ) {
                    firstGenerationBox.neighbors.push(firstGenerationObstacle);
                    firstGenerationObstacle.neighbors.push(firstGenerationBox);
                  }
                }
                // console.log("the beam obj", firstGenerationObstacle);
                inputBoxes.push(firstGenerationObstacle);
                allNodes.push(firstGenerationObstacle);
              }

              inputBoxGroup.push(inputBoxes);
              // console.log("in add in.");
            }
            // if the layer is not inside
            else {
              const exitingIndexPos = includedIndex.findIndex(
                (element) => element === i
              );
              // console.log("exitingIndexPos", exitingIndexPos);

              for (const voxel of inputBoxGroup[exitingIndexPos]) {
                voxel.neighbors.push(firstTestVoxel);
                firstTestVoxel.neighbors.push(voxel);
              }

              // console.log("voxels", inputBoxGroup[exitingIndexPos]);
            }
          } else {
            // console.log("not add in"); // if beam layer and the space is not neighbor
          }
        }

        for (let i = 0; i < iter; i++) {
          console.log("---------------------");
          console.log("iter:", i);
          console.log("allBoxSpace before", allNodes);
          const allBoxSpaceNew: VoxelNode[] = [];
          for (const parentBox of allNodes) {
            if (!parentBox.canBeDivided) continue;
            // console.log("indexBox", indexBox);
            const thisGeneration: VoxelNode[] = [];

            for (const meshBox of objBoundingBoxes) {
              // console.log("indexMesh", indexMesh);
              // has intersection
              const isCollision = isIntersectingBox3(parentBox.box, meshBox);
              if (isCollision) {
                // check box is not divided yet
                if (parentBox.isDivided) continue;

                parentBox.isDivided = true;

                const size = new THREE.Vector3();
                parentBox.box.getSize(size); // get size of original Box3

                const center = new THREE.Vector3();
                parentBox.box.getCenter(center); // get center of original Box3

                // Check whether the split size in each dimension meets the minimum size requirements
                const shouldSplitX = size.x / 2 >= minSize;
                const shouldSplitY = size.y / 2 >= minSize;
                const shouldSplitZ = size.z / 2 >= minSize;

                // Loop based on the flag of whether it should be split or not. If a dimension should not be split, the number of loops is 1, otherwise it is 2
                for (let x = 0; x < (shouldSplitX ? 2 : 1); x++) {
                  for (let y = 0; y < (shouldSplitY ? 2 : 1); y++) {
                    for (let z = 0; z < (shouldSplitZ ? 2 : 1); z++) {
                      // Calculate the offset of the new Box3. If not split, the offset is 0.
                      const offsetX = shouldSplitX
                        ? ((x === 0 ? -0.5 : 0.5) * size.x) / 2
                        : 0;
                      const offsetY = shouldSplitY
                        ? ((y === 0 ? -0.5 : 0.5) * size.y) / 2
                        : 0;
                      const offsetZ = shouldSplitZ
                        ? ((z === 0 ? -0.5 : 0.5) * size.z) / 2
                        : 0;

                      // Create min and max points of new Box3
                      const newMin = new THREE.Vector3(
                        center.x +
                          offsetX -
                          (shouldSplitX ? size.x / 4 : size.x / 2),
                        center.y +
                          offsetY -
                          (shouldSplitY ? size.y / 4 : size.y / 2),
                        center.z +
                          offsetZ -
                          (shouldSplitZ ? size.z / 4 : size.z / 2)
                      );
                      const newMax = new THREE.Vector3(
                        center.x +
                          offsetX +
                          (shouldSplitX ? size.x / 4 : size.x / 2),
                        center.y +
                          offsetY +
                          (shouldSplitY ? size.y / 4 : size.y / 2),
                        center.z +
                          offsetZ +
                          (shouldSplitZ ? size.z / 4 : size.z / 2)
                      );
                      const subBox = new THREE.Box3(newMin, newMax);

                      const subBoxSpace = new VoxelNode(subBox);

                      for (const MeshBox2 of objBoundingBoxes) {
                        if (isIntersectingBox3(subBoxSpace.box, MeshBox2))
                          subBoxSpace.isAvailable = false;
                      }
                      // allBoxSpaceNew.push(subBoxSpace);
                      thisGeneration.push(subBoxSpace);
                    }
                  }
                }
              }
            }

            //find neighbor of this generation
            for (const thisBox of thisGeneration) {
              for (const neighborBox of parentBox.neighbors) {
                // add parent's neighbor to child
                if (areBoxesNeighbors(thisBox.box, neighborBox.box)) {
                  // update thisBox
                  thisBox.neighbors.push(neighborBox);
                }
              }
              // add this generation neighbor
              for (const compareBox of thisGeneration) {
                if (areBoxesNeighbors(thisBox.box, compareBox.box))
                  thisBox.neighbors.push(compareBox);
              }
            }

            // update neighbor of parent
            if (thisGeneration.length > 0) {
              for (const neighborBox of parentBox.neighbors) {
                for (const originalBox of neighborBox.neighbors) {
                  if (originalBox.isDivided) {
                    // cull origin box
                    neighborBox.neighbors = neighborBox.neighbors.filter(
                      (item) => item !== originalBox
                    );

                    // if intersect, add new child box
                    for (const thisBox of thisGeneration) {
                      if (areBoxesNeighbors(thisBox.box, neighborBox.box))
                        neighborBox.neighbors.push(thisBox);
                    }
                  }
                }
              }
            }

            // // add sub space to array
            allBoxSpaceNew.push(...thisGeneration);

            // searched space without intersection
            if (parentBox.isDivided !== true) {
              allBoxSpaceNew.push(parentBox);
            }
          }
          //update space array
          allNodes = allBoxSpaceNew;
          console.log("allBoxSpace after", allNodes);
        }
        allNodesGeneration.push(...allNodes);
      }

      // ----- step 5. create mesh and draw -----
      console.log("allBoxSpace.length", allNodesGeneration.length);

      this.voxelNodes = allNodesGeneration;
      for (const [index, voxelNode] of this.voxelNodes.entries()) {
        voxelNode.nodeId = index;
      }
      return allNodesGeneration;
    } else {
      console.error("There's no mesh, please input first");
    }
  }

  showObstacleBoxes() {
    for (const box of this.obstacleBoxes) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const material: THREE.Material = this.voxelMaterialTest;

      const boxMesh = new THREE.Mesh(boxGeometry, material);
      boxMesh.position.copy(center);

      this.voxelIndexes.push(this.viewModel.scene.children.length);
      this.viewModel.scene.children.push(boxMesh);
    }
  }

  //#endregion

  GetVoxelsInfo() {
    const voxelsInfo: VoxelsInfo = {
      iter: this.iter,
      maxSize: new THREE.Vector3(0, 0, 0),
      minSize: new THREE.Vector3(Infinity, Infinity, Infinity),
      allSizes: [],
    };
    for (const voxel of this.voxelNodes) {
      const thisSize = new THREE.Vector3();
      voxel.box.getSize(thisSize);

      if (
        thisSize.x > voxelsInfo.maxSize.x &&
        thisSize.y > voxelsInfo.maxSize.y &&
        thisSize.z > voxelsInfo.maxSize.z
      ) {
        voxelsInfo.maxSize = thisSize;
        voxelsInfo.allSizes.push(thisSize);
      }
      if (
        thisSize.x < voxelsInfo.minSize.x &&
        thisSize.y < voxelsInfo.minSize.y &&
        thisSize.z < voxelsInfo.minSize.z
      ) {
        voxelsInfo.minSize = thisSize;
        voxelsInfo.allSizes.push(thisSize);
      }
    }

    return voxelsInfo;
  }

  static createBoundingBoxOfObjs(hostObjects: HostObject[]) {
    // console.log("normalObj", hostObjects);
    const meshObjs: THREE.Mesh[] = [];
    for (const obj of hostObjects) {
      for (const renderingObj of obj.renderObjects) {
        if (renderingObj.object3d instanceof THREE.Mesh) {
          const mesh = renderingObj.object3d as THREE.Mesh;
          meshObjs.push(mesh);
        }
      }
    }

    const boundingBoxAll = new THREE.Box3().setFromObject(meshObjs[0]);
    for (const [index, mesh] of meshObjs.entries()) {
      if (index === 0) continue;
      boundingBoxAll.expandByObject(mesh);
    }
    return boundingBoxAll;
  }

  voxelizeSpacesByObstacle(
    iter: number,
    minSize: number,
    obstacles: HostObject[],
    spaces: THREE.Box3[],
    additionalObstacleBox?: THREE.Box3[]
  ) {
    // no input mesh
    if (obstacles.length === 0) {
      console.error("There's no mesh, please input first");
      alert("There's no mesh, please input first");
      throw new Error("There's no mesh, please input first");
    }
    // 0. collect obstacle
    const meshObjs: THREE.Mesh[] = [];
    for (const obj of obstacles) {
      for (const renderingObj of obj.renderObjects) {
        const mesh = renderingObj.object3d as THREE.Mesh;
        if (mesh) meshObjs.push(mesh);
      }
    }
    console.log("test before: ", [...meshObjs]);
    console.log("test after: ", [...meshObjs]);

    // 1. initialize container
    let allNodes: VoxelNode[] = [];
    const objBoundingBoxes: THREE.Box3[] = [];

    // 2. voxelize obj for detailed mesh
    for (const mesh of meshObjs) {
      objBoundingBoxes.push(...VoxelizeObj(mesh, this.voxelizeObjDivider));
    }
    if (additionalObstacleBox) objBoundingBoxes.push(...additionalObstacleBox);
    // this.obstacleBoxes = objBoundingBoxes;
    console.log("meshBoundingBoxes", objBoundingBoxes);

    // 3. cut bounding box of space (AABB)

    // 3-1 set initial space
    for (const space of spaces) {
      const originVoxel = new VoxelNode(space);
      allNodes.push(originVoxel);
    }

    // 3-2 set initial neighbor
    for (const voxel of allNodes) {
      for (const neighbor of allNodes) {
        if (areBoxesNeighbors(voxel.box, neighbor.box) && voxel !== neighbor) {
          voxel.neighbors.push(neighbor);
        }
      }
    }

    // 4. voxelize (every iter)
    for (let i = 0; i < iter; i++) {
      console.log("---------------------");
      console.log("iter:", i);
      console.log("allBoxSpace before", allNodes);
      const allBoxSpaceNew: VoxelNode[] = [];

      for (const parentNode of allNodes) {
        if (!parentNode.canBeDivided) continue;
        // console.log("indexBox", indexBox);
        const thisGeneration: VoxelNode[] = [];

        for (const meshBox of objBoundingBoxes) {
          // console.log("indexMesh", indexMesh);
          // has intersection
          const isCollision = isIntersectingBox3(parentNode.box, meshBox);
          if (isCollision) {
            // check box is not divided yet
            if (parentNode.isDivided) continue;

            parentNode.isDivided = true;

            const size = new THREE.Vector3();
            parentNode.box.getSize(size); // get size of original Box3

            const center = new THREE.Vector3();
            parentNode.box.getCenter(center); // get center of original Box3

            // Check whether the split size in each dimension meets the minimum size requirements
            const shouldSplitX = size.x / 2 >= minSize;
            const shouldSplitY = size.y / 2 >= minSize;
            const shouldSplitZ = size.z / 2 >= minSize;

            // Loop based on the flag of whether it should be split or not. If a dimension should not be split, the number of loops is 1, otherwise it is 2
            for (let x = 0; x < (shouldSplitX ? 2 : 1); x++) {
              for (let y = 0; y < (shouldSplitY ? 2 : 1); y++) {
                for (let z = 0; z < (shouldSplitZ ? 2 : 1); z++) {
                  // Calculate the offset of the new Box3. If not split, the offset is 0.
                  const offsetX = shouldSplitX
                    ? ((x === 0 ? -0.5 : 0.5) * size.x) / 2
                    : 0;
                  const offsetY = shouldSplitY
                    ? ((y === 0 ? -0.5 : 0.5) * size.y) / 2
                    : 0;
                  const offsetZ = shouldSplitZ
                    ? ((z === 0 ? -0.5 : 0.5) * size.z) / 2
                    : 0;

                  // Create min and max points of new Box3
                  const newMin = new THREE.Vector3(
                    center.x +
                      offsetX -
                      (shouldSplitX ? size.x / 4 : size.x / 2),
                    center.y +
                      offsetY -
                      (shouldSplitY ? size.y / 4 : size.y / 2),
                    center.z +
                      offsetZ -
                      (shouldSplitZ ? size.z / 4 : size.z / 2)
                  );
                  const newMax = new THREE.Vector3(
                    center.x +
                      offsetX +
                      (shouldSplitX ? size.x / 4 : size.x / 2),
                    center.y +
                      offsetY +
                      (shouldSplitY ? size.y / 4 : size.y / 2),
                    center.z +
                      offsetZ +
                      (shouldSplitZ ? size.z / 4 : size.z / 2)
                  );
                  const subBox = new THREE.Box3(newMin, newMax);

                  const subBoxSpace = new VoxelNode(subBox);

                  for (const MeshBox2 of objBoundingBoxes) {
                    if (isIntersectingBox3(subBoxSpace.box, MeshBox2))
                      subBoxSpace.isAvailable = false;
                  }
                  // allBoxSpaceNew.push(subBoxSpace);
                  thisGeneration.push(subBoxSpace);
                }
              }
            }
          }
        }

        //find neighbor of this generation
        for (const thisBox of thisGeneration) {
          for (const neighborBox of parentNode.neighbors) {
            // add parent's neighbor to child
            if (areBoxesNeighbors(thisBox.box, neighborBox.box)) {
              // update thisBox
              thisBox.neighbors.push(neighborBox);
            }
          }
          // add this generation neighbor
          for (const compareBox of thisGeneration) {
            if (areBoxesNeighbors(thisBox.box, compareBox.box))
              thisBox.neighbors.push(compareBox);
          }
        }

        // update neighbor of parent
        if (thisGeneration.length > 0) {
          for (const neighborBox of parentNode.neighbors) {
            for (const originalBox of neighborBox.neighbors) {
              if (originalBox.isDivided) {
                // cull origin box
                neighborBox.neighbors = neighborBox.neighbors.filter(
                  (item) => item !== originalBox
                );

                // if intersect, add new child box
                for (const thisBox of thisGeneration) {
                  if (areBoxesNeighbors(thisBox.box, neighborBox.box))
                    neighborBox.neighbors.push(thisBox);
                }
              }
            }
          }
        }

        // // add sub space to array
        allBoxSpaceNew.push(...thisGeneration);

        // searched space without intersection
        if (parentNode.isDivided !== true) {
          allBoxSpaceNew.push(parentNode);
        }
      }

      //update space array --> use this generation to update the space array(allNodes)
      allNodes = allBoxSpaceNew;
      console.log("allBoxSpace after", allNodes);
    }
    // allNodesGeneration.push(...allNodes);
    this.voxelNodes = allNodes;

    for (const [index, voxelNode] of this.voxelNodes.entries()) {
      voxelNode.nodeId = index;
    }

    return this.voxelNodes;
  }

  showVoxels(voxels?: VoxelNode[], color?: THREE.MeshStandardMaterial) {
    let inputVoxel: VoxelNode[] = [];
    if (voxels) {
      inputVoxel = voxels;
    } else {
      inputVoxel = this.voxelNodes;
    }
    for (const space of inputVoxel) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      space.box.getSize(size);
      space.box.getCenter(center);

      const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      // const boxGeometry = new THREE.BoxGeometry(
      //   size.x - 1,
      //   size.y - 1,
      //   size.z - 1
      // );
      let material: THREE.Material = this.voxelMaterialEmpty;
      if (!space.isAvailable) material = this.voxelMaterialInside;
      // if (voxels) material = this.voxelMaterialTest;
      // if (color) material = color;
      if (space.isGrid)
        material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      //#region choose voxel and show
      // if (space.nodeId === 0) {
      //   material = this.voxelMaterialNear;
      //   console.log("space", space);

      //   console.log(space.neighborsId);
      //   console.log(space.toString());
      // }
      //#endregion

      const boxMesh = new THREE.Mesh(boxGeometry, material);
      boxMesh.position.copy(center);

      // // --show--
      this.voxelIndexes.push(this.viewModel.scene.children.length);
      this.viewModel.scene.children.push(boxMesh);
      // // --show--
    }
  }

  SeparateObjs(
    hostObjects?: HostObject[],
    waffle?: HostObject[],
    spFloor?: HostObject[]
  ) {
    if (!hostObjects)
      hostObjects = [...ReduxStore.getState().BIMSlice.hostObjects];

    console.log("hostObjects", hostObjects);
    const beamObjs: Beam[] = [];
    const floorObjs: Floor[] = [];
    const normalObjs: HostObject[] = [];
    const supportObjs: HostObject[] = [];
    const tileObjs: HostObject[] = [];
    const columnObjs: HostObject[] = [];
    const hangObjs: HostObject[] = [];

    for (const obj of hostObjects) {
      // optional collect waffle
      if (waffle) {
        if ("Family" in obj.meta) {
          const family = obj.meta["Family"] as string;
          if (family.includes("Waffle")) {
            waffle.push(obj);
            continue;
          }
        }
      }
      // optional collect spFloor
      if (spFloor) {
        if ("Family" in obj.meta) {
          const family = obj.meta["Family"] as string;
          if (family.includes("Sub FAb Beam")) {
            spFloor.push(obj);
            continue;
          }
        }
      }

      if (obj.constructor.name === "Beam") {
        if ("Type" in obj.meta) {
          const type = obj.meta["Type"] as string;
          if (!type.includes("HW")) {
            beamObjs.push(obj as Beam);
            continue;
          }
        }
      }
      if (obj.constructor.name === "Floor") {
        if ("Type" in obj.meta)
          if (!String(obj.meta["Type"]).includes("Tile"))
            floorObjs.push(obj as Floor);
          else {
            tileObjs.push(obj as Floor);
          }

        continue;
      }
      if ("Family" in obj.meta)
        if (obj.meta["Family"] === "Raised Floor Pedestal") {
          supportObjs.push(obj as PointObject);
          continue;
        }

      if ("Category" in obj.meta)
        if (obj.meta["Category"] === "Columns") {
          columnObjs.push(obj);
          continue;
        }

      if ("Family" in obj.meta) {
        if (
          String(obj.meta["Family"]).includes(
            "P3L-PH1_Modeular_PI_LateralFSF_A-Type_Dummy"
          )
        ) {
          hangObjs.push(obj);
          continue;
        }
      }

      normalObjs.push(obj);
    }

    const supportRefLoc = supportObjs[0].location as LocationPoint;
    const supportPt = supportRefLoc.origin;
    for (let i = beamObjs.length - 1; i > 0; i--) {
      const beamObj = beamObjs[i];
      const beamPt = beamObj.StartPoint;
      if (beamPt.z > supportPt.z) {
        beamObjs.splice(i, 1);
      }
    }

    // console.log("beamObj", beamObj);
    // console.log("normalObj", normalObj);
    return [beamObjs, normalObjs, floorObjs, supportObjs, tileObjs, hangObjs];
  }
}

function VoxelizeObj(mesh: THREE.Mesh, resolution: number = 3) {
  const meshBox = new THREE.Box3().setFromObject(mesh);
  const stepX = (meshBox.max.x - meshBox.min.x) / resolution;
  const stepY = (meshBox.max.y - meshBox.min.y) / resolution;
  const stepZ = (meshBox.max.z - meshBox.min.z) / resolution;

  // Create BVH structures based on mesh geometry
  const bvh = new MeshBVH(mesh.geometry);

  // Calculate the mesh's world-to-local space transformation matrix
  const invMat = new THREE.Matrix4().copy(mesh.matrixWorld).invert();

  const obstacleVoxels: THREE.Box3[] = [];
  let emptyVoxels: THREE.Box3[] = [];
  for (let x = 0; x < resolution; x++) {
    for (let y = 0; y < resolution; y++) {
      for (let z = 0; z < resolution; z++) {
        const positionMin = new THREE.Vector3(
          meshBox.min.x + x * stepX,
          meshBox.min.y + y * stepY,
          meshBox.min.z + z * stepZ
        );
        const positionMax = new THREE.Vector3(
          positionMin.x + stepX,
          positionMin.y + stepY,
          positionMin.z + stepZ
        );
        const box = new THREE.Box3(positionMin, positionMax);
        // console.log("box", box);

        const center = new THREE.Vector3();
        box.getCenter(center);

        // Use this matrix to check if the box intersects the BVH structure
        let intersects = bvh.intersectsBox(box, invMat);

        if (intersects) obstacleVoxels.push(box);
        else emptyVoxels.push(box);
      }
    }
  }
  if (emptyVoxels.length > 0) {
    const newEmptyVoxels: THREE.Box3[] = [];
    // console.warn("into raycast", mesh);
    // raycast for inside box
    for (const vox of emptyVoxels) {
      const ray = new THREE.Ray();
      ray.direction.set(0, 0, 1);
      const center = new THREE.Vector3();
      vox.getCenter(center);
      ray.origin.copy(center).applyMatrix4(invMat);

      const res = bvh.raycastFirst(ray, 2);
      if (res && res.face && res.face.normal.dot(ray.direction) > 0.0) {
        // is fully inside the mesh
        obstacleVoxels.push(vox);
      } else newEmptyVoxels.push(vox);
    }
    emptyVoxels = newEmptyVoxels;
  }

  if (emptyVoxels.length === 0) return [meshBox];
  return obstacleVoxels;
}
import { GPU } from "gpu.js";

const gpu = new GPU();

const kernel = gpu.createKernel(function(
  box1_max_x: number, 
  box1_min_x: number, 
  box1_max_y: number, 
  box1_min_y: number, 
  box1_max_z: number, 
  box1_min_z: number, 
  box2_max_x: number, 
  box2_min_x: number, 
  box2_max_y: number, 
  box2_min_y: number, 
  box2_max_z: number, 
  box2_min_z: number ) {

  if(box1_max_x >= box2_min_x &&
    box1_min_x <= box2_max_x &&
    box1_max_y >= box2_min_y &&
    box1_min_y <= box2_max_y &&
    box1_max_z >= box2_min_z &&
    box1_min_z <= box2_max_z)
    {
      return 1;
    }
    else
    {
      return 0;
    }
  
}, {
  output: [1]
});

function isIntersectingBox3(box1: THREE.Box3, box2: THREE.Box3) {

  // let val = kernel( 
  //   box1.max.x,
  //   box1.min.x,
  //   box1.max.y,
  //   box1.min.y,
  //   box1.max.z,
  //   box1.min.z,
  //   box2.max.x,
  //   box2.min.x,
  //   box2.max.y,
  //   box2.min.y,
  //   box2.max.z,
  //   box2.min.z,
  // )[0];


  // return val ? true : false;
  // Check whether the maximum value of box1 on all axes is less than the minimum value of box2 on the corresponding axis
  // Or whether the minimum value of box1 on all axes is greater than the maximum value of box2 on the corresponding axis
  // If any condition is met, the two boxes do not intersect
  return (
    box1.max.x >= box2.min.x &&
    box1.min.x <= box2.max.x &&
    box1.max.y >= box2.min.y &&
    box1.min.y <= box2.max.y &&
    box1.max.z >= box2.min.z &&
    box1.min.z <= box2.max.z
  );
}

export function splitRangeBySubRanges(
  largeRange: Range,
  subRanges: Range[]
): Range[] {
  // if(!disposeSplit)
  // 1. clear non use digit
  largeRange.min = parseFloat(largeRange.min.toFixed(3));
  largeRange.max = parseFloat(largeRange.max.toFixed(3));

  subRanges = subRanges.map((range) => {
    range.max = parseFloat(range.max.toFixed(3));
    range.min = parseFloat(range.min.toFixed(3));
    return range;
  });

  // 2. Sort sub ranges by starting position
  subRanges.sort((a, b) => a.min - b.min);

  // 3. Split large range by sub ranges
  let currentMin = largeRange.min;
  const result: Range[] = [];

  subRanges.forEach(({ min: subMin, max: subMax }) => {
    // If the start of the sub range is after the start of the current range, add the current range to the result and update the start of the current range
    if (subMin > currentMin) {
      result.push({ min: currentMin, max: subMin });
      currentMin = subMax; // Update the start of the current range to the end of the sub range
    } else {
      // If the sub range is within or overlaps the current scope, updates the start of the current range to the farthest end of the sub range
      currentMin = Math.max(currentMin, subMax);
    }
  });

  // Check and add the last range
  if (currentMin < largeRange.max) {
    result.push({ min: currentMin, max: largeRange.max });
  }

  return result;
}

function distanceOfBoxes(box1: THREE.Box3, box2: THREE.Box3) {
  // Calculate the shortest distance between box boundaries on the x, y, and z axes respectively
  let distanceX = Math.max(0, box1.min.x - box2.max.x, box2.min.x - box1.max.x);
  let distanceY = Math.max(0, box1.min.y - box2.max.y, box2.min.y - box1.max.y);
  let distanceZ = Math.max(0, box1.min.z - box2.max.z, box2.min.z - box1.max.z);

  // // 计算三维空间中的曼哈顿距离
  // return Math.sqrt(distanceX + distanceY + distanceZ);

  // Calculate Euclidean distance in 3D space
  return Math.sqrt(
    distanceX * distanceX + distanceY * distanceY + distanceZ * distanceZ
  );
}

function generateBranchInfo(inputVoxel: VoxelNode) {
  if (inputVoxel.dividedChildren.length > 0) {
    // no dir info
    if (inputVoxel.branchInfo.aheadDir === aheadDir.None) {
      console.error(`there's no ahead direction of this voxel: ${inputVoxel}`);
    }
    // ahead X
    else if (
      inputVoxel.branchInfo.aheadDir === aheadDir.X ||
      inputVoxel.branchInfo.aheadDir === aheadDir.XMinus
    ) {
      inputVoxel.branchInfo.maxBranchAmount =
        inputVoxel.childrenShape.y * inputVoxel.childrenShape.z;
    } // ahead Y
    else if (
      inputVoxel.branchInfo.aheadDir === aheadDir.Y ||
      inputVoxel.branchInfo.aheadDir === aheadDir.YMinus
    ) {
      inputVoxel.branchInfo.maxBranchAmount =
        inputVoxel.childrenShape.x * inputVoxel.childrenShape.z;
    }

    inputVoxel.branchInfo.maxMainAmount =
      inputVoxel.childrenShape.x * inputVoxel.childrenShape.y;
  }
}

export function findBranchNode(
  voxelNodes: VoxelNode[],
  thisNodes?: VoxelNode[] // if not input this, calculate every node
) {
  // 1 create bounding box
  const boundingBox = cloneDeep(voxelNodes[0].box);
  for (const voxel of voxelNodes) {
    boundingBox.union(voxel.box);
  }

  // 2 find distance and get direction and generate branch info
  // just calculate selected node
  if (thisNodes) {
    for (const node of thisNodes) {
      const testPoint = new THREE.Vector3();
      boundingBox.clampPoint(node.location, testPoint);

      const centerOfBox = new THREE.Vector3();
      boundingBox.getCenter(centerOfBox);
      // const draw = new Vec3(clampedPoint.x, clampedPoint.y, clampedPoint.z);
      // new Point(draw);

      const directionVectorToClamp = new THREE.Vector3().subVectors(
        testPoint,
        node.location
      );
      const directionVectorToCenter = new THREE.Vector3().subVectors(
        centerOfBox,
        node.location
      );

      // if point under the equip
      if (
        testPoint.x.toFixed(3) === node.location.x.toFixed(3) &&
        testPoint.y.toFixed(3) === node.location.y.toFixed(3)
      ) {
        if (
          Math.abs(directionVectorToCenter.x) >
          Math.abs(directionVectorToCenter.y)
        ) {
          console.log("x direction");
          if (directionVectorToCenter.x > 0)
            node.branchInfo.aheadDir = aheadDir.X;
          else node.branchInfo.aheadDir = aheadDir.XMinus;
        } else {
          console.log("y direction");
          if (directionVectorToCenter.y > 0)
            node.branchInfo.aheadDir = aheadDir.Y;
          else node.branchInfo.aheadDir = aheadDir.YMinus;
        }
      }
      // not under equip
      else {
        if (
          Math.abs(directionVectorToClamp.x) >
          Math.abs(directionVectorToClamp.y)
        ) {
          console.log("x direction");
          if (directionVectorToClamp.x > 0)
            node.branchInfo.aheadDir = aheadDir.X;
          else node.branchInfo.aheadDir = aheadDir.XMinus;
        } else {
          console.log("y direction");
          if (directionVectorToClamp.y > 0)
            node.branchInfo.aheadDir = aheadDir.Y;
          else node.branchInfo.aheadDir = aheadDir.YMinus;
        }
      }
      // generate branch info
      generateBranchInfo(node);
    }
    console.log("selectedVoxels", thisNodes);
  }

  // calculate every node
  else {
    for (const node of voxelNodes) {
      const clampedPoint = new THREE.Vector3();
      boundingBox.clampPoint(node.location, clampedPoint);
      // const draw = new Vec3(clampedPoint.x, clampedPoint.y, clampedPoint.z);
      // new Point(draw);

      const centerOfBox = new THREE.Vector3();
      boundingBox.getCenter(centerOfBox);

      const directionVector = new THREE.Vector3().subVectors(
        clampedPoint,
        node.location
      );

      const directionVectorToCenter = new THREE.Vector3().subVectors(
        centerOfBox,
        node.location
      );

      // if point under the equip
      if (
        clampedPoint.x.toFixed(3) === node.location.x.toFixed(3) &&
        clampedPoint.y.toFixed(3) === node.location.y.toFixed(3)
      ) {
        if (
          Math.abs(directionVectorToCenter.x) >
          Math.abs(directionVectorToCenter.y)
        ) {
          console.log("x direction");
          if (directionVectorToCenter.x > 0)
            node.branchInfo.aheadDir = aheadDir.X;
          else node.branchInfo.aheadDir = aheadDir.XMinus;
        } else {
          console.log("y direction");
          if (directionVectorToCenter.y > 0)
            node.branchInfo.aheadDir = aheadDir.Y;
          else node.branchInfo.aheadDir = aheadDir.YMinus;
        }
      }
      // not under equip
      else {
        if (Math.abs(directionVector.x) > Math.abs(directionVector.y)) {
          console.log("x direction");
          if (directionVector.x > 0) node.branchInfo.aheadDir = aheadDir.X;
          else node.branchInfo.aheadDir = aheadDir.XMinus;
        } else {
          console.log("y direction");
          if (directionVector.y > 0) node.branchInfo.aheadDir = aheadDir.Y;
          else node.branchInfo.aheadDir = aheadDir.YMinus;
        }
      }
      // generate branch info
      generateBranchInfo(node);
    }
    console.log("selectedVoxels", voxelNodes);
  }
}

export function areBoxesNeighbors(
  box1: THREE.Box3,
  box2: THREE.Box3,
  supUse: boolean = true
) {
  // Check if they are closely adjacent in one dimension
  const isAdjacent = (
    min1: number,
    max1: number,
    min2: number,
    max2: number,
    forSup: boolean = supUse
  ) => {
    if (!forSup) {
      return (
        +max1.toFixed(3) - +min2.toFixed(3) ||
        +min1.toFixed(3) === +max2.toFixed(3)
      );
    }
    if (forSup) {
      return (
        Math.abs(+max1.toFixed(3) - +min2.toFixed(3)) < 1.2 ||
        Math.abs(+min1.toFixed(3) - +max2.toFixed(3)) < 1.2
      );
    }
  };

  // Check whether two intervals overlap
  const hasOverlap = (
    min1: number,
    max1: number,
    min2: number,
    max2: number
  ) => {
    return (
      Math.min(+max1.toFixed(3), +max2.toFixed(3)) >
      Math.max(+min1.toFixed(3), +min2.toFixed(3))
    );
  };

  // Check in the three dimensions of X, Y and Z respectively
  const adjacentInX = isAdjacent(
    box1.min.x,
    box1.max.x,
    box2.min.x,
    box2.max.x
  );
  const adjacentInY = isAdjacent(
    box1.min.y,
    box1.max.y,
    box2.min.y,
    box2.max.y
  );
  const adjacentInZ = isAdjacent(
    box1.min.z,
    box1.max.z,
    box2.min.z,
    box2.max.z
  );

  const overlapInY = hasOverlap(box1.min.y, box1.max.y, box2.min.y, box2.max.y);
  const overlapInZ = hasOverlap(box1.min.z, box1.max.z, box2.min.z, box2.max.z);
  const overlapInX = hasOverlap(box1.min.x, box1.max.x, box2.min.x, box2.max.x);

  // Boxes must be closely adjacent in one dimension and overlap in the other two dimensions

  return (
    (adjacentInX && overlapInY && overlapInZ) ||
    (adjacentInY && overlapInX && overlapInZ) ||
    (adjacentInZ && overlapInX && overlapInY)
  );
}

export function areBoxesNeighbors_sup(box1: THREE.Box3, box2: THREE.Box3) {
  // Check if they are closely adjacent in one dimension
  const isAdjacent = (
    min1: number,
    max1: number,
    min2: number,
    max2: number
  ) => {
    return (
      +max1.toFixed(3) === +min2.toFixed(3) ||
      +min1.toFixed(3) === +max2.toFixed(3)
    );
  };

  // Check whether two intervals overlap
  const hasOverlap = (
    min1: number,
    max1: number,
    min2: number,
    max2: number
  ) => {
    return (
      Math.min(+max1.toFixed(3), +max2.toFixed(3)) >
      Math.max(+min1.toFixed(3), +min2.toFixed(3))
    );
  };

  // Check in the three dimensions of X, Y and Z respectively
  const adjacentInX = isAdjacent(
    box1.min.x,
    box1.max.x,
    box2.min.x,
    box2.max.x
  );
  const adjacentInY = isAdjacent(
    box1.min.y,
    box1.max.y,
    box2.min.y,
    box2.max.y
  );
  const adjacentInZ = isAdjacent(
    box1.min.z,
    box1.max.z,
    box2.min.z,
    box2.max.z
  );

  const overlapInY = hasOverlap(box1.min.y, box1.max.y, box2.min.y, box2.max.y);
  const overlapInZ = hasOverlap(box1.min.z, box1.max.z, box2.min.z, box2.max.z);
  const overlapInX = hasOverlap(box1.min.x, box1.max.x, box2.min.x, box2.max.x);

  // Boxes must be closely adjacent in one dimension and overlap in the other two dimensions
  return (
    (adjacentInX && overlapInY && overlapInZ) ||
    (adjacentInY && overlapInX && overlapInZ) ||
    (adjacentInZ && overlapInX && overlapInY)
  );
}

export function getRangeZAndSpaceBox(
  sameObjs: HostObject[],
  boundingBox: THREE.Box3
): [Range, THREE.Box3] {
  const objBoxes = sameObjs.map((obj) =>
    VoxelManager.createBoundingBoxOfObjs([obj])
  );
  const objRangeZ =
    objBoxes.length > 0
      ? { min: objBoxes[0].min.z, max: objBoxes[0].max.z }
      : undefined;

  console.log("waffleRangeZ", objRangeZ);
  const objSpaceBox = new THREE.Box3(
    new THREE.Vector3(boundingBox.min.x, boundingBox.min.y, objRangeZ!.min),
    new THREE.Vector3(boundingBox.max.x, boundingBox.max.y, objRangeZ!.max)
  );
  console.log("waffleBox", objSpaceBox);

  return [objRangeZ!, objSpaceBox];
}
