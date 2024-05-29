import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface MetaDataFitting {
  Category: string;
  Family: string;
  SystemType: string;
  SystemName: string;
  Level: string;
}

const initialState: MetaDataFitting = {
  Category: "Pipe Fittings",
  Family: "Elbow",
  SystemType: "순환수 공급",
  SystemName: "순환수 공급 1000",
  Level: "1F"
};

const MetaDataFitting = createSlice({
  name: "metafitting",
  initialState: initialState,
  reducers: {
    setFittingCategoryData(state, action: PayloadAction<string>) {
        console.log('payload', action.payload)
      state.Category = action.payload;
    },
    setFittingFamilyData(state, action: PayloadAction<string>) {
      state.Family = action.payload;
    },
    setFittingSystemTypeData(state, action: PayloadAction<string>) {
      state.SystemType = action.payload;
    },
    setFittingSystemNameData(state, action: PayloadAction<string>) {
      state.SystemName = action.payload;
    },
    setFittingReferenceLevelData(state, action: PayloadAction<string>) {
      state.Level = action.payload;
    }
  }
});

export const {
  setFittingCategoryData,
  setFittingFamilyData,
  setFittingSystemTypeData,
  setFittingSystemNameData,
  setFittingReferenceLevelData
} = MetaDataFitting.actions;
export default MetaDataFitting.reducer;