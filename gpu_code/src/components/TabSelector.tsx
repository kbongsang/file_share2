import React from "react";

interface TabSelectorProps {
  tabs: string[];
  onChange?: (tab: string) => void;
}
export const TabSelector = ({ tabs, onChange }: TabSelectorProps) => {
  const buttonsRef = React.useRef<HTMLButtonElement[]>([]);

  React.useEffect(() => {
    buttonsRef.current = buttonsRef.current.slice(0, tabs.length);
  });

  const handleSelectorClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.target as HTMLButtonElement;
    target.style.backgroundColor = "#303030";

    buttonsRef.current.forEach((button) => {
      if (button !== target && button !== null) {
        button.style.backgroundColor = "#1d1d1d";
      }
    });

    onChange && onChange(target.textContent || "");
  };

  return (
    <div className="selector-container">
      {tabs.map((tab, index) => {
        const width = 100 / tabs.length + "%";
        return (
          <button
            ref={(el: HTMLButtonElement) => buttonsRef.current.push(el)}
            key={tab}
            style={{
              width: width,
              border: "none",
              backgroundColor: index === 0 ? "#303030" : "#1d1d1d",
              color: "white",
            }}
            onClick={handleSelectorClick}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
};
