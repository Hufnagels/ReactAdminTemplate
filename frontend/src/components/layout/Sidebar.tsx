import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { routes } from '../../routes/routes';
import type { RouteConfig } from '../../routes/routes';

export const DRAWER_WIDTH = 240;

// ── Leaf nav item ─────────────────────────────────────────────────────────────
function NavItem({ route, indent = false }: { route: RouteConfig; indent?: boolean }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <ListItemButton
      selected={pathname === route.path}
      onClick={() => navigate(route.path!)}
      sx={{ pl: indent ? 4 : 2 }}
    >
      <ListItemIcon sx={{ minWidth: indent ? 36 : 40 }}>
        {route.icon}
      </ListItemIcon>
      <ListItemText
        primary={route.label}
        slotProps={{ primary: { variant: indent ? 'body2' : 'body1' } }}
      />
    </ListItemButton>
  );
}

// ── Collapsible group ─────────────────────────────────────────────────────────
function NavGroup({ route }: { route: RouteConfig }) {
  const { pathname } = useLocation();
  const childPaths = route.children?.map((c) => c.path) ?? [];
  const isChildActive = childPaths.includes(pathname);

  const [open, setOpen] = useState(isChildActive);

  // Auto-expand when navigating to a child (e.g. via direct URL)
  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  return (
    <>
      <ListItemButton
        onClick={() => setOpen((prev) => !prev)}
        selected={isChildActive}
        sx={{ pl: 2 }}
      >
        <ListItemIcon sx={{ minWidth: 40 }}>
          {route.icon}
        </ListItemIcon>
        <ListItemText primary={route.label} />
        {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </ListItemButton>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding>
          {route.children
            ?.filter((c) => c.showInNav)
            .map((child) => (
              <NavItem key={child.path} route={child} indent />
            ))}
        </List>
      </Collapse>
    </>
  );
}

// ── Drawer content ────────────────────────────────────────────────────────────
function DrawerContent() {
  const navRoutes = routes.filter((r) => r.showInNav);

  return (
    <div>
      <Toolbar>
        <Typography variant="h6" fontWeight={700} color="primary">
          AdminPanel
        </Typography>
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

// ── Sidebar (responsive drawer) ───────────────────────────────────────────────
interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        <DrawerContent />
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
        open
      >
        <DrawerContent />
      </Drawer>
    </Box>
  );
}
