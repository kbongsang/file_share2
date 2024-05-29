import React from "react";
import "./App.css";
import { ReduxRootState, ReduxStore } from "./app/redux-store";
import { useDispatch, useSelector } from "react-redux";
import { BIMOptions, SELECT_OBJECT } from "./app/bim-slice";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api";
import { ObjectManager } from "./core/util/ObjectManager";
import { RightSideTab } from "./components/RightSideTab";
import { Resizer } from "./components/Resizer";
import { APP_SET_MOUSE_ON_VIEWPORT, APP_SET_RIGHT } from "./app/app-slice";
import { TopToolbar } from "./components/TopToolbar";

import { APP_SET_ISLOADING } from "./app/loading-slice";
import Loading from "./components/Loading";
import { gEManager } from "./core/api/hookup-routing/functions";

function App() {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const centerContainerRef = React.useRef<HTMLDivElement>(null);
  const ws = React.useRef<WebSocket | null>(null);

  const [hasViewport, setHasViewport] = React.useState(false);
  const [statusBarHeight] = React.useState(
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--status-bar-height"
      )
    )
  );
  const [topToolbarHeight] = React.useState(
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--top-toolbar-height"
      )
    )
  );

  const app = useSelector((state: ReduxRootState) => state.AppSlice);
  const [rawBimData] = React.useState<any[]>([]);
  const [rawBimOptions] = React.useState<BIMOptions[]>([]);

  const dispatch = useDispatch();

  const test_react = () => {
    console.log("Test React");
  };
  listen("test", test_react);

  // const exportUSDZ = async () => {
  //   const exporter = new USDZExporter();
  //   const arrayBuffer = await exporter.parse(viewModel.scene);
  //   const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });
  //   const link = document.getElementById("link") as HTMLAnchorElement;
  //   link.href = URL.createObjectURL(blob);
  //   link.click();
  // };

  // const handleClick = async () => {
  //   // const path: Vec3[] = [
  //   //   new Vec3(0, 0, 0),
  //   //   new Vec3(0, 0, 1000),
  //   //   new Vec3(1500, 0, 1000),
  //   //   new Vec3(3000, 500, 0),
  //   //   new Vec3(0, 500, -500),
  //   //   new Vec3(1500, 2000, 0),
  //   //   new Vec3(0, 2000, 0),
  //   //   new Vec3(0, 2000, 2000),
  //   //   new Vec3(-1000, 2000, 2000),
  //   // ];
  //   // const result = DrawingManager.DrawPipes(path, 300, 100);
  //   // hostObjects.push(...result[0], ...result[1]);
  //   // TODO: Clean up this if you want to run another test.
  //   // await exportUSDZ(); // Export to USDZ test.
  // };
  const requestPermission = () => {
    Notification.requestPermission().then((result) => {
      if (result === "granted") {
        console.log("Permission granted");
      } else {
        console.log("Permission denied");
      }
    });
  };

  // const exportUSDZ = async () => {
  //   const exporter = new USDZExporter();
  //   const arrayBuffer = await exporter.parse(viewModel.scene);
  //   const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });
  //   const link = document.getElementById("link") as HTMLAnchorElement;
  //   link.href = URL.createObjectURL(blob);
  //   link.click();
  // };

  // const handleClick = async () => {
  //   // const path: Vec3[] = [
  //   //   new Vec3(0, 0, 0),
  //   //   new Vec3(0, 0, 1000),
  //   //   new Vec3(1500, 0, 1000),
  //   //   new Vec3(3000, 500, 0),
  //   //   new Vec3(0, 500, -500),
  //   //   new Vec3(1500, 2000, 0),
  //   //   new Vec3(0, 2000, 0),
  //   //   new Vec3(0, 2000, 2000),
  //   //   new Vec3(-1000, 2000, 2000),
  //   // ];
  //   // const result = DrawingManager.DrawPipes(path, 300, 100);
  //   // hostObjects.push(...result[0], ...result[1]);
  //   // TODO: Clean up this if you want to run another test.
  //   // await exportUSDZ(); // Export to USDZ test.
  // };
  React.useEffect(() => {
    let startTime = 0;
    let endTime = 0;

    requestPermission();

    if (!hasViewport) {
      loadViewModel();
      animate();
      setHasViewport(true);
      invoke("start_server");
    }

    ws.current = new WebSocket(`ws://127.0.0.1:3001`);
    ws.current.onopen = () => {
      console.log("WebSocket connection opened");
    };
    ws.current.onmessage = async (event) => {
      // 시작 시점 측정
      if (event.data === "1") {
        startTime = performance.now();
        console.log("Processing started");
        new Notification("Processing started", {
          body: "Processing started",
          data: "start flag",
          tag: "processing start flag",
        });
        dispatch(APP_SET_ISLOADING(true));
      } else if (event.data === "2") {
        dispatch(APP_SET_ISLOADING(false));
        await ObjectManager.registerHostObjects(rawBimData, rawBimOptions[0]);

        new Notification("Processing finished", {
          body: "Processing finished",
          data: "end flag",
          tag: "processing end flag",
        });

        rawBimData.splice(0, rawBimData.length);
        rawBimOptions.splice(0, rawBimOptions.length);

        endTime = performance.now();
        const processingTime = endTime - startTime;
        const minutes = Math.floor(processingTime / 60000);
        const seconds = ((processingTime % 60000) / 1000).toFixed(3);

        console.log(`Processing time: ${minutes} minutes ${seconds} seconds`);
      } else if (event.data.includes("Built-in_Category")) {
        // const data: Dataset = JSON.parse(event.data);
        // dispatch(setDataset(data));
      } else {
        try {
          const obj = JSON.parse(event.data);
          if (obj.Id === null) {
            console.log(obj);
            rawBimOptions.push(obj);
            return;
          } else {
            // console.log(obj);
            rawBimData.push(obj);
          }
        } catch (ex) {
          console.log("Error", ex);
          alert("Error: " + ex);
        }
      }
    };
    ws.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    // Prevent F5, Ctrl+R, Cmd+R
    const preventKeyDownRefresh = (event: KeyboardEvent) => {
      if (
        event.key === "F5" ||
        (event.ctrlKey && event.key === "r") ||
        (event.metaKey && event.key === "r")
      ) {
        event.preventDefault();
      }
    };

    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    // Add resize event.
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mousedown", onMouseDown);

    // Gizmo Event
    ReduxStore.getState().RenderReducer.viewModel.gizmo?.transformControls.addEventListener(
      "dragging-changed",
      () => {
        gEManager.UpdateNodeLocation();
        console.log("Gizmo Moved");
      }
    );

    if (process.env.NODE_ENV !== "development") {
      document.addEventListener("keydown", preventKeyDownRefresh);
      document.addEventListener("contextmenu", preventContextMenu);
    }
    return () => {
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mousedown", onMouseDown);

      if (process.env.NODE_ENV !== "development") {
        document.removeEventListener("keydown", preventKeyDownRefresh);
        document.removeEventListener("contextmenu", preventContextMenu);
      }
      ObjectManager.clearHostObjects();
      ws.current?.close();
      console.log("DISCONNECTED");
    };
  }, []);

  const loadViewModel = () => {
    const container = viewportRef.current;
    if (container === null) {
      console.error("there is no reference for the viewport!");
      return;
    }

    ReduxStore.getState().RenderReducer.viewModel.setRenderer(
      container.clientWidth,
      container.clientHeight
    );
    container.appendChild(
      ReduxStore.getState().RenderReducer.viewModel.renderer.domElement
    );
    ReduxStore.getState().RenderReducer.viewModel.setPerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      1,
      5000,
      { x: 30, y: 30, z: 100 }
    );
    ReduxStore.getState().RenderReducer.viewModel.setGizmo();
    ReduxStore.getState().RenderReducer.viewModel.setSky();
    ReduxStore.getState().RenderReducer.viewModel.setControls();

    ReduxStore.getState().RenderReducer.viewModel.setGizmo();
    container.appendChild(
      ReduxStore.getState().RenderReducer.viewModel.renderer.domElement
    );
  };

  const onWindowResize = () => {
    const viewportDiv = viewportRef.current;
    if (viewportDiv === null) {
      console.error("there is no reference for the viewport!");
      return;
    }

    const centerContainerDiv = centerContainerRef.current;
    if (centerContainerDiv === null) {
      console.error("there is no reference for the center container!");
      return;
    }
    let resizerRight = ReduxStore.getState().AppSlice.right;

    if (resizerRight > window.innerWidth) {
      dispatch(APP_SET_RIGHT(window.innerWidth - 4));
      resizerRight = window.innerWidth - 4;
    }

    const width = window.innerWidth - resizerRight;
    const height = window.innerHeight - statusBarHeight - topToolbarHeight;

    ReduxStore.getState().RenderReducer.viewModel.setSize(width, height);
    viewportDiv.setAttribute("style", `width: ${width}px; min-width: 4px`);
    centerContainerDiv.setAttribute("style", `height: ${height}px`);

    ReduxStore.getState().RenderReducer.viewModel.render();
  };

  const onPointerMove = (event: MouseEvent) => {
    if (viewportRef.current) {
      const clientX =
        event.clientX - viewportRef.current.getBoundingClientRect().left;
      const clientY =
        event.clientY - viewportRef.current.getBoundingClientRect().top;

      const width = viewportRef.current.offsetWidth;
      const height = viewportRef.current.offsetHeight;

      if (clientX < 0 || clientX > width || clientY < 0 || clientY > height) {
        dispatch(APP_SET_MOUSE_ON_VIEWPORT(false));
      } else {
        dispatch(APP_SET_MOUSE_ON_VIEWPORT(true));
      }

      ReduxStore.getState().RenderReducer.viewModel.setPointer(
        clientX,
        clientY,
        width,
        height
      );
    }
  };
  const onMouseDown = () => {
    if (ReduxStore.getState().BoundBoxSlice.isCreated) {
      return;
    }

    if (ReduxStore.getState().AppSlice.isMouseOnViewport) {
      let isIntersected = false;

      if (ReduxStore.getState().BIMSlice.selected !== null) {
        ReduxStore.getState().BIMSlice.selected!.renderObjects.forEach(
          (renderObj) => {
            renderObj.onDeSelect();
          }
        );
      }

      // console.log(ReduxStore.getState().BIMSlice.hostObjects);
      if (ReduxStore.getState().BIMSlice.hostObjects.length === 0) return;

      ReduxStore.getState().BIMSlice.hostObjects.forEach((obj) => {
        obj.renderObjects.forEach((renderObj) => {
          if (
            ReduxStore.getState().RenderReducer.viewModel.intersects[0] &&
            renderObj.object3d ===
              ReduxStore.getState().RenderReducer.viewModel.intersects[0].object
          ) {
            obj.renderObjects.forEach((renderObj) => {
              if (renderObj) renderObj.onSelect();
            });
            dispatch(SELECT_OBJECT(obj));
            isIntersected = true;
            return;
          }
        });
      });

      const mgobj =
        ReduxStore.getState().RenderReducer.viewModel.raycaster.intersectObjects(
          ReduxStore.getState().RenderReducer.viewModel.scene.children,
          true
        );

      mgobj.forEach((obj) => {
        {
          if (obj.object.type == "Points") {
            console.log(obj.object.type, " / obj: ", obj);

            //obj.onSelect();
            const gizmo = ReduxStore.getState().RenderReducer.viewModel.gizmo;
            const isOn = ReduxStore.getState().gizmoSlice.isOn;
            if (gizmo !== undefined) {
              if (isOn) {
                gizmo.transformControls.attach(obj.object);
                console.log(gizmo.transformControls.getWorldPosition);

                ReduxStore.getState().RenderReducer.viewModel.scene.add(
                  gizmo.transformControls
                );
              } else if (!isOn) {
                gizmo.transformControls.detach();
              }
            }
          }
        }
      });

      if (!isIntersected) {
        dispatch(SELECT_OBJECT(null));
      }
    }
  };

  const onResizerMove = (right: number) => {
    const viewportDiv = viewportRef.current;
    if (viewportDiv === null) {
      console.error("there is no reference for the viewport!");
      return;
    }
    if (right > window.innerWidth) {
      right = window.innerWidth;
    }
    const width = window.innerWidth - right;
    const height = window.innerHeight - statusBarHeight - topToolbarHeight;
    viewportDiv.setAttribute("style", `width: ${width}px; min-width: 4px`);
    ReduxStore.getState().RenderReducer.viewModel.setSize(width, height);
    dispatch(APP_SET_RIGHT(right));
  };

  const animate = () => {
    requestAnimationFrame(animate);
    ReduxStore.getState().RenderReducer.viewModel.render();
  };

  return (
    <>
      <div className="container">
        <TopToolbar />
        <div className="center-container" ref={centerContainerRef}>
          <div className="viewport" ref={viewportRef} />
          <Resizer onMove={onResizerMove} />
          <RightSideTab width={app.right} />
        </div>
        <div className="statusbar"></div>
        <a
          id="link"
          style={{ display: "none" }}
          rel="ar"
          href=""
          download="asset.usdz"
        />
      </div>
      <Loading />
    </>
  );
}

export default App;
