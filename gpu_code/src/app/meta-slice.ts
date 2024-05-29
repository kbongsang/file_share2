import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface MetaData {
  Category: string;
  Family: string;
  Type: string;
  SystemType: string;
  SystemName: string;
  PipeSegment: string;
  Size: string;
  Diameter: string;
  ReferenceLevel: string;
}

const initialState: MetaData = {
  Category: "Pipes",
  Family: "Pipe Types",
  Type: "기본값",
  SystemType: "순환수 공급",
  SystemName: "순환수 공급 1000",
  PipeSegment: "탄소강 - 일람표 40",
  Size: "150mm",
  Diameter: "150mm",
  ReferenceLevel: "1F"
};

const MetaData = createSlice({
  name: "meta",
  initialState: initialState,
  reducers: {
    setCategoryData(state, action: PayloadAction<string>) {
        console.log('payload', action.payload)
      state.Category = action.payload;
    },
    setFamilyData(state, action: PayloadAction<string>) {
      state.Family = action.payload;
    },
    setTypeData(state, action: PayloadAction<string>) {
      state.Type = action.payload;
    },
    setSystemTypeData(state, action: PayloadAction<string>) {
      state.SystemType = action.payload;
    },
    setSystemNameData(state, action: PayloadAction<string>) {
      state.SystemName = action.payload;
    },
    setPipeSegmentData(state, action: PayloadAction<string>) {
      state.PipeSegment = action.payload;
    },
    setSizeData(state, action: PayloadAction<string>) {
      state.Size = action.payload;
    },
    setDiameterData(state, action: PayloadAction<string>) {
      state.Diameter = action.payload;
    },
    setReferenceLevelData(state, action: PayloadAction<string>) {
      state.ReferenceLevel = action.payload;
    }
  }
});

export const {
  setCategoryData,
  setFamilyData,
  setTypeData,
  setSystemTypeData,
  setSystemNameData,
  setPipeSegmentData,
  setSizeData,
  setDiameterData,
  setReferenceLevelData
} = MetaData.actions;
export default MetaData.reducer;