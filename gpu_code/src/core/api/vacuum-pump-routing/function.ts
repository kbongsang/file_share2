// import * as THREE from "three";
import { ReduxStore } from "../../../app/redux-store";
import { HostObject } from "../../BIM/HostObject";
import { Connector } from "../../../app/routing-slice";
import { Box3 } from "three/src/math/Box3.js";
import { Vector3 } from "three/src/math/Vector3.js";
import { Point } from "../../../render/generic/point";

export const makeSupportBoxes = () => {
  const hostObjects = ReduxStore.getState().BIMSlice.hostObjects;
  const allPointObjs = hostObjects.filter(
    (obj) => obj.constructor.name === "PointObject"
  );

  const supportsBoxes: Box3[] = [];
  for (const obj of allPointObjs) {
    if ("Type" in obj.meta) {
      if (String(obj.meta["Type"]).includes("Raised Floor Pedestal")) {
        supportsBoxes.push(
          new Box3().setFromObject(obj.renderObjects[0].object3d)
        );
      }
    }
  }

  return supportsBoxes;
};

export const calculateBeamArea = () => {
  const hostObjects = ReduxStore.getState().BIMSlice.hostObjects;
  const beamBoxes: Box3[] = [];

  hostObjects.map((hostObject: any) => {
    if (hostObject.constructor.name === "PointObject") {
      if (hostObject.meta["Family"].includes("Waffle")) {
        const xOffsetVector = new Vector3(12, 0, 0);
        const yOffsetVector = new Vector3(0, 20, 0);
        const zOffsetVector = new Vector3(0, 0, 5);
        const offsetVector = new Vector3(12, 20, 5);
        const xHalfVector = new Vector3(5, 0, 0);
        const yHalfVector = new Vector3(0, 9, 0);
        const basePoint: Vector3 = hostObject.location.origin
          .convertToTHREE()
          .clone()
          .sub(offsetVector);
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            const origin = basePoint
              .clone()
              .add(xOffsetVector.clone().multiplyScalar(i))
              .add(yOffsetVector.clone().multiplyScalar(j));
            const min = origin
              .clone()
              .sub(xHalfVector)
              .sub(yHalfVector)
              .sub(zOffsetVector);
            const max = origin
              .clone()
              .add(xHalfVector)
              .add(yHalfVector)
              .add(zOffsetVector);

            beamBoxes.push(new Box3(min, max));
          }
        }
      }
    }
  });

  return beamBoxes;
};

export const makeRawObstacles = () => {
  const hostObjects = ReduxStore.getState().BIMSlice.hostObjects;
  console.log("hostObjects: ", hostObjects);
  const rawObstacles = hostObjects.filter(
    (obj) =>
      obj.constructor.name === "Beam" ||
      obj.constructor.name === "PointObject" ||
      obj.constructor.name === "Pipes" ||
      obj.constructor.name === "RectangularDucts" ||
      obj.constructor.name === "CableTrays" ||
      obj.constructor.name === "CableTrayFittings" ||
      obj.constructor.name === "PipeFitting"
  );

  for (let i = rawObstacles.length - 1; i >= 0; i--) {
    const rawObstacle = rawObstacles[i];
    if (rawObstacle.constructor.name === "PointObject") {
      // exclude this equip
      if ("Type" in rawObstacle.meta) {
        if (!String(rawObstacle.meta["Type"]).includes("Obstacle")) {
          rawObstacles.splice(i, 1);
        } else if (
          String(rawObstacle.meta["Type"]).includes("Raised Floor Pedestal")
        ) {
          rawObstacles.splice(i, 1);
        }
      }
      // exclude column
      if ("Category" in rawObstacle.meta) {
        if (String(rawObstacle.meta["Category"]).includes("Columns")) {
          rawObstacles.splice(i, 1);
        }
      }
    }
  }

  return rawObstacles;
};

export const getBeamMinZ = (beamBoxes: Box3[]) => {
  let minZ = Infinity;

  beamBoxes.map((beamBox) => {
    if (minZ > beamBox.min.z) {
      minZ = beamBox.min.z;
    }
  });

  return minZ;
};

export const getTempEPT = (
  toConnector: Connector,
  beamBoxes: Box3[],
  beamMinZ: number
) => {
  console.log("toConnector: ", toConnector);

  const tempBox = new Box3(
    new Vector3(
      toConnector.origin.x - toConnector.diameter / 200,
      toConnector.origin.y - toConnector.diameter / 200,
      beamMinZ
    ),
    new Vector3(
      toConnector.origin.x + toConnector.diameter / 200,
      toConnector.origin.y + toConnector.diameter / 200,
      toConnector.origin.z
    )
  );

  let currDistance = Infinity;
  let nearestBeamBox = new Box3();

  for (const beamBox of beamBoxes) {
    if (
      tempBox.min.x >= beamBox.min.x &&
      tempBox.min.y >= beamBox.min.y &&
      tempBox.max.x <= beamBox.max.x &&
      tempBox.max.y <= beamBox.max.y
    ) {
      return [
        toConnector.origin,
        new Vector3(toConnector.origin.x, toConnector.origin.y, beamBox.min.z),
      ];
    }

    if (beamBox.distanceToPoint(toConnector.origin) < currDistance) {
      currDistance = beamBox.distanceToPoint(toConnector.origin);
      nearestBeamBox = beamBox.clone();
    }
  }

  nearestBeamBox = new Box3(
    nearestBeamBox.min
      .clone()
      .addScalar(toConnector.diameter / 200)
      .setZ(nearestBeamBox.min.z - toConnector.diameter / 200),
    nearestBeamBox.max
      .clone()
      .subScalar(toConnector.diameter / 200)
      .setZ(nearestBeamBox.max.z + toConnector.diameter / 200)
  );

  // const nearestPoint = findNearestPoint(
  //   toConnector.origin,
  //   nearestBeamBox,
  //   false
  // );

  const nearestPoint = new Vector3();

  nearestBeamBox.clampPoint(toConnector.origin.clone(), nearestPoint);

  console.warn("toConnector: ", toConnector.origin.clone());
  console.warn("nearestBeamBox: ", nearestBeamBox.clone());
  console.warn("nearestBeamBox's min: ", nearestBeamBox.clone().min);
  console.warn("nearestBeamBox's max: ", nearestBeamBox.clone().max);
  console.warn("nearestPoint: ", nearestPoint.clone());
  // console.warn("testVector3: ", testVector3.clone());

  new Point(nearestPoint.clone(), { r: 0, g: 0, b: 1 });
  // new Point(testVector3.clone(), { r: 0, g: 1, b: 0 });

  new Point(nearestBeamBox.clone().min, { r: 1, g: 0, b: 0 });
  new Point(nearestBeamBox.clone().max, { r: 1, g: 0, b: 0 });

  const turnPoint = modifyPointByAngle(nearestPoint, toConnector.origin, false);

  return [
    toConnector.origin,
    turnPoint!,
    nearestPoint,
    nearestPoint.clone().setZ(nearestBeamBox.min.z),
  ];
};

export const makeObstacleGroups = (
  rawObstacles: HostObject[],
  fromConnectors: Connector[] = [],
  toConnectors: Connector[] = []
) => {
  const obj3DObstacles: THREE.Object3D[] = [];
  for (const rawObstacle of rawObstacles) {
    if (
      rawObstacle.constructor.name === "Beam" ||
      rawObstacle.constructor.name === "Pipes" ||
      rawObstacle.constructor.name === "RectangularDucts" ||
      rawObstacle.constructor.name === "CableTrays"
    ) {
      obj3DObstacles.push(rawObstacle.renderObjects[1].object3d);
    } else if (
      rawObstacle.constructor.name === "PointObject" ||
      rawObstacle.constructor.name === "CableTrayFittings" ||
      rawObstacle.constructor.name === "PipeFitting"
    ) {
      obj3DObstacles.push(rawObstacle.renderObjects[0].object3d);
    }
    // else if (rawObstacle.constructor.name === "Pipes") {
    //   obj3DObstacles.push(rawObstacle.renderObjects[1].object3d);
    // } else if (rawObstacle.constructor.name === "RectangularDucts") {
    //   obj3DObstacles.push(rawObstacle.renderObjects[1].object3d);
    // }
  }

  // for (const rawObstacle of rawObstacles) {
  //   if (rawObstacle.constructor.name === "PipeFitting") {
  //     const testBox = new Box3().setFromObject(
  //       rawObstacle.renderObjects[0].object3d
  //     );
  //     new Point(new Vector3(testBox.min.x, testBox.min.y, testBox.min.z), {
  //       r: 0,
  //       g: 0,
  //       b: 1,
  //     });
  //     new Point(new Vector3(testBox.max.x, testBox.max.y, testBox.max.z), {
  //       r: 0,
  //       g: 0,
  //       b: 1,
  //     });
  //   }
  // }

  console.log("obj3DObstacles: ", obj3DObstacles);

  const obstacleBoxes = obj3DObstacles.map((obj3DObstacle) =>
    new Box3().setFromObject(obj3DObstacle)
  );

  const obstacleGroups = fromConnectors.map((fromConnector, i) => {
    const obstacleGroup = collectObstacles(
      obstacleBoxes,
      toConnectors[i].diameter / 200,
      fromConnector.origin,
      toConnectors[i].origin
    );
    return obstacleGroup;
  });

  return obstacleGroups;
};

export const isCollideWithSupportBox = (
  toConnector: Connector,
  supportBoxes: Box3[]
) => {
  for (const supportBox of supportBoxes) {
    if (supportBox.distanceToPoint(toConnector.origin) === 0) {
      console.error("collided with support box!");
      return true;
    }
  }

  return false;
};

export const isAlreadyRouted = (
  fromConnector: Connector,
  toConnector: Connector
) => {
  const routedFromConnectors =
    ReduxStore.getState().routingSlice.routedFromConnectors;
  const routedToConnectors =
    ReduxStore.getState().routingSlice.routedToConnectors;

  if (
    routedFromConnectors.includes(fromConnector) &&
    routedToConnectors.includes(toConnector)
  )
    return true;

  return false;
};

export const collectObstacles = (
  boxes: Box3[],
  offset: number = 0,
  sPt: Vector3,
  ePt?: Vector3
) => {
  const offsetBoxes = boxes.map((box) => {
    const clonedBox = box.clone();
    clonedBox.min.subScalar(offset);
    clonedBox.max.addScalar(offset);
    return clonedBox;
  });

  if (ePt) {
    return offsetBoxes.filter(
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
    return offsetBoxes.filter(
      (box) =>
        box.max.x >= sPt.x &&
        box.min.x <= sPt.x &&
        box.max.y >= sPt.y &&
        box.min.y <= sPt.y &&
        box.max.z >= sPt.z
    );
  }
};

export const findNearestPoint = (
  point: Vector3,
  box: Box3,
  isFromBottom: boolean
) => {
  const leftXDist = box.min.x - point.x;
  const rightXDist = box.max.x - point.x;
  const bottomYDist = box.min.y - point.y;
  const topYDist = box.max.y - point.y;
  const distanceAll = [leftXDist, rightXDist, bottomYDist, topYDist];

  const minDistance = [...distanceAll].sort(
    (a, b) => Math.abs(a) - Math.abs(b)
  )[0];
  const minIndex = distanceAll.indexOf(minDistance);

  const nearestPt = point.clone();

  nearestPt.z = isFromBottom ? box.min.z : box.max.z;
  if (minIndex <= 1) {
    nearestPt.x += minDistance;
  } else {
    nearestPt.y += minDistance;
  }

  return nearestPt;
};

export const modifyPointByAngle = (
  sPt: Vector3,
  ePt: Vector3,
  isFromBottom: boolean
) => {
  let testDegree = 90 - calculateVerticalAngle(sPt, ePt, true);
  const angleDegree = isFinite(testDegree) ? testDegree : 0;

  console.log("angleDegree: ", angleDegree);

  // let angleDegree = _angleDegree;
  let outPt: Vector3 | undefined = undefined;

  //step2: get cotangent
  const cot60 = 1 / Math.tan(Math.PI / 3);
  const cot45 = 1 / Math.tan(Math.PI / 4);
  const cot30 = 1 / Math.tan(Math.PI / 6);
  const xLength = Math.abs(sPt.x - ePt.x);
  const yLength = Math.abs(sPt.y - ePt.y);

  const planLength = Math.sqrt(xLength ** 2 + yLength ** 2);
  //step3: determine
  if (angleDegree > 60) {
    // const _zLength = planLength * cot45;
    // outPt = isFromBottom
    //   ? new Vector3(sPt.x, sPt.y, ePt.z - _zLength)
    //   : new Vector3(ePt.x, ePt.y, sPt.z + _zLength);

    // return outPt;
    console.error("error in angle algorithm, angleDegree: ", angleDegree);
    return outPt;
  }
  // 0 ~ 60
  else if (angleDegree <= 60 && angleDegree >= 0) {
    let _zLength: number = 0;
    if (angleDegree <= 60 && angleDegree > 45) {
      _zLength = planLength * cot60;
    } else if (angleDegree <= 45 && angleDegree > 0) {
      _zLength = planLength * cot45;
    } else if (angleDegree <= 30 && angleDegree > 0) {
      _zLength = planLength * cot30;
    } else {
      _zLength = planLength * cot30;
    }
    outPt = isFromBottom
      ? new Vector3(sPt.x, sPt.y, ePt.z - _zLength)
      : new Vector3(ePt.x, ePt.y, sPt.z + _zLength);

    return outPt;
  }
  console.error("error in angle algorithm, angleDegree: ", angleDegree);
  return outPt;
};

export const calculateVerticalAngle = (
  sPt: Vector3,
  ePt: Vector3,
  degree: boolean
) => {
  const projectedEPt = new Vector3(ePt.x, ePt.y, sPt.z);
  const vec1 = new Vector3().subVectors(projectedEPt, sPt);
  const vec2 = new Vector3().subVectors(ePt, sPt);

  const dot = vec1.dot(vec2);

  const magnitudeA = vec1.length();
  const magnitudeB = vec2.length();

  const angleRadians = Math.acos(dot / (magnitudeA * magnitudeB));
  const angleDegrees = angleRadians * (180 / Math.PI);

  if (!degree) {
    return angleRadians;
  } else {
    return angleDegrees;
  }
};

export const testTriangleCalculator = (sPt: Vector3, ePt: Vector3) => {
  const a = Math.sqrt(
    Math.pow(ePt.x - sPt.x, 2) +
      Math.pow(ePt.y - sPt.y, 2) +
      Math.pow(ePt.z - sPt.z, 2)
  );
  const b = Math.sqrt(Math.pow(ePt.x - sPt.x, 2) + Math.pow(ePt.y - sPt.y, 2));
  const c = Math.abs(ePt.z - sPt.x);

  console.log("빗변: ", a);
  console.log("밑변: ", b);
  console.log("높이: ", c);
};

export const arrangePath = (path: Vector3[]) => {
  let lastDirection: Vector3 = new Vector3(-1, -1, -1);

  for (let i = path.length - 1; i > 0; i--) {
    const currPT = path[i];
    const prevPT = path[i - 1];

    const currDirection = currPT.subtract(prevPT).normalize();
    if (
      currPT.subtract(prevPT).length < 0.01 ||
      lastDirection.isSame(currDirection)
    )
      path.splice(i, 1);

    lastDirection = currDirection;
  }

  return path;
};
