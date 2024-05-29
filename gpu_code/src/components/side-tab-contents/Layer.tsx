import { ReduxRootState, ReduxStore } from "../../app/redux-store";
import { useSelector } from "react-redux";
import { HostObject } from "../../core/BIM/HostObject";
import { ObjectManager } from "../../core/util/ObjectManager";
import { DELETE_RESULT_BY_NAME } from "../../app/routing-slice";
import { PumpExportObject } from "../../app/bim-slice";

const DataManageTable = ({
  title,
  data: dataSets,
  onDeleteClick,
  onVisibleClick,
}: {
  title: string;
  data: string[];
  onDeleteClick: (name: string, dataListType: string) => void;
  onVisibleClick: (name: string, dataListType: string) => void;
}) => {
  return (
    <>
      <div className="table-header">{title}</div>
      <table className="data-table">
        <tbody className="data-table-body">
          {dataSets.map((dataName: any, index: number) => {
            return (
              <tr key={index}>
                <td className="data-table-td">
                  <div className="data-table-row-container">
                    <span>{dataName}</span>
                    <div>
                      <button
                        onClick={() => {
                          onVisibleClick(dataName, title);
                        }}
                      >
                        visible
                      </button>
                      <button onClick={() => onDeleteClick(dataName, title)}>
                        delete
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

const RoutingDataTable = ({ title }: { title: string; data: string[] }) => {
  const data = useSelector((state: ReduxRootState) =>
    state.routingSlice.routeResults.map((routeResult) => {
      return routeResult.name;
    })
  );

  const onExportClick = async (e: any) => {
    let targetPumpExportObject: PumpExportObject | undefined;

    for (const pumpExportObject of ReduxStore.getState().BIMSlice
      .pumpExportObjects) {
      if (pumpExportObject.name === e.target.className) {
        targetPumpExportObject = pumpExportObject;
        exportJsonFile(pumpExportObject);
        break;
      }
    }

    if (!targetPumpExportObject)
      return alert(`there is no data that name is ${e.target.className}`);
  };

  const exportJsonFile = async (pumpExportObject: PumpExportObject) => {
    const jsonToString = JSON.stringify({
      elements: pumpExportObject.hostObjects,
    });
    try {
      const blob = new Blob([jsonToString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const fileName = prompt(
        "저장할 파일 이름을 입력하세요:",
        `${pumpExportObject.name}.json`
      );
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

  const onDeleteClick = (e: any) => {
    ReduxStore.dispatch(DELETE_RESULT_BY_NAME(e.target.className));
  };

  return (
    <>
      <div className="table-header">{title}</div>
      <table className="data-table">
        <tbody className="data-table-body">
          {data.map((dataName: any, index: number) => {
            return (
              <tr key={index}>
                <td className="data-table-td">
                  <div className="data-table-row-container">
                    <span>{dataName}</span>
                    <div>
                      <button className={dataName} onClick={onExportClick}>
                        export
                      </button>
                      <button className={dataName} onClick={onDeleteClick}>
                        delete
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

const Layer = () => {
  const dataSet = useSelector(
    (state: ReduxRootState) => state.BIMSlice.dataSet
  );
  const hostObjects = useSelector(
    (state: ReduxRootState) => state.BIMSlice.hostObjects
  );

  const handleVisible = (name: string, dataListType: string) => {
    if (dataListType === "Imported Data") {
      const filter = hostObjects?.filter((object: HostObject) => {
        if (
          "Dataset_tag" in object.meta &&
          typeof object.meta.Dataset_tag === "string"
        ) {
          return object.meta.Dataset_tag === name;
        }
      });

      filter?.forEach((object: HostObject) => {
        if (object.isHidden) {
          object.show();
        } else {
          object.hide();
        }
      });
      // const filteredData = importedData?.filter((item: any) => item.id !== id);
      // setImportedData(filteredData);
    } else if (dataListType === "Routing Data") {
      // const filteredData = routingData?.filter((item: any) => item.id !== id);
      // setRoutingData(filteredData);
    }
  };

  const handleDelete = (name: string, dataListType: string) => {
    if (dataListType === "Imported Data") {
      ObjectManager.deleteHostObjectsByDatasetTag(name);

      console.log(ReduxStore.getState().BIMSlice);
    } else if (dataListType === "Routing Data") {
      // const filteredData = routingData?.filter((item: any) => item.id !== id);
      // setRoutingData(filteredData);
    }
  };

  return (
    <>
      <DataManageTable
        title="Imported Data"
        data={dataSet}
        onDeleteClick={handleDelete}
        onVisibleClick={handleVisible}
      />
      <RoutingDataTable title="Routing Data" data={["test", "test"]} />
    </>
  );
};

export default Layer;
