import { createSlice } from "@reduxjs/toolkit";
import { ViewModel } from "../core/view-model";
import * as THREE from "three";

interface RenderState {
  scene: THREE.Scene;
  viewModel: ViewModel;
}

const RenderSlice = createSlice({
  name: "bim-slice",
  initialState: () => {
    let scene = new THREE.Scene();
    let viewModel = new ViewModel(scene);

    return { scene: scene, viewModel: viewModel } as RenderState;
  },
  reducers: {},
});

export const {} = RenderSlice.actions;
export default RenderSlice.reducer;
