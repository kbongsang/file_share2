import * as THREE from "three";
import { createSlice } from "@reduxjs/toolkit";
interface BoundBoxState {
  origin: THREE.Vector3;
  scale: THREE.Vector3;
  boundBox: THREE.Object3D;
  isCreated: boolean;
}

const initialState: BoundBoxState = {
  origin: new THREE.Vector3(0, 0, 0),
  scale: new THREE.Vector3(0, 0, 0),
  boundBox: new THREE.Object3D(),
  isCreated: false,
};

const BoundBoxSlice = createSlice({
  name: "boundBox-slice",
  initialState,
  reducers: {
    BOUNDBOX_SET_ORIGIN(state, action) {
      state.origin = action.payload;
    },
    BOUNDBOX_SET_SCALE(state, action) {
      state.scale = action.payload;
    },
    BOUNDBOX_SET_BOX(state, action) {
      state.boundBox = action.payload;
    },
    BOUNDBOX_SET_CREATED(state) {
      state.isCreated = true;
    },
    BOUNDBOX_SET_DELETED(state) {
      state.isCreated = false;
    },
  },
});

export const {
  BOUNDBOX_SET_ORIGIN,
  BOUNDBOX_SET_SCALE,
  BOUNDBOX_SET_BOX,
  BOUNDBOX_SET_CREATED,
  BOUNDBOX_SET_DELETED,
} = BoundBoxSlice.actions;
export default BoundBoxSlice.reducer;
