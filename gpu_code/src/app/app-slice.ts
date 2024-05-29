import { createSlice } from "@reduxjs/toolkit";

interface AppState {
  right: number;
  isMouseOnViewport: boolean;
}

const initialState: AppState = {
  right: 500,
  isMouseOnViewport: false,
};

const AppSlice = createSlice({
  name: "app-slice",
  initialState,
  reducers: {
    APP_SET_RIGHT(state, action) {
      state.right = action.payload;
    },
    APP_SET_MOUSE_ON_VIEWPORT(state, action) {
      state.isMouseOnViewport = action.payload;
    },
  },
});

export const { APP_SET_RIGHT, APP_SET_MOUSE_ON_VIEWPORT } = AppSlice.actions;
export default AppSlice.reducer;
