import { Cylinder } from "../../render/generic/cylinder";
import { CurveObject } from "../BIM/CurveObject";
import { LocationCurve } from "../BIM/Location";
import Vec3 from "../util/vec3";

export class Pipes extends CurveObject {
  constructor(id: string, location: LocationCurve, meta: object) {
    super(id, location, meta);
    this.createGeometry();
  }

  createGeometry: () => void = () => {
    if (this.Diameter) {
      this.add(
        new Cylinder(
          (this.Diameter / 2) * 0.01,
          new Vec3(this.StartPoint.x, this.StartPoint.y, this.StartPoint.z),
          new Vec3(this.EndPoint.x, this.EndPoint.y, this.EndPoint.z)
        )
      );
      this.setColor({ r: 0, g: 1, b: 0 });
    } else {
      throw new Error("Diameter is not defined!");
    }
  };

  get Diameter() {
    if (!("Size" in this.meta)) throw new Error("Size is not in meta");

    const sizeString = this.meta["Size"] as string;
    const numberMatches = sizeString.match(/\d+/g);
    const numbers = numberMatches ? numberMatches.map(Number) : [];
    return numbers[0];
  }
}
