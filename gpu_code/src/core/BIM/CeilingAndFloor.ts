import { TriangleMesh } from "../../render/generic/triangle-mesh";
import { HostObject } from "./HostObject";

export class CeilingAndFloor extends HostObject {
  constructor(id: string, meta: object, location: null = null) {
    super(id, location, meta);

    this.createGeometry();
  }
  createGeometry(): void {
    if (
      "Mesh" in this.meta &&
      typeof this.meta["Mesh"] === "object" &&
      this.meta["Mesh"] !== null &&
      "Triangles" in this.meta["Mesh"] &&
      Array.isArray(this.meta["Mesh"]["Triangles"])
    ) {
      const pts: { x: number; y: number; z: number }[] = [];

      this.meta.Mesh.Triangles.forEach(
        (pt: {
          Index: number;
          Coordinate: { X: number; Y: number; Z: number };
        }) => {
          pts.push({
            x: pt.Coordinate.X,
            y: pt.Coordinate.Y,
            z: pt.Coordinate.Z,
          });
        }
      );

      this.add(new TriangleMesh(pts));
    }
  }
}
