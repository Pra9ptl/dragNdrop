import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const selectionSlice = createSlice({
  name: 'selection',
  initialState: { selectedId: null as string | null },
  reducers: {
    selectNode: (state, action: PayloadAction<string | null>) => {
      state.selectedId = action.payload;
    }
  }
});

export const { selectNode } = selectionSlice.actions;
