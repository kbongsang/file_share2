import { ReduxStore } from "../../../app/redux-store";
import {
  ADD_EXPORT_OBJECT,
  CLEAR_EXPORT_OBJECTS,
  ADD_PUMP_EXPORT_OBJECT,
  ExportObject,
} from "../../../app/bim-slice";
import Vec3 from "../../util/vec3";
import { LocationCurve, LocationPoint } from "../../BIM/Location";
import { ObjectManager } from "../../util/ObjectManager";
import { MetaData } from "../../../app/meta-slice";
import { MetaDataFitting } from "../../../app/metafitting-slice";
import { RouteResult } from "../../../app/routing-slice";
import { HostObject } from "../../BIM/HostObject";

export function clear_redux_export() {
  ReduxStore.dispatch(CLEAR_EXPORT_OBJECTS()); //Export data initialization function, required to insert into the code that starts routing.
}

export const convertPumpRouteForRevit = (routeResult: RouteResult) => {
  const reduce_length = 50;
  const pumpHostObjects: HostObject[] = [];

  console.log("convertPumpRouteForRevit: routeResult: ", routeResult);

  routeResult.routeResult.map((routeData) => {
    const pumpPipeMeta: MetaData = {
      Category: "Pipes",
      Family: "Pipe Types",
      Type: ReduxStore.getState().Meta.Type,
      SystemType: ReduxStore.getState().Meta.SystemType,
      SystemName: ReduxStore.getState().Meta.SystemType + "1000",
      PipeSegment: ReduxStore.getState().Meta.PipeSegment,
      Size: routeData.diameter.toString(),
      Diameter: routeData.diameter.toString(),
      ReferenceLevel: ReduxStore.getState().Meta.ReferenceLevel,
    };

    const pumpFittingMeta: MetaDataFitting = {
      Category: "Pipe Fittings",
      Family: ReduxStore.getState().MetaFitting.Family,
      SystemType: ReduxStore.getState().Meta.SystemType,
      SystemName: ReduxStore.getState().Meta.SystemType + "1000",
      Level: ReduxStore.getState().Meta.ReferenceLevel,
    };

    for (let i = 0; i < routeData.route.length - 1; i++) {
      const SPT = new Vec3(
        routeData.route[i].x * 100,
        routeData.route[i].y * 100,
        routeData.route[i].z * 100
      );
      const EPT = new Vec3(
        routeData.route[i + 1].x * 100,
        routeData.route[i + 1].y * 100,
        routeData.route[i + 1].z * 100
      );

      const startToFitting = EPT.clone()
        .subtract(SPT)
        .normalize()
        .multiply(reduce_length);
      const endToFitting = SPT.clone()
        .subtract(EPT)
        .normalize()
        .multiply(reduce_length);

      let fittingSPT = SPT.clone().add(startToFitting);
      if (i === 0) fittingSPT = SPT.clone();
      let fittingEPT = EPT.clone().add(endToFitting);
      if (i + 1 === routeData.route.length - 1) fittingEPT = EPT.clone();

      const mepCurve = ObjectManager.CreateCurveObject(
        `seg${i}`,
        new LocationCurve(fittingSPT, fittingEPT),
        pumpPipeMeta
      );
      pumpHostObjects.push(mepCurve);

      if (i + 1 !== routeData.route.length - 1) {
        const mepPoint = ObjectManager.CreatePointObject(
          `fitting_seg${i}`,
          new LocationPoint(EPT),
          pumpFittingMeta
        );
        pumpHostObjects.push(mepPoint);
      }
    }
  });

  console.log("convertPumpRouteForRevit: pumpExportObjects: ", pumpHostObjects);

  const pumpExportObject: ExportObject = {
    name: routeResult.name,
    hostObjects: pumpHostObjects,
  };

  ReduxStore.dispatch(ADD_PUMP_EXPORT_OBJECT(pumpExportObject));
  console.log("convertPumpRouteForRevit end!!!");
};

export function export_trans(
  path: THREE.Vector3[][],
  radius_set: any,
  task: number,
  type_set?: any,
  task_pipe_option?: number
) {
  const reduce_length = 50; // Degree of reduction of pipe segment vector (length), will be checked and optimized by the Revit stage
  let segmentId_index = 0;
  let Set_index = 0;
  path.forEach((segmentVectors) => {
    if (task == 1) {
      //For Task 1
      const meta_pipe: MetaData = {
        Category: "Pipes",
        Family: "Pipe Types",
        Type: ReduxStore.getState().Meta.Type,
        SystemType: ReduxStore.getState().Meta.SystemType,
        SystemName: ReduxStore.getState().Meta.SystemType + "1000", //` 100${segmentId_index}`,
        PipeSegment: ReduxStore.getState().Meta.PipeSegment,
        Size: radius_set[Set_index].toString(),
        Diameter: radius_set[Set_index].toString(),
        ReferenceLevel: ReduxStore.getState().Meta.ReferenceLevel,
      };

      const meta_pipe_fitting: MetaDataFitting = {
        Category: "Pipe Fittings",
        Family: ReduxStore.getState().MetaFitting.Family,
        SystemType: ReduxStore.getState().Meta.SystemType,
        SystemName: ReduxStore.getState().Meta.SystemType + "1000",
        Level: ReduxStore.getState().Meta.ReferenceLevel,
      };

      Set_index++;
      for (let i = 0; i < segmentVectors.length - 1; i++) {
        let cur_meta_pipe = { ...meta_pipe };
        let cur_meta_pipe_fitting = { ...meta_pipe_fitting };
        // 시작점을 Vec3 형태로 생성
        let startPoint = new Vec3(
          segmentVectors[i].x * 100,
          segmentVectors[i].y * 100,
          segmentVectors[i].z * 100
        );
        // 끝점을 Vec3 형태로 생성
        let endPoint = new Vec3(
          segmentVectors[i + 1].x * 100,
          segmentVectors[i + 1].y * 100,
          segmentVectors[i + 1].z * 100
        );
        // 시작점과 끝점 벡터의 방향을 유지하면서 길이를 줄임
        let startToFitting = endPoint
          .clone()
          .subtract(startPoint)
          .normalize()
          .multiply(reduce_length);
        let endToFitting = startPoint
          .clone()
          .subtract(endPoint)
          .normalize()
          .multiply(reduce_length);
        // 피팅의 위치 계산
        let startFittingPoint = startPoint.clone().add(startToFitting);
        if (i === 0) startFittingPoint = startPoint.clone();
        let endFittingPoint = endPoint.clone().add(endToFitting);
        if (i + 1 === segmentVectors.length - 1)
          endFittingPoint = endPoint.clone();
        let mepCurve = ObjectManager.CreateCurveObject(
          `seg${segmentId_index}`,
          new LocationCurve(startFittingPoint, endFittingPoint),
          cur_meta_pipe // 복사된 메타데이터 객체를 사용합니다.
        );
        mepCurve.disposeGeometry();

        ReduxStore.dispatch(ADD_EXPORT_OBJECT(mepCurve));
        let mepPoint = ObjectManager.CreatePointObject(
          `fitting_seg${segmentId_index}`,
          new LocationPoint(endPoint),
          cur_meta_pipe_fitting // 복사된 메타데이터 객체를 사용합니다.
        );
        mepPoint.disposeGeometry();
        ReduxStore.dispatch(ADD_EXPORT_OBJECT(mepPoint));
        segmentId_index++;
      }
    } else {
      // For Task 2
      const meta_pipe: MetaData = {
        Category: "Pipes",
        Family: "Pipe Types",
        Type: type_set[Set_index]["Type"],
        SystemType: type_set[Set_index]["System Type"],
        SystemName: type_set[Set_index]["System Type"] + "1000",
        PipeSegment: type_set[Set_index]["Pipe Segment"],
        Size: radius_set[Set_index].toString(),
        Diameter: radius_set[Set_index].toString(),
        ReferenceLevel: type_set[Set_index]["Reference Level"],
      };

      const meta_pipe_fitting: MetaDataFitting = {
        Category: "Pipe Fittings",
        Family: "M_엘보 - 일반",
        SystemType: type_set[Set_index]["System Type"],
        SystemName: type_set[Set_index]["System Type"] + "1000",
        Level: type_set[Set_index]["Reference Level"],
      };
      Set_index++;

      for (let i = 0; i < segmentVectors.length - 1; i++) {
        let cur_meta_pipe = { ...meta_pipe };
        let cur_meta_pipe_fitting = { ...meta_pipe_fitting };
        // 시작점을 Vec3 형태로 생성
        let startPoint = new Vec3(
          segmentVectors[i].x * 100,
          segmentVectors[i].y * 100,
          segmentVectors[i].z * 100
        );
        // 끝점을 Vec3 형태로 생성
        let endPoint = new Vec3(
          segmentVectors[i + 1].x * 100,
          segmentVectors[i + 1].y * 100,
          segmentVectors[i + 1].z * 100
        );

        // 시작점과 끝점 벡터의 방향을 유지하면서 길이를 줄임
        let startToFitting = endPoint
          .clone()
          .subtract(startPoint)
          .normalize()
          .multiply(reduce_length);
        let endToFitting = startPoint
          .clone()
          .subtract(endPoint)
          .normalize()
          .multiply(reduce_length);

        let startFittingPoint = startPoint.clone().add(startToFitting);
        let endFittingPoint = endPoint.clone().add(endToFitting);
        // 피팅의 위치 계산
        if (task_pipe_option == 0) {
          //startFittingPoint = startPoint.clone();
          cur_meta_pipe_fitting.Family = "Elbow";
        } else if (task_pipe_option == 1) {
          //if (i == 0) startFittingPoint = startPoint.clone();
          if (i + 1 === segmentVectors.length - 1)
            //endFittingPoint = endPoint.clone();
            cur_meta_pipe_fitting.Family = "Tee";
        } else {
          //endFittingPoint = endPoint.clone();
          cur_meta_pipe_fitting.Family = "Elbow";
        }

        let mepCurve = ObjectManager.CreateCurveObject(
          `seg${segmentId_index}`,
          new LocationCurve(startFittingPoint, endFittingPoint),
          cur_meta_pipe // 복사된 메타데이터 객체를 사용합니다.
        );
        mepCurve.disposeGeometry();
        ReduxStore.dispatch(ADD_EXPORT_OBJECT(mepCurve));
        let mepPoint = ObjectManager.CreatePointObject(
          `fitting_seg${segmentId_index}`,
          new LocationPoint(endPoint),
          cur_meta_pipe_fitting // 복사된 메타데이터 객체를 사용합니다.
        );
        ReduxStore.dispatch(ADD_EXPORT_OBJECT(mepPoint));
        segmentId_index++;
      }
    }
  });
}

export const convertHookUpRouteForRevit = (
  path: THREE.Vector3[][], //Vector set
  radius_set: any, //Radius set
  type_set: any, //Metadata set
  task_pipe_option: number // Main: 0, Sub: 1, Branch: 2
) => {
  const reduce_length = 50; // Degree of reduction of pipe segment vector (length), will be checked and optimized by the Revit stage
  const HookUpHostObjects: HostObject[] = [];
  let segmentId_index = 0;
  let Set_index = 0;
  path.forEach((segmentVectors) => {
    const meta_pipe: MetaData = {
      Category: "Pipes",
      Family: "Pipe Types",
      Type: type_set[Set_index]["Type"],
      SystemType: type_set[Set_index]["System Type"],
      SystemName: type_set[Set_index]["System Type"] + "1000",
      PipeSegment: type_set[Set_index]["Pipe Segment"],
      Size: radius_set[Set_index].toString(),
      Diameter: radius_set[Set_index].toString(),
      ReferenceLevel: type_set[Set_index]["Reference Level"],
    };

    const meta_pipe_fitting: MetaDataFitting = {
      Category: "Pipe Fittings",
      Family: "M_엘보 - 일반",
      SystemType: type_set[Set_index]["System Type"],
      SystemName: type_set[Set_index]["System Type"] + "1000",
      Level: type_set[Set_index]["Reference Level"],
    };
    Set_index++;

    for (let i = 0; i < segmentVectors.length - 1; i++) {
      let cur_meta_pipe = { ...meta_pipe };
      let cur_meta_pipe_fitting = { ...meta_pipe_fitting };
      // 시작점을 Vec3 형태로 생성
      let startPoint = new Vec3(
        segmentVectors[i].x * 100,
        segmentVectors[i].y * 100,
        segmentVectors[i].z * 100
      );
      // 끝점을 Vec3 형태로 생성
      let endPoint = new Vec3(
        segmentVectors[i + 1].x * 100,
        segmentVectors[i + 1].y * 100,
        segmentVectors[i + 1].z * 100
      );

      // 시작점과 끝점 벡터의 방향을 유지하면서 길이를 줄임
      let startToFitting = endPoint
        .clone()
        .subtract(startPoint)
        .normalize()
        .multiply(reduce_length);
      let endToFitting = startPoint
        .clone()
        .subtract(endPoint)
        .normalize()
        .multiply(reduce_length);

      let startFittingPoint = startPoint.clone().add(startToFitting);
      let endFittingPoint = endPoint.clone().add(endToFitting);
      // 피팅의 위치 계산
      if (task_pipe_option === 0) {
        cur_meta_pipe_fitting.Family = "Elbow";
        if (i == 0) startFittingPoint = startPoint.clone();
      } else if (task_pipe_option === 1) {
        cur_meta_pipe_fitting.Family = "Tee";
        if (i == 0) startFittingPoint = startPoint.clone();
        if (i + 1 == segmentVectors.length - 1) endPoint.clone();
      } else if (task_pipe_option === 2) {
        cur_meta_pipe_fitting.Family = "Elbow";
        if (i + 1 == segmentVectors.length - 1) endPoint.clone();
      } else {
        cur_meta_pipe_fitting.Family = "Elbow";
      }

      const mepCurve = ObjectManager.CreateCurveObject(
        `seg${segmentId_index}`,
        new LocationCurve(startFittingPoint, endFittingPoint),
        cur_meta_pipe // 복사된 메타데이터 객체를 사용합니다.
      );
      HookUpHostObjects.push(mepCurve);
      ReduxStore.dispatch(ADD_EXPORT_OBJECT(mepCurve));

      if (i + 1 !== segmentVectors.length - 1) {
        const mepPoint = ObjectManager.CreatePointObject(
          `fitting_seg${segmentId_index}`,
          new LocationPoint(endPoint),
          cur_meta_pipe_fitting // 복사된 메타데이터 객체를 사용합니다.
        );
        HookUpHostObjects.push(mepPoint);
        ReduxStore.dispatch(ADD_EXPORT_OBJECT(mepPoint));
      }
      console.log(cur_meta_pipe_fitting.Family);
      segmentId_index++;
    }
  });
};
