import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Outlet } from "react-router-dom";
import { TokenService } from "../../api/axiosInstance";
import { restoreSessionThunk } from "../../features/auth/authSlice";

function RootLayout() {
  const dispatch = useDispatch();
  useEffect(() => {
    const token = TokenService.getAccessToken();
    if (token && !TokenService.isTokenExpired(token)) {
      dispatch(restoreSessionThunk());
    }
  }, []);
  return <Outlet />;
}

export default RootLayout;
