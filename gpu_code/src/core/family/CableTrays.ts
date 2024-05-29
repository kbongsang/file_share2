import { TriangleMesh } from "../../render/generic/triangle-mesh";
import { CurveObject } from "../BIM/CurveObject";
import { LocationCurve } from "../BIM/Location";

export class CableTrays extends CurveObject {
  constructor(id: string, location: LocationCurve, meta: object) {
    super(id, location, meta);
    this.createGeometry();
  }

  createGeometry: () => void = () => {
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
      this.setColor({ r: 1, g: 1, b: 0 });
    } else {
      throw new Error("Diameter is not defined!");
    }
  };

  get Width() {
    if (!("Size" in this.meta)) throw new Error("Size is not in meta");

    const sizeString = this.meta["Size"] as string;
    const numberMatches = sizeString.match(/\d+/g);
    const numbers = numberMatches ? numberMatches.map(Number) : [];
    return numbers[0];
  }

  get Height() {
    if (!("Size" in this.meta)) throw new Error("Size is not in meta");

    const sizeString = this.meta["Size"] as string;
    const numberMatches = sizeString.match(/\d+/g);
    const numbers = numberMatches ? numberMatches.map(Number) : [];
    return numbers[1];
  }
}
