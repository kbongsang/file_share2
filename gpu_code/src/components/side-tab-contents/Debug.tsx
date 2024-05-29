import * as THREE from "three";
import { useSelector } from "react-redux";
import { CurveObject } from "../../core/BIM/CurveObject";
import { Point } from "../../render/generic/point";
import { equipObject } from "../../core/BIM/RoutingObject";
import { ReduxRootState, ReduxStore } from "../../app/redux-store";
import { measureExecutionTime } from "../../core/Dev/General/Timer";
import {
  findBranchNode,
  VoxelManager,
} from "../../core/Dev/Voxel/VoxelManager";
import {
  hideObjInScene,
  SmartElbowManager,
} from "../../core/Dev/SE/SmartElbow";
import React from "react";
import { GEManager } from "../../core/Dev/GE/GEManager";
import { PumpHookManager } from "../../core/Dev/GE/AngleAlgorithm";
import { PointObject } from "../../core/BIM/PointObject";
import { cloneDeep } from "lodash";
import Vec3 from "../../core/util/vec3";
import {
  //LocationCurve,
  LocationPoint,
} from "../../core/BIM/Location";
import {
  aheadDir,
  propertyInfo,
  VoxelNode,
} from "../../core/Dev/Voxel/VoxelNode";
import { Pipes } from "../../core/family/Pipes";
// import { ObjectManager } from "../../core/util/ObjectManager";
// import { ADD_EXPORT_OBJECT, CLEAR_EXPORT_OBJECTS } from "../../app/bim-slice";
import { Connector } from "./Routing";
import { Line } from "../../render/generic/line";
import {
  convertHookUpRouteForRevit,
  export_trans,
} from "../../core/Dev/General/RoutingToHost";
import { DebugLine, DrawLines } from "../../core/Dev/GE/DebugingGeometry";
import { ParallelLines } from "../../core/Dev/GE/ParallelAlgorithm";
import { ValveConnection } from "../../core/Dev/GE/ValveConnectionLine";
import { AddPerpendicularFromTwoPoints } from "../../core/Dev/GE/GEFunctions";

export interface connection {
  location: THREE.Vector3;
  property: string | undefined;
  space: string | undefined;
  collided: boolean;
}

// // HostObject를 HostObjectData로 변환하는 함수
// function convertHostObjectToData(hostObject: HostObject): HostObjectData {
//   return {
//     Id: hostObject.id,
//     data: hostObject.meta,
//   };
// }

// // hostObjects를 HostObjectMap으로 매핑하는 함수
// function extractDataToElements(hostObjects: HostObject[]): HostObjectData[] {
//   return hostObjects.flatMap((hostObject) => {
//     const data = convertHostObjectToData(hostObject);
//     return { ...data};
//   });
// }
export var gEManager = new GEManager();

export const Debug = () => {
  // console.log("initialize Debug");

  //------------------------initialize-------------------------
  // read host object in redux
  // const [hostObjects] = React.useState(
  //   ReduxStore.getState().BIMSlice.hostObjects
  // );

  const hostObjects = ReduxStore.getState().BIMSlice.hostObjects;
  //const exportObjects = ReduxStore.getState().BIMSlice.exportObjects;
  // read viewModel object in redux
  const [viewModel] = React.useState(
    useSelector((state: ReduxRootState) => state.RenderReducer.viewModel)
  );

  // initialize voxel manager
  const [voxelManager] = React.useState(new VoxelManager(viewModel));

  // initialize SE manager
  const [se1] = React.useState(new SmartElbowManager(viewModel, voxelManager));
  const [se2] = React.useState(new SmartElbowManager(viewModel, voxelManager));

  // initialize sPt and ePt
  // let [sPt, setSPt] = React.useState<THREE.Vector3>();
  // let [ePt, setEPt] = React.useState<THREE.Vector3>();
  const [sPts_1] = React.useState<THREE.Vector3[]>([]);
  const [startObjs_1] = React.useState<CurveObject[]>([]);
  const [ePts_1] = React.useState<THREE.Vector3[]>([]);

  const [sPts_2] = React.useState<THREE.Vector3[]>([]);
  const [ePts_2] = React.useState<THREE.Vector3[]>([]);

  // initialize GE manager
  const [managerGE] = React.useState(new GEManager(viewModel.scene));
  const [isSetup, setSetup] = React.useState(false);
  //const [testManager] = React.useState(new PumpHookManager(viewModel.scene));

  // initialize pumpConnection

  // const vacuumConnections: connection[] = [];
  const [vacuumConnections] = React.useState<connection[]>([]);
  //const [vacuumConnectionsRadius] = React.useState<connection[]>([]);
  const [machineConnections] = React.useState<connection[]>([]);

  const [selectedVoxels] = React.useState<VoxelNode[]>([]);

  // function updateMetaValue(
  //   metadata: { [key: string]: string },
  //   key: string,
  //   value: string
  // ): void {
  //   if (metadata.hasOwnProperty(key)) {
  //     metadata[key] = value;
  //   } else {
  //     console.error(`Key '${key}' not found in metadata.`);
  //   }
  // }

  // function export_trans(
  //   path: THREE.Vector3[][],
  //   radius_set: any,
  //   task: number,
  //   type_set: string[] = [],
  //   systemtype_set: string[] = [],
  //   pipesegemnt_set: string[] = [],
  //   Level_set: string[] = []
  // ) {
  //   ReduxStore.dispatch(CLEAR_EXPORT_OBJECTS());

  //   const fittingRadius = 30; // 파이프 세그먼트 벡터를 줄이는 정도(길이)

  //   let meta_pipe: { [key: string]: string } = {
  //     Category: "Pipes",
  //     Family: "Pipe Types",
  //     Type: "",
  //     "System Type": "",
  //     "System Name": "순환수 공급 100",
  //     "Pipe Segment": "탄소강 - 일람표 40",
  //     Size: "150mm",
  //     Diameter: "150mm",
  //     "Reference Level": "1F",
  //   };

  //   let meta_pipe_fitting: { [key: string]: string } = {
  //     Category: "Pipe Fittings",
  //     Family: "M_엘보 - 일반",
  //     "System Type": "",
  //     "System Name": "순환수 공급 100",
  //     Level: "1F",
  //   };

  //   let segmentId_index = 1;
  //   let segmentset_index = 0;

  //   path.forEach((segmentVectors: any) => {
  //     let meta_pipe_copy = { ...meta_pipe };
  //     let meta_pipe_fitting_copy = { ...meta_pipe_fitting };

  //     if (task == 1) {
  //       updateMetaValue(
  //         meta_pipe_copy,
  //         "Size",
  //         radius_set[segmentset_index].toString()
  //       );
  //       updateMetaValue(
  //         meta_pipe_copy,
  //         "Diameter",
  //         radius_set[segmentset_index].toString()
  //       );
  //       updateMetaValue(
  //         meta_pipe_copy,
  //         "Type",
  //         ReduxStore.getState().Meta.Type
  //       );
  //       updateMetaValue(
  //         meta_pipe_copy,
  //         "System Type",
  //         ReduxStore.getState().Meta.SystemType
  //       );
  //       updateMetaValue(
  //         meta_pipe_copy,
  //         "System Name",
  //         ReduxStore.getState().Meta.SystemType + " 1000"
  //       );
  //       updateMetaValue(
  //         meta_pipe_copy,
  //         "Pipe Segment",
  //         ReduxStore.getState().Meta.PipeSegment
  //       );
  //       updateMetaValue(
  //         meta_pipe_copy,
  //         "Reference Level",
  //         ReduxStore.getState().Meta.ReferenceLevel
  //       );

  //       updateMetaValue(
  //         meta_pipe_fitting_copy,
  //         "System Type",
  //         ReduxStore.getState().Meta.SystemType
  //       );
  //       updateMetaValue(
  //         meta_pipe_fitting_copy,
  //         "System Name",
  //         ReduxStore.getState().Meta.SystemType + " 1000"
  //       );
  //       updateMetaValue(
  //         meta_pipe_fitting_copy,
  //         "Level",
  //         ReduxStore.getState().Meta.ReferenceLevel
  //       );
  //     } else {
  //       updateMetaValue(
  //         meta_pipe_copy,
  //         "Size",
  //         radius_set[segmentset_index].toString()
  //       );
  //       updateMetaValue(
  //         meta_pipe_copy,
  //         "Diameter",
  //         radius_set[segmentset_index].toString()
  //       );
  //       updateMetaValue(meta_pipe_copy, "Type", type_set[segmentset_index]);
  //       updateMetaValue(
  //         meta_pipe_copy,
  //         "System Type",
  //         systemtype_set[segmentset_index]
  //       );
  //       updateMetaValue(
  //         meta_pipe_copy,
  //         "System Name",
  //         systemtype_set[segmentset_index] + " 1000"
  //       );
  //       updateMetaValue(
  //         meta_pipe_copy,
  //         "Pipe Segment",
  //         pipesegemnt_set[segmentset_index]
  //       );
  //       updateMetaValue(
  //         meta_pipe_copy,
  //         "Reference Level",
  //         Level_set[segmentset_index]
  //       );

  //       updateMetaValue(
  //         meta_pipe_fitting_copy,
  //         "System Type",
  //         systemtype_set[segmentset_index]
  //       );
  //       updateMetaValue(
  //         meta_pipe_fitting_copy,
  //         "System Name",
  //         systemtype_set[segmentset_index] + " 1000"
  //       );
  //       updateMetaValue(
  //         meta_pipe_fitting_copy,
  //         "Level",
  //         Level_set[segmentset_index]
  //       );
  //     }

  //     segmentset_index++;

  //     for (let i = 0; i < segmentVectors.length - 1; i++) {
  //       // 시작점을 Vec3 형태로 생성
  //       let startPoint = new Vec3(
  //         segmentVectors[i].x * 100,
  //         segmentVectors[i].y * 100,
  //         segmentVectors[i].z * 100
  //       );
  //       // 끝점을 Vec3 형태로 생성
  //       let endPoint = new Vec3(
  //         segmentVectors[i + 1].x * 100,
  //         segmentVectors[i + 1].y * 100,
  //         segmentVectors[i + 1].z * 100
  //       );

  //       // 시작점과 끝점 벡터의 방향을 유지하면서 길이를 줄임
  //       let startToFitting = endPoint
  //         .clone()
  //         .subtract(startPoint)
  //         .normalize()
  //         .multiply(fittingRadius);
  //       let endToFitting = startPoint
  //         .clone()
  //         .subtract(endPoint)
  //         .normalize()
  //         .multiply(fittingRadius);

  //       // 피팅의 위치 계산
  //       let startFittingPoint = startPoint.clone().add(startToFitting);
  //       if (i === 0) startFittingPoint = startPoint.clone();
  //       let endFittingPoint = endPoint.clone().add(endToFitting);
  //       if (i + 1 === segmentVectors.length - 1)
  //         endFittingPoint = endPoint.clone();

  //       let mepCurve = ObjectManager.CreateCurveObject(
  //         `seg${segmentId_index}`,
  //         new LocationCurve(startFittingPoint, endFittingPoint),
  //         meta_pipe_copy // 복사된 메타데이터 객체를 사용합니다.
  //       );
  //       ReduxStore.dispatch(ADD_EXPORT_OBJECT(mepCurve));

  //       let mepPoint = ObjectManager.CreatePointObject(
  //         `fitting_seg${segmentId_index}`,
  //         new LocationPoint(endPoint),
  //         meta_pipe_fitting_copy // 복사된 메타데이터 객체를 사용합니다.
  //       );
  //       ReduxStore.dispatch(ADD_EXPORT_OBJECT(mepPoint));
  //       segmentId_index++;
  //     }
  //   });
  // }

  //------------------------initialize-------------------------

  const EndPoints_Setup = async () => {
    console.log("hostObjects when press", hostObjects);
    const randomList: Pipes[] = [];
    for (const obj of hostObjects) {
      // if (obj instanceof CurveObject && obj.isConnection === true)
      if (obj.constructor.name === "Pipes") {
        const pipeObj = obj as Pipes;
        if (
          pipeObj.StartPoint.x.toFixed(0) === pipeObj.EndPoint.x.toFixed(0) &&
          pipeObj.StartPoint.y.toFixed(0) === pipeObj.EndPoint.y.toFixed(0) &&
          pipeObj.StartPoint.z.toFixed(0) !== pipeObj.EndPoint.z.toFixed(0)
        ) {
          randomList.push(obj as Pipes);
        }
      }
    }
    console.log("randomList", randomList);

    //const randomIndex = Math.floor(Math.random() * randomList.length);
    const randomElement = randomList[5];
    console.log("randomElement", randomElement);
    const curveObj = randomElement as CurveObject;
    console.log("curveObj", curveObj);

    //const randomIndex2 = Math.floor(Math.random() * randomList.length);
    const randomElement2 = randomList[0];
    const curveObj2 = randomElement2 as CurveObject;
    const randomElement3 = randomList[1];
    const curveObj3 = randomElement3 as CurveObject;
    const randomElement4 = randomList[2];
    const curveObj4 = randomElement4 as CurveObject;
    const randomElement5 = randomList[3];
    const curveObj5 = randomElement5 as CurveObject;
    const randomElement6 = randomList[4];
    const curveObj6 = randomElement6 as CurveObject;

    if (curveObj && curveObj.EndPoint && curveObj2 && curveObj2.EndPoint) {
      const newSPt = new THREE.Vector3(
        curveObj.EndPoint.x,
        curveObj.EndPoint.y,
        curveObj.EndPoint.z
      );
      const newSPt2 = new THREE.Vector3(
        curveObj2.EndPoint.x,
        curveObj2.EndPoint.y,
        curveObj2.EndPoint.z
      );
      const newSPt3 = new THREE.Vector3(
        curveObj3.EndPoint.x,
        curveObj3.EndPoint.y,
        curveObj3.EndPoint.z
      );
      const newSPt4 = new THREE.Vector3(
        curveObj4.EndPoint.x,
        curveObj4.EndPoint.y,
        curveObj4.EndPoint.z
      );
      const newSPt5 = new THREE.Vector3(
        curveObj5.EndPoint.x,
        curveObj5.EndPoint.y,
        curveObj5.EndPoint.z
      );
      const newSPt6 = new THREE.Vector3(
        curveObj6.EndPoint.x,
        curveObj6.EndPoint.y,
        curveObj6.EndPoint.z
      );
      // const newSPt3 = new THREE.Vector3(0, 0, 0);
      // setSPt(newSPt);
      sPts_1.push(newSPt);
      startObjs_1.push(curveObj);
      sPts_1.push(newSPt2);
      startObjs_1.push(curveObj2);
      // sPts_1.push(newSPt3);

      const newSPtVec1 = new Vec3(newSPt.x, newSPt.y, newSPt.z);
      const newSPtVec2 = new Vec3(newSPt2.x, newSPt2.y, newSPt2.z);
      const newSPtVec3 = new Vec3(newSPt3.x, newSPt3.y, newSPt3.z);
      const newSPtVec4 = new Vec3(newSPt4.x, newSPt4.y, newSPt4.z);
      const newSPtVec5 = new Vec3(newSPt5.x, newSPt5.y, newSPt5.z);
      const newSPtVec6 = new Vec3(newSPt6.x, newSPt6.y, newSPt6.z);
      // const newSPtVec3 = new Vec3(newSPt3.x, newSPt3.y, newSPt3.z);
      new Point(newSPtVec1);
      new Point(newSPtVec2);
      new Point(newSPtVec3);
      new Point(newSPtVec4);
      new Point(newSPtVec5);
      new Point(newSPtVec6);
      // new Point(newSPtVec3);
    } else console.log("not right", curveObj);

    // just input 1 equip, consider multiple
    const equipObjAll = hostObjects.filter((obj) => {
      if ("Family" in obj.meta) {
        return String(obj.meta["Family"]).includes(
          "Semiconductor equipment_routing test"
        );
      }
    });

    console.log("equipObjAll", equipObjAll);
    const tempPt = cloneDeep(equipObjAll[0].location) as LocationPoint;
    tempPt.origin = tempPt.origin.multiply(100);
    const equip = new equipObject(
      equipObjAll[0].id,
      tempPt,
      equipObjAll[0].meta
    );

    const connector = equip.getConnectors();
    console.log("connectPoints", connector);

    // const newEPt = connector![0];
    // const newEPt2 = connector![1];
    console.log(
      "voxelManager.supportSpaceVoxels",
      voxelManager.supportSpaceVoxels
    );
    const newEPt = voxelManager.supportSpaceVoxels[10].location;
    const newEPt2 = voxelManager.supportSpaceVoxels[15].location;
    const newEPt3 = voxelManager.supportSpaceVoxels[15].location;
    const newEPt4 = voxelManager.supportSpaceVoxels[15].location;
    const newEPt5 = voxelManager.supportSpaceVoxels[10].location;
    const newEPt6 = voxelManager.supportSpaceVoxels[10].location;
    console.log("EPT1", newEPt);
    console.log("EPT2", newEPt2);
    console.log("EPT3", newEPt3);
    console.log("EPT4", newEPt4);
    console.log("EPT5", newEPt5);
    console.log("EPT6", newEPt6);
    // const newEPt3 = new THREE.Vector3(1000, 1000, 1000);
    // setEPt(newEPt);
    ePts_1.push(newEPt);
    ePts_1.push(newEPt2);
    ePts_1.push(newEPt3);
    ePts_1.push(newEPt4);
    ePts_1.push(newEPt5);
    ePts_1.push(newEPt6);
    // ePts_1.push(newEPt3);

    const newEPtVec1 = new Vec3(newEPt.x, newEPt.y, newEPt.z);
    const newEPtVec2 = new Vec3(newEPt2.x, newEPt2.y, newEPt2.z);
    const newEPtVec3 = new Vec3(newEPt3.x, newEPt3.y, newEPt3.z);
    const newEPtVec4 = new Vec3(newEPt4.x, newEPt4.y, newEPt4.z);
    const newEPtVec5 = new Vec3(newEPt5.x, newEPt5.y, newEPt5.z);
    const newEPtVec6 = new Vec3(newEPt6.x, newEPt6.y, newEPt6.z);
    // const newEPtVec3 = new Vec3(newEPt3.x, newEPt3.y, newEPt3.z);
    new Point(newEPtVec1);
    new Point(newEPtVec2);
    new Point(newEPtVec3);
    new Point(newEPtVec4);
    new Point(newEPtVec5);
    new Point(newEPtVec6);
    // new Point(newEPtVec3);
  };

  const Voxelization = async () => {
    const timer = measureExecutionTime();
    timer.next();
    voxelManager.run(5, 3);
    timer.next();

    const voxelInfo = voxelManager.GetVoxelsInfo();
    console.log("voxelInfo", voxelInfo);
  };

  const showVoxels = async () => {
    voxelManager.showVoxels();
  };
  const showSupportVoxel = async () => {
    voxelManager.showVoxels(
      voxelManager.supportSpaceVoxels,
      voxelManager.voxelMaterialEmpty
    );
  };

  const FindPath = async () => {
    const timer2 = measureExecutionTime();
    timer2.next();
    // console.log("sPts at find path", sPts);
    // console.log("ePts at find path", ePts);

    if (voxelManager.voxelNodes) {
      const excludeSupportNode = voxelManager.voxelNodes.filter(
        (node) => !voxelManager.supportSpaceVoxels.includes(node)
      );
      se1.voxelNodes = excludeSupportNode;
      se1.run(sPts_1, ePts_1);
      se1.addConnector(startObjs_1);
      // const paths = se1.run(sPts_1, ePts_1);
      // setPath1(paths);
    }
    console.warn("SE Algorithm");
    timer2.next();
  };

  // const VoxelizeAndFindPath = async () => {
  //   Voxelization();
  //   FindPath();
  // };

  const hideNodeAndVoxel = async () => {
    // collect index of voxel obj and hide it

    const hideIndexes = [...se1.nodeIndexesAll, ...voxelManager.voxelIndexes];
    console.log("se.nodeIndexes", se1.nodeIndexesAll);
    hideObjInScene(viewModel, hideIndexes);
  };
  const GE_Setup = async () => {
    // setGEManager(new GEManager(viewModel.scene));

    if (!isSetup) {
      console.log("se.paths", se1.paths);

      const infoForGE = se1.getInfoForGE();
      console.log("infoForGE", infoForGE);

      //managerGE?.Setup(infoForGE, startObjs_1);
      gEManager = managerGE;

      // console.log("Setup");
      setSetup(true);
    }

    if (isSetup) {
      console.log("isSetup");
      console.log("FinalPath", managerGE?.Step());
    }

    console.log("managerGE", managerGE);
  };

  const RunGE = async () => {
    // let t = 0;
    // const intervalId = setInterval(() => {
    //   // Code to run on every tick
    //   if (t < 200) {
    //     console.log("iter: ", t++);
    //     console.log("FinalPath", managerGE?.Step());
    //   }
    //   if (t === 200) {
    //     console.log("managerGE after running", managerGE);
    //     t++;
    //   }
    // }, 0); // Interval in milliseconds

    // return () => {
    //   // Cleanup function to clear the interval when the component unmounts
    //   clearInterval(intervalId);
    // };

    const point = [new THREE.Vector3(0, 0, 0)];
    const testPoint1 = AddPerpendicularFromTwoPoints(
      new THREE.Vector3(),
      new THREE.Vector3(100, 100, 100)
    ).locations;
    const testPoint2 = AddPerpendicularFromTwoPoints(
      new THREE.Vector3(100, 100, 100),
      new THREE.Vector3(200, 200, 200)
    ).locations;
    point.push(testPoint1[0]);
    point.push(testPoint1[1]);
    point.push(new THREE.Vector3(100, 100, 100));
    point.push(testPoint2[0]);
    point.push(testPoint2[1]);

    for (let i = 0; i < point.length - 1; i++) {
      new DebugLine(
        viewModel.scene,
        point[i],
        point[i + 1],
        new THREE.Color(0, 1, 0)
      );
    }
    const sublines = [];
    for (let i = 0; i < 10; i++) {
      sublines.push(
        ParallelLines(point, new THREE.Vector3(0, -1, 0), 3 * (i + 1))
      );
    }
    sublines.forEach((element) => {
      for (let i = 0; i < element.length - 1; i++) {
        new DebugLine(
          viewModel.scene,
          element[i],
          element[i + 1],
          new THREE.Color(0, 1, 0)
        );
      }
    });
  };

  const Test = async () => {
    // console.log("Test");
    // testManager.inputTestData();
    // testManager.RunTest();

    const startPoints: THREE.Vector3[] = [];
    const endPoints: THREE.Vector3[] = [];
    const valveLine = [];

    for (let i = 0; i < 20; i++) {
      startPoints.push(new THREE.Vector3(i * 10, (i * 20) % 50, 0));
      endPoints.push(new THREE.Vector3(i * 10, 20, 50));
    }

    startPoints.push(new THREE.Vector3(20 * 10, 0, 0));
    endPoints.push(new THREE.Vector3(20 * 10, 20, 50));

    const basePoint: THREE.Vector3 = startPoints[0];

    for (let i = 0; i < startPoints.length; i++) {
      valveLine.push(
        ValveConnection(
          startPoints[i],
          basePoint,
          endPoints[i],
          new THREE.Vector3(0, 1, 0)
        )
      );
    }

    valveLine.forEach((element) => {
      DrawLines(viewModel.scene, element);
    });
  };

  const GetPumpEndPts = async () => {
    // vacuum
    const vacuums = hostObjects.filter(
      (obj) => "Family" in obj.meta && obj.meta["Family"] === "Vacuum Pump"
    );
    for (const vacuum of vacuums) {
      const vacuumObj = vacuum as PointObject;
      let spaceDetected = undefined;
      if ("SLZ_Connect" in vacuumObj.meta)
        spaceDetected = String(vacuumObj.meta["SLZ_Connect"]);
      let type = undefined;
      if ("Type" in vacuumObj.meta) type = String(vacuumObj.meta["Type"]);

      const newConnection: connection = {
        location: new THREE.Vector3(
          vacuumObj.location.origin.x + 4.5,
          vacuumObj.location.origin.y,
          vacuumObj.location.origin.z + 8
        ),
        property: type,
        space: spaceDetected,
        collided: false,
      };

      //const vacuum_radius = vacuumObj.meta["Connectors_radius"][""];
      //vacuumConnectionsRadius.push(vacuum_radius);
      vacuumConnections.push(newConnection);
    }

    //show
    for (const vacuum of vacuumConnections) {
      const pointVec3 = new Vec3(
        vacuum.location.x,
        vacuum.location.y,
        vacuum.location.z
      );
      new Point(pointVec3, {
        r: 0,
        g: 1,
        b: 0,
      });
    }

    // machine
    const machines = hostObjects.filter((obj) => {
      if ("Family" in obj.meta) {
        return String(obj.meta["Family"]).includes(
          "Semiconductor equipment_routing test"
        );
      }
    });
    for (const machine of machines) {
      const machineObj = machine as PointObject;

      let spaceDetected = undefined;
      if ("SLZ_Connect" in machine.meta)
        spaceDetected = String(machine.meta["SLZ_Connect"]);

      // C1
      let propertyC1 = undefined;
      if ("C1" in machineObj.meta) propertyC1 = String(machineObj.meta["C1"]);

      const newC1: connection = {
        location: new THREE.Vector3(
          machineObj.location.origin.x + 11,
          machineObj.location.origin.y + 5,
          machineObj.location.origin.z - 2
        ),
        property: propertyC1,
        space: spaceDetected,
        collided: false,
      };
      machineConnections.push(newC1);
      console.log("newC1", newC1);
      console.log("machineConnections", machineConnections);

      // C2
      let propertyC2 = undefined;
      if ("C2" in machineObj.meta) propertyC2 = String(machineObj.meta["C2"]);

      const newC2: connection = {
        location: new THREE.Vector3(
          machineObj.location.origin.x - 4,
          machineObj.location.origin.y + 5,
          machineObj.location.origin.z - 2
        ),
        property: propertyC2,
        space: spaceDetected,
        collided: false,
      };
      machineConnections.push(newC2);

      // C3
      let propertyC3 = undefined;
      if ("C3" in machineObj.meta) propertyC3 = String(machineObj.meta["C3"]);

      const newC3: connection = {
        location: new THREE.Vector3(
          machineObj.location.origin.x - 4,
          machineObj.location.origin.y - 10,
          machineObj.location.origin.z - 2
        ),
        property: propertyC3,
        space: spaceDetected,
        collided: false,
      };
      machineConnections.push(newC3);

      // C4
      let propertyC4 = undefined;
      if ("C4" in machineObj.meta) propertyC4 = String(machineObj.meta["C4"]);

      const newC4: connection = {
        location: new THREE.Vector3(
          machineObj.location.origin.x + 11,
          machineObj.location.origin.y - 10,
          machineObj.location.origin.z - 2
        ),
        property: propertyC4,
        space: spaceDetected,
        collided: false,
      };
      machineConnections.push(newC4);

      // C5
      let propertyC5 = undefined;
      if ("C5" in machineObj.meta) propertyC5 = String(machineObj.meta["C5"]);

      const newC5: connection = {
        location: new THREE.Vector3(
          machineObj.location.origin.x + 5,
          machineObj.location.origin.y + 20,
          machineObj.location.origin.z - 2
        ),
        property: propertyC5,
        space: spaceDetected,
        collided: false,
      };
      machineConnections.push(newC5);

      // C6
      let propertyC6 = undefined;
      if ("C6" in machineObj.meta) propertyC6 = String(machineObj.meta["C6"]);

      const newC6: connection = {
        location: new THREE.Vector3(
          machineObj.location.origin.x - 1,
          machineObj.location.origin.y + 14,
          machineObj.location.origin.z - 2
        ),
        property: propertyC6,
        space: spaceDetected,
        collided: false,
      };
      machineConnections.push(newC6);
    }
    for (const connectionM of machineConnections) {
      const pointVec3 = new Vec3(
        connectionM.location.x,
        connectionM.location.y,
        connectionM.location.z
      );
      new Point(pointVec3, {
        r: 0,
        g: 1,
        b: 0,
      });
    }

    console.log("vacuumConnections", vacuumConnections);
    console.log("machineConnections", machineConnections);
  };

  const GenPumpPath = async () => {
    // supports
    const supportsBoxes: THREE.Box3[] = [];
    const allPointObjs = hostObjects.filter(
      (obj) => obj.constructor.name === "PointObject"
    );

    for (const obj of allPointObjs) {
      if ("Type" in obj.meta) {
        if (String(obj.meta["Type"]).includes("Raised Floor Pedestal")) {
          supportsBoxes.push(
            new THREE.Box3().setFromObject(obj.renderObjects[0].object3d)
          );
        }
      }
    }
    console.log("supportsBoxes", supportsBoxes);
    const obstacles = hostObjects.filter(
      (obj) =>
        obj.constructor.name === "Beam" ||
        obj.constructor.name === "PointObject"
    );
    console.log("obstacles", obstacles);

    for (const machineC of machineConnections) {
      for (const supBox of supportsBoxes) {
        if (supBox.distanceToPoint(machineC.location) === 0)
          machineC.collided = true;
      }
    }

    // obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      if (obstacle.constructor.name === "PointObject") {
        // exclude this equip
        if ("Type" in obstacle.meta) {
          if (!String(obstacle.meta["Type"]).includes("Obstacle")) {
            obstacles.splice(i, 1);
          }
        }
        // exclude column
        if ("Category" in obstacle.meta) {
          if (String(obstacle.meta["Category"]).includes("Columns")) {
            obstacles.splice(i, 1);
          }
        }
      }
    }

    const obstacleObj3D: THREE.Object3D[] = [];
    for (const obj of obstacles) {
      if (obj.constructor.name === "Beam") {
        obstacleObj3D.push(obj.renderObjects[1].object3d);
      }
      if (obj.constructor.name === "PointObject") {
        obstacleObj3D.push(obj.renderObjects[0].object3d);
      }
    }

    const obstacleBoxes = obstacleObj3D.map((obstacle) =>
      new THREE.Box3().setFromObject(obstacle)
    );

    console.log("obstacleBoxes", obstacleBoxes);

    const pumpHookManager = new PumpHookManager(viewModel.scene);

    pumpHookManager.inputData(
      vacuumConnections,
      machineConnections,
      obstacleBoxes
    );

    const path = pumpHookManager.Run(); // 라우팅 경로에 대한 벡터 값 리턴
    console.log("path", path);
    // ReduxStore.dispatch(CLEAR_EXPORT_OBJECTS())

    // console.log("path", path)

    // console.log("test", ReduxStore.getState().Meta.SystemType)

    // let meta_pipe: { [key: string]: string } = {
    //   "Category": "Pipes",
    //   "Family": "Pipe Types",
    //   "Type": "",
    //   "System Type": "",
    //   "System Name": "순환수 공급 100",
    //   "Pipe Segment": "탄소강 - 일람표 40",
    //   "Size": "150mm",
    //   "Diameter": "150mm",
    //   "Reference Level": "1F"
    // };

    // let meta_pipe_fitting: { [key: string]: string } = {
    //   "Category": "Pipe Fittings",
    //   "Family": "M_엘보 - 일반",
    //   "System Type": "",
    //   "System Name": "순환수 공급 100",
    //   "Reference Level": "1F"
    // };

    // function updateMetaValue(metadata: { [key: string]: string }, key: string, value: string): void {
    //   if (metadata.hasOwnProperty(key)) {
    //     metadata[key] = value;
    //   } else {
    //     console.error(`Key '${key}' not found in metadata.`);
    //   }
    // }

    // const fittingRadius = 50; // 파이프 세그먼트 벡터를 줄이는 정도(길이)

    // let segmentId_index = 1;
    // let segmentset_index = 0;

    // path.forEach((segmentVectors) => {
    //   let meta_pipe_copy = { ...meta_pipe };
    //   let meta_pipe_fitting_copy = { ...meta_pipe_fitting };
    //   updateMetaValue(meta_pipe_copy, "Size", vacuumConnectionsRadius[segmentset_index].toString());
    //   updateMetaValue(meta_pipe_copy, "Diameter", vacuumConnectionsRadius[segmentset_index].toString());
    //   updateMetaValue(meta_pipe, "Type", ReduxStore.getState().Meta.Type);
    //   updateMetaValue(meta_pipe, "System Type", ReduxStore.getState().Meta.SystemType);
    //   updateMetaValue(meta_pipe, "System Name", ReduxStore.getState().Meta.SystemType + " 1000");
    //   updateMetaValue(meta_pipe, "Pipe Segment", ReduxStore.getState().Meta.PipeSegment)

    //   updateMetaValue(meta_pipe_fitting, "System Type", ReduxStore.getState().Meta.SystemType);
    //   updateMetaValue(meta_pipe_fitting, "System Name", ReduxStore.getState().Meta.SystemType + " 1000");

    //   segmentset_index++;

    //   for (let i = 0; i < segmentVectors.length - 1; i++) {
    //     // 시작점을 Vec3 형태로 생성
    //     let startPoint = new Vec3(segmentVectors[i].x * 100, segmentVectors[i].y * 100, segmentVectors[i].z * 100);
    //     // 끝점을 Vec3 형태로 생성
    //     let endPoint = new Vec3(segmentVectors[i + 1].x * 100, segmentVectors[i + 1].y * 100, segmentVectors[i + 1].z * 100);

    //     // 시작점과 끝점 벡터의 방향을 유지하면서 길이를 줄임
    //     let startToFitting = endPoint.clone().subtract(startPoint).normalize().multiply(fittingRadius);
    //     let endToFitting = startPoint.clone().subtract(endPoint).normalize().multiply(fittingRadius);

    //     // 피팅의 위치 계산
    //     let startFittingPoint = startPoint.clone().add(startToFitting);
    //     if (i === 0) startFittingPoint = startPoint.clone();
    //     let endFittingPoint = endPoint.clone().add(endToFitting);
    //     if (i + 1 === segmentVectors.length - 1) endFittingPoint = endPoint.clone()

    //     let mepCurve = ObjectManager.CreateCurveObject(
    //       `seg${segmentId_index}`,
    //       new LocationCurve(startFittingPoint, endFittingPoint),
    //       meta_pipe_copy
    //     );
    //     ReduxStore.dispatch(ADD_EXPORT_OBJECT(mepCurve));

    //     let mepPoint = ObjectManager.CreatePointObject(
    //       `fitting_seg${segmentId_index}`,
    //       new LocationPoint(endPoint),
    //       meta_pipe_fitting_copy
    //     );
    //     ReduxStore.dispatch(ADD_EXPORT_OBJECT(mepPoint));
    //     segmentId_index++;
    //     const a = 0;
    //   }
    // });

    // export_trans(path, vacuumConnectionsRadius, 1);
  };

  // const JSON_export = async () => {
  //   const jsonData = '{"key": "value"}'; // 쓸 JSON 데이터
  //   try {
  //     const blob = new Blob([jsonData], { type: 'application/json' });
  //     const url = URL.createObjectURL(blob);

  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = 'data.json';
  //     a.click();

  //     URL.revokeObjectURL(url);
  //     console.log('파일 쓰기 완료');
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };
  const JSON_export = async () => {
    const exportObjects = ReduxStore.getState().BIMSlice.exportObjects;
    //const allElements: HostObjectData[] = extractDataToElements(hostObjects);
    const allElementsJson = JSON.stringify({ elements: exportObjects });
    try {
      const blob = new Blob([allElementsJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const fileName = prompt("저장할 파일 이름을 입력하세요:", "data.json");
      if (fileName) {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
      }

      URL.revokeObjectURL(url);
      console.log("파일 쓰기 완료");
    } catch (err) {
      console.error(err);
    }
  };

  const Tee_generate = async () => {
    let main_vec_set = [];
    let sub_vec_set = [];
    let branch_vec_set = [];
    let main_meta_set = [];
    let sub_meta_set = [];
    let branch_meta_set = [];

    const vec_main1: THREE.Vector3[] = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(100, 0, 0),
      new THREE.Vector3(100, 100, 0),
      new THREE.Vector3(100, 100, 100),
    ];

    const vec_main2: THREE.Vector3[] = [
      new THREE.Vector3(500, 0, 0),
      new THREE.Vector3(600, 0, 0),
      new THREE.Vector3(600, 100, 0),
      new THREE.Vector3(600, 100, 100),
    ];

    const vec_branch1: THREE.Vector3[] = [
      new THREE.Vector3(50, 100, 100),
      new THREE.Vector3(70, 100, 100),
      new THREE.Vector3(90, 100, 100),
      new THREE.Vector3(100, 100, 100),
      new THREE.Vector3(110, 100, 100),
      new THREE.Vector3(130, 100, 100),
      new THREE.Vector3(150, 100, 100),
    ];

    const vec_branch2: THREE.Vector3[] = [
      new THREE.Vector3(550, 100, 100),
      new THREE.Vector3(570, 100, 100),
      new THREE.Vector3(590, 100, 100),
      new THREE.Vector3(600, 100, 100),
      new THREE.Vector3(610, 100, 100),
      new THREE.Vector3(630, 100, 100),
      new THREE.Vector3(650, 100, 100),
    ];

    const vec_b1_1: THREE.Vector3[] = [
      new THREE.Vector3(70, 100, 100),
      new THREE.Vector3(70, 150, 100),
      new THREE.Vector3(0, 150, 100),
    ];
    const vec_b1_2: THREE.Vector3[] = [
      new THREE.Vector3(90, 100, 100),
      new THREE.Vector3(90, 150, 100),
      new THREE.Vector3(90, 150, 170),
    ];
    const vec_b1_3: THREE.Vector3[] = [
      new THREE.Vector3(110, 100, 100),
      new THREE.Vector3(110, 100, 150),
      new THREE.Vector3(110, 170, 150),
    ];
    const vec_b1_4: THREE.Vector3[] = [
      new THREE.Vector3(130, 100, 100),
      new THREE.Vector3(130, 100, 150),
      new THREE.Vector3(200, 100, 150),
    ];

    const vec_b2_1: THREE.Vector3[] = [
      new THREE.Vector3(570, 100, 100),
      new THREE.Vector3(570, 150, 100),
      new THREE.Vector3(500, 150, 100),
    ];
    const vec_b2_2: THREE.Vector3[] = [
      new THREE.Vector3(590, 100, 100),
      new THREE.Vector3(590, 150, 100),
      new THREE.Vector3(590, 150, 170),
    ];
    const vec_b2_3: THREE.Vector3[] = [
      new THREE.Vector3(610, 100, 100),
      new THREE.Vector3(610, 100, 150),
      new THREE.Vector3(610, 170, 150),
    ];
    const vec_b2_4: THREE.Vector3[] = [
      new THREE.Vector3(630, 100, 100),
      new THREE.Vector3(630, 100, 150),
      new THREE.Vector3(700, 100, 150),
    ];

    main_vec_set.push(vec_main1);
    main_vec_set.push(vec_main2);
    sub_vec_set.push(vec_branch1);
    sub_vec_set.push(vec_branch2);
    branch_vec_set.push(vec_b1_1);
    branch_vec_set.push(vec_b1_2);
    branch_vec_set.push(vec_b1_3);
    branch_vec_set.push(vec_b1_4);
    branch_vec_set.push(vec_b2_1);
    branch_vec_set.push(vec_b2_2);
    branch_vec_set.push(vec_b2_3);
    branch_vec_set.push(vec_b2_4);

    const main_radius_sample = ["200mm", "200mm"];
    const sub_radius_sample = ["100mm", "100mm"];
    const branch_radius_sample = [
      "50mm",
      "50mm",
      "50mm",
      "50mm",
      "50mm",
      "50mm",
      "50mm",
      "50mm",
    ];

    const Meta_samnple = {
      Category: "Pipes",
      Family: "Pipe Types",
      Type: "Default",
      SystemType: "Hydronic Supply",
      SystemName: "Hydronic Supply 1000",
      PipeSegment: "Carbon Steel - Schedule 40",
      Size: "150mm",
      Diameter: "150mm",
      ReferenceLevel: "1F",
    };
    for (let i = 0; i < main_radius_sample.length; i++) {
      main_meta_set.push(Meta_samnple);
    }
    for (let i = 0; i < sub_radius_sample.length; i++) {
      sub_meta_set.push(Meta_samnple);
    }
    for (let i = 0; i < branch_radius_sample.length; i++) {
      branch_meta_set.push(Meta_samnple);
    }

    convertHookUpRouteForRevit(
      main_vec_set,
      main_radius_sample,
      main_meta_set,
      0
    );
    convertHookUpRouteForRevit(sub_vec_set, sub_radius_sample, sub_meta_set, 1);
    convertHookUpRouteForRevit(
      branch_vec_set,
      branch_radius_sample,
      branch_meta_set,
      2
    );
  };

  //-----0416-----
  const GetSpt2_1 = async () => {
    console.log("hostObjects when press", hostObjects);
    const randomList: Pipes[] = [];
    for (const obj of hostObjects) {
      // if (obj instanceof CurveObject && obj.isConnection === true)
      if (obj.constructor.name === "Pipes") {
        const pipeObj = obj as Pipes;
        if (
          pipeObj.StartPoint.x.toFixed(0) === pipeObj.EndPoint.x.toFixed(0) &&
          pipeObj.StartPoint.y.toFixed(0) === pipeObj.EndPoint.y.toFixed(0) &&
          pipeObj.StartPoint.z.toFixed(0) !== pipeObj.EndPoint.z.toFixed(0)
        ) {
          randomList.push(obj as Pipes);
        }
      }
    }
    // console.log("randomList", randomList);

    const randomIndex = Math.floor(Math.random() * randomList.length);
    const randomElement = randomList[randomIndex];
    randomList.splice(randomIndex, 1);
    const curveObj = randomElement as CurveObject;
    // console.log("randomElement", randomElement);
    // console.log("curveObj", curveObj);

    const randomIndex2 = Math.floor(Math.random() * randomList.length);
    const randomElement2 = randomList[randomIndex2];
    randomList.splice(randomIndex2, 1);
    const curveObj2 = randomElement2 as CurveObject;

    const randomIndex3 = Math.floor(Math.random() * randomList.length);
    const randomElement3 = randomList[randomIndex3];
    randomList.splice(randomIndex3, 1);
    const curveObj3 = randomElement3 as CurveObject;

    const randomIndex4 = Math.floor(Math.random() * randomList.length);
    const randomElement4 = randomList[randomIndex4];
    randomList.splice(randomIndex4, 1);
    const curveObj4 = randomElement4 as CurveObject;

    const randomIndex5 = Math.floor(Math.random() * randomList.length);
    const randomElement5 = randomList[randomIndex5];
    randomList.splice(randomIndex5, 1);
    const curveObj5 = randomElement5 as CurveObject;

    if (
      curveObj &&
      curveObj.EndPoint &&
      curveObj2 &&
      curveObj2.EndPoint &&
      curveObj3 &&
      curveObj3.EndPoint &&
      curveObj4 &&
      curveObj4.EndPoint &&
      curveObj5 &&
      curveObj5.EndPoint
    ) {
      const newSPt = new THREE.Vector3(
        curveObj.EndPoint.x,
        curveObj.EndPoint.y,
        curveObj.EndPoint.z
      );
      const newSPt2 = new THREE.Vector3(
        curveObj2.EndPoint.x,
        curveObj2.EndPoint.y,
        curveObj2.EndPoint.z
      );
      const newSPt3 = new THREE.Vector3(
        curveObj3.EndPoint.x,
        curveObj3.EndPoint.y,
        curveObj3.EndPoint.z
      );
      const newSPt4 = new THREE.Vector3(
        curveObj4.EndPoint.x,
        curveObj4.EndPoint.y,
        curveObj4.EndPoint.z
      );
      const newSPt5 = new THREE.Vector3(
        curveObj5.EndPoint.x,
        curveObj5.EndPoint.y,
        curveObj5.EndPoint.z
      );
      // setSPt(newSPt);
      sPts_1.push(newSPt);
      startObjs_1.push(curveObj);

      sPts_1.push(newSPt2);
      startObjs_1.push(curveObj2);

      sPts_1.push(newSPt3);
      startObjs_1.push(curveObj3);

      sPts_1.push(newSPt4);
      startObjs_1.push(curveObj4);

      sPts_1.push(newSPt5);
      startObjs_1.push(curveObj5);

      const newSPtVec1 = new Vec3(newSPt.x, newSPt.y, newSPt.z);
      const newSPtVec2 = new Vec3(newSPt2.x, newSPt2.y, newSPt2.z);
      const newSPtVec3 = new Vec3(newSPt3.x, newSPt3.y, newSPt3.z);
      const newSPtVec4 = new Vec3(newSPt4.x, newSPt4.y, newSPt4.z);
      const newSPtVec5 = new Vec3(newSPt4.x, newSPt4.y, newSPt4.z);
      new Point(newSPtVec1);
      new Point(newSPtVec2);
      new Point(newSPtVec3);
      new Point(newSPtVec4);
      new Point(newSPtVec5);
    } else console.log("not right", curveObj);

    // // just input 1 equip, consider multiple
    // const equipObjAll = hostObjects.filter(
    //   (obj) =>
    //     "Family" in obj.meta &&
    //     obj.meta["Family"] === "Semiconductor equipment_routing test"
    // );

    // console.log("equipObjAll", equipObjAll);
    // const equip = new RoutingObject(
    //   equipObjAll[0].id,
    //   equipObjAll[0].location as LocationPoint,
    //   equipObjAll[0].meta
    // );

    // const connector = equip.getConnectors();
    // console.log("connectPoints", connector);

    // const newEPt = connector![0];
    // const newEPt2 = connector![1];
    // const newEPt3 = new THREE.Vector3(1000, 1000, 1000);
    // // setEPt(newEPt);
    // // ePts.push(newEPt);
    // // ePts.push(newEPt2);
    // // ePts.push(newEPt3);

    // const newEPtVec1 = new Vec3(newEPt.x, newEPt.y, newEPt.z);
    // const newEPtVec2 = new Vec3(newEPt2.x, newEPt2.y, newEPt2.z);
    // const newEPtVec3 = new Vec3(newEPt3.x, newEPt3.y, newEPt3.z);
    // new Point(newEPtVec1);
    // new Point(newEPtVec2);
    // new Point(newEPtVec3);
  };

  const GetEndVoxel1 = async () => {
    // just input 1 equip, consider multiple
    // const equipObjAll = hostObjects.filter(
    //   (obj) =>
    //     "Family" in obj.meta &&
    //     obj.meta["Family"] === "Semiconductor equipment_routing test"
    // );

    // console.log("equipObjAll", equipObjAll);

    // const tempPt = cloneDeep(equipObjAll[0].location) as LocationPoint;
    // tempPt.origin = tempPt.origin.multiply(100);
    // const equip = new RoutingObject(
    //   equipObjAll[0].id,
    //   tempPt,
    //   equipObjAll[0].meta
    // );

    // const connector = equip.getConnectors();

    selectedVoxels.push(
      voxelManager.supportSpaceVoxels[15],
      voxelManager.supportSpaceVoxels[13],
      voxelManager.supportSpaceVoxels[11],
      voxelManager.supportSpaceVoxels[11],
      voxelManager.supportSpaceVoxels[13]
    );

    console.log("startObjs_1", startObjs_1);

    for (const [i, voxel] of selectedVoxels.entries()) {
      // TODO add sth to record path here
      const thisObj = startObjs_1[i];
      if ("Type" in thisObj.meta) {
        // get property
        const typeStr = String(thisObj.meta["Type"]);
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

    console.log("selectedVoxels", [...new Set(selectedVoxels)]);

    const newEPt = selectedVoxels[0].location;
    const newEPt2 = selectedVoxels[1].location;
    const newEPt3 = selectedVoxels[2].location;
    const newEPt4 = selectedVoxels[3].location;
    const newEPt5 = selectedVoxels[4].location;
    // ePts_2.push(newEPt);
    ePts_1.push(newEPt, newEPt2, newEPt3, newEPt4, newEPt5);

    voxelManager.showVoxels(selectedVoxels);
  };

  const GetEndVoxel2_2 = async () => {
    const infoForGE = se1.getInfoForGE();
    const properties = se1.connectorProperties;
    const useProperties: string[] = [];

    const branchingMainPath: THREE.Vector3[][] = [];
    // just input 1 equip, consider multiple
    const equipObjAll = hostObjects.filter(
      (obj) =>
        "Family" in obj.meta &&
        String(obj.meta["Family"]).includes(
          "Semiconductor equipment_routing test - AP TO CR"
        )
    );

    console.log("equipObjAll", equipObjAll);

    const tempPt = cloneDeep(equipObjAll[0].location) as LocationPoint;
    tempPt.origin = tempPt.origin.multiply(100);
    const equip = new equipObject(
      equipObjAll[0].id,
      tempPt,
      equipObjAll[0].meta
    );

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
        for (const [voxelIndex, voxel] of selectedVoxels.entries()) {
          console.log(`this is the ${voxelIndex} voxel`, voxel);
          for (const [
            k,
            propertyInfo,
          ] of voxel.branchInfo.assignProps.entries()) {
            console.log(
              `this is the ${k} property info of Voxel`,
              propertyInfo
            );

            if (propertyInfo.property === connectorName && !isKeyFind) {
              // if (propertyInfo.property.includes(connectorName) && !isKeyFind) {
              console.log("match!");
              // sPt

              // voxel.branchInfo.branchSPts.push(
              //   voxel.dividedChildren[voxel.branchInfo.currentBranchAmount]
              //     .location
              // );
              if (k < voxel.branchInfo.assignProps.length) {
                const mainOrder = k;
                for (let index = 0; index < propertyInfo.amount; index++) {
                  const branchOrder = index;
                  // face X
                  if (
                    voxel.branchInfo.aheadDir === aheadDir.X ||
                    voxel.branchInfo.aheadDir === aheadDir.XMinus
                  ) {
                    const selectedVoxel = voxel.dividedChildren.find(
                      (child) =>
                        +child.positionInParent
                          .distanceTo(
                            new THREE.Vector3(mainOrder, branchOrder, mainOrder)
                          )
                          .toFixed(3) === 0
                    );
                    if (selectedVoxel) {
                      voxel.branchInfo.branchSPts.push(selectedVoxel.location);
                      // add main
                      const testMainSPt = selectedVoxel.location;
                      const tempPt = new THREE.Vector3(
                        testMainSPt.x,
                        selectedVoxel.dividedParentNode!.box.max.y,
                        testMainSPt.z
                      );
                      let testMainEPt = tempPt;
                      let tempDist = Infinity;
                      for (const voxel of selectedVoxel.dividedChildren) {
                        if (voxel.location.distanceTo(testMainEPt) < tempDist) {
                          tempDist = voxel.location.distanceTo(testMainEPt);
                          testMainEPt = voxel.location;
                        }
                      }
                      branchingMainPath.push([testMainSPt, testMainEPt]);

                      // move origin path
                      const foundProp = properties.find(
                        (a) => a === propertyInfo.property
                      );
                      const pathIndex = properties.indexOf(foundProp!);
                      se1.ePts[pathIndex].x = selectedVoxel.location.x;
                      se1.ePts[pathIndex].z = selectedVoxel.location.z;
                    }
                    // no select
                    else console.error("can not found");
                  }
                  // face Y
                  else if (
                    voxel.branchInfo.aheadDir === aheadDir.Y ||
                    voxel.branchInfo.aheadDir === aheadDir.YMinus
                  ) {
                    const selectedVoxel = voxel.dividedChildren.find(
                      (child) =>
                        +child.positionInParent
                          .distanceTo(
                            new THREE.Vector3(branchOrder, mainOrder, mainOrder)
                          )
                          .toFixed(3) === 0
                    );
                    if (selectedVoxel) {
                      voxel.branchInfo.branchSPts.push(selectedVoxel.location);
                      // add main
                      const testMainSPt = selectedVoxel.location;
                      const tempPt = new THREE.Vector3(
                        selectedVoxel.dividedParentNode!.box.max.x,
                        testMainSPt.y,
                        testMainSPt.z
                      );
                      let testMainEPt = tempPt;
                      let tempDist = Infinity;
                      for (const voxel of selectedVoxel.dividedChildren) {
                        if (voxel.location.distanceTo(testMainEPt) < tempDist) {
                          tempDist = voxel.location.distanceTo(testMainEPt);
                          testMainEPt = voxel.location;
                        }
                      }
                      branchingMainPath.push([testMainSPt, testMainEPt]);

                      // move origin path
                      const foundProp = properties.find(
                        (a) => a === propertyInfo.property
                      );
                      const pathIndex = properties.indexOf(foundProp!);
                      se1.ePts[pathIndex].y = selectedVoxel.location.y;
                      se1.ePts[pathIndex].z = selectedVoxel.location.z;
                    }
                    // no select
                    else console.error("can not found");
                  } else {
                    console.error("no dir");
                    console.error(
                      "voxel.branchInfo.aheadDir",
                      voxel.branchInfo.aheadDir
                    );
                  }
                }
              }

              voxel.branchInfo.currentBranchAmount++;

              const connector = thisConnectors[
                connectorName as keyof typeof thisConnectors
              ] as Connector;
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

      console.log("paired!!!!", selectedVoxels);
    }

    // const connector = equip.getConnectors();
    // console.log("connectPoints", connector);

    // const newEPt = connector![0];
    // const newEPt2 = connector![1];
    // const newEPt3 = connector![2];
    // const newEPt4 = connector![3];
    // const newEPt5 = connector![4];
    // const newEPt6 = connector![5];
    // const newEPt7 = connector![6];
    // const newEPt8 = connector![7];
    // const newEPt9 = connector![8];
    // // ePts_2.push(newEPt);
    // ePts_2.push(
    //   newEPt,
    //   newEPt2,
    //   newEPt3,
    //   newEPt4,
    //   newEPt5,
    //   newEPt6,
    //   newEPt7,
    //   newEPt8,
    //   newEPt9
    // );

    // voxelManager.showVoxels(selectedVoxels);

    console.log("branchingMainPath.length before", branchingMainPath.length);

    for (const path of branchingMainPath) {
      for (const [i, pathCompared] of branchingMainPath.entries()) {
        if (path[0] === pathCompared[0]) {
          if (
            path[1].distanceTo(path[0]) >
            pathCompared[1].distanceTo(pathCompared[0])
          ) {
            branchingMainPath.splice(i, 1);
          }
        }
      }
    }

    console.log("branchingMainPath.length after", branchingMainPath.length);

    for (const path of branchingMainPath) {
      const pathToVec3 = path.map((pt) => new Vec3(pt.x, pt.y, pt.z));
      new Line(pathToVec3, { r: 0, g: 1, b: 0 });
    }
    se1.drawPath();
  };

  const GetStartVoxel = async () => {
    // // const randomIndexes = generateRandomIndices(
    // //   voxelManager.supportSpaceVoxels.length,
    // //   3
    // // );
    // // const selectedVoxels = voxelManager.supportSpaceVoxels.filter((voxel, i) =>
    // //   randomIndexes.includes(i)
    // // );
    // // setRandomStartVoxel(selectedVoxels);
    // // no origin, dummy data
    // if (
    //   voxelManager.originSupportSpaceVoxels.length === 0 ||
    //   se1.paths.length === 0
    // ) {
    //   console.log("original support voxel --> 0");
    //   const dummySelectedVoxels = [
    //     voxelManager.supportSpaceVoxels[0],
    //     voxelManager.supportSpaceVoxels[1],
    //     voxelManager.supportSpaceVoxels[2],
    //   ];
    //   // selectedVoxels.push(...voxelManager.supportSpaceVoxels[0].neighbors);
    //   sPts_2.push(voxelManager.supportSpaceVoxels[0].location);
    //   sPts_2.push(voxelManager.supportSpaceVoxels[1].location);
    //   sPts_2.push(voxelManager.supportSpaceVoxels[2].location);
    //   sPts_2.push(voxelManager.supportSpaceVoxels[0].location);
    //   sPts_2.push(voxelManager.supportSpaceVoxels[1].location);
    //   sPts_2.push(voxelManager.supportSpaceVoxels[2].location);
    //   sPts_2.push(voxelManager.supportSpaceVoxels[0].location);
    //   sPts_2.push(voxelManager.supportSpaceVoxels[1].location);
    //   sPts_2.push(voxelManager.supportSpaceVoxels[2].location);
    //   voxelManager.showVoxels(dummySelectedVoxels);
    //   for (const neighbor of voxelManager.supportSpaceVoxels[0].neighbors) {
    //     console.log(
    //       "distance",
    //       distanceOfBoxes(neighbor.box, voxelManager.supportSpaceVoxels[0].box)
    //     );
    //   }
    //   // findBranchNode(
    //   //   voxelManager.originSupportSpaceVoxels,
    //   //   dummySelectedVoxels
    //   // );
    // } else {
    //   console.log("original support voxel > 0");
    //   let startNodes: VoxelNode[] = [];
    //   for (const sPt of se1.ePts) {
    //     startNodes.push(
    //       getInsideNode(sPt, voxelManager.originSupportSpaceVoxels)
    //     );
    //   }
    //   const selectedSubVoxels = [
    //     selectedVoxels[0].dividedChildren[0],
    //     selectedVoxels[0].dividedChildren[3],
    //     selectedVoxels[0].dividedChildren[6],
    //     selectedVoxels[1].dividedChildren[10],
    //     selectedVoxels[1].dividedChildren[13],
    //     selectedVoxels[1].dividedChildren[16],
    //     selectedVoxels[2].dividedChildren[20],
    //     selectedVoxels[2].dividedChildren[23],
    //     selectedVoxels[2].dividedChildren[26],
    //   ];
    //   // selectedVoxels.push(...voxelManager.supportSpaceVoxels[0].neighbors);
    //   sPts_2.push(selectedSubVoxels[0].location);
    //   sPts_2.push(selectedSubVoxels[1].location);
    //   sPts_2.push(selectedSubVoxels[2].location);
    //   sPts_2.push(selectedSubVoxels[3].location);
    //   sPts_2.push(selectedSubVoxels[4].location);
    //   sPts_2.push(selectedSubVoxels[5].location);
    //   sPts_2.push(selectedSubVoxels[6].location);
    //   sPts_2.push(selectedSubVoxels[7].location);
    //   sPts_2.push(selectedSubVoxels[8].location);
    //   voxelManager.showVoxels(selectedVoxels);
    //   for (const neighbor of voxelManager.supportSpaceVoxels[0].neighbors) {
    //     console.log(
    //       "distance",
    //       distanceOfBoxes(neighbor.box, voxelManager.supportSpaceVoxels[0].box)
    //     );
    //   }
    //   // findBranchNode(voxelManager.originSupportSpaceVoxels, selectedSubVoxels);
    // }
  };

  const divideSupportVoxels = async () => {
    //findBranchNode

    if (voxelManager.supportSpaceVoxels) {
      voxelManager.originSupportSpaceVoxels = voxelManager.supportSpaceVoxels;
      voxelManager.supportSpaceVoxels = await voxelManager.divideVoxels(
        voxelManager.supportSpaceVoxels,
        5
      );
      // voxelManager.supportSpaceVoxels = voxelManager.divideVoxels(
      //   voxelManager.supportSpaceVoxels,
      //   1.1
      // );
      console.log("divided success");
    } else console.error("divided false");

    findBranchNode(voxelManager.originSupportSpaceVoxels);
    console.log(
      "voxelManager.OriginSupportSpaceVoxels",
      voxelManager.originSupportSpaceVoxels
    );
    console.log("selectedVoxels after divide", [...new Set(selectedVoxels)]);
  };

  const findPath2 = async () => {
    for (const voxel of [...new Set(selectedVoxels)]) {
      for (const sPt of voxel.branchInfo.branchSPts) {
        sPts_2.push(sPt);
        new Point(new Vec3(sPt.x, sPt.y, sPt.z), { r: 1, g: 0, b: 0 });
      }
      for (const ePt of voxel.branchInfo.branchEPts) {
        ePts_2.push(ePt);
        new Point(new Vec3(ePt.x, ePt.y, ePt.z)), { r: 1, g: 1, b: 0 };
      }
    }

    console.log(`find path with sPts: `, sPts_2);
    console.log(`find path with ePts: `, ePts_2);

    const timer2 = measureExecutionTime();
    timer2.next();
    // console.log("sPts at find path", sPts);
    // console.log("ePts at find path", ePts);

    if (voxelManager.voxelNodes) {
      se2.voxelNodes = voxelManager.supportSpaceVoxels;
      se2.run(sPts_2, ePts_2, true);
    }
    console.warn("SE Algorithm");
    timer2.next();
  };

  //const SetupAndOrganize = async () => {};
  return (
    <>
      <button style={{ width: "100%", height: "100%" }} onClick={Voxelization}>
        Voxelization
      </button>

      <button style={{ width: "100%", height: "100%" }} onClick={showVoxels}>
        showVoxels
      </button>
      <button
        style={{ width: "100%", height: "100%" }}
        onClick={EndPoints_Setup}
      >
        EndPoints_Setup
      </button>
      <button style={{ width: "100%", height: "100%" }} onClick={FindPath}>
        FindPath
      </button>
      {/* <button
        style={{ width: "100%", height: "100%" }}
        onClick={VoxelizeAndFindPath}
      >
        FindPath2
      </button> */}
      <button
        style={{ width: "100%", height: "100%" }}
        onClick={hideNodeAndVoxel}
      >
        Hide_Node_And_Voxel
      </button>

      <button style={{ width: "100%", height: "100%" }} onClick={GE_Setup}>
        GE_Setup
      </button>
      <button style={{ width: "100%", height: "100%" }} onClick={RunGE}>
        RunGE
      </button>
      <button style={{ width: "100%", height: "100%" }} onClick={Test}>
        Test
      </button>

      <button
        style={{ width: "100%", height: "100%", color: "green" }}
        onClick={GetPumpEndPts}
      >
        Route1 Get Pump End Pts
      </button>
      <button
        style={{ width: "100%", height: "100%", color: "green" }}
        onClick={GenPumpPath}
      >
        Route1 Gen Pump Path
      </button>

      <button
        style={{ width: "100%", height: "100%", color: "orange" }}
        onClick={Voxelization}
      >
        Route2-1 step0 Voxelize
      </button>
      <button
        style={{ width: "100%", height: "100%", color: "orange" }}
        onClick={showVoxels}
      >
        Route2-1 step1 show Voxels
      </button>

      <button
        style={{ width: "100%", height: "100%", color: "orange" }}
        onClick={GetSpt2_1}
      >
        Route2-1 step2 Random Get spt
      </button>
      <button
        style={{ width: "100%", height: "100%", color: "orange" }}
        onClick={GetEndVoxel1}
      >
        Route2-1 step3 Random Get End Voxel
      </button>
      <button
        style={{ width: "100%", height: "100%", color: "orange" }}
        onClick={FindPath}
      >
        Route2-1 step4 FindPath
      </button>
      <button
        style={{ width: "100%", height: "100%", color: "orange" }}
        onClick={hideNodeAndVoxel}
      >
        Route2-1 step5 Hide_Node_And_Voxel
      </button>
      <button
        style={{ width: "100%", height: "100%", color: "orange" }}
        onClick={GE_Setup}
      >
        Route2-1 step6 GE_Setup
      </button>
      <button
        style={{ width: "100%", height: "100%", color: "orange" }}
        onClick={RunGE}
      >
        Route2-1 step7 RunGE
      </button>

      <button
        style={{ width: "100%", height: "100%", color: "brown" }}
        onClick={Voxelization}
      >
        Route2-2 step0 Voxelization
      </button>

      <button
        style={{ width: "100%", height: "100%", color: "brown" }}
        onClick={divideSupportVoxels}
      >
        Route2-2 step1 divide Support Voxels
      </button>

      <button
        style={{ width: "100%", height: "100%", color: "brown" }}
        onClick={showSupportVoxel}
      >
        Route2-2 step2 show support Voxels
      </button>

      <button
        style={{ width: "100%", height: "100%", color: "brown" }}
        onClick={GetStartVoxel}
      >
        Route2-2 step3 Get Start Voxels
      </button>
      <button
        style={{ width: "100%", height: "100%", color: "brown" }}
        onClick={GetEndVoxel2_2}
      >
        Route2-2 step4 Get End Voxels
      </button>
      <button
        style={{ width: "100%", height: "100%", color: "brown" }}
        onClick={findPath2}
      >
        Route2-2 step5 findPath
      </button>
      <button style={{ width: "100%", height: "100%" }} onClick={JSON_export}>
        JSON_export
      </button>
      <button style={{ width: "100%", height: "100%" }} onClick={Tee_generate}>
        Tee_generate
      </button>
    </>
  );
};

export function generateRandomIndices(length: number, count: number): number[] {
  if (length <= 0 || count <= 0) {
    throw new Error("Length and count must be greater than 0.");
  }
  if (count > length) {
    throw new Error("Count must not exceed the length of the array.");
  }

  const indices = new Set<number>();
  while (indices.size < count) {
    const randomIndex = Math.floor(Math.random() * length);
    indices.add(randomIndex);
  }

  return Array.from(indices);
}
