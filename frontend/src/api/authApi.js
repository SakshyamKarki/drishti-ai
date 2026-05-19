import api from "./axiosInstance";

export const loginApi    = (creds)    => api.post("/login/",    creds);
export const registerApi = (userData) => api.post("/register/", userData);
export const logoutApi   = ()         => api.post("/refresh/",  { refresh: localStorage.getItem("refresh") }).catch(() => {});
export const getMeApi    = ()         => api.get("/me/");
