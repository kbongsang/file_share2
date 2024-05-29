import React from "react";
import { useSelector } from "react-redux";
import { ReduxRootState } from "../app/redux-store";
import { TabSelector } from "./TabSelector";
import { Debug } from "./side-tab-contents/Debug";
import { Property } from "./side-tab-contents/Property";
import "../styles.css";
import Layer from "./side-tab-contents/Layer";
import Routing from "./side-tab-contents/Routing";

interface RightSideTabProps {
  width: number;
}

export const RightSideTab = ({ width }: RightSideTabProps) => {
  const selected = useSelector(
    (state: ReduxRootState) => state.BIMSlice.selected
  );
  const [hasSelected, setHasSelected] = React.useState(false);
  const [selectedTab, setSelectedTab] = React.useState("Property" as string);

  React.useEffect(() => {
    console.log("Selected object has been updated: ", selected);
    if (selected) {
      setHasSelected(true);
    } else {
      setHasSelected(false);
    }
  }, [selected]);

  const handleSelectorChange = (tab: string) => {
    console.log("Selected tab: ", tab);
    setSelectedTab(tab);
  };

  const selector = () => {
    if (selectedTab === "Property") {
      return hasSelected ? (
        <Property />
      ) : (
        <div className="table-title">Select an object</div>
      );
    } else if (selectedTab === "Routing") {
      return <Routing />;
    } else if (selectedTab === "Layer") {
      return <Layer />;
    } else if (
      selectedTab === "Debug" &&
      process.env.NODE_ENV === "development"
    ) {
      return <Debug />;
    }
  };

  return (
    <div
      className="right-side-tab-container"
      style={{ width: width, height: "100%" }}
    >
      <div className="side-tab-inner-box">
        <TabSelector
          tabs={["Property", "Layer", "Routing", "Debug"]}
          onChange={handleSelectorChange}
        />
        <div className="table-container" id="table-container">
          {selector()}
        </div>
      </div>
    </div>
  );
};
