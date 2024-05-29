import { useSelector } from "react-redux";
import { ReduxRootState } from "../../app/redux-store";
import React from "react";
import { CurveObject } from "../../core/BIM/CurveObject";
import { PointObject } from "../../core/BIM/PointObject";
import { LocationCurve, LocationPoint } from "../../core/BIM/Location";

export const Property = () => {
  const selected = useSelector(
    (state: ReduxRootState) => state.BIMSlice.selected
  );
  const [location, setLocation] = React.useState<
    LocationCurve | LocationPoint | null
  >(null);

  const right = useSelector((state: ReduxRootState) => state.AppSlice.right);

  React.useEffect(() => {
    if (selected instanceof CurveObject) {
      setLocation(selected.location);
    }

    if (selected instanceof PointObject) {
      setLocation(selected.location);
    }
  }, [selected]);

  const renderLocation = () => {
    if (location === null) {
      return null;
    }
    if (location instanceof LocationCurve) {
      return (
        <>
          <div className="table-title">Location</div>
          <table
            className="data-table"
            style={{
              maxWidth: right - 71,
              width: right - 71,
            }}
          >
            <tbody>
              <tr>
                <td
                  className="data-table-td"
                  style={{
                    maxWidth: (right - 71) * 0.3 - 42,
                    width: (right - 71) * 0.3 - 42,
                  }}
                >
                  Start Point
                </td>
                <td
                  className="data-table-td"
                  style={{
                    textAlign: "center",
                    maxWidth: (right - 71) * 0.7 - 42,
                    width: (right - 71) * 0.7 - 42,
                  }}
                >
                  <a className="x">X </a>
                  <a>{location.startPoint.x.toFixed(2)}</a>
                  <a className="y"> Y </a>
                  <a>{location.startPoint.y.toFixed(2)}</a>
                  <a className="z"> Z </a>
                  <a>{location.startPoint.z.toFixed(2)}</a>
                </td>
              </tr>
              <tr>
                <td className="data-table-td">End Point</td>
                <td className="data-table-td" style={{ textAlign: "center" }}>
                  <a className="x">X </a>
                  <a>{location.endPoint.x.toFixed(2)}</a>
                  <a className="y"> Y </a>
                  <a>{location.endPoint.y.toFixed(2)}</a>
                  <a className="z"> Z </a>
                  <a>{location.endPoint.z.toFixed(2)}</a>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      );
    } else if (location instanceof LocationPoint) {
      return (
        <>
          <div className="table-title">Location</div>
          <table
            className="data-table"
            style={{
              maxWidth: right - 71,
              width: right - 71,
            }}
          >
            <thead>
              <tr>
                <td
                  className="data-table-td"
                  style={{
                    maxWidth: (right - 71) * 0.3 - 42,
                    width: (right - 71) * 0.3 - 42,
                  }}
                >
                  Base Point
                </td>
                <td
                  className="data-table-td"
                  style={{
                    textAlign: "center",
                    maxWidth: (right - 71) * 0.7 - 42,
                    width: (right - 71) * 0.7 - 42,
                  }}
                >
                  <a className="x">X </a>
                  <a>{location.origin.x.toFixed(2)}</a>
                  <a className="y"> Y </a>
                  <a>{location.origin.y.toFixed(2)}</a>
                  <a className="z"> Z </a>
                  <a>{location.origin.z.toFixed(2)}</a>
                </td>
              </tr>
            </thead>
          </table>
        </>
      );
    }
  };

  const renderMeta = () => {
    if (selected) {
      const meta = selected.meta as any;
      return (
        <>
          <div className="table-title">Meta</div>
          <table
            className="data-table"
            style={{
              maxWidth: right - 71,
              width: right - 71,
            }}
          >
            <tbody>
              {Object.keys(meta).map((key, index) => {
                if (
                  key === "Mesh" ||
                  key === "Connectors" ||
                  key === "Connector_Direction" ||
                  key === "collision_bound" ||
                  key === "Connectors_diameter"
                )
                  return null;
                else
                  return (
                    <tr key={index}>
                      <td
                        className="data-table-td"
                        key={index}
                        style={{
                          maxWidth: (right - 71) * 0.3 - 42,
                          width: (right - 71) * 0.3 - 42,
                        }}
                      >
                        {key}
                      </td>
                      <td
                        className="data-table-td"
                        style={{
                          maxWidth: (right - 71) * 0.7 - 42,
                          width: (right - 71) * 0.7 - 42,
                        }}
                      >
                        {meta[key]}
                      </td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
        </>
      );
    }
  };

  return (
    <>
      <div className="table-title">Identifier</div>
      <table
        className="data-table"
        style={{
          maxWidth: right - 71,
          width: right - 71,
        }}
      >
        <tbody>
          <tr>
            <td
              className="data-table-td"
              style={{
                maxWidth: (right - 71) * 0.3 - 42,
                width: (right - 71) * 0.3 - 42,
              }}
            >
              ID
            </td>
            <td
              className="data-table-td"
              style={{
                maxWidth: (right - 71) * 0.7 - 42,
                width: (right - 71) * 0.7 - 42,
              }}
            >
              {selected?.id}
            </td>
          </tr>
        </tbody>
      </table>
      {renderLocation()}
      {renderMeta()}
    </>
  );
};
