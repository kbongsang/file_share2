import { Box } from "../../render/generic/box";
import { CurveObject } from "../BIM/CurveObject";
import { LocationCurve } from "../BIM/Location";
import Vec3 from "../util/vec3";

export class Beam extends CurveObject {
  constructor(id: string, location: LocationCurve, meta: object) {
    super(id, location, meta);
    this.setColor({ r: 1, g: 1, b: 1 });
    this.createGeometry();
  }

  createGeometry = () => {
    if (!this.Width || !this.Height) {
      alert("Width or Height is not defined");
      return;
    }
    this.add(
      new Box(
        this.Width * 0.01,
        this.Height * 0.01,
        new Vec3(
          this.StartPoint.x,
          this.StartPoint.y,
          this.StartPoint.z - this.Height * 0.01 * 0.5
        ),
        new Vec3(
          this.EndPoint.x,
          this.EndPoint.y,
          this.EndPoint.z - this.Height * 0.01 * 0.5
        )
      )
    );
  };

  get Width() {
    if ("Type" in this.meta) {
      const type = this.meta["Type"] as string;
      const numberMatches = type.match(/\d+/g);
      const numbers = numberMatches ? numberMatches.map(Number) : [];
      return numbers[0];
    }
  }

  get Height() {
    if ("Type" in this.meta) {
      const type = this.meta["Type"] as string;
      const numberMatches = type.match(/\d+/g);
      const numbers = numberMatches ? numberMatches.map(Number) : [];
      return numbers[1];
    }
  }
}
