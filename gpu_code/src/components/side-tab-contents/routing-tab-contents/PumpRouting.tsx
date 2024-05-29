import { useSelector } from "react-redux";
import { ReduxRootState, ReduxStore } from "../../../app/redux-store";
import { Point } from "../../../render/generic/point";
import React from "react";
import { LocationPoint } from "../../../core/BIM/Location";
// import Vec3 from "../../../core/util/vec3";
import {
  setTypeData,
  setSystemTypeData,
  setPipeSegmentData,
} from "../../../app/meta-slice";
import { setFittingFamilyData } from "../../../app/metafitting-slice";
import {
  ADD_ROUTE_RESULT,
  ADD_TARGET_PAIR,
  ADD_TARGET_TO_ROUTED,
  Connector,
  RouteResult,
  SET_SELECTED_EQUIPMENT,
} from "../../../app/routing-slice";
import { executeVacuumRouting } from "../../../core/api/vacuum-pump-routing/main";
import { convertPumpRouteForRevit } from "../../../core/Dev/General/RoutingToHost";
import { PointObject } from "../../../core/BIM/PointObject";
import { Vector3 } from "three/src/math/Vector3.js";

// interface Connector {
//   X: number;
//   Y: number;
//   Z: number;
// }

export const PumpRouting = () => {
  const selected = useSelector(
    (state: ReduxRootState) => state.BIMSlice.selected
  );
  const right = useSelector((state: ReduxRootState) => state.AppSlice.right);

  const defaultTable = <div className="table-title">Empty</div>;

  const hostObjects = ReduxStore.getState().BIMSlice.hostObjects;

  const [tableContentEquip, setTableContentEquip] =
    React.useState<JSX.Element | null>(defaultTable);
  const [tableContentVacuum, setTableContentVacuum] =
    React.useState<JSX.Element | null>(defaultTable);
  const [pipeSegment] = React.useState<string[]>([]);
  const [pipeSystemType] = React.useState<string[]>([]);
  const [pipeType] = React.useState<string[]>([]);
  const [routeName, setRouteName] = React.useState<string>("");

  const [isOpen, setIsOpen] = React.useState(false);

  const setEquipment = () => {
    if (selected) {
      if ("Connectors" in selected.meta) {
        ReduxStore.dispatch(SET_SELECTED_EQUIPMENT(selected));

        const selectedMeta: any = selected.meta;
        const groupName = selectedMeta["S5_EQCODE"];
        const rawConnectors = selectedMeta["Connectors"];
        const currVacuumPump = hostObjects.filter(
          (obj: any) =>
            obj.meta["Family"] &&
            obj.meta["Family"].includes("VP") &&
            obj.meta["S5_EQCODE"] === groupName
        );

        const filteredKeys = Object.keys(rawConnectors).filter((key) =>
          key.includes("Target")
        );

        const finalConnectors = filteredKeys.map((connectorKey) => {
          const location = selected.location as LocationPoint;
          const connectorLocation = rawConnectors[connectorKey].location;
          return new Vector3(
            location.origin.x + connectorLocation.X / 100,
            location.origin.y + connectorLocation.Y / 100,
            location.origin.z + connectorLocation.Z / 100
          );
        });

        finalConnectors.sort((a, b) => {
          if (a.x !== b.x) {
            return a.x - b.x;
          }
          return a.y - b.y;
        });

        // --show in UI--
        const table = (
          <>
            <table className="data-table">
              <tbody>
                {finalConnectors.map((connector, i) => (
                  <tr key={i}>
                    <td className="data-table-td">C{i + 1}</td>
                    <td className="data-table-td">
                      X: {Math.round(connector.x)} Y: {Math.round(connector.y)}{" "}
                      Z: {Math.round(connector.z)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );
        setTableContentEquip(table);

        const thisVacuumsLocations: Vector3[] = new Array(
          finalConnectors.length
        ).fill(new Vector3(NaN, NaN, NaN));
        const currVacuum = currVacuumPump[0];
        const currVacuumMeta: any = currVacuum.meta;
        const currVacuumConnectors = currVacuumMeta.Connectors;
        const vacuumKeys = Object.keys(currVacuumConnectors).filter((key) => {
          if (key.includes("Vacuum")) return key;
        });
        console.log(currVacuumConnectors);
        console.log(vacuumKeys);
        // return;
        for (let i = 0; i < vacuumKeys.length; i++) {
          const currConnector = currVacuumConnectors[vacuumKeys[i]];
          const location = currVacuum.location as LocationPoint;
          thisVacuumsLocations[i] = new Vector3(
            location.origin.x + currConnector.location.X / 100,
            location.origin.y + currConnector.location.Y / 100,
            location.origin.z + currConnector.location.Z / 100
          );
        }

        thisVacuumsLocations.sort((a, b) => {
          if (a.x !== b.x) {
            return a.x - b.x;
          }
          return a.y - b.y;
        });

        // --show in UI--
        const tableVacuums = (
          <>
            <table className="data-table">
              <tbody>
                {thisVacuumsLocations.map((location, i) => (
                  <tr key={i}>
                    <td className="data-table-td">C{i + 1}</td>
                    <td className="data-table-td">
                      X: {Math.round(location.x)} Y: {Math.round(location.y)} Z:{" "}
                      {Math.round(location.z)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );
        setTableContentVacuum(tableVacuums);

        // ---- create PUMP Connection Data ----
        let r = 1;
        let g = 0;
        let b = 0;
        for (const [i, equipConnector] of finalConnectors.entries()) {
          const connectIndex = `C${i + 1}`;
          const pumpConnector = thisVacuumsLocations[i];
          let size = 160;
          // if (connectIndex in selected.meta) {
          //   const sizeString = String(
          //     selected.meta[connectIndex as keyof typeof selected.meta]
          //   );
          //   const match = sizeString.match(/\d+/);

          //   if (match) {
          //     size = parseInt(match[0], 10);
          //   }
          // }

          const fromConnector: Connector = {
            id: groupName,
            name: connectIndex,
            diameter: size,
            origin: new Vector3(
              pumpConnector.x,
              pumpConnector.y,
              pumpConnector.z
            ),
          };
          const toConnector: Connector = {
            id: groupName,
            name: connectIndex,
            diameter: size,
            origin: new Vector3(
              equipConnector.x,
              equipConnector.y,
              equipConnector.z
            ),
          };
          ReduxStore.dispatch(
            ADD_TARGET_PAIR({
              targetFromConnector: fromConnector,
              targetToConnector: toConnector,
            })
          );

          // --- show connector point ---

          new Point(pumpConnector, { r: r, g: g, b: b });
          new Point(equipConnector, { r: r, g: g, b: b });

          if (r === 1) {
            r = 0;
            g = 1;
            b = 0;
          } else if (g === 1) {
            r = 0;
            g = 0;
            b = 1;
          } else if (b === 1) {
            r = 1;
            g = 0;
            b = 0;
          }
        }
      }
    }
  };

  const onTestButtonClick = () => {
    console.log("test");
    console.log("hostObjects: ", hostObjects);

    const waffles = hostObjects.filter((hostObject: any) => {
      if (hostObject.constructor.name === "PointObject") {
        if (hostObject.meta["Family"].includes("Waffle")) {
          console.log("Waffle: ", hostObject);
          const xOffsetVector = new Vec3(12, 0, 0);
          const yOffsetVector = new Vec3(0, 20, 0);
          const zOffsetVector = new Vec3(0, 0, 5);
          const offsetVector = new Vec3(12, 20, 5);
          const xHalfVector = new Vec3(5, 0, 0);
          const yHalfVector = new Vec3(0, 9, 0);
          const basePoint: Vec3 =
            hostObject.location.origin.subtract(offsetVector);
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              const origin = basePoint
                .add(xOffsetVector.multiply(i))
                .add(yOffsetVector.multiply(j));
              const min = origin
                .subtract(xHalfVector)
                .subtract(yHalfVector)
                .subtract(zOffsetVector);
              const max = origin
                .add(xHalfVector)
                .add(yHalfVector)
                .add(zOffsetVector);

              new Point(min, { r: 1, g: 0, b: 0 });
              new Point(max, { r: 1, g: 0, b: 0 });
            }
          }
          // new Point(hostObject.location.origin.subtract(new Vec3(0, 0, 10)), {
          //   r: 1,
          //   g: 0,
          //   b: 0,
          // });
          return hostObject;
        }
      }
    });

    console.log("waffles: ", waffles);
  };

  const onExecuteButtonClick = () => {
    const routeResults = ReduxStore.getState().routingSlice.routeResults;
    if (routeName.length < 1) {
      return alert("Please write route name");
    }

    for (const routeResult of routeResults) {
      if (routeResult.name === routeName)
        return alert("current name is already exist");
    }

    const routeDatas = executeVacuumRouting(routeName);

    return;

    if (routeDatas.length < 1) return alert("There is no routing result");

    const routeResult: RouteResult = {
      name: routeName,
      routeResult: routeDatas,
    };
    ReduxStore.dispatch(ADD_ROUTE_RESULT(routeResult));
    console.log(ReduxStore.getState().routingSlice.routeResults);

    convertPumpRouteForRevit(routeResult);
    ReduxStore.dispatch(ADD_TARGET_TO_ROUTED());
  };

  React.useEffect(() => {
    const options = ReduxStore.getState().BIMSlice.bimOptions;

    options.forEach((option) => {
      option.data.Pipe_Segments.forEach((segment) => {
        if (!pipeSegment.includes(segment)) pipeSegment.push(segment);
      });
      option.data.Pipe_System_Types.forEach((type) => {
        if (!pipeSystemType.includes(type)) pipeSystemType.push(type);
      });
      option.data.Element_data.Pipes["Pipe Types"].forEach((type) => {
        if (!pipeType.includes(type)) pipeType.push(type);
      });
    });

    ReduxStore.dispatch(setFittingFamilyData("Elbow"));
    ReduxStore.dispatch(setTypeData(pipeType[0]));
    ReduxStore.dispatch(setSystemTypeData(pipeSystemType[0]));
    ReduxStore.dispatch(setPipeSegmentData(pipeSegment[0]));
    console.log("effectcheck", ReduxStore.getState().Meta.Type);
  }, []);

  return (
    <>
      <div className="function-container">
        <div
          className="function-title"
          onClick={() => {
            setIsOpen((curr) => !curr);
          }}
        >
          <span>Pump Routing</span>
          <span style={{ float: "right" }}>{isOpen ? "△" : "▽"}</span>
        </div>
        {isOpen && (
          <>
            <div className="table-header" style={{ fontSize: "11px" }}>
              Target Equipment
            </div>
            <table
              className="data-table"
              style={{
                maxWidth: right - 91,
                width: right - 91,
              }}
            >
              <tbody>
                <tr>
                  <td
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.3 - 42,
                      width: (right - 91) * 0.3 - 42,
                    }}
                  >
                    Target
                  </td>
                  <td
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.7 - 42,
                      width: (right - 91) * 0.7 - 42,
                    }}
                  >
                    <button className="function-btn" onClick={setEquipment}>
                      Set Equipment Target
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="table-header" style={{ fontSize: "11px" }}>
              Pump Settings
            </div>
            <table
              className="data-table"
              style={{
                maxWidth: right - 91,
                width: right - 91,
              }}
            >
              <tbody>
                <tr>
                  <td
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.3 - 42,
                      width: (right - 91) * 0.3 - 42,
                    }}
                  >
                    Family
                  </td>
                  <td
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.7 - 42,
                      width: (right - 91) * 0.7 - 42,
                    }}
                  >
                    Pipes
                  </td>
                </tr>
                <tr>
                  <td
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.3 - 42,
                      width: (right - 91) * 0.3 - 42,
                    }}
                  >
                    Type
                  </td>
                  <td
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.7 - 42,
                      width: (right - 91) * 0.7 - 42,
                    }}
                  >
                    <select
                      style={{ width: "100%" }}
                      onChange={(e) => {
                        ReduxStore.dispatch(setTypeData(e.target.value));
                        console.log(
                          "setcheck",
                          ReduxStore.getState().Meta.Type
                        );
                      }}
                    >
                      {pipeType.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.3 - 42,
                      width: (right - 91) * 0.3 - 42,
                    }}
                  >
                    System Type
                  </td>
                  <td
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.7 - 42,
                      width: (right - 91) * 0.7 - 42,
                    }}
                  >
                    <select
                      style={{ width: "100%" }}
                      onChange={(e) =>
                        ReduxStore.dispatch(setSystemTypeData(e.target.value))
                      }
                    >
                      {pipeSystemType.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.3 - 42,
                      width: (right - 91) * 0.3 - 42,
                    }}
                  >
                    Pipe Segment
                  </td>
                  <td
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.7 - 42,
                      width: (right - 91) * 0.7 - 42,
                    }}
                  >
                    <select
                      style={{ width: "100%" }}
                      onChange={(e) => {
                        ReduxStore.dispatch(setPipeSegmentData(e.target.value));
                      }}
                    >
                      {pipeSegment.map((segment) => (
                        <option key={segment}>{segment}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="table-header" style={{ fontSize: "11px" }}>
              Detected Equipment Connectors
            </div>
            {tableContentEquip}
            <div className="table-header" style={{ fontSize: "11px" }}>
              Detected Pump Connectors
            </div>
            {tableContentVacuum}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                gap: "10px",
                margin: "10px 0px",
              }}
            >
              <input
                placeholder="name"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
              />
              <button onClick={onExecuteButtonClick}>Execute</button>
              <button onClick={onTestButtonClick}>Test</button>
            </div>
          </>
        )}
      </div>
    </>
  );
};
