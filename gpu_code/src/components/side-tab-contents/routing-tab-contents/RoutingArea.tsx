import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { ReduxRootState, ReduxStore } from "../../../app/redux-store";
import * as THREE from "three";
import {
  BOUNDBOX_SET_BOX,
  BOUNDBOX_SET_CREATED,
  BOUNDBOX_SET_DELETED,
} from "../../../app/boundBox-slice";

interface RoutingAreaProps {
  onConfirm: () => void;
  onClear?: () => void;
}

export const RoutingArea = ({ onConfirm, onClear }: RoutingAreaProps) => {
  const createBtnRef = React.useRef<HTMLButtonElement>(null);
  const [pos, setPos] = React.useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = React.useState({ x: 0, y: 0, z: 0 });
  const [isBoundingBox, setIsBoundingBox] = React.useState(false);

  const dispatch = useDispatch();

  const right = useSelector((state: ReduxRootState) => state.AppSlice.right);

  const scene = useSelector(
    (state: ReduxRootState) => state.RenderReducer.scene
  );
  const viewModel = useSelector(
    (state: ReduxRootState) => state.RenderReducer.viewModel
  );

  const box = useSelector(
    (state: ReduxRootState) => state.BoundBoxSlice.boundBox
  );

  const handleOnConfirm = () => {
    if (createBtnRef.current === null) {
      alert("createBtnRef is null");
      return;
    }

    createBtnRef.current.innerText = "Create";
    onConfirm();
    dispatch(BOUNDBOX_SET_DELETED());
    setIsBoundingBox(false);
    console.log("handleOnConfirm");
  };

  const createBoundingBox = () => {
    console.log("createBoundingBox");

    const box = new THREE.BoxGeometry(100, 100, 100);
    const material = new THREE.MeshStandardMaterial({
      color: "red",
      opacity: 0.5,
      transparent: true,
      wireframe: true,
    });

    const boxMesh = new THREE.Mesh(box, material);
    boxMesh.position.copy(viewModel.controls.target);

    scene.add(boxMesh);
    viewModel.gizmo?.transformControls.attach(boxMesh);
    if (viewModel.gizmo?.transformControls)
      scene.add(viewModel.gizmo?.transformControls);

    dispatch(BOUNDBOX_SET_BOX(boxMesh));
    dispatch(BOUNDBOX_SET_CREATED());
  };

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.keyCode) {
        case 81: // Q
          viewModel.gizmo?.transformControls.setSpace(
            viewModel.gizmo?.transformControls.space === "local"
              ? "world"
              : "local"
          );
          break;

        case 16: // Shift
          viewModel.gizmo?.transformControls.setTranslationSnap(1);
          viewModel.gizmo?.transformControls.setRotationSnap(
            THREE.MathUtils.degToRad(15)
          );
          viewModel.gizmo?.transformControls.setScaleSnap(0.25);
          break;

        case 87: // W
          viewModel.gizmo?.transformControls.setMode("translate");
          break;

        case 69: // E
          viewModel.gizmo?.transformControls.setMode("rotate");
          break;

        case 82: // R
          viewModel.gizmo?.transformControls.setMode("scale");
          break;

        case 27: // Esc
          viewModel.gizmo?.transformControls.reset();
          break;
        case 187:
        case 107: // +, =, num+
          viewModel.gizmo?.transformControls.setSize(
            viewModel.gizmo?.transformControls.size + 0.1
          );
          break;

        case 189:
        case 109: // -, _, num-
          viewModel.gizmo?.transformControls.setSize(
            Math.max(viewModel.gizmo?.transformControls.size - 0.1, 0.1)
          );
          break;
      }
    };

    const onChange = () => {
      const b = ReduxStore.getState().BoundBoxSlice.boundBox;
      ReduxStore.getState().BoundBoxSlice.boundBox.updateMatrix();
      ReduxStore.getState().RenderReducer.viewModel.gizmo?.transformControls.updateMatrix();

      setPos({ x: b.position.x, y: b.position.y, z: b.position.z });
      setScale({ x: b.scale.x, y: b.scale.y, z: b.scale.z });
    };

    const onKeyup = (event: KeyboardEvent) => {
      switch (event.keyCode) {
        case 16: // Shift
          viewModel.gizmo?.transformControls.setTranslationSnap(null);
          viewModel.gizmo?.transformControls.setRotationSnap(null);
          viewModel.gizmo?.transformControls.setScaleSnap(null);
          break;
      }
    };

    if (isBoundingBox) {
      viewModel.gizmo?.transformControls.addEventListener("change", onChange);
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyup);
    } else {
      if (box) {
        scene.remove(box);
      }

      if (viewModel.gizmo?.transformControls) {
        scene.remove(viewModel.gizmo?.transformControls);
      }
    }

    return () => {
      viewModel.gizmo?.transformControls.removeEventListener(
        "change",
        onChange
      );
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyup);
    };
  }, [pos, scale, isBoundingBox]);

  return (
    <>
      <div className="table-header" style={{ fontSize: "11px" }}>
        Create Bound
      </div>
      <table
        className="data-table"
        style={{
          maxWidth: right - 91,
          width: right - 91,
        }}
      >
        <tbody className="data-table-body">
          <tr>
            <td
              className="data-table-td"
              style={{
                maxWidth: (right - 91) * 0.3 - 42,
                width: (right - 91) * 0.3 - 42,
              }}
            >
              Bound
            </td>
            <td
              className="data-table-td"
              style={{
                maxWidth: (right - 91) * 0.7 - 42,
                width: (right - 91) * 0.7 - 42,
              }}
            >
              <button
                ref={createBtnRef}
                className="function-btn"
                onClick={(e) => {
                  if (e.currentTarget.innerText === "Create") {
                    createBoundingBox();
                    setIsBoundingBox(true);
                    e.currentTarget.innerText = "Delete";
                  } else {
                    dispatch(BOUNDBOX_SET_DELETED());
                    setIsBoundingBox(false);
                    e.currentTarget.innerText = "Create";
                  }
                }}
              >
                Create
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ height: "10px" }}></div>
      <table
        className="data-table"
        style={{
          maxWidth: right - 91,
          width: right - 91,
        }}
      >
        <tbody className="data-table-body">
          <tr>
            <td
              className="data-table-td"
              style={{
                maxWidth: (right - 91) * 0.3 - 42,
                width: (right - 91) * 0.3 - 42,
              }}
            >
              Origin
            </td>
            <td
              className="data-table-td"
              style={{
                maxWidth: (right - 91) * 0.7 - 42,
                width: (right - 91) * 0.7 - 42,
                textAlign: "center",
              }}
            >
              <a className="x">X </a>
              <a>{pos?.x?.toFixed(2)}</a>
              <a className="y"> Y </a>
              <a>{pos?.y?.toFixed(2)}</a>
              <a className="z"> Z </a>
              <a>{pos?.z?.toFixed(2)}</a>
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
              Scale
            </td>
            <td
              className="data-table-td"
              style={{
                maxWidth: (right - 91) * 0.7 - 42,
                width: (right - 91) * 0.7 - 42,
                textAlign: "center",
              }}
            >
              <a className="x">X </a>
              <a>{(scale.x * 100).toFixed(2)}</a>
              <a className="y"> Y </a>
              <a>{(scale.y * 100).toFixed(2)}</a>
              <a className="z"> Z </a>
              <a>{(scale.z * 100).toFixed(2)}</a>
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
        <button onClick={handleOnConfirm}>Confirm</button>
      </div>
    </>
  );
};
