import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme } from './theme/muiTheme';
import { routes, flattenRoutes } from './routes/routes';
import MainLayout from './components/layout/MainLayout';
import type { RootState, AppDispatch } from './app/store';
import { fetchCurrentUser } from './features/auth/authSlice';

function ProtectedRoute() {
  const token = useSelector((state: RootState) => state.auth.token);
  return token ? <Outlet /> : <Navigate to="/signin" replace />;
}

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { mode } = useSelector((state: RootState) => state.theme);
  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  useEffect(() => {
    if (token) dispatch(fetchCurrentUser());
  }, [token, dispatch]);

  const muiTheme = mode === 'dark' ? darkTheme : lightTheme;

  // Flatten the nested tree to get all routable nodes
  const flat = flattenRoutes(routes);
  const publicRoutes    = flat.filter((r) => !r.protected);
  const protectedRoutes = flat.filter((r) => r.protected);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {publicRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={<route.element />} />
          ))}

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              {protectedRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={<route.element />} />
              ))}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
