import { HostObject } from "../../BIM/HostObject";

export const filterByBoundingBox = (
  box: THREE.Object3D,
  objects: HostObject[]
): HostObject[] => {
  console.log(box, objects);
  const result: HostObject[] = [];
  // TODO: filter objects by bounding box.
  return result;
};
