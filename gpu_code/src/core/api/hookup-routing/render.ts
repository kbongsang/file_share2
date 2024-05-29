import * as THREE from "three";
import { DrawingManager } from "../../util/DrawingManager";
import { Cylinder } from "../../../render/generic/cylinder";
import { Sphere } from "../../../render/generic/sphere";
import { Line } from "../../../render/generic/line";
import { Point } from "../../../render/generic/point";
import { Vector3ToVec3 } from "./general";
import Vec3 from "../../util/vec3";
import { hexToRGB, rgbToHex } from "../../Dev/SE/SmartElbow";

export function drawPolyline(path: THREE.Vector3[], color?: number) {
  for (const [index, thisPt] of path.entries()) {
    if (index === path.length - 1) continue;
    const nextPt = path[index + 1];
    if (!color) new Line([Vector3ToVec3(thisPt), Vector3ToVec3(nextPt)]);
    else
      new Line([Vector3ToVec3(thisPt), Vector3ToVec3(nextPt)], hexToRGB(color));
  }
}

export function drawNodeOfPL(path: THREE.Vector3[]) {
  for (const pt of path) {
    new Point(Vector3ToVec3(pt), { r: 0, g: 1, b: 0 });
  }
}

export function drawPipe(
  path: THREE.Vector3[],
  radiusFit: number,
  radius: number
) {
  const pathToVec3 = path.map(
    (pt) => new Vec3(pt.x * 100, pt.y * 100, pt.z * 100)
  );
  DrawingManager.DrawPipes(pathToVec3, radiusFit / 2, radius / 2);
}

export function drawPipeFromExportData(
  exportData: [THREE.Vector3[][], any[], number, object[]]
) {
  for (const [i, path] of exportData[0].entries()) {
    console.log("path: ", i);
    const radius = parseFloat(exportData[1][i]);
    console.log("exportData[1][i]", exportData[1][i]);
    console.log("radius", radius);
    // const fittingSize = radius / 2;
    const fittingSize = 0.0001;
    console.log("exportData[0]", exportData[0]);
    drawPipe(path, fittingSize, radius);
  }
}

export async function drawDebugPipe(
  exportData: [THREE.Vector3[][], any[], number, object[]],
  material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
  })
) {
  for (const [i, path] of exportData[0].entries()) {
    for (let j = 0; j <= path.length - 2; j++) {
      const sPt = path[j];
      const sVec = Vector3ToVec3(sPt);
      const ePt = path[j + 1];
      const eVec = Vector3ToVec3(ePt);
      const radius = (parseFloat(exportData[1][i]) * 0.01) / 2;
      new Cylinder(radius, sVec, eVec, material);

      if (j === 0) new Sphere(radius, sVec, material);

      new Sphere(radius, eVec, material);
    }
  }
}
