import React from "react";
import { useSelector } from "react-redux";
import { ReduxRootState } from "../app/redux-store";

interface ResizerProps {
  onMove?: (right: number) => void;
}

export const Resizer = ({ onMove: onResizerMove }: ResizerProps) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const app = useSelector((state: ReduxRootState) => state.AppSlice);

  const handleOnMouseDown = () => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (ref && ref.current !== null) {
      if (e.clientX + 4 > window.innerWidth) {
        ref.current.style.right = "4px";
      } else if (e.clientX < 0){
        ref.current.style.right = window.innerWidth -8 + "px";
      } else {
        ref.current.style.right = window.innerWidth - e.clientX + "px";
      }
      const size = Number.parseFloat(ref.current.style.right);
      onResizerMove && onResizerMove(size);
    }
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      className="resizer"
      onMouseDown={handleOnMouseDown}
      style={{ right: app.right - 4 }}
      ref={ref}
    ></div>
  );
};
