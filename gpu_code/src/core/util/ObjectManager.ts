import { Beam } from "../family/Beam";
import { Floor } from "../family/Floor";
import { PipeFitting } from "../family/PipeFittings";
import { Pipes } from "../family/Pipes";
import { RectangularDucts } from "../family/RectangularDucts";
import { RoundDucts } from "../family/RoundDucts";
import { CeilingAndFloor } from "../BIM/CeilingAndFloor";
import { CurveObject } from "../BIM/CurveObject";
import { LocationCurve, LocationPoint, LocationSpline } from "../BIM/Location";
import { PointObject } from "../BIM/PointObject";
import { ReduxStore } from "../../app/redux-store";
import {
  ADD_BIM_OPTIONS,
  ADD_DATASET,
  ADD_HOST_OBJECT,
  BIMOptions,
  BIMRawData,
  CLEAR_BIM_OPTIONS,
  CLEAR_HOST_OBJECTS,
  DELETE_DATASET,
  DELETE_HOST_OBJECT,
} from "../../app/bim-slice";
import Vec3 from "./vec3";
import { Conduits } from "../family/Conduits";
import { ConduitFittings } from "../family/ConduitFittings";
import { CableTrays } from "../family/CableTrays";
import { Walls } from "../family/Walls";
import { SplineObject } from "../BIM/SplineObject";
import { CableTrayFittings } from "../family/CableTrayFittings";

export class ObjectManager {
  static CreateCurveObject(id: string, location: LocationCurve, meta: object) {
    // const inputLocation = {
    //   "Start Point": location["Start Point"],
    //   "End Point": location["End Point"],
    // };

    if ("Category" in meta && meta["Category"] === "Pipes") {
      const pipes = new Pipes(id, location, meta);
      return pipes;
    }

    if ("Category" in meta && meta["Category"] === "Ducts") {
      if ("Family" in meta && typeof meta["Family"] === "string") {
        const isRectangularDuct = meta["Family"].includes("Rectangular Duct");
        if (isRectangularDuct) {
          const rectangularDucts = new RectangularDucts(id, location, meta);
          return rectangularDucts;
        } else {
          const roundDucts = new RoundDucts(id, location, meta);
          return roundDucts;
        }
      }
    }

    if ("Category" in meta && meta["Category"] === "Structural Framing") {
      const beamObj = new Beam(id, location, meta);
      return beamObj;
    }

    if ("Category" in meta && meta["Category"] === "Conduits") {
      const conduits = new Conduits(id, location, meta);
      return conduits;
    }

    if ("Category" in meta && meta["Category"] === "Cable Trays") {
      const cableTrays = new CableTrays(id, location, meta);
      return cableTrays;
    }

    if ("Category" in meta && meta["Category"] === "Walls") {
      const walls = new Walls(id, location, meta);
      return walls;
    }

    const curveObject = new CurveObject(id, location, meta);
    return curveObject;
  }

  static CreateSplineObject(
    id: string,
    location: LocationSpline,
    meta: object
  ) {
    if ("Category" in meta && meta["Category"] === "Flex Ducts") {
      const flexDucts = new SplineObject(id, location, meta);
      return flexDucts;
    }
  }

  static CreatePointObject(id: string, location: LocationPoint, meta: object) {
    if ("Category" in meta && meta["Category"] === "Pipe Fittings") {
      const pipeFittings = new PipeFitting(id, location, meta);
      return pipeFittings;
    }

    if ("Category" in meta && meta["Category"] === "Duct Fittings") {
      const ductFittings = new PipeFitting(id, location, meta);
      return ductFittings;
    }

    if ("Category" in meta && meta["Category"] === "Conduit Fittings") {
      const conduitFittings = new ConduitFittings(id, location, meta);
      return conduitFittings;
    }

    if ("Category" in meta && meta["Category"] === "Cable Tray Fittings") {
      const cableTrayFittings = new CableTrayFittings(id, location, meta);
      return cableTrayFittings;
    }
    const pointObject = new PointObject(id, location, meta);
    return pointObject;
  }

  static createCeilingAndFloor(id: string, meta: object) {
    if ("Category" in meta && meta["Category"] === "Floors") {
      const floorObj = new Floor(id, meta);
      return floorObj;
    }
    const ceilingAndFloor = new CeilingAndFloor(id, meta);
    return ceilingAndFloor;
  }

  static async registerHostObjects(raw: BIMRawData[], options: BIMOptions) {
    const filename = options.data.Dataset_tag;
    console.log(filename);
    if (ReduxStore.getState().BIMSlice.dataSet.indexOf(filename) === -1) {
      const isConfirmedNewDataSet = await confirm(
        "New dataset " + filename + " is loaded. Do you want to proceed?"
      );

      if (!isConfirmedNewDataSet) {
        await confirm("New dataset " + filename + " is not loaded.");
        return;
      }

      ReduxStore.dispatch(ADD_DATASET(filename));
    } else {
      const isConfirmedOverwrite = await confirm(
        "Dataset " +
          filename +
          " is already loaded.\n Do you want clear previous data and load new data?"
      );
      if (!isConfirmedOverwrite) {
        await confirm("New dataset " + filename + " is not loaded.");
        return;
      } else {
        this.deleteHostObjectsByDatasetTag(filename);
      }
    }

    ReduxStore.dispatch(ADD_BIM_OPTIONS(options));

    raw.forEach((raw: BIMRawData) => {
      let isCurveObject = false;
      let sPt: Vec3 | undefined = undefined;
      let ePt: Vec3 | undefined = undefined;
      let origin: Vec3 | undefined = undefined;
      let vertices: Vec3[] = [];
      let meta: { [key: string]: any } = {};

      for (const key in raw.data) {
        switch (key) {
          case "Start Point": {
            isCurveObject = true;
            sPt = new Vec3(raw.data[key].X, raw.data[key].Y, raw.data[key].Z);
            break;
          }
          case "End Point": {
            isCurveObject = true;
            ePt = new Vec3(raw.data[key].X, raw.data[key].Y, raw.data[key].Z);
            break;
          }
          case "Location": {
            origin = new Vec3(
              raw.data[key].X,
              raw.data[key].Y,
              raw.data[key].Z
            );
            break;
          }
          case "Vertices": {
            vertices = raw.data[key].map((vertex: any) => {
              return new Vec3(vertex.X, vertex.Y, vertex.Z);
            });
            break;
          }
          default: {
            meta[key] = raw.data[key];
            break;
          }
        }
      }

      if (isCurveObject && sPt && ePt) {
        const mepCurve = ObjectManager.CreateCurveObject(
          raw.Id,
          new LocationCurve(sPt, ePt),
          meta
        );
        ReduxStore.dispatch(ADD_HOST_OBJECT(mepCurve));
      } else if (origin) {
        const mepPoint = ObjectManager.CreatePointObject(
          raw.Id,
          new LocationPoint(origin),
          meta
        );
        ReduxStore.dispatch(ADD_HOST_OBJECT(mepPoint));
      } else if (vertices.length > 0) {
        const mepSpline = ObjectManager.CreateSplineObject(
          raw.Id,
          new LocationSpline(vertices),
          meta
        );
        ReduxStore.dispatch(ADD_HOST_OBJECT(mepSpline));
      } else {
        const ceilingAndFloor = ObjectManager.createCeilingAndFloor(
          raw.Id,
          meta
        );
        if (ceilingAndFloor !== undefined)
          ReduxStore.dispatch(ADD_HOST_OBJECT(ceilingAndFloor));
      }
    });

    console.log("hostObjects: ", ReduxStore.getState().BIMSlice.hostObjects);
    console.log("bimOptions: ", ReduxStore.getState().BIMSlice.bimOptions);
    console.log("dataSet: ", ReduxStore.getState().BIMSlice.dataSet);
  }

  static clearHostObjects() {
    ReduxStore.getState().BIMSlice.hostObjects.forEach((obj) => {
      obj.disposeGeometry();
    });

    ReduxStore.dispatch(CLEAR_HOST_OBJECTS());
  }

  static deleteHostObjectsByDatasetTag(datasetTag: string) {
    ReduxStore.dispatch(DELETE_DATASET(datasetTag));

    ReduxStore.getState().BIMSlice.hostObjects.forEach((obj) => {
      if ("Dataset_tag" in obj.meta && obj.meta.Dataset_tag === datasetTag) {
        obj.disposeGeometry();
        ReduxStore.dispatch(DELETE_HOST_OBJECT(obj));
      }
    });

    const filteredOptions = ReduxStore.getState().BIMSlice.bimOptions.filter(
      (option) => option.data.Dataset_tag !== datasetTag
    );
    const deepCopiedOptions = JSON.parse(JSON.stringify(filteredOptions));

    ReduxStore.dispatch(CLEAR_BIM_OPTIONS());

    if (deepCopiedOptions.length > 0) {
      deepCopiedOptions.forEach((option: BIMOptions) => {
        ReduxStore.dispatch(ADD_BIM_OPTIONS(option));
      });
    }

    // console.log(
    //   "filtered Host Objects: ",
    //   ReduxStore.getState().BIMSlice.hostObjects
    // );
    // console.log(
    //   "filtered BIM Options: ",
    //   ReduxStore.getState().BIMSlice.bimOptions
    // );
    // console.log("filtered Data Set: ", ReduxStore.getState().BIMSlice.dataSet);
  }
}
