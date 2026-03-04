import { createContext, useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { routes } from '../../routes/routes';
import type { RouteConfig } from '../../routes/routes';

export const DRAWER_WIDTH      = 240;
export const MINI_DRAWER_WIDTH = 56;

// Context propagates open state + close callback to all nav items / DrawerContent
interface DrawerCtx { open: boolean; onClose: () => void; }
const OpenCtx = createContext<DrawerCtx>({ open: false, onClose: () => {} });

// ── Leaf nav item ─────────────────────────────────────────────────────────────
function NavItem({ route, indent = false }: { route: RouteConfig; indent?: boolean }) {
  const { open } = useContext(OpenCtx);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <Tooltip title={!open ? route.label : ''} placement="right" disableInteractive>
      <ListItemButton
        selected={pathname === route.path}
        onClick={() => navigate(route.path!)}
        sx={{
          minHeight: 48,
          justifyContent: open ? 'flex-start' : 'center',
          pl: open && indent ? 4 : 2,
          pr: 2,
        }}
      >
        <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 0, justifyContent: 'center' }}>
          {route.icon}
        </ListItemIcon>
        {open && (
          <ListItemText
            primary={route.label}
            slotProps={{ primary: { variant: indent ? 'body2' : 'body1' } }}
          />
        )}
      </ListItemButton>
    </Tooltip>
  );
}

// ── Collapsible group ─────────────────────────────────────────────────────────
function NavGroup({ route }: { route: RouteConfig }) {
  const { open } = useContext(OpenCtx);
  const { pathname } = useLocation();
  const childPaths    = route.children?.map((c) => c.path) ?? [];
  const isChildActive = childPaths.includes(pathname);

  // localOpen tracks manual toggle; isChildActive auto-expands without needing an effect
  const [localOpen, setLocalOpen] = useState(false);
  const groupOpen = isChildActive || localOpen;

  return (
    <>
      <Tooltip title={!open ? route.label : ''} placement="right" disableInteractive>
        <ListItemButton
          onClick={() => open && setLocalOpen((prev) => !prev)}
          selected={isChildActive}
          sx={{ minHeight: 48, justifyContent: open ? 'flex-start' : 'center', pl: 2, pr: 2 }}
        >
          <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 0, justifyContent: 'center' }}>
            {route.icon}
          </ListItemIcon>
          {open && (
            <>
              <ListItemText primary={route.label} />
              {groupOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </>
          )}
        </ListItemButton>
      </Tooltip>

      <Collapse in={open && groupOpen} timeout="auto" unmountOnExit>
        <List disablePadding>
          {route.children
            ?.filter((c) => c.showInNav)
            .map((child) => <NavItem key={child.path} route={child} indent />)}
        </List>
      </Collapse>
    </>
  );
}

// ── Drawer content ────────────────────────────────────────────────────────────
function DrawerContent() {
  const { open, onClose } = useContext(OpenCtx);
  const navRoutes = routes.filter((r) => r.showInNav);

  return (
    <div>
      <Toolbar sx={{ justifyContent: open ? 'space-between' : 'center', px: open ? 2 : 0 }}>
        {open && (
          <Typography variant="h6" fontWeight={700} color="primary" noWrap>
            AdminPanel
          </Typography>
        )}
        {open && (
          <Tooltip title="Close" placement="right" disableInteractive>
            <IconButton onClick={onClose} size="small">
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
      <Divider />
      <List>
        {navRoutes.map((route) =>
          route.children ? (
            <NavGroup key={route.path} route={route} />
          ) : (
            <NavItem key={route.path} route={route} />
          )
        )}
      </List>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
interface SidebarProps {
  open:    boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const ctx = { open, onClose };

  return (
    <Box component="nav" sx={{ width: { sm: MINI_DRAWER_WIDTH }, flexShrink: 0 }}>

      {/* Mobile: full-width temporary overlay */}
      <OpenCtx.Provider value={{ open: true, onClose }}>
        <Drawer
          variant="temporary"
          anchor="left"
          open={open}
          onClose={onClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          <DrawerContent />
        </Drawer>
      </OpenCtx.Provider>

      {/* Desktop: mini permanent drawer — expands as overlay, content never shifts */}
      <OpenCtx.Provider value={ctx}>
        <Drawer
          variant="permanent"
          open
          sx={(theme) => ({
            display: { xs: 'none', sm: 'block' },
            width: MINI_DRAWER_WIDTH,   // layout space never changes
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: open ? DRAWER_WIDTH : MINI_DRAWER_WIDTH,
              overflowX: 'hidden',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: open
                  ? theme.transitions.duration.enteringScreen
                  : theme.transitions.duration.leavingScreen,
              }),
            },
          })}
        >
          <DrawerContent />
        </Drawer>
      </OpenCtx.Provider>

    </Box>
  );
}
