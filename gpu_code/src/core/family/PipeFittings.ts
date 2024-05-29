import { LocationPoint } from "../BIM/Location";
import { PointObject } from "../BIM/PointObject";
import Vec3 from "../util/vec3";

export class PipeFitting extends PointObject {
  connectors: Vec3[] = [];

  constructor(id: string, location: LocationPoint, meta: object) {
    super(id, location, meta);
    this.location = location;

    this.setColor({ r: 0, g: 0.75, b: 0.2 });

    if ("Connectors" in this.meta) {
      const connectors = this.meta["Connectors"] as {
        X: number;
        Y: number;
        Z: number;
      }[];
      connectors.forEach((connector) => {
        const X = Math.abs(connector.X) > 0.001 ? connector.X : 0;
        const Y = Math.abs(connector.Y) > 0.001 ? connector.Y : 0;
        const Z = Math.abs(connector.Z) > 0.001 ? connector.Z : 0;
        this.connectors.push(new Vec3(X, Y, Z));
      });
    }
  }
}
