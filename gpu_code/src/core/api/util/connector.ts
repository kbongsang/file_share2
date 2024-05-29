import { generateUUID } from "three/src/math/MathUtils.js";
import { connectorPosition } from "../../../app/routing-slice";
import { HostObject } from "../../BIM/HostObject";
import Vec3 from "../../util/vec3";

export const getEquipmentConnectorPositions = (
  hostObject: HostObject
): connectorPosition[] | null => {
  const result: connectorPosition[] = [];

  if (
    !(
      "Connector" in hostObject.meta &&
      typeof hostObject.meta.Connector === "object" &&
      hostObject.meta.Connector !== null
    )
  ) {
    alert("No connectors found in the vacuum pump.");
    return null;
  } else {
    const keys = Object.keys(hostObject.meta.Connector);
    const values: { X: number; Y: number; Z: number }[] = Object.values(
      hostObject.meta.Connector
    );

    keys.forEach((key, index) => {
      result.push({
        type: key,
        origin: new Vec3(values[index].X, values[index].Y, values[index].Z),
      });
    });

    return result;
  }
};

export const getPumpConnectorPositions = (
  hostObject: HostObject
): connectorPosition[] | null => {
  const result: connectorPosition[] = [];

  if (
    !(
      "Connector" in hostObject.meta &&
      typeof hostObject.meta.Connector === "object" &&
      hostObject.meta.Connector !== null
    )
  ) {
    alert("No connectors found in the vacuum pump.");
    return null;
  } else {
    if ("Type" in hostObject.meta && typeof hostObject.meta.Type === "string") {
      const values: { X: number; Y: number; Z: number }[] = Object.values(
        hostObject.meta.Connector
      );

      const type = hostObject.meta.Type;

      values.forEach((value) => {
        result.push({
          id: generateUUID(),
          name: type,
          origin: new Vec3(value.X, value.Y, value.Z),
        });
      });

      return result;
    } else {
      alert("No Type found in the vacuum pump.");
      return null;
    }
  }
};

export const validateConnectors = (
  fromConnectors: connectorPosition[],
  toConnectors: connectorPosition[]
) => {
  if (fromConnectors.length === 0) {
    alert("No connectors found in the vacuum pump.");
    return undefined;
  }
  if (toConnectors.length === 0) {
    alert("No connectors found in the target equipment.");
    return undefined;
  }

  const equipmentConnectorResult: connectorPosition[] = [];
  const pumpConnectorResult: connectorPosition[] = [];

  for (let i = toConnectors.length - 1; i >= 0; i--) {
    const equipmentConnector = toConnectors[i];
    for (let j = fromConnectors.length - 1; j >= 0; j--) {
      const pumpConnector = fromConnectors[j];
      if (equipmentConnector.type === pumpConnector.type) {
        equipmentConnectorResult.push(equipmentConnector);
        pumpConnectorResult.push(pumpConnector);

        toConnectors.splice(i, 1);
        fromConnectors.splice(j, 1);
      }
    }
  }

  return [equipmentConnectorResult, pumpConnectorResult];
};
