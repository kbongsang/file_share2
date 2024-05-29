import React from "react";
import "./DraggableBox.css";

interface DraggableBoxProps {
  title: string;
  children?: React.ReactNode;
  onClose?: () => void;
}

export const DraggableBox = ({
  title,
  children,
  onClose,
}: DraggableBoxProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = React.useState(false);
  const [pos1, setPos1] = React.useState(0);
  const [pos2, setPos2] = React.useState(0);
  const [pos3, setPos3] = React.useState(0);
  const [pos4, setPos4] = React.useState(0);

  const onMouseDown = (e: React.MouseEvent<HTMLHeadElement>) => {
    setIsDragging(true);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    setPos3(e.clientX);
    setPos4(e.clientY);
  };

  const onMouseMove = (e: MouseEvent) => {
    setPos1(pos3 - e.clientX);
    setPos2(pos4 - e.clientY);
    setPos3(e.clientX);
    setPos4(e.clientY);

    if (!containerRef.current) {
      alert("containerRef.current is null");
      return;
    }

    containerRef.current.style.top =
      containerRef.current.offsetTop - pos2 + "px";
    containerRef.current.style.left =
      containerRef.current.offsetLeft - pos1 + "px";
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  });

  return (
    <section className="draggable-container" ref={containerRef}>
      <header className="draggable-window-frame" onMouseDown={onMouseDown}>
        <div className="draggable-window-frame-contents">
          <span className="draggable-window-title">{title}</span>
          <button
            className="draggable-cancel-btn"
            onClick={() => onClose && onClose()}
          >
            X
          </button>
        </div>
      </header>
      <div className="draggable-window-content-container">
      <section className="draggable-window-content">{children}</section>
      </div>
    </section>
  );
};
