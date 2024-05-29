import { configureStore } from "@reduxjs/toolkit";
import RenderReducer from "./render-slice";
import BIMSlice from "./bim-slice";
import AppSlice from "./app-slice";
import BoundBoxSlice from "./boundBox-slice";
import Meta from "./meta-slice";
import MetaFitting from "./metafitting-slice";
import routingSlice from "./routing-slice";
import loadingSlice from "./loading-slice";
import gizmoSlice from "./gizmo-slice"

export const ReduxStore = configureStore({
  reducer: {
    RenderReducer,
    BIMSlice,
    AppSlice,
    BoundBoxSlice,
    Meta,
    MetaFitting,
    routingSlice,
    loadingSlice,
    gizmoSlice
  },
  devTools: true,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export type ReduxRootState = ReturnType<typeof ReduxStore.getState>;
