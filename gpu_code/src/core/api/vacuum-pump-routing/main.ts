import { ReduxStore } from "../../../app/redux-store";
// import Vector3 from "../../util/vec3";
import { RouteData } from "../../../app/routing-slice";
import {
  arrangePath,
  calculateBeamArea,
  findNearestPoint,
  getBeamMinZ,
  getTempEPT,
  isAlreadyRouted,
  isCollideWithSupportBox,
  makeObstacleGroups,
  makeRawObstacles,
  makeSupportBoxes,
  modifyPointByAngle,
} from "./function";
import { HostObject } from "../../BIM/HostObject";
import { Point } from "../../../render/generic/point";
import { Vector3 } from "three/src/math/Vector3.js";
import { Box3 } from "three/src/math/Box3.js";
import { Line } from "../../../render/generic/line";

export const executeVacuumRouting = (routeName: string) => {
  const result: RouteData[] = [];
  const fromConnectors =
    ReduxStore.getState().routingSlice.targetFromConnectors;
  const toConnectors = ReduxStore.getState().routingSlice.targetToConnectors;

  if (!(fromConnectors.length === toConnectors.length)) {
    alert("fromConnector's length and toConnectors's length are different!");
    return result;
  }

  // Make supportBoxes array
  const supportBoxes: THREE.Box3[] = makeSupportBoxes();
  // console.log("supportBoxes: ", supportBoxes);

  // Make Obstacles groups for each connector pair
  const rawObstacles: HostObject[] = makeRawObstacles();
  console.log("rawObstacles: ", rawObstacles);

  const beamBoxes = calculateBeamArea();
  console.log("beamBoxes: ", beamBoxes);
  // return;

  const beamMinZ = getBeamMinZ(beamBoxes);
  console.log("beamMinZ: ", beamMinZ);

  // Make obstacleGroups for pairs
  const obstacleGroups: THREE.Box3[][] = makeObstacleGroups(
    rawObstacles,
    fromConnectors,
    toConnectors
  );
  console.log("obstaclesGroups: ", obstacleGroups);

  // return;
  // obstacleGroups[2].map((obstacle) => {
  //   new Point(new Vector3(obstacle.min.x, obstacle.min.y, obstacle.min.z), {
  //     r: 0,
  //     g: 0,
  //     b: 1,
  //   });
  //   new Point(new Vector3(obstacle.max.x, obstacle.max.y, obstacle.max.z), {
  //     r: 0,
  //     g: 0,
  //     b: 1,
  //   });
  // });
  // return;

  // Algorithm start
  for (let i = 0; i < fromConnectors.length; i++) {
    // if (i !== 0) continue;
    const fromConnector = fromConnectors[i];
    const toConnector = toConnectors[i];
    const obstacleGroup = obstacleGroups[i];

    console.log("fromConnector: ", fromConnector);
    console.log("toConnector: ", toConnector);
    console.log("obstacleGroup: ", [...obstacleGroup]);

    // If this pair already routed, continue
    if (isAlreadyRouted(fromConnector, toConnector)) continue;

    // If fromConnector collied with supportBox, continue
    // if (isCollideWithSupportBox(toConnector, supportBoxes)) continue;

    const routeData: RouteData = {
      id: `${toConnector.id}_${toConnector.name}`,
      name: routeName,
      from: fromConnector.id,
      to: toConnector.id,
      diameter: toConnector.diameter,
      route: [],
    };

    const tempEPT = getTempEPT(toConnector, beamBoxes, beamMinZ);

    console.log("tempEPT: ", tempEPT);

    for (let j = 0; j < tempEPT.length - 1; j++) {
      new Line([tempEPT[j], tempEPT[j + 1]], { r: 1, g: 0, b: 0 });
    }

    continue;

    if (obstacleGroup.length < 1) {
      // Case 1: If there is no collision between fromConnector to ToConnector
      console.log("Case 1: There is no collision");
      if (
        toConnector.origin.subtract(fromConnector.origin).normalize().z > 0.9999
      ) {
        // Case 1-1: Direction is equal to (0, 0, 1)
        console.log("Case 1-1: Direction is equal to (0, 0, 1)");

        routeData.route = [fromConnector.origin, toConnector.origin];
        result.push(routeData);
      } else {
        // Case 1-2: Direction is not equal to (0, 0, 1)
        console.log("Case 1-2: Direction is not equal to (0, 0, 1)");

        const tempEPT = new Vector3(
          toConnector.origin.x,
          toConnector.origin.y,
          beamMinZ - toConnector.diameter / 200
        );

        const turnPoint = modifyPointByAngle(
          fromConnector.origin.convertToTHREE(),
          tempEPT.convertToTHREE(),
          true
        );

        routeData.route = [
          fromConnector.origin,
          new Vector3(turnPoint!.x, turnPoint!.y, turnPoint!.z),
          tempEPT,
          toConnector.origin,
        ];
        result.push(routeData);
      }
    } else {
      // Case 2: If there is collision between fromConnector to ToConnector
      console.log("Case 2: There is collision");

      // Make temp EPT
      obstacleGroup.sort(
        (a, b) =>
          b.distanceToPoint(toConnector.origin) -
          a.distanceToPoint(toConnector.origin)
      );
      const lastObstacle = obstacleGroup.pop()!;

      let tempEPT = new Vector3();
      let tempEPTToEPT: Vector3[] = [];

      const radiusVector = new Vector3(
        toConnector.diameter / 200,
        toConnector.diameter / 200,
        0
      );
      const testBox = new Box3(
        toConnector.origin.clone().sub(radiusVector).setZ(lastObstacle.min.z),
        toConnector.origin.clone().add(radiusVector)
      );

      if (testBox.intersect(lastObstacle).isEmpty()) {
        // if there is no collision pipe's toConnector to beam's min with beam
        tempEPT = toConnector.origin.clone().setZ(lastObstacle.min.z);
        tempEPTToEPT = [
          new Vector3(tempEPT.x, tempEPT.y, tempEPT.z),
          toConnector.origin,
        ];
      } else {
        // if there is a collision pipe's toConnector to beam's min with beam
        const nearestFromEPT = findNearestPoint(
          toConnector.origin,
          lastObstacle,
          false
        );

        console.log("test: ", [...obstacleGroup]);

        for (let k = obstacleGroup.length - 1; k >= 0; k--) {
          if (lastObstacle.clone().intersect(obstacleGroup[k]).isEmpty()) break;
          else {
            const nextObstacle = obstacleGroup.pop()!;
            console.log("nextObstacle: ", nextObstacle);
            const nextNearestPT = findNearestPoint(
              nearestFromEPT,
              nextObstacle,
              false
            );
            nearestFromEPT.x = nextNearestPT.x;
            nearestFromEPT.y = nextNearestPT.y;
          }
        }

        const turnPoint = modifyPointByAngle(
          nearestFromEPT,
          toConnector.origin,
          false
        );

        tempEPT = nearestFromEPT.clone();
        console.log(lastObstacle);
        tempEPT.z = lastObstacle.min.z;
        // tempEPT.z -= lastObstacle.max.z - lastObstacle.min.z;

        tempEPTToEPT = [
          new Vector3(tempEPT.x, tempEPT.y, tempEPT.z),
          new Vector3(nearestFromEPT.x, nearestFromEPT.y, nearestFromEPT.z),
          new Vector3(turnPoint!.x, turnPoint!.y, turnPoint!.z),
          toConnector.origin,
        ];

        console.log("tempEPTToEPT: ", tempEPTToEPT);
        // continue;
      }

      // Except obstacles below lastObstacle(maybe BEAM)
      for (let j = obstacleGroup.length - 1; j >= 0; j--) {
        if (obstacleGroup[j].min.z >= lastObstacle.min.z)
          obstacleGroup.splice(j, 1);
      }

      if (obstacleGroup.length < 1) {
        // Case 2-1: Only one obstacle
        console.log("Case 2-1: Only one obstacle");
        const turnPoint = modifyPointByAngle(
          fromConnector.origin,
          tempEPT,
          true
        );

        const path: Vector3[] = [
          fromConnector.origin,
          new Vector3(turnPoint!.x, turnPoint!.y, turnPoint!.z),
        ];
        tempEPTToEPT.map((element) => {
          path.push(element);
        });

        routeData.route = arrangePath(path);
        result.push(routeData);
      } else {
        // Case 2-2: More than one obstacle
        console.log("Case 2-2: More than one obstacle");
        let round = 0;

        obstacleGroup.sort(
          (a, b) =>
            b.distanceToPoint(fromConnector.origin) -
            a.distanceToPoint(fromConnector.origin)
        );

        const path: Vector3[] = [fromConnector.origin];

        console.log(obstacleGroup);

        while (obstacleGroup.length > 0) {
          console.log(`${++round} round!`);

          // const currObstacle = obstacleGroup.splice(
          //   obstacleGroup.length - 1,
          //   1
          // )[0];
          const currObstacle = obstacleGroup.pop()!;
          const currPT = path[path.length - 1];

          const nearestPT = findNearestPoint(currPT, currObstacle, true);

          for (let k = obstacleGroup.length - 1; k >= 0; k--) {
            if (obstacleGroup[k].min.z <= currObstacle.max.z) {
              // const nextObstacle = obstacleGroup.splice(k, 1)[0];
              const nextObstacle = obstacleGroup.pop()!;
              const tempMin = nearestPT.clone().sub(radiusVector);
              const tempMax = nearestPT
                .clone()
                .add(radiusVector)
                .setZ(nextObstacle.max.z);
              const tempBox = new Box3(tempMin, tempMax);

              if (tempBox.clone().intersect(nextObstacle).isEmpty()) continue;

              const nextNearestPT = findNearestPoint(
                nearestPT,
                nextObstacle,
                true
              );
              nearestPT.x = nextNearestPT.x;
              nearestPT.y = nextNearestPT.y;
            } else break;
          }

          const turnPoint = modifyPointByAngle(currPT, nearestPT, true);
          const passPT = nearestPT.clone();
          passPT.z += currObstacle.max.z - currObstacle.min.z;
          path.push(new Vector3(turnPoint!.x, turnPoint!.y, turnPoint!.z));
          path.push(new Vector3(nearestPT.x, nearestPT.y, nearestPT.z));
          path.push(new Vector3(passPT.x, passPT.y, passPT.z));
        }

        const turnPoint = modifyPointByAngle(
          path[path.length - 1],
          tempEPT,
          true
        );
        path.push(new Vector3(turnPoint!.x, turnPoint!.y, turnPoint!.z));

        tempEPTToEPT.map((element) => {
          path.push(element);
        });

        routeData.route = arrangePath(path);
        result.push(routeData);
      }
    }
  }

  return result;
};
