import React from "react";
import { ReduxStore } from "../../app/redux-store";
import * as THREE from "three";
import HookUpPhaseOne from "./routing-tab-contents/HookUpPhaseOne";
import HookUpPhaseTwo from "./routing-tab-contents/HookUpPhaseTwo";
import { PumpRouting } from "./routing-tab-contents/PumpRouting";
export interface Connector {
  X: number;
  Y: number;
  Z: number;
}
export interface PumpConnectData {
  Connector_Index: string;
  Pump_Connector: THREE.Vector3;
  Equipment_Connector: THREE.Vector3;
  Diameter: number;
  Spacing: number;
  collided: boolean;
}

function Routing() {
  // const [isPopUpOpen, setIsPopUpOpen] = React.useState(false);

  const [pipeSegment] = React.useState<string[]>([]);
  const [pipeSystemType] = React.useState<string[]>([]);
  const [pipeType] = React.useState<string[]>([]);
  const [isConfirm, setIsConfirm] = React.useState<boolean>(false);

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
  });

  return (
    <>
      <PumpRouting />
      <HookUpPhaseOne
            setIsConfirm={() => {
              setIsConfirm(true);
            }}
          />
      {/* {!isConfirm ? (
        <div className="function-container">
          <HookUpPhaseOne
            setIsConfirm={() => {
              setIsConfirm(true);
            }}
          />
        </div>
      ) : (
        <div className="function-container">
          <HookUpPhaseTwo />
        </div>
      )} */}
    </>
  );
}

export default Routing;
