import { createSlice } from "@reduxjs/toolkit";

interface AppState {
  isOn: boolean
}

const initialState: AppState = {
  isOn : false
};

const gizmoSlice = createSlice({
  name: "gizmo-slice",
  initialState,
  reducers: {
    GIZMO_ON(state, action) {
      state.isOn = action.payload;
    },
  },
});

export const { GIZMO_ON } = gizmoSlice.actions;
export default gizmoSlice.reducer;
