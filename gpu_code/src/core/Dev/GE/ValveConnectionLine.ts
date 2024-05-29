import * as THREE from "three";

enum direction2D {
  x,
  mx,
  y,
  my,
}

const direction = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
];

export const ValveConnection = (
  startPoint: THREE.Vector3,
  basePoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  directionToMachine: THREE.Vector3
): THREE.Vector3[] => {
  const result: THREE.Vector3[] = [startPoint];

  // TODO: is overed?
  const isOver = IsLineOver(basePoint, startPoint, directionToMachine);

  const h1 = (endPoint.z -  startPoint.z)*0.5;

  if (isOver.isOvered) {
    result.push(
      new THREE.Vector3(startPoint.x, startPoint.y, startPoint.z + h1)
    );
    if (
      isOver.direction == direction2D.x ||
      isOver.direction == direction2D.mx
    ) {
        result.push(
          new THREE.Vector3(basePoint.x, startPoint.y, startPoint.z + h1)
        );
        result.push(
          new THREE.Vector3(basePoint.x, startPoint.y, endPoint.z)
        );  
    }
    if (
      isOver.direction == direction2D.y ||
      isOver.direction == direction2D.my
    ) {
      result.push(
        new THREE.Vector3(startPoint.x, basePoint.y, startPoint.z + h1)
      );
      result.push(
        new THREE.Vector3(startPoint.x, basePoint.y, endPoint.z)
      );  
    }
  } // TODO: if over, gernerate twisted perpendicular lines
  else {
    result.push(new THREE.Vector3(startPoint.x, startPoint.y, endPoint.z));
  } // TODO: if not over, generate perependicular points

  // TODO: Connect to EndPoint
  result.push(endPoint);

  // TODO: Export Result
  return result;
};

interface lineover {
  isOvered: boolean;
  direction: direction2D;
}

const IsLineOver = (
  basePoint: THREE.Vector3,
  startPoint: THREE.Vector3,
  directionToMachine: THREE.Vector3
): lineover => {
  let result: lineover = {
    isOvered: false,
    direction: direction2D.x,
  };

  if (directionToMachine.equals(direction[direction2D.x]))
    if (basePoint.x < startPoint.x) {
      result.isOvered = true;
      result.direction = direction2D.x;
      return result;
    }

  if (directionToMachine.equals(direction[direction2D.mx]))
    if (basePoint.x > startPoint.x) {
      result.isOvered = true;
      result.direction = direction2D.mx;
      return result;
    }

  if (directionToMachine.equals(direction[direction2D.y]))
    if (basePoint.y < startPoint.y) {
      result.isOvered = true;
      result.direction = direction2D.y;
      return result;
    }

  if (directionToMachine.equals(direction[direction2D.my]))
    if (basePoint.y > startPoint.y) {
      result.isOvered = true;
      result.direction = direction2D.my;
      return result;
    }

  return result;
};
