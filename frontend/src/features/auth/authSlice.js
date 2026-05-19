import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { TokenService } from "../../api/axiosInstance";
import { getMeApi, loginApi, logoutApi, registerApi } from "../../api/authApi";

export const loginThunk = createAsyncThunk("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const res = await loginApi(credentials);
    TokenService.setTokens(res.data.access, res.data.refresh);
    const me = await getMeApi();
    return { ...res.data, user: me.data };
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "Login failed");
  }
});

export const registerThunk = createAsyncThunk("auth/register", async (userData, { rejectWithValue }) => {
  try {
    const res = await registerApi(userData);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "Registration failed");
  }
});

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  await logoutApi();
});

export const restoreSessionThunk = createAsyncThunk("auth/restore", async (_, { rejectWithValue }) => {
  try {
    const res = await getMeApi();
    return { user: res.data };
  } catch (err) {
    return rejectWithValue("Session expired");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: { user: null, isAuthenticated: false, isLoading: false, error: null },
  reducers: { clearError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    // login
    builder
      .addCase(loginThunk.pending,   (s) => { s.isLoading = true;  s.error = null; })
      .addCase(loginThunk.fulfilled, (s, a) => { s.isLoading = false; s.isAuthenticated = true; s.user = a.payload.user; })
      .addCase(loginThunk.rejected,  (s, a) => { s.isLoading = false; s.isAuthenticated = false; s.error = a.payload; });
    // register
    builder
      .addCase(registerThunk.pending,   (s) => { s.isLoading = true;  s.error = null; })
      .addCase(registerThunk.fulfilled, (s) => { s.isLoading = false; })
      .addCase(registerThunk.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; });
    // logout
    builder
      .addCase(logoutThunk.pending,   (s) => { s.isLoading = true; })
      .addCase(logoutThunk.fulfilled, (s) => { s.isLoading = false; s.user = null; s.isAuthenticated = false; TokenService.removeTokens(); })
      .addCase(logoutThunk.rejected,  (s) => { s.isLoading = false; s.user = null; s.isAuthenticated = false; TokenService.removeTokens(); });
    // restore
    builder
      .addCase(restoreSessionThunk.pending,   (s) => { s.isLoading = true; })
      .addCase(restoreSessionThunk.fulfilled, (s, a) => { s.isLoading = false; s.user = a.payload.user; s.isAuthenticated = true; })
      .addCase(restoreSessionThunk.rejected,  (s) => { s.isLoading = false; TokenService.removeTokens(); });
  },
});

export const { clearError } = authSlice.actions;
export const selectUser            = (s) => s.auth.user;
export const selectIsAuthenticated = (s) => s.auth.isAuthenticated;
export const selectAuthLoading     = (s) => s.auth.isLoading;
export const selectAuthError       = (s) => s.auth.error;
export default authSlice.reducer;
