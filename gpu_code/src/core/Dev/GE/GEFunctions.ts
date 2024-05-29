import * as THREE from "three";
import { GENode } from "./GENode";
import { VoxelNode } from "../Voxel/VoxelNode";

// Force confine node to box
export const ConfineNodeToBox = (node: GENode) => {
  if (node.isSPT || node.isEPT) {
    return;
  }

  const box = node.voxelNode?.box;

  if (box) {
    node.location.x = Math.max(
      box.min.clone().addScalar(node.radius).x,
      Math.min(box.max.clone().subScalar(node.radius).x, node.location.x)
    );
    node.location.y = Math.max(
      box.min.clone().addScalar(node.radius).y,
      Math.min(box.max.clone().subScalar(node.radius).y, node.location.y)
    );
    node.location.z = Math.max(
      box.min.clone().addScalar(node.radius).z,
      Math.min(box.max.clone().subScalar(node.radius).z, node.location.z)
    );
  }
};

// Check Node Overlaped with Voxels
export const CheckNodeOverlap = (node: GENode, voxelNodes: VoxelNode[]) => {
  const point = node.location;
  for (const voxel of voxelNodes) {
    const box = voxel.box;
    if (box.containsPoint(point)) {
      node.voxelNode = voxel;
      return;
    }
  }
};

// Check Point(Vector3) Overlaped with Voxel
export const CheckPointOverlap = (
  point: THREE.Vector3,
  voxelNodes: VoxelNode[]
) => {
  for (const voxel of voxelNodes) {
    if (voxel.box.containsPoint(point)) {
      return true;
    }
  }
};

// Check Point(Vector3) Overlaped with Voxel
export const FindVoxelPoint = (
  point: THREE.Vector3,
  voxelNodes: VoxelNode[]
) => {
  for (const voxel of voxelNodes) {
    if (voxel.box.containsPoint(point)) {
      return voxel.location;
    }
  }
};

// Check Overlap 2 Boxes
export const checkOverlapBoxToBox = (box1: THREE.Box3, box2: THREE.Box3) => {
  return box1.intersectsBox(box2);
};

// find Bounding box from vertices
export const findBoundingBox = (vertices: THREE.Vector3[]): THREE.Box3 => {
  const boundingBox = new THREE.Box3();
  boundingBox.setFromPoints(vertices);
  return boundingBox;
};

// Shortest Direction find from 2 Nodes
export const ShortestDirection = (node1: GENode, node2: GENode) => {
  const absX = Math.abs(node1.location.x - node2.location.x);
  const absY = Math.abs(node1.location.y - node2.location.y);
  const absZ = Math.abs(node1.location.z - node2.location.z);
  if (absX <= absY && absX <= absZ) {
    if (node1.location.x > node2.location.x) return new THREE.Vector3(-1, 0, 0);
    else return new THREE.Vector3(1, 0, 0);
  } // 1-1. X 거리보다 Y나 Z의 거리보다 크다면, 다음포인트의 y, z 값을 현재의 y, z으로 변경
  else if (absY <= absX && absY <= absZ) {
    if (node1.location.y > node2.location.y) return new THREE.Vector3(0, -1, 0);
    else return new THREE.Vector3(0, 1, 0);
  } // 1-2. 1-1과 같은방식으로 Y의 기준
  else {
    if (node1.location.z > node2.location.z) return new THREE.Vector3(0, 0, -1);
    else return new THREE.Vector3(0, 0, 1);
  } // 1-3. 1
};

import { GPU } from "gpu.js";

const gpu = new GPU();
  const kernel = gpu.createKernel(function(a: number, b: number ) {
    return Math.abs(a-b);
  }).setOutput([1]);

// Longest Direction from 2 Nodes
export const LongestDirectionByNode = (node1: GENode, node2: GENode) => {

  

  // const absX1 = kernel(node1.location.x, node2.location.x)[0];
  // const absY1 = kernel(node1.location.y, node2.location.y)[0];
  // const absZ2 = kernel(node1.location.z, node2.location.z)[0];
  // //gpu.destroy();

  const absX = Math.abs(node1.location.x - node2.location.x);
  const absY = Math.abs(node1.location.y - node2.location.y);
  const absZ = Math.abs(node1.location.z - node2.location.z);
  if (absX >= absY && absX >= absZ) {
    if (node1.location.x > node2.location.x) return new THREE.Vector3(-1, 0, 0);
    else return new THREE.Vector3(1, 0, 0);
  } // 1-1. X 거리보다 Y나 Z의 거리보다 크다면, 다음포인트의 y, z 값을 현재의 y, z으로 변경
  else if (absY >= absX && absY >= absZ) {
    if (node1.location.y > node2.location.y) return new THREE.Vector3(0, -1, 0);
    else return new THREE.Vector3(0, 1, 0);
  } // 1-2. 1-1과 같은방식으로 Y의 기준
  else {
    if (node1.location.z > node2.location.z) return new THREE.Vector3(0, 0, -1);
    else return new THREE.Vector3(0, 0, 1);
  } // 1-3. 1



};

// Longest Direction from 2 Point (Vector3)
export const LongestDirection = (vec1: THREE.Vector3, vec2: THREE.Vector3) => {
  const absX = Math.abs(vec1.x - vec2.x);
  const absY = Math.abs(vec1.y - vec2.y);
  const absZ = Math.abs(vec1.z - vec2.z);
  if (absX >= absY && absX >= absZ) {
    if (vec1.x > vec2.x) return new THREE.Vector3(-1, 0, 0);
    else return new THREE.Vector3(1, 0, 0);
  } // 1-1. X 거리보다 Y나 Z의 거리보다 크다면, 다음포인트의 y, z 값을 현재의 y, z으로 변경
  else if (absY >= absX && absY >= absZ) {
    if (vec1.y > vec2.y) return new THREE.Vector3(0, -1, 0);
    else return new THREE.Vector3(0, 1, 0);
  } // 1-2. 1-1과 같은방식으로 Y의 기준
  else {
    if (vec1.z > vec2.z) return new THREE.Vector3(0, 0, -1);
    else return new THREE.Vector3(0, 0, 1);
  } // 1-3. 1
};

// Check Line is Parallel with axis
export const CheckParallel = (dir: THREE.Vector3, threshold: number) => {
  const Directions = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];

  for (const direction of Directions) {
    if (dir.distanceTo(direction) <= threshold) return true;
  }
  return false;
};

export const LongestDirectionByVector = (
  vec1: THREE.Vector3,
  vec2: THREE.Vector3
) => {
  const absX = Math.abs(vec1.x - vec2.x);
  const absY = Math.abs(vec1.y - vec2.y);
  const absZ = Math.abs(vec1.z - vec2.z);
  if (absX >= absY && absX >= absZ) {
    if (vec1.x < vec2.x) return new THREE.Vector3(-1, 0, 0);
    else return new THREE.Vector3(1, 0, 0);
  } // 1-1. X 거리보다 Y나 Z의 거리보다 크다면, 다음포인트의 y, z 값을 현재의 y, z으로 변경
  else if (absY >= absX && absY >= absZ) {
    if (vec1.y < vec2.y) return new THREE.Vector3(0, -1, 0);
    else return new THREE.Vector3(0, 1, 0);
  } // 1-2. 1-1과 같은방식으로 Y의 기준
  else {
    if (vec1.z < vec2.z) return new THREE.Vector3(0, 0, -1);
    else return new THREE.Vector3(0, 0, 1);
  } // 1-3. 1
};

export const AddPerpendicular = (node1: GENode, node2: GENode) => {
  const absX = Math.abs(node1.location.x - node2.location.x);
  const absY = Math.abs(node1.location.y - node2.location.y);
  const absZ = Math.abs(node1.location.z - node2.location.z);
  let perpendicularPoint = new THREE.Vector3();

  if (absX >= absY && absX >= absZ) {
    perpendicularPoint = new THREE.Vector3(
      node2.location.x,
      node1.location.y,
      node1.location.z
    );
  } // 1-1. X 거리가 Y나 Z의 거리보다 크다면, 다음포인트의 y, z 값을 현재의 y, z으로 변경
  else if (absY >= absX && absY >= absZ) {
    perpendicularPoint = new THREE.Vector3(
      node1.location.x,
      node2.location.y,
      node1.location.z
    );
  } // 1-2. 1-1과 같은방식으로 Y의 기준
  else {
    perpendicularPoint = new THREE.Vector3(
      node1.location.x,
      node1.location.y,
      node2.location.z
    );
  } // 1-3. 1-1과 같은방식으로 Z의 기준
  return perpendicularPoint;
};

export const SearchPerpendicular = (
  node1: GENode,
  node2: GENode,
  obstacleVoxels: VoxelNode[]
) => {
  const perpendicularPointList = [
    new THREE.Vector3(node2.location.x, node1.location.y, node1.location.z),
    new THREE.Vector3(node1.location.x, node2.location.y, node1.location.z),
    new THREE.Vector3(node1.location.x, node1.location.y, node2.location.z),
  ];

  const absX = Math.abs(node1.location.x - node2.location.x);
  const absY = Math.abs(node1.location.y - node2.location.y);
  const absZ = Math.abs(node1.location.z - node2.location.z);

  const CheckPoint = (check: number) => {
    for (let i = 0; i < perpendicularPointList.length; i++) {
      const checking = (i + check) % perpendicularPointList.length;
      if (
        !CheckPointOverlap(perpendicularPointList[checking], obstacleVoxels) &&
        node1.location.distanceTo(perpendicularPointList[checking]) > 0.1
      )
        return perpendicularPointList[checking];
    }
  };

  // for (const point of perpendicularPointList) {
  //   if (checkPointOverlap(point, emptyVoxels) && node1.location.distanceTo(point) > 1){
  //     return point;
  //   }
  // }

  if (absX >= absY && absX >= absZ) {
    return CheckPoint(0);
  } else if (absY >= absX && absY >= absZ) {
    return CheckPoint(1);
  } else {
    return CheckPoint(2);
  }
};

export const MakePerpendicular = (
  node1: GENode,
  node2: GENode,
  threshold: number
) => {
  const absX = Math.abs(node1.location.x - node2.location.x);
  const absY = Math.abs(node1.location.y - node2.location.y);
  const absZ = Math.abs(node1.location.z - node2.location.z);

  if (absX <= threshold) {
    node2.location = new THREE.Vector3(
      node1.location.x,
      node2.location.y,
      node2.location.z
    );
  } // 1-1. X 거리가 Y나 Z의 거리보다 크다면, 다음포인트의 y, z 값을 현재의 y, z으로 변경
  if (absY <= threshold) {
    node2.location = new THREE.Vector3(
      node2.location.x,
      node1.location.y,
      node2.location.z
    );
  } // 1-2. 1-1과 같은방식으로 Y의 기준
  if (absZ <= threshold) {
    node2.location = new THREE.Vector3(
      node2.location.x,
      node2.location.y,
      node1.location.z
    );
  } // 1-3. 1-1과 같은방식으로 Z의 기준
};

export const MatchPoints = (
  node1: GENode,
  node2: GENode,
  threshold: number
) => {
  const absX = Math.abs(node1.location.x - node2.location.x);
  const absY = Math.abs(node1.location.y - node2.location.y);
  const absZ = Math.abs(node1.location.z - node2.location.z);

  let matchedPoints = 0;

  if (absX <= threshold) {
    matchedPoints += 1;
  } // 1-1. X 거리가 Y나 Z의 거리보다 크다면, 다음포인트의 y, z 값을 현재의 y, z으로 변경
  if (absY <= threshold) {
    matchedPoints += 1;
  } // 1-2. 1-1과 같은방식으로 Y의 기준
  if (absZ <= threshold) {
    matchedPoints += 1;
  } // 1-3. 1-1과 같은방식으로 Z의 기준
  return matchedPoints;
};

export const CheckPerPendicular = (
  lastStart: THREE.Vector3,
  lastEnd: THREE.Vector3,
  threshold: number
): [number, THREE.Vector3] => {
  const absX = Math.abs(lastStart.x - lastEnd.x);
  const absY = Math.abs(lastStart.y - lastEnd.y);
  const absZ = Math.abs(lastStart.z - lastEnd.z);

  let matchLocation = new THREE.Vector3();

  if (absX > threshold && absY > threshold && absZ > threshold) {
    if (absX <= absY && absX <= absZ) {
      matchLocation = new THREE.Vector3(lastEnd.x, lastStart.y, lastStart.z);
      return [5, matchLocation];
    } else if (absY <= absX && absY <= absZ) {
      matchLocation = new THREE.Vector3(lastStart.x, lastEnd.y, lastStart.z);
      return [4, matchLocation];
    } else {
      matchLocation = new THREE.Vector3(lastStart.x, lastStart.y, lastEnd.z);
      return [3, matchLocation];
    }
  } else if (absY > threshold && absZ > threshold) {
    matchLocation = new THREE.Vector3(lastStart.x, lastEnd.y, lastStart.z);
    return [2, matchLocation];
  } else if (absX > threshold || absZ > threshold) {
    matchLocation = new THREE.Vector3(lastStart.x, lastStart.y, lastEnd.z);
    return [1, matchLocation];
  } else if (absX < threshold && absY < threshold && absZ < threshold) {
    // Do something
  } else {
  }
  return [0, matchLocation];
};
export function MidPoint(start: THREE.Vector3, end: THREE.Vector3) {
  var midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  return midpoint;
}

export const CheckSpace = (start: THREE.Vector3, end: THREE.Vector3) => {
  const absX = Math.abs(start.x - end.x);
  const absY = Math.abs(start.y - end.y);
  const absZ = Math.abs(start.z - end.z);

  let matchedPoints = 0;

  if (absX <= 0.001) {
    matchedPoints += 1;
  } // 1-1. X 거리가 Y나 Z의 거리보다 크다면, 다음포인트의 y, z 값을 현재의 y, z으로 변경
  if (absY <= 0.001) {
    matchedPoints += 1;
  } // 1-2. 1-1과 같은방식으로 Y의 기준
  if (absZ <= 0.001) {
    matchedPoints += 1;
  } // 1-3. 1-1과 같은방식으로 Z의 기준

  return matchedPoints;
};

interface perpendicularResult {
  finished: boolean;
  locations: THREE.Vector3[];
}

export const AddPerpendicularFromTwoPoints = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  inputDirection?: THREE.Vector3,
  something: boolean = true,

  //outputDirection?: THREE.Vector3
) => {
  // let is3D = false;
  const result: perpendicularResult = {
    finished: true,
    locations: [new THREE.Vector3(), new THREE.Vector3()],
  };
  const newPoints: THREE.Vector3[] = [];

  // if (CheckSpace(start, end) == 0) {
  //   is3D = true;
  // }
  //Search Perpendicular Line by Cube
  const pointList1: THREE.Vector3[] = [
    new THREE.Vector3(end.x, start.y, start.z),
    new THREE.Vector3(start.x, end.y, start.z),
    new THREE.Vector3(start.x, start.y, end.z),
  ];
  const pointList2: THREE.Vector3[] = [
    new THREE.Vector3(start.x, end.y, end.z),
    new THREE.Vector3(end.x, start.y, end.z),
    new THREE.Vector3(end.x, end.y, start.z),
  ];

  const pointList1DirList: THREE.Vector3[] = [];
  let dir = new THREE.Vector3();

  if (inputDirection) dir = inputDirection;
  else dir = LongestDirection(start, end).clone();

  newPoints.push(new THREE.Vector3());
  newPoints.push(new THREE.Vector3());

  pointList1.forEach((point) => {
    pointList1DirList.push(point.clone().sub(start).normalize());
  });
  console.log("dir: ", dir);
  console.log("dirList: ", pointList1DirList);

  let checker = false;
  for (let i = 0; i < pointList1DirList.length; i++) {
    if (pointList1DirList[i].distanceTo(dir) <= 0.001) {
      newPoints[0] = pointList1[i];
      checker = true;
      break;
    }
  }
  if (!checker) {
    dir = LongestDirection(start, end).clone();
    for (let i = 0; i < pointList1DirList.length; i++) {
      if (pointList1DirList[i].distanceTo(dir) <= 0.001) {
        newPoints[0] = pointList1[i];
        checker = true;
        break;
      }
    }
  }

  if (newPoints[0].distanceTo(pointList1[0]) < 0.001) {
    if (something) {
      newPoints[1] = pointList2[1];
    } else {
      newPoints[1] = pointList2[2];
    }
  } else if (newPoints[0].distanceTo(pointList1[1]) < 0.001) {
    if (something) {
      newPoints[1] = pointList2[0];
    } else {
      newPoints[1] = pointList2[2];
    }
  } else if (newPoints[0].distanceTo(pointList1[2]) < 0.001) {
    if (something) {
      newPoints[1] = pointList2[0];
    } else {
      newPoints[1] = pointList2[1];
    }
  } else {
    result.finished = false;
  }

  // if (is3D) {
  //   newPoints.push(new THREE.Vector3());
  //   newPoints.push(new THREE.Vector3());

  //   const dir = LongestDirection(end, start).clone();
  //   let cal = dir.clone().addScalar(-1);
  //   cal.multiplyScalar(-1);

  //   console.log(cal);
  //   console.log(dir);
  //   newPoints[0] = start.clone().multiply(cal).add(end.clone().multiply(dir));
  //   newPoints[1] = newPoints[0]
  //     .clone()
  //     .multiply(cal)
  //     .add(end.clone().multiply(dir));
  // }

  if (
    newPoints[0].equals(new THREE.Vector3(0, 0, 0)) ||
    newPoints[1].equals(new THREE.Vector3(0, 0, 0))
  ) {
    result.finished = false;
  }
  result.locations = newPoints;
  console.log("Result", result);

  return result;
};

export const AddPerpendicularFromTwoPointsbyBoxes = (
  spt: GENode,
  ept: GENode,
  //inputDirection?: THREE.Vector3
  //outputDirection?: THREE.Vector3
) => {
  const start = spt.location;
  const end = ept.location;

  let temp  = 0;
  let temp2 = 0;

  // initialize
  const result: perpendicularResult = {
    finished: true,
    locations: [new THREE.Vector3(), new THREE.Vector3()],
  };
  const newPoints: THREE.Vector3[] = [];

  // if (CheckSpace(start, end) == 0) {
  //   is3D = true;
  // }
  //Search Perpendicular Line by Cube
  const pointList1: THREE.Vector3[] = [
    new THREE.Vector3(end.x, start.y, start.z),
    new THREE.Vector3(start.x, end.y, start.z),
    new THREE.Vector3(start.x, start.y, end.z),
  ];
  const pointList2: THREE.Vector3[] = [
    new THREE.Vector3(start.x, end.y, end.z),
    new THREE.Vector3(end.x, start.y, end.z),
    new THREE.Vector3(end.x, end.y, start.z),
  ];

  const pointList1DirList: THREE.Vector3[] = [];
  const pointList2DirList: THREE.Vector3[] = [];
  let dir = new THREE.Vector3();

  newPoints.push(new THREE.Vector3());
  newPoints.push(new THREE.Vector3());

  pointList1.forEach((point) => {
    pointList1DirList.push(point.clone().sub(start).normalize());
  });
  pointList2.forEach((point) => {
    pointList2DirList.push(point.clone().sub(end).normalize());
  });

  
  let checker = false;

  // 1. Check voxelsize (calculate from small => big)
  const size1 = new THREE.Vector3();
  const size2 = new THREE.Vector3();
  const isSptBoxBigger =
    spt.box.getSize(size1).length() > ept.box.getSize(size2).length();

  // 2. Projected Point Direction
  let projectedPoint = new THREE.Vector3();
  
  if (isSptBoxBigger) {
    projectedPoint = ProjectedPointToBox(spt.box, ept.location);
    dir = LongestDirection(ept.location, projectedPoint);
    temp = 1;
    temp2 = 0;
    
  } else {
    projectedPoint = ProjectedPointToBox(ept.box, spt.location);
    dir = LongestDirection(spt.location, projectedPoint);
    temp = 0;
    temp2 = 1;
  }

  // 3. pointList
  if(temp == 0){
    for (let i = 0; i < pointList1DirList.length; i++) {
      if (pointList1DirList[i].distanceTo(dir) <= 0.001) {
        newPoints[temp] = pointList1[i];
        checker = true;
        break;
      }
    }
  }
  if(temp == 1){
    for (let i = 0; i < pointList2DirList.length; i++) {
      if (pointList2DirList[i].distanceTo(dir) <= 0.001) {
        newPoints[temp] = pointList2[i];
        checker = true;
        break;
      }
    }
  }

  const something = true;
  if (newPoints[temp].distanceTo(pointList1[0]) < 0.001) {
    if (something) {
      newPoints[temp2] = pointList2[1];
    } else {
      newPoints[temp2] = pointList2[2];
    }
  } else if (newPoints[temp].distanceTo(pointList1[1]) < 0.001) {
    if (something) {
      newPoints[temp2] = pointList2[0];
    } else {
      newPoints[temp2] = pointList2[2];
    }
  } else if (newPoints[temp].distanceTo(pointList1[2]) < 0.001) {
    if (something) {
      newPoints[temp2] = pointList2[0];
    } else {
      newPoints[temp2] = pointList2[1];
    }
  } else {
    result.finished = false;
  }

  if (
    newPoints[0].equals(new THREE.Vector3(0, 0, 0)) ||
    newPoints[1].equals(new THREE.Vector3(0, 0, 0))
  ) {
    result.finished = false;
  }

  result.locations = newPoints;
  console.log("Result", result);

  return result;
};

export const convertTo2DArray = (vectorArray1D: THREE.Vector3[]) => {
  const vectorArray2D: THREE.Vector3[][] = [];
  vectorArray2D.push([vectorArray1D[0]]);
  vectorArray1D.splice(0, 1);

  vectorArray1D.forEach((vector) => {
    for (let i = 0; i < vectorArray2D.length; i++) {
      if (vectorArray2D[i][0].equals(vector)) {
        vectorArray2D[i].push(vector);
        console.log("2D", vectorArray2D);
        break;
      } else if (i == vectorArray2D.length - 1) {
        vectorArray2D.push([vector]);
        console.log("2D", vectorArray2D);
        break;
      }
    }
  });

  return vectorArray2D;
};

export const ProjectedPointToBox = (box: THREE.Box3, point: THREE.Vector3) => {
  const projectedPoint = new THREE.Vector3();
  box.clampPoint(point, projectedPoint);

  console.log("Projected point:", projectedPoint);
  return projectedPoint;
};
