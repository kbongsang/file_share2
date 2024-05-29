import { createSlice } from "@reduxjs/toolkit";
import { HostObject } from "../core/BIM/HostObject";

export interface BIMRawData {
  Id: string;
  data: any;
}

export interface BIMOptions {
  Id: string;
  data: {
    Dataset_tag: string;
    Duct_System_Types: string[];
    Element_data: {
      "Duct Fittings": {
        [key: string]: string[];
      };
      Ducts: {
        [key: string]: string[];
      };
      "Pipe Fittings": {
        [key: string]: string[];
      };
      Pipes: {
        "Pipe Types": string[];
      };
    };
    Levels: string[];
    Pipe_Segments: string[];
    Pipe_System_Types: string[];
  };
}

export interface ExportObject {
  name: string;
  hostObjects: HostObject[];
}

interface BIMState {
  rawData: BIMRawData[];
  hostObjects: HostObject[];
  exportObjects: HostObject[];
  pumpExportObjects: ExportObject[];
  dataSet: string[];
  bimOptions: BIMOptions[];
  selected: HostObject | null;
}

const initialState: BIMState = {
  rawData: [],
  hostObjects: [],
  exportObjects: [],
  pumpExportObjects: [],
  bimOptions: [],
  dataSet: [],

  selected: null,
};

const BIMSlice = createSlice({
  name: "bim-slice",
  initialState: initialState,
  reducers: {
    ADD_RAW_DATA(state, action) {
      state.rawData.push(action.payload);
    },

    CLEAR_RAW_DATA(state) {
      state.rawData.splice(0, state.rawData.length);
    },

    ADD_HOST_OBJECT(state, action) {
      state.hostObjects.push(action.payload);
    },

    DELETE_HOST_OBJECT(state, action) {
      state.hostObjects = state.hostObjects.filter(
        (hostObject) => hostObject !== action.payload
      );
    },

    CLEAR_HOST_OBJECTS(state) {
      state.hostObjects.splice(0, state.hostObjects.length);
    },

    ADD_EXPORT_OBJECT(state, action) {
      state.exportObjects.push(action.payload);
    },

    ADD_PUMP_EXPORT_OBJECT(state, action) {
      state.pumpExportObjects.push(action.payload);
    },

    CLEAR_EXPORT_OBJECTS(state) {
      state.exportObjects.splice(0, state.hostObjects.length);
    },

    SELECT_OBJECT(state, action) {
      state.selected = action.payload;
    },

    ADD_DATASET(state, action) {
      state.dataSet.push(action.payload);
    },

    DELETE_DATASET(state, action) {
      state.dataSet = state.dataSet.filter(
        (dataset) => dataset !== action.payload
      );
    },

    CLEAR_DATASET(state) {
      state.dataSet.splice(0, state.dataSet.length);
    },

    ADD_BIM_OPTIONS(state, action) {
      state.bimOptions.push(action.payload);
    },

    CLEAR_BIM_OPTIONS(state) {
      state.bimOptions.splice(0, state.bimOptions.length);
    },
  },
});

export const {
  CLEAR_RAW_DATA,
  ADD_RAW_DATA,
  CLEAR_HOST_OBJECTS,
  ADD_EXPORT_OBJECT,
  ADD_PUMP_EXPORT_OBJECT,
  CLEAR_EXPORT_OBJECTS,
  DELETE_HOST_OBJECT,
  ADD_HOST_OBJECT,
  SELECT_OBJECT,
  ADD_DATASET,
  ADD_BIM_OPTIONS,
  CLEAR_DATASET,
  DELETE_DATASET,
  CLEAR_BIM_OPTIONS,
} = BIMSlice.actions;
export default BIMSlice.reducer;
