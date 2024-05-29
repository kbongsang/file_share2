import { createSlice } from "@reduxjs/toolkit";

interface LoadingState {
  isLoading : boolean;
}

const initialState: LoadingState = {
  isLoading : false
};

const LoadingSlice = createSlice({
  name: "loading-slice",
  initialState,
  reducers: {
    APP_SET_ISLOADING(state, action) {
      state.isLoading = action.payload;
    },
  },
});

export const { APP_SET_ISLOADING } = LoadingSlice.actions;
export default LoadingSlice.reducer;
