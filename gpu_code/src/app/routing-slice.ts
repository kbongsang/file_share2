import { createSlice } from "@reduxjs/toolkit";
import { HostObject } from "../core/BIM/HostObject";
import { Vector3 } from "three/src/math/Vector3.js";

export interface RouteData {
  id: string;
  name: string;
  from: string;
  to: string;
  diameter: number;
  route: Vector3[];
}

export interface RouteResult {
  name: string;
  routeResult: RouteData[];
}

export interface Connector {
  id: string;
  name: string;
  diameter: number;
  origin: Vector3;
}

interface RoutingState {
  name: string | null;
  selectedEquipment: HostObject | null;
  routeResults: RouteResult[];
  targetFromConnectors: Connector[];
  targetToConnectors: Connector[];
  routedFromConnectors: Connector[];
  routedToConnectors: Connector[];
}

const initialState: RoutingState = {
  name: null,
  selectedEquipment: null,
  routeResults: [],
  targetFromConnectors: [],
  targetToConnectors: [],
  routedFromConnectors: [],
  routedToConnectors: [],
};

const routingSlice = createSlice({
  name: "routing-slice",
  initialState: initialState,
  reducers: {
    SET_NAME(state, action) {
      state.name = action.payload;
    },
    SET_SELECTED_EQUIPMENT(state, action) {
      state.selectedEquipment = action.payload;
    },
    ADD_ROUTE_RESULT(state, action) {
      console.log(action.payload);
      state.routeResults.push(action.payload);
    },
    ADD_TARGET_PAIR(state, action) {
      const targetFromConnector = action.payload.targetFromConnector;
      const targetToConnector = action.payload.targetToConnector;

      const isDuplicate = state.targetFromConnectors.some(
        (existFromConnector) =>
          existFromConnector.id === targetFromConnector.id &&
          existFromConnector.name === targetFromConnector.name
      );

      if (isDuplicate) return console.log("This connector pair already exist!");

      state.targetFromConnectors.push(targetFromConnector);
      state.targetToConnectors.push(targetToConnector);
    },
    ADD_TARGET_TO_ROUTED(state) {
      state.routedFromConnectors = state.targetFromConnectors;
      state.routedToConnectors = state.targetToConnectors;
    },
    DELETE_RESULT_BY_NAME(state, action) {
      for (const [i, routeResult] of state.routeResults.entries()) {
        if (routeResult.name === action.payload) {
          state.routeResults.splice(i, 1);
          return;
        }
      }
    },
  },
});

export const {
  SET_NAME,
  SET_SELECTED_EQUIPMENT,
  ADD_ROUTE_RESULT,
  ADD_TARGET_PAIR,
  ADD_TARGET_TO_ROUTED,
  DELETE_RESULT_BY_NAME,
} = routingSlice.actions;
export default routingSlice.reducer;
