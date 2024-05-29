// import { Euler } from "../../core/util/euler";
// import { Quaternion } from "../../core/util/quaternion";
import { v4 as uuid } from "uuid";
import { Pipes } from "../family/Pipes";
import Vec3 from "./vec3";
import { PipeFitting } from "../family/PipeFittings";
import { Tube } from "../../render/generic/tube";
import { LocationCurve, LocationPoint } from "../BIM/Location";

interface PipeLine {
  start: Vec3;
  end: Vec3;
}

export class DrawingManager {
  static DrawPipes(path: Vec3[], bendingRadius: number, radius: number) {
    // const lines: Line[] = [];
    const pipeLines: PipeLine[] = [];
    const pipes: Pipes[] = [];
    const pipeFittings: PipeFitting[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      pipeLines.push({ start: path[i], end: path[i + 1] });
    }

    for (let i = 0; i < pipeLines.length - 1; i++) {
      const dir1 = pipeLines[i].start.subtract(pipeLines[i].end).unitVector;
      const dir2 = pipeLines[i + 1].end.subtract(
        pipeLines[i + 1].start
      ).unitVector;
      const angle = Math.acos(dir1.unitVector.dot(dir2.unitVector)) / 2;
      const shrinkDist = bendingRadius / Math.tan(angle);

      const pipeFitting = new PipeFitting(
        uuid(),
        new LocationPoint(new Vec3(path[i].x, path[i].y, path[i].z)),
        {
          Size: `${radius * 2}`,
          Family: "Elbow",
          Marks: "Generated from Smart Routing AI",
        }
      );

      // TODO: Auto update for the pipe fittings and duct fittings.
      pipeFitting.renderObjects.push(
        new Tube(
          new Vec3(
            pipeLines[i].end.x * 0.01,
            pipeLines[i].end.y * 0.01,
            pipeLines[i].end.z * 0.01
          ),
          bendingRadius * 0.01,
          dir1,
          dir2,
          { radius: radius * 0.01 }
        )
      );
      pipeFittings.push(pipeFitting);

      pipeLines[i].end = pipeLines[i].end.add(dir1.multiply(shrinkDist));
      pipeLines[i + 1].start = pipeLines[i + 1].start.add(
        dir2.multiply(shrinkDist)
      );
    }

    for (const pipeLine of pipeLines) {
      const pipe = new Pipes(
        uuid(),
        new LocationCurve(pipeLine.start, pipeLine.end),
        { Size: `${radius * 2}`, Marks: "Generated from Smart Routing AI" }
      );
      pipes.push(pipe);
    }
    return [pipes, pipeFittings];
  }
}
