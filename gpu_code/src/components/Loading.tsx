import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { ReduxRootState } from "../app/redux-store";

const Loading: React.FC = () => {
  const FullText = "Smart Routing AI . . . ";
const textLength = FullText.length;
  const isLoading = useSelector(
    (state: ReduxRootState) => state.loadingSlice.isLoading);
  const [dots, setDots] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  // const isLoading = true;
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isLoading) {
      interval = setInterval(() => {
        setDots((prevDots) => (prevDots === "..." ? "" : prevDots + "."));
      }, 500);
    } else {
      setDots("");
    }

    return () => clearInterval(interval);
  }, [isLoading]);

  // useEffect(() => {
  //   let interval: NodeJS.Timeout;
  //   let isAdding = true; // Start by adding text
  
  //   if (isLoading) {
  //     interval = setInterval(() => {
  //       setDisplayedText((prevText) => {
  //         if (isAdding) {
  //           // If adding and the full text isn't displayed yet, add next character
  //           if (prevText.length < FullText.length) {
  //             return FullText.slice(0, prevText.length + 1);
  //           } else {
  //             // Full text displayed, start removing all text on next interval
  //             isAdding = false;
  //             return prevText;
  //           }
  //         } else {
  //           // If removing, clear the text and start adding on next interval
  //           isAdding = true; // Switch to adding mode
  //           return ""; // Clear text completely
  //         }
  //       });
  //     }, 100); // Adjust time as needed for your animation speed
  //   } else {
  //     setDisplayedText(""); // Clear text when not loading
  //   }
  
  //   return () => clearInterval(interval);
  // }, [isLoading]);
  if (!isLoading) return null;

  return (
    <div
      className="loading-overlay"
      style={{
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        className="loading-text"
        style={{
          color: "white",
          fontSize: "50px",
        }}
      >
        Loading{dots}
        {/* {displayedText} */}
      </div>
    </div>
  );
};

export default Loading;
