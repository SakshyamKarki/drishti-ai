import { api } from "./axiosInstance";

// Single-model detection (DenseNet121 best model)
export const uploadDetectionImage = (file) => {
  const formData = new FormData();
  formData.append("image", file);
  return api.post("/detection/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
};

// Multi-model comparison — all 5 models
export const uploadForComparison = (file) => {
  const formData = new FormData();
  formData.append("image", file);
  return api.post("/compare/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 180000,
  });
};

// Single specific model
export const uploadSingleModel = (file, modelName) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("model_name", modelName);
  return api.post("/compare/single/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });
};

// History
export const getDetectionHistory = (limit = 50) =>
  api.get(`/detection/?limit=${limit}`);

export const getDetectionStats = () => api.get("/detection/stats/");

// Research data
export const getResearchData = () => api.get("/research/");

export const getBenchmarkData = () => api.get("/benchmark/");
