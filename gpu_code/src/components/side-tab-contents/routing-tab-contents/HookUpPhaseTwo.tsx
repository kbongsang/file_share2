import { useState } from "react";
import { ReduxStore } from "../../../app/redux-store";
// import * as THREE from "three";
// import { ReduxStore } from "../../../app/redux-store";

const JSON_export = async () => {
  const exportObjects = ReduxStore.getState().BIMSlice.exportObjects;
  //const allElements: HostObjectData[] = extractDataToElements(hostObjects);
  const allElementsJson = JSON.stringify({ elements: exportObjects });
  try {
    const blob = new Blob([allElementsJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const fileName = prompt("저장할 파일 이름을 입력하세요:", "data.json");
    if (fileName) {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
    }

    URL.revokeObjectURL(url);
    console.log("파일 쓰기 완료");
  } catch (err) {
    console.error(err);
  }
};

const HookUpPhaseTwo = ({
  setIsPopUpOpen,
}: {
  setIsPopUpOpen?: () => void;
}) => {
  // const test = () => {
  //   const boxMesh = ReduxStore.getState().BoundBoxSlice.boundBox;
  //   const boundingBox = new THREE.Box3().setFromObject(boxMesh);
  //   console.log("boundingBox", boundingBox);
  // };

  const [isOpen, setIsOpen] = useState(true);

  const toggleOpen = () => {
    console.log(isOpen);
    setIsOpen(!isOpen);
  };
  return (
    <>
      <div className="table-header-container">
        <div className="table-header">Hook-Up Routing</div>
        <div
          style={{ fontSize: "15px", cursor: "pointer" }}
          onClick={toggleOpen}
        >
          {isOpen ? "△" : "▽"}
        </div>
      </div>
      {isOpen && (
        <>
          <div className="table-header" style={{ fontSize: "11px" }}>
            Voxelization
          </div>
          <table className="data-table">
            <tbody className="data-table-body">
              <tr>
                <td className="data-table-td">Sub Division Count</td>
                <td className="data-table-td" style={{ textOverflow: "unset" }}>
                  <input
                    type="number"
                    style={{ width: "97%" }}
                    onChange={(e) => console.log(e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="data-table-td">Sub Division Min Size (mm)</td>
                <td className="data-table-td" style={{ textOverflow: "unset" }}>
                  <input
                    type="number"
                    style={{ width: "97%" }}
                    onChange={(e) => console.log(e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              gap: "10px",
              margin: "10px 0px",
            }}
          >
            <button onClick={() => alert("Click!")}>
              Sub Division Execute
            </button>
          </div>
          <div className="table-header" style={{ fontSize: "11px" }}>
            Connections
          </div>
          <table className="data-table">
            <tbody className="data-table-body">
              <tr>
                <td className="data-table-td">Connection Data</td>
                <td className="data-table-td">
                  <button
                    onClick={() => {
                      setIsPopUpOpen && setIsPopUpOpen();
                    }}
                  >
                    Set Connection
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="table-header" style={{ fontSize: "11px" }}>
            Routing Parameters
          </div>
          <table className="data-table">
            <tbody className="data-table-body">
              <tr>
                <td className="data-table-td">Pipe Segment Min Length</td>
                <td className="data-table-td" style={{ textOverflow: "unset" }}>
                  <input type="number" style={{ width: "97%" }} />
                </td>
              </tr>
            </tbody>
          </table>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              gap: "10px",
              margin: "10px 0px",
            }}
          >
            <button onClick={() => alert("Click!")}>Generate Routes</button>
            <button
              onClick={(e) => {
                if (e.currentTarget.innerText === "Start Edit")
                  e.currentTarget.innerText = "Regenerate Routes";
                else e.currentTarget.innerText = "Start Edit";
              }}
            >
              Start Edit
            </button>
            <button
              onClick={() =>
                confirm("This action cannot be undone. Are you sure?")
              }
            >
              Confirm
            </button>
            <button onClick={JSON_export}>Export</button>
          </div>
        </>
      )}
    </>
  );
};

export default HookUpPhaseTwo;
