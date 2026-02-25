import type { ComponentType, ReactNode } from 'react';
import Landing from '../pages/Landing';
import SignIn from '../pages/SignIn';
import Dashboard from '../pages/Dashboard';
import UserAccount from '../pages/users/UserAccount';
import TypographyPage from '../pages/Typography';
import Charts from '../pages/charts/Charts';
import RidgelineChart from '../pages/charts/RidgelineChart';
import UsersPage from '../pages/users/Users';
import FileManager from '../pages/files/FileManager';
import HistoryMap from '../pages/maps/HistoryMap';
import GeoJsonMap from '../pages/maps/GeoJsonMap';
import CustomMap from '../pages/maps/CustomMap';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import BarChartIcon from '@mui/icons-material/BarChart';
import DonutSmallIcon from '@mui/icons-material/DonutSmall';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import MapIcon from '@mui/icons-material/Map';
import TimelineIcon from '@mui/icons-material/Timeline';
import PublicIcon from '@mui/icons-material/Public';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import FolderIcon from '@mui/icons-material/Folder';

export interface RouteConfig {
  path: string;
  element?: ComponentType;   // undefined for group-only nodes
  icon?: ReactNode;
  protected: boolean;
  label?: string;
  showInNav?: boolean;
  children?: RouteConfig[];
}

export const routes: RouteConfig[] = [
  { path: '/',           element: Landing,       protected: false },
  { path: '/signin',     element: SignIn,         protected: false },
  { path: '/dashboard',  element: Dashboard,      protected: true, icon: <DashboardIcon />,  label: 'Dashboard',    showInNav: true  },
  { path: '/account',    element: UserAccount,    protected: true, icon: <PersonIcon />,      label: 'User Account', showInNav: false },
  { path: '/typography', element: TypographyPage, protected: true, icon: <TextFieldsIcon />, label: 'Typography',   showInNav: true  },
  {
    path: '/charts',
    protected: true,
    icon: <BarChartIcon />,
    label: 'Charts',
    showInNav: true,
    children: [
      { path: '/charts/barchart',  element: Charts,         protected: true, icon: <DonutSmallIcon />, label: 'Bar & Donut', showInNav: true },
      { path: '/charts/ridgeline', element: RidgelineChart, protected: true, icon: <ShowChartIcon />,  label: 'Ridgeline',   showInNav: true },
    ],
  },
  { path: '/users', element: UsersPage,   protected: true, icon: <SupervisorAccountIcon />, label: 'Users', showInNav: true },
  { path: '/files', element: FileManager, protected: true, icon: <FolderIcon />,            label: 'Files', showInNav: true },
  {
    path: '/maps',
    protected: true,
    icon: <MapIcon />,
    label: 'Maps',
    showInNav: true,
    children: [
      { path: '/maps/history', element: HistoryMap, protected: true, icon: <TimelineIcon />,        label: 'History Map', showInNav: true },
      { path: '/maps/geojson', element: GeoJsonMap, protected: true, icon: <PublicIcon />,           label: 'GeoJSON Map', showInNav: true },
      { path: '/maps/custom',  element: CustomMap,  protected: true, icon: <EditLocationAltIcon />, label: 'Custom Map',  showInNav: true },
    ],
  },
];

/** Flatten tree into routable leaf nodes (only nodes with an element). */
export function flattenRoutes(
  list: RouteConfig[]
): (RouteConfig & { element: ComponentType })[] {
  return list.flatMap((r) => {
    const self = r.element ? [r as RouteConfig & { element: ComponentType }] : [];
    const nested = r.children ? flattenRoutes(r.children) : [];
    return [...self, ...nested];
  });
}
