import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import RegisterPage from "../pages/RegisterPage";
import LoginPage from "../pages/LoginPage";
import HistoryPage from "../pages/HistoryPage";
import App from "../App";
import LandingPage from "../pages/LandingPage";
import Dashboard from "../pages/Dashboard";
import UploadPage from "../pages/UploadPage";
import ComparePage from "../pages/ComparePage";
import ResearchPage from "../pages/ResearchPage";
import RootLayout from "../components/layouts/RootLayout";

const routes = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      // Public
      { index: true, element: <LandingPage /> },
      { path: "login",    element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },

      // Protected
      {
        element: (
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        ),
        children: [
          { path: "dashboard", element: <Dashboard />    },
          { path: "upload",    element: <UploadPage />   },
          { path: "compare",   element: <ComparePage />  },
          { path: "research",  element: <ResearchPage /> },
          { path: "history",   element: <HistoryPage />  },
        ],
      },

      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
];

export default routes;
