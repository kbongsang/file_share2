import React from "react";
import "./ReorderableTable.css";

interface ReorderableTableProps {
  data: { [key: string]: any }[];
  cellOptions?: CellOption[];
  onChange?: (data: { [key: string]: any }[]) => void;
}

interface CellOption {
  key: string;
  type: "Editable" | "Selectable";
  options?: string[];
}

interface Option {
  type: "ReadOnly" | "Editable" | "Selectable";
  options?: string[];
}

const validateKeys = (data: { [key: string]: any }[]) => {
  if (data.length === 0) {
    throw new Error("Data is empty");
  }
  const keys = Object.keys(data[0]);
  if (keys.length === 0) {
    throw new Error("Data is empty");
  }

  data.forEach((row) => {
    if (Object.keys(row).length !== keys.length) {
      throw new Error("Data is not consistent");
    }

    if (!keys.every((key) => key in row)) {
      throw new Error("Data is not consistent");
    }
  });

  return keys;
};

const getValues = (data: { [key: string]: any }[]) => {
  return data.map((row) => Object.values(row));
};

export const ReorderableTable = ({
  data,
  cellOptions,
  onChange,
}: ReorderableTableProps) => {
  const [keys, setKeys] = React.useState<string[]>([]);
  const [values, setValues] = React.useState<any[][]>([]);
  const [optionTypes, setOptionTypes] = React.useState<Option[]>([]);

  const shiftDown = (index: number) => {
    const newValues = [...values];
    if (index < newValues.length - 1) {
      [newValues[index], newValues[index + 1]] = [
        newValues[index + 1],
        newValues[index],
      ];
      setValues(newValues);
    }
    onChange && onChange(newValues);
  };

  const shiftUp = (index: number) => {
    const newValues = [...values];
    if (index > 0) {
      [newValues[index], newValues[index - 1]] = [
        newValues[index - 1],
        newValues[index],
      ];
      setValues(newValues);
    }
    onChange && onChange(newValues);
  };

  const handleValueChange = (
    newValue: number | string,
    rowIndex: number,
    columnIndex: number
  ) => {
    const updatedValues = [...values];
    updatedValues[rowIndex][columnIndex] = newValue;
    setValues(updatedValues);

    onChange && onChange(updatedValues);
  };

  React.useEffect(() => {
    console.log("ReorderableTable component mounted");
    try {
      const keys = validateKeys(data);
      setKeys(keys);

      if (cellOptions) {
        const optionTypes: Option[] = keys.map((key) => {
          const option = cellOptions.find(
            (cellOption) => cellOption.key === key
          );
          if (option) {
            if (option.type === "Selectable" && !option.options) {
              throw new Error("Options are not provided for Selectable type");
            }
            return { type: option.type, options: option.options };
          } else {
            return { type: "ReadOnly", options: undefined };
          }
        });
        setOptionTypes(optionTypes);
      } else {
        setOptionTypes(
          keys.map(() => ({ type: "ReadOnly", options: undefined }))
        );
      }

      setValues(getValues(data));
    } catch (error) {
      alert(error);
    }
  }, []);
  return (
    <>
      <table className="reorderable-table">
        <thead className="reorderable-table-thead">
          <tr>
            <th className="reorderable-table-th">Order</th>
            {keys.map((key) => (
              <th className="reorderable-table-th" key={key}>
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {values.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td className="reorderable-table-td">
                {rowIndex === 0 ? (
                  <>
                    <button className="shift-btn up disabled" disabled={true}>
                      U
                    </button>
                    <button
                      className="shift-btn down"
                      onClick={() => {
                        shiftDown(rowIndex);
                      }}
                    >
                      D
                    </button>
                  </>
                ) : rowIndex === values.length - 1 ? (
                  <>
                    <button
                      className="shift-btn up"
                      onClick={() => {
                        shiftUp(rowIndex);
                      }}
                    >
                      U
                    </button>
                    <button className="shift-btn down disabled" disabled={true}>
                      D
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="shift-btn up"
                      onClick={() => {
                        shiftUp(rowIndex);
                      }}
                    >
                      U
                    </button>
                    <button
                      className="shift-btn down"
                      onClick={() => {
                        shiftDown(rowIndex);
                      }}
                    >
                      D
                    </button>
                  </>
                )}
              </td>
              {row.map((value, columnIndex) => (
                <td key={columnIndex} className="reorderable-table-td">
                  {optionTypes[columnIndex].type === "ReadOnly" ? (
                    value
                  ) : optionTypes[columnIndex].type === "Editable" ? (
                    <input
                      className="reorderable-input"
                      type="text"
                      value={value}
                      onChange={(e) => {
                        handleValueChange(
                          parseInt(e.target.value),
                          rowIndex,
                          columnIndex
                        );
                      }}
                    />
                  ) : (
                    <select
                      className="reorderable-select"
                      value={value}
                      onChange={(e) => {
                        handleValueChange(
                          e.target.value,
                          rowIndex,
                          columnIndex
                        );
                      }}
                    >
                      {optionTypes[columnIndex].options?.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="reorderable-btn-container">
        <button>Save</button>
        <button>Cancel</button>
      </div>
    </>
  );
};
