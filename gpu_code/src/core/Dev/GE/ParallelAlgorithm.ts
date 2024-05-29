import { first, last } from "lodash";
import * as THREE from "three";
import { LongestDirection } from "./GEFunctions";

interface parallelResult{
  finish:boolean,
  line:THREE.Vector3[]
}

// Main Line Direction 따라 생성
export const ParallelLines = (
  mainLineLocations: THREE.Vector3[],
  offsetDirection: THREE.Vector3,
  offsetDistance = 0.5
): THREE.Vector3[] => {
  var subLineLocations: THREE.Vector3[] = [];

  // TODO: First X/Y Direction Check
  const firstDirection = FirstDirection(mainLineLocations);

  // TODO: if X Direction -> Y / -Y (But Y for now)
  if (
    firstDirection.equals(
      new THREE.Vector3(1, 0, 0) ||
        firstDirection.equals(new THREE.Vector3(-1, 0, 0))
    )
  ) {
    offsetDirection = new THREE.Vector3(0, -1, 0);
  }

  // TODO: if Y Direction -> X / -X (But X for now)
  if (
    firstDirection.equals(
      new THREE.Vector3(0, 1, 0) ||
        firstDirection.equals(new THREE.Vector3(0, -1, 0))
    )
  ) {
    offsetDirection = new THREE.Vector3(1, 0, 0);
  }
  //--------------------------------------------------

  // Main variables
  const originOffsetDir = offsetDirection.clone();
  const offset = offsetDirection.clone().multiplyScalar(offsetDistance);
  let lastDir = new THREE.Vector3(0, 0, 0);
  let lastflattenDir = new THREE.Vector3(0, 0, 0);
  let lastTwistedOffsetDir = originOffsetDir.clone();
  let currOffsetDir = originOffsetDir.clone();
  let count = 0;

  // Extract Line
  const extractedLine = ExtractMain(mainLineLocations);
  for (let i = 0; i < extractedLine.direction.length; i++) {
    let addLength = extractedLine.length[i];
    let currDir = extractedLine.direction[i];

    if (i > 0) {
      addLength = mainLineLocations[i + 1]
        .clone()
        .sub(subLineLocations[subLineLocations.length - 1].clone())
        .multiply(currDir)
        .length();

      if (lastDir != currDir && lastDir.z == 0) {
        if (lastTwistedOffsetDir.equals(currDir)) currOffsetDir = lastDir.clone().multiplyScalar(-1);
        else currOffsetDir = lastDir.clone();
      }

      console.log("lastDir", lastDir);
      // console.log("lastTwistedOffsetDir", lastTwistedOffsetDir);
      console.log("currDir", currDir);
      console.log("currOffsetDir", currOffsetDir);
      console.log("AddLength", addLength);
    }

    if (lastDir != currDir && currDir.z == 0) {
      if (i < extractedLine.direction.length - 1) {
        const nextDir = extractedLine.direction[i + 1].clone();
        console.log("NextDir",nextDir);
        if (
          lastDir.z == 1 &&
          (lastTwistedOffsetDir.equals(currDir))
        ) {
          
          console.log("can`t Generate ParallelLines");
          return [];
        }  
        else if(lastTwistedOffsetDir.equals(currDir.clone().multiplyScalar(-1))){
          subLineLocations.push(
            subLineLocations[i]
              .clone()
              .add(lastflattenDir.clone().multiplyScalar(offsetDistance))
          );
          console.log("E");
        }
        if (nextDir.z == 0) {
          if (nextDir.equals(lastTwistedOffsetDir)) {
            addLength -= offsetDistance;
            console.log("A");
          } else if (
            nextDir.clone().multiplyScalar(-1).equals(lastTwistedOffsetDir)
          ) {
            addLength += offsetDistance;
            console.log("B");
            // console.log("offosite");
          } else if (currDir.equals(lastTwistedOffsetDir)) {
            addLength += offsetDistance;
            console.log("C");
            // console.log("SameDir");
          } else if (
            currDir.clone().multiplyScalar(-1).equals(lastTwistedOffsetDir)
          ) {
            addLength -= offsetDistance;
            console.log("D");
            // console.log("offosite");
          }
        }
      }
    } // LastDir == CurrentDir (pass)

    // 0 : offset to subline start Point
    if (i == 0) {
      subLineLocations.push(mainLineLocations[i].clone().add(offset));
    }

    // Normal : from start point generate line
    subLineLocations.push(
      subLineLocations[subLineLocations.length-1]
        .clone()
        .add(extractedLine.direction[i].clone().multiplyScalar(addLength))
    );

    lastDir = currDir.clone();

    if (currDir.z == 0 && currOffsetDir.z == 0) {
      lastflattenDir = currDir.clone();

      if (lastTwistedOffsetDir.normalize().x != currOffsetDir.x) {
        lastTwistedOffsetDir = currOffsetDir.clone();
        console.log("Twisted", lastTwistedOffsetDir.clone());
      }
    }
    count++;
  }

  return subLineLocations;
};

interface ExtractLine {
  length: number[];
  direction: THREE.Vector3[];
}

const ExtractMain = (mainLineLocations: THREE.Vector3[]): ExtractLine => {
  const result: ExtractLine = {
    length: [],
    direction: [],
  };

  for (let i = 0; i < mainLineLocations.length - 1; i++) {
    const startPoint = mainLineLocations[i].clone();
    const endPoint = mainLineLocations[i + 1].clone();

    result.direction.push(endPoint.clone().sub(startPoint).normalize());
    result.length.push(startPoint.clone().distanceTo(endPoint));
  }

  return result;
};

const FirstDirection = (mainLineLocations: THREE.Vector3[]): THREE.Vector3 => {
  let result = new THREE.Vector3(0, 0, 0);

  for (let i = 0; i < mainLineLocations.length - 1; i++) {
    const firstDirection = mainLineLocations[i + 1]
      .clone()
      .sub(mainLineLocations[i])
      .normalize();
    if (firstDirection.z == 0) {
      return (result = firstDirection.clone());
    }
  }

  return result;
};
