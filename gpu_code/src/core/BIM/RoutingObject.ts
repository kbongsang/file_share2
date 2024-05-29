import { cloneDeep } from "lodash";
import { vec3ToVector3, Vector3ToVec3 } from "../api/hookup-routing/general";
import { LocationPoint } from "./Location";
import { PointObject } from "./PointObject";
import * as THREE from "three";
import { Point } from "../../render/generic/point";

export interface equipConnector {
  location: THREE.Vector3;
  property: string;
  size: number;
  direction: THREE.Vector3;
  isVertical: boolean;
}

export class equipObject extends PointObject {
  location: LocationPoint;
  connectors: equipConnector[] = [];
  boundingBox: THREE.Box3 = new THREE.Box3();
  // testConnectPoint: THREE.Vector3;
  // testConnectPoint2: THREE.Vector3;

  constructor(id: string, location: LocationPoint, meta: object) {
    super(id, location, meta);
    this.location = location;

    //#region not used now
    // this.testConnectPoint = new THREE.Vector3(
    //   location.origin.x - 12.5,
    //   location.origin.y - 12.5,
    //   location.origin.z - 2
    // );
    // this.testConnectPoint2 = new THREE.Vector3(
    //   location.origin.y - 12.5,
    //   location.origin.y - 5,
    //   location.origin.z - 2
    // );
    // new Point(location.X - 12.5, location.Y - 12.5, location.Z - 2);
    //#endregion

    this.createGeometry();
    this.getConnectorsNew();
    this.getBoundingBox();
  }

  test = () => {
    console.log("test");
  };

  getConnectors = (): THREE.Vector3[] | undefined => {
    console.log("get connector? ", "Connectors" in this.meta);
    if ("Connectors" in this.meta && Array.isArray(this.meta["Connectors"])) {
      return this.meta["Connectors"].map(
        (connector) =>
          new THREE.Vector3(
            this.location.origin.x + connector.X / 100,
            this.location.origin.y + connector.Y / 100,
            this.location.origin.z + connector.Z / 100
          )
      );
    } else {
      return undefined;
    }
  };

  getConnectorsNew = (): equipConnector[] | undefined => {
    // console.log("get connector? ", "Connectors" in this.meta);
    if ("Connectors" in this.meta) {
      // console.log(typeof this.meta["Connectors"]);
      // console.log(this.meta["Connectors"]);
      const connectorsInfo = this.meta["Connectors"] as object;

      const flattenArray = flattenToValuesArray(connectorsInfo);
      const convertArray = convertData(flattenArray);
      const separatedArray = separateProperty(convertArray);
      const formatArray = formatSize(separatedArray);

      // console.log("convertArray", cloneDeep(convertArray));
      // console.log("separatedArray", cloneDeep(separatedArray));
      // console.log("formatArray", formatArray);

      const equipPt = vec3ToVector3(this.location.origin).multiplyScalar(100);
      console.log("equipPt", equipPt);
      new Point(Vector3ToVec3(equipPt), { r: 0, g: 1, b: 0 });

      const connectorPts = formatArray.map((data) => {
        const location = data[2] as THREE.Vector3;
        const connectorPt = cloneDeep(equipPt).add(
          cloneDeep(location).multiplyScalar(0.01)
        );
        new Point(Vector3ToVec3(connectorPt), { r: 0, g: 1, b: 0 });
        return connectorPt;
      });

      for (const [index, data] of formatArray.entries()) {
        const newConnector: equipConnector = {
          location: connectorPts[index],
          property: data[1] as string,
          size: data[0] as number,
          direction: data[3] as THREE.Vector3,
          isVertical: true,
        };
        this.connectors.push(newConnector);
      }

      return this.connectors;
    }
    // no connectors
    else {
      return undefined;
    }
  };
  getBoundingBox = () => {
    for (const renderObj of this.renderObjects) {
      if (renderObj.object3d instanceof THREE.Mesh) {
        this.boundingBox.expandByObject(renderObj.object3d);
      }
    }
    return this.boundingBox;
  };
}

function flattenToValuesArray(obj: Record<string, any>): any[][] {
  const result: any[][] = [];

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const nestedObject = obj[key];
      const valuesArray = [key, ...Object.values(nestedObject)];
      result.push(valuesArray);
    }
  }

  // console.log("result", result);
  return result;
}

function convertData(data: any[]) {
  for (const connectorInfo of data) {
    for (const [index, data] of connectorInfo.entries()) {
      if (index === 0) continue;
      const connector = data as { X: number; Y: number; Z: number };
      const transferConnector = new THREE.Vector3(
        connector.X,
        connector.Y,
        connector.Z
      );
      connectorInfo[index] = transferConnector;
    }
  }
  return data;
}

function separateProperty(data: any[]) {
  for (const dataSingle of data) {
    const dataInfo = dataSingle[0] as string;
    const dataCulled = dataInfo.replace('"', "");
    const [size, ...propertyArray] = dataCulled.split("_");
    const finalPropArray = propertyArray.join("_");

    dataSingle.splice(0, 1);

    dataSingle.unshift(finalPropArray);
    dataSingle.unshift(size);
  }
  return data;
}

function formatSize(data: any[]) {
  for (const dataSingle of data) {
    const sizeData = dataSingle[0] as string;
    // console.log("sizeData", sizeData);

    // console.log("sizeData", sizeData);
    let finalSize: number;
    if (sizeData.includes("미사용")) {
      finalSize = -1;
    }
    // mm data
    else if (sizeData.includes("A")) {
      finalSize = parseFloat(sizeData);
    }
    // inch data
    else {
      if (sizeData.includes("/")) {
        const Dividend = sizeData.split("/")[0];
        const Divisor = sizeData.split("/")[1];
        finalSize = parseFloat(
          (
            parseFloat(
              (parseFloat(Dividend) / parseFloat(Divisor)).toFixed(3)
            ) * 25.4
          ).toFixed(3)
        );
      } else finalSize = parseFloat(sizeData) * 25.4;
    }
    dataSingle[0] = finalSize;
    // console.log("finalSize", finalSize);
  }

  return data;
}
