import { useState } from "react";
import { ReduxRootState, ReduxStore } from "../../../app/redux-store";
import { useDispatch, useSelector } from "react-redux";
import { Pipes } from "../../../core/family/Pipes";
import React from "react";
import { CurveObject } from "../../../core/BIM/CurveObject";
import { VoxelNode } from "../../../core/Dev/Voxel/VoxelNode";
import * as THREE from "three";

import { export_trans } from "../../../core/Dev/General/RoutingToHost";
import { HostObject } from "../../../core/BIM/HostObject";

import { RoutingArea } from "./RoutingArea";

import { GIZMO_ON } from "../../../app/gizmo-slice";

import { hookupRouting } from "../../../core/api/hookup-routing/main";
import { drawDebugPipe } from "../../../core/api/hookup-routing/render";
import { PipeFitting } from "../../../core/family/PipeFittings";

export interface mainPath {
  path: THREE.Vector3[];
  property: string;
  branchVoxel: VoxelNode[];
  branchSize: number[];
  mainSize?: number;
}

const HookUpPhaseOne = ({ setIsConfirm }: { setIsConfirm?: () => void }) => {
  // UI
  const right = useSelector((state: ReduxRootState) => state.AppSlice.right);
  const selected = useSelector(
    (state: ReduxRootState) => state.BIMSlice.selected
  );
  const [isOpen, setIsOpen] = useState(false);
  let [clickedVoxel] = React.useState<VoxelNode>();

  const [viewModel] = useState(
    useSelector((state: ReduxRootState) => state.RenderReducer.viewModel)
  );

  // Bounding box
  const boxMesh = ReduxStore.getState().BoundBoxSlice.boundBox;
  const _inputBoundingBox = new THREE.Box3().setFromObject(boxMesh);

  const [hookupRoutingManager] = useState(new hookupRouting(viewModel));

  const [userPipeObjArray, setPipeObjArray] = useState<HostObject[]>([]); // not used in auto mode
  const [userVoxelArray, setVoxelArray] = useState<VoxelNode[]>([]); // not used in auto mode

  // ------------------------

  const isOn = useSelector((state: ReduxRootState) => state.gizmoSlice.isOn);
  const dispatch = useDispatch();

  // Gizmo On & Off
  const handleGizmo = () => {
    if (!isOn) {
      dispatch(GIZMO_ON(true));
    } else {
      dispatch(GIZMO_ON(false));
      const gizmo = ReduxStore.getState().RenderReducer.viewModel.gizmo;
      if (gizmo !== undefined) {
        ReduxStore.getState().RenderReducer.viewModel.scene.remove(
          gizmo?.transformControls
        );
      }
    }
  };

  interface DataItem {
    Type: string;
    Size: string;
    Location: THREE.Vector3;
  }

  const showSelectedObjBox = () => {
    if (selected) {
      for (const renObj of selected.renderObjects) {
        const selectedMesh = renObj.object3d;
        const box = new THREE.Box3().setFromObject(selectedMesh);
        if (box.max.z > box.min.z) console.log("Mesh box: ", box);
      }
    } else console.log("not selected.");
  };

  const showData = () => {
    const boxMesh = ReduxStore.getState().BoundBoxSlice.boundBox;
    const inputBoundingBox = new THREE.Box3().setFromObject(boxMesh);
    console.log("inputBoundingBox: ", inputBoundingBox);
    console.log("se1: ", hookupRoutingManager.globalSE1);
    console.log("se2: ", hookupRoutingManager.globalSE2);
    console.log("voxelManager: ", hookupRoutingManager.globalVM);
  };

  // Voxelization / SE Algorithm / GE Algorithm Setup and run?

  // Export Task 2 data to Revit
  const Confirm = (inputStartObjs_1?: PipeFitting[]) => {
    // Get Task 2-1 and 2-2 Result
    const route2_1FinalPathGE = hookupRoutingManager.globalGE.ExportFinalPath(); //Main
    const route2_2FinalPathSE =
      hookupRoutingManager.globalSE2.exportFinalPathBranch(); //Branch
    const useStartObjs_1 = inputStartObjs_1
      ? inputStartObjs_1
      : hookupRoutingManager.startObjs_1;
    const route2_2FinalPathSEMain =
      hookupRoutingManager.globalSE2.exportFinalPathMain(useStartObjs_1); // Sub

    console.warn("route2_1FinalPathGE", route2_1FinalPathGE);
    console.warn("route2_2FinalPathSE", route2_2FinalPathSE);
    console.warn("route2_2FinalPathSEMain", route2_2FinalPathSEMain);

    // rendering pipes
    // drawPipeFromExportData(route2_1FinalPathGE);
    // drawPipeFromExportData(route2_2FinalPathSE);
    // drawPipeFromExportData(route2_2FinalPathSEMain);
    drawDebugPipe(route2_1FinalPathGE);

    drawDebugPipe(
      route2_2FinalPathSEMain,
      new THREE.MeshStandardMaterial({
        color: 0xffff00,
      })
    );

    drawDebugPipe(
      route2_2FinalPathSE,
      new THREE.MeshStandardMaterial({
        color: 0xff9900,
      })
    );

    // export pipe data
    export_trans(
      route2_1FinalPathGE[0],
      route2_1FinalPathGE[1],
      route2_1FinalPathGE[2],
      route2_1FinalPathGE[3]
    );
    export_trans(
      route2_2FinalPathSE[0],
      route2_2FinalPathSE[1],
      route2_2FinalPathSE[2],
      route2_2FinalPathSE[3]
    );
    export_trans(
      route2_2FinalPathSEMain[0],
      route2_2FinalPathSEMain[1],
      route2_2FinalPathSEMain[2],
      route2_2FinalPathSEMain[3]
    );

    console.warn("route2_1FinalPathGE", route2_1FinalPathGE);
    console.warn("route2_2FinalPathSE", route2_2FinalPathSE);
    console.warn("route2_2FinalPathSEMain", route2_2FinalPathSEMain);
  };

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

  const renderProperty = () => {
    // console.log("SelectedCheck", selected);
    if (selected) {
      if (selected.constructor.name === "Pipe Connect") {
        const pipeObj = selected as PipeFitting;
        if (
          pipeObj.StartPoint!.x.toFixed(1) === pipeObj.EndPoint!.x.toFixed(1) &&
          pipeObj.StartPoint!.y.toFixed(1) === pipeObj.EndPoint!.y.toFixed(1) &&
          pipeObj.StartPoint!.z.toFixed(1) !== pipeObj.EndPoint!.z.toFixed(1)
        ) {
          // get property
          let property = "none";
          if ("Type" in pipeObj.meta) {
            property = String(pipeObj.meta["Type"]);
          }

          // get zone
          let zone = "none";
          if ("SLZ_Connect" in pipeObj.meta) {
            zone = String(pipeObj.meta["SLZ_Connect"]);
          }

          return (
            <>
              <table className="data-table">
                <tbody className="data-table-body">
                  <tr>
                    <td className="data-table-td" key={"property"}>
                      {"Connector Type: "}
                    </td>
                    <td className="data-table-td" key={"value"}>
                      {"MEP Connector"}
                    </td>
                  </tr>
                  <tr>
                    <td className="data-table-td" key={"property"}>
                      {"Property: "}
                    </td>
                    <td className="data-table-td" key={"value"}>
                      {property}
                    </td>
                  </tr>
                  <tr>
                    <td className="data-table-td" key={"property"}>
                      {"Zone: "}
                    </td>
                    <td className="data-table-td" key={"value"}>
                      {zone}
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          );
        }
      }
      if (selected.constructor.name === "Floor") {
        // console.log("chosen a floor");
        const boundingBox = new THREE.Box3().setFromObject(
          selected.renderObjects[0].object3d
        );
        // dummy panel obj
        // console.log("hookupRoutingManager", hookupRoutingManager);
        if (hookupRoutingManager.globalVM.voxelNodes.length > 0) {
          const nearestVoxel = [
            ...hookupRoutingManager.globalVM.supportSpaceVoxels,
          ].sort((a, b) => {
            return (
              boundingBox.distanceToPoint(a.location) -
              boundingBox.distanceToPoint(b.location)
            );
          })[0];

          clickedVoxel = nearestVoxel;

          const pointX = nearestVoxel.location.x;
          const pointY = nearestVoxel.location.y;
          const pointZ = nearestVoxel.location.z;

          return (
            <>
              <table className="data-table">
                <tbody className="data-table-body">
                  <tr>
                    <td className="data-table-td" key={"property"}>
                      {"ID: "}
                    </td>
                    <td className="data-table-td" key={"value"}>
                      {nearestVoxel.nodeId}
                    </td>
                  </tr>
                  <tr>
                    <td className="data-table-td" key={"property"}>
                      {"location: "}
                    </td>
                    <td className="data-table-td" key={"value"}>
                      {`X:${pointX}, Y:${pointY}, Z:${pointZ}`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          );
        }
      } else {
        return (
          <table className="data-table">
            <tbody className="data-table-body">
              <tr>
                <td className="data-table-td" key={"value"}>
                  {"Unsupported input element"}
                </td>
              </tr>
            </tbody>
          </table>
        );
      }
    }
    return (
      <table className="data-table">
        <tbody className="data-table-body">
          <tr>
            <td className="data-table-td" key={"value"}>
              {"EMPTY"}
            </td>
          </tr>
        </tbody>
      </table>
    );
  };

  const addPressed = () => {
    console.log("Pressed");

    if (selected!.constructor.name === "Pipes") {
      pushData(selected!);
    } else if (selected!.constructor.name === "Floor" && clickedVoxel) {
      pushVoxel(clickedVoxel);
    }
    // console.log("DataArray", userPipeObjArray);
    console.log("PipeObjArray After Add", userPipeObjArray);
    console.log("VoxelArray After Add", userVoxelArray);
  };

  const pushData = (dataToAdd: HostObject) => {
    // console.log("dataToAdd", dataToAdd);
    // setPipeObjArray((prevDataArray) => [...prevDataArray, dataToAdd]);
    userPipeObjArray.push(dataToAdd);
  };
  const pushVoxel = (dataToAdd: VoxelNode) => {
    // console.log("dataToAdd", dataToAdd);
    // setVoxelArray((prevDataArray) => [...prevDataArray, dataToAdd]);
    userVoxelArray.push(dataToAdd);
  };

  const deleteRow = (index: number) => {
    // setPipeObjArray((prevDataArray) =>
    //   prevDataArray.filter((_, i) => i !== index)
    // );
    userPipeObjArray.splice(index, 1);
    // setVoxelArray((prevDataArray) =>
    //   prevDataArray.filter((_, i) => i !== index)
    // );
    userVoxelArray.splice(index, 1);

    console.log("PipeObjArray After Delete", userPipeObjArray);
    console.log("VoxelArray After Delete", userVoxelArray);
  };

  // const toggleOpen = () => {
  //   console.log(isOpen);
  //   setIsOpen(!isOpen);
  // };

  interface DataItem {
    Type: string;
    Size: string;
    Location: THREE.Vector3;
  }

  const propertiesToShow: (keyof DataItem)[] = ["Type", "Size"];

  // Cleanup from here.
  const handleBoundingConfirm = () => {
    console.log("click confirm to voxelize");
    hookupRoutingManager.inputBoundingBox = _inputBoundingBox;
    hookupRoutingManager.voxelize();
    // console.log("hookupRoutingManager", hookupRoutingManager);
  };

  const handleBoundingClear = () => {};

  return (
    <>
      <div className="function-container">
        <div
          className="function-title"
          onClick={() => {
            setIsOpen((curr) => !curr);
          }}
        >
          <span>Hookup Routing</span>
          <span style={{ float: "right" }}>{isOpen ? "△" : "▽"}</span>
        </div>
        {isOpen && (
          <>
            <RoutingArea
              onConfirm={handleBoundingConfirm}
              onClear={handleBoundingClear}
            />
            {/* <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              gap: "10px",
              margin: "10px 0px",
            }}
          >
            <button onClick={handleBoundingConfirm}>Confirm</button>
          </div> */}

            <div className="table-header" style={{ fontSize: "11px" }}>
              Selected Connector
              {renderProperty()}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                gap: "10px",
                margin: "10px 0px",
              }}
            >
              {/* <button onClick={addPressed}>Add</button> */}
              <button
                onClick={() => {
                  addPressed();
                }}
              >
                Add
              </button>
            </div>
            <div className="table-header" style={{ fontSize: "11px" }}>
              Store MEP Connector
            </div>
            <table
              className="data-table"
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                gap: "10px",
                margin: "10px 0px",
              }}
            >
              <tbody>
                <tr>
                  <th
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.7 - 42,
                      width: (right - 91) * 0.7 - 42,
                    }}
                  >
                    Index
                  </th>
                  {propertiesToShow.map((property, i) => (
                    <th
                      className="data-table-td"
                      key={i}
                      style={{
                        maxWidth: (right - 91) * 0.7 - 42,
                        width: (right - 91) * 0.7 - 42,
                      }}
                    >
                      {property}
                    </th>
                  ))}
                  <th
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.7 - 42,
                      width: (right - 91) * 0.7 - 42,
                    }}
                  >
                    Location
                  </th>
                  <th
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.7 - 42,
                      width: (right - 91) * 0.7 - 42,
                    }}
                  >
                    Action
                  </th>
                </tr>
                {userPipeObjArray.map((data, index) => (
                  <tr key={index}>
                    <td
                      className="data-table-td"
                      style={{ textAlign: "center" }}
                    >
                      {index + 1}
                    </td>
                    {propertiesToShow.map((property, i) => (
                      <td
                        className="data-table-td"
                        key={`${index}-${i}`}
                        style={{ textAlign: "center" }}
                      >
                        {(data.meta as Record<string, any>)[property]}
                      </td>
                    ))}
                    <td
                      className="data-table-td"
                      style={{ textAlign: "center" }}
                    >
                      X: {data.StartPoint?.x.toFixed(1)}, Y:{" "}
                      {data.StartPoint?.y.toFixed(1)}, Z:{" "}
                      {data.StartPoint?.z.toFixed(1)}
                    </td>

                    <td
                      className="data-table-td"
                      style={{ textAlign: "center" }}
                    >
                      <button onClick={() => deleteRow(index)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              className="table-header"
              style={{
                fontSize: "11px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              Store Voxel
            </div>

            <table
              className="data-table"
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                gap: "10px",
                margin: "10px 0px",
              }}
            >
              <tbody className="data-table-body">
                <tr>
                  <th
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.7 - 42,
                      width: (right - 91) * 0.7 - 42,
                    }}
                  >
                    Index
                  </th>
                  <th
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.7 - 42,
                      width: (right - 91) * 0.7 - 42,
                    }}
                  >
                    Node ID
                  </th>
                  <th
                    className="data-table-td"
                    style={{
                      maxWidth: (right - 91) * 0.7 - 42,
                      width: (right - 91) * 0.7 - 42,
                    }}
                  >
                    Location (X, Y, Z)
                  </th>
                  {/* Add more headers as needed */}
                </tr>
                {userVoxelArray.map((node, index) => (
                  <tr key={index}>
                    <td
                      className="data-table-td"
                      style={{ textAlign: "center" }}
                    >
                      {index + 1}
                    </td>
                    <td
                      className="data-table-td"
                      style={{ textAlign: "center" }}
                    >
                      {node.nodeId}
                    </td>
                    <td
                      className="data-table-td"
                      style={{ textAlign: "center" }}
                    >
                      X: {node.location.x.toFixed(1)}, Y:{" "}
                      {node.location.y.toFixed(1)}, Z:{" "}
                      {node.location.z.toFixed(1)}
                    </td>
                    {/* Add more cells to display other properties */}
                  </tr>
                ))}
              </tbody>
            </table>
            {/* <div className="table-header" style={{ fontSize: "11px" }}>
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
          </table> */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
              }}
            >
              <button onClick={handleGizmo}>Gizmo</button>
              <div
                style={{
                  width: "50px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isOn ? "lightgreen" : "red",
                }}
              >
                {isOn ? "ON" : "OFF"}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                gap: "10px",
                margin: "10px 0px",
              }}
            >
              <button
                onClick={() => {
                  hookupRoutingManager.generateRoutesAuto();
                }}
              >
                Generate Routes(Auto)
              </button>
              <button
                onClick={() => {
                  hookupRoutingManager.generateRoutes(
                    userPipeObjArray,
                    userVoxelArray
                  );
                }}
              >
                Generate Routes(manually)
              </button>
              <button
                onClick={(e) => {
                  if (e.currentTarget.innerText === "Start Edit") {
                    e.currentTarget.innerText = "Regenerate Routes";
                  } else {
                    hookupRoutingManager.reRunGE();
                    e.currentTarget.innerText = "Start Edit";
                  }
                }}
              >
                Start Edit
              </button>
              <button
                onClick={async () => {
                  const result = await window.confirm(
                    "This action cannot be undone. Are you sure?"
                  );
                  if (result) {
                    Confirm();
                    setIsConfirm && setIsConfirm();
                  } else if (!result) {
                    console.log("Cancel confirm");
                  }
                }}
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  JSON_export();
                }}
              >
                Export
              </button>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "left",
                gap: "10px",
                margin: "10px 0px",
              }}
            >
              <button
                onClick={() => {
                  hookupRoutingManager.initialize();
                }}
              >
                initialize
              </button>
              <button
                onClick={() => {
                  showData();
                }}
              >
                show data
              </button>
              <button
                onClick={() => {
                  showSelectedObjBox();
                }}
              >
                show selected bounding box
              </button>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "left",
                gap: "10px",
                margin: "10px 0px",
              }}
            >
              <button
                onClick={() => {
                  hookupRoutingManager.GenerateRoutesOneClick();
                }}
              >
                one-click Generate
              </button>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "left",
                gap: "10px",
                margin: "10px 0px",
              }}
            >
              <button
                onClick={() => {
                  // hookupRoutingManager.GenerateRoutesNew();
                  hookupRoutingManager.GenerateRoutesNewForTest();
                }}
              >
                new Generate Method
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default HookUpPhaseOne;
