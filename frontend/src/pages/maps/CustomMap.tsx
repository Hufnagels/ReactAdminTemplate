/*
 * pages/maps/CustomMap.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose : Map page with interactive drawing tools (Leaflet Geoman). Users
 *           can draw shapes, edit/delete them, save them to the backend, and
 *           manage preset locations — all with full CRUD.
 *
 * Relationships
 *   Dispatches : mapsSlice.{ fetchCustomMap, fetchShapes, addDrawnShape,
 *                removeDrawnShape, clearDrawnShapes, saveShapes, updateDrawnShape,
 *                updateSavedShape, deleteSavedShape, addPreset, updatePreset, deletePreset }
 *   Reads      : state.maps.{ customItems, customLoading, drawnShapes,
 *                savedShapes, shapesSaving }
 *   Libraries  : react-leaflet, @geoman-io/leaflet-geoman-free
 *
 * Architecture note
 *   DrawnShape (local state) holds Leaflet layer refs (not serialisable).
 *   StoredShape (Redux state) holds only plain coordinates.
 *   On save, drawn shapes are posted to the backend then cleared from both stores.
 *
 * Key components
 *   GeomanControls   – mounts Geoman draw toolbar; fires onShapeAdded / onShapeRemoved
 *   MapRefSetter     – exposes the Leaflet map instance via a ref for programmatic panning
 *   SavedShapeLayer  – renders a StoredShape as the correct react-leaflet component
 *   ShapeEditDialog  – MUI Dialog for editing Name, Type (presets only), Description
 *
 * Key types
 *   DrawnShape  – { id, type, name, description?, layer: L.Layer, coords: ShapeCoords }
 *   EditTarget  – discriminated union: 'drawn' | 'saved' | 'preset' | 'new-preset' | null
 *
 * Key constants
 *   PRESET_TYPE_COLOR – colour map for preset location type chips
 *   SAVED_OPTS        – Leaflet PathOptions for saved shape overlays (blue)
 */
import { useEffect, useRef, useState } from 'react';
import {
  MapContainer, TileLayer, useMap,
  CircleMarker, Tooltip,
  Marker, Circle, Rectangle, Polygon, Polyline,
} from 'react-leaflet';
import { useDispatch, useSelector } from 'react-redux';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';   // CSS is loaded globally in index.css
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import SaveIcon from '@mui/icons-material/Save';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import {
  fetchCustomMap,
  fetchShapes,
  addDrawnShape,
  removeDrawnShape,
  clearDrawnShapes,
  saveShapes,
  updateDrawnShape,
  updateSavedShape,
  deleteSavedShape,
  addPreset,
  updatePreset,
  deletePreset,
} from '../../features/maps/mapsSlice';
import type { StoredShape, CustomMapItem } from '../../features/maps/mapsSlice';
import type { RootState, AppDispatch } from '../../app/store';

// Fix Leaflet default marker icon path issue with Vite bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       new URL('leaflet/dist/images/marker-icon.png',    import.meta.url).href,
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png',  import.meta.url).href,
});

type ShapeCoords = Omit<StoredShape, 'id' | 'type' | 'name'>;

interface DrawnShape {
  id: number;
  type: string;
  name: string;
  description?: string;
  layer: L.Layer;
  coords: ShapeCoords;
}

let shapeCounter = 0;

function extractCoords(shape: string, layer: L.Layer): ShapeCoords {
  try {
    if (shape === 'Marker') {
      const ll = (layer as L.Marker).getLatLng();
      return { lat: ll.lat, lng: ll.lng };
    }
    if (shape === 'Circle') {
      const ll = (layer as L.Circle).getLatLng();
      return { lat: ll.lat, lng: ll.lng, radius: Math.round((layer as L.Circle).getRadius()) };
    }
    if (shape === 'Rectangle') {
      const b = (layer as L.Rectangle).getBounds();
      return {
        boundsNE: [b.getNorthEast().lat, b.getNorthEast().lng],
        boundsSW: [b.getSouthWest().lat, b.getSouthWest().lng],
      };
    }
    // Polygon / Line (Polyline)
    const raw = (layer as L.Polyline).getLatLngs();
    const flat: L.LatLng[] = Array.isArray(raw[0])
      ? (raw as L.LatLng[][]).flat()
      : (raw as L.LatLng[]);
    return { latlngs: flat.map((ll) => [ll.lat, ll.lng] as [number, number]) };
  } catch {
    return {};
  }
}

// ── Stores the map instance in a ref for access outside MapContainer ──────────
function MapRefSetter({ mapRef }: { mapRef: { current: L.Map | null } }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
}

// ── Geoman draw toolbar – uses refs so callbacks are never stale ──────────────
function GeomanControls({
  onShapeAdded,
  onShapeRemoved,
}: {
  onShapeAdded:   (shape: DrawnShape) => void;
  onShapeRemoved: (id: number) => void;
}) {
  const map = useMap();

  const addedRef   = useRef(onShapeAdded);
  const removedRef = useRef(onShapeRemoved);
  useEffect(() => { addedRef.current   = onShapeAdded;   });
  useEffect(() => { removedRef.current = onShapeRemoved; });

  useEffect(() => {
    (map as any).pm.addControls({
      position:         'topleft',
      drawMarker:       true,
      drawCircleMarker: false,
      drawPolyline:     true,
      drawRectangle:    true,
      drawPolygon:      true,
      drawCircle:       true,
      drawText:         false,
      editMode:         true,
      dragMode:         true,
      cutPolygon:       false,
      removalMode:      true,
    });

    const onCreated = (e: any) => {
      const layer = e.layer as L.Layer;
      const id    = ++shapeCounter;
      const type  = (e.shape as string) ?? 'Shape';
      (layer as any)._customId = id;
      const name  = `${type} #${id}`;
      addedRef.current({ id, type, name, layer, coords: extractCoords(type, layer) });
    };

    const onRemoved = (e: any) => {
      const id = (e.layer as any)._customId as number | undefined;
      if (id !== undefined) removedRef.current(id);
    };

    map.on('pm:create', onCreated);
    map.on('pm:remove', onRemoved);

    return () => {
      (map as any).pm.removeControls();
      map.off('pm:create', onCreated);
      map.off('pm:remove', onRemoved);
    };
  }, [map]);

  return null;
}

const SAVED_OPTS = { color: '#2563eb', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.3 };

function SavedShapeLayer({ shape }: { shape: StoredShape }) {
  if (shape.type === 'Marker' && shape.lat !== undefined)
    return <Marker position={[shape.lat, shape.lng!]} />;
  if (shape.type === 'Circle' && shape.lat !== undefined)
    return <Circle center={[shape.lat, shape.lng!]} radius={shape.radius ?? 1000} pathOptions={SAVED_OPTS} />;
  if (shape.type === 'Rectangle' && shape.boundsNE && shape.boundsSW)
    return <Rectangle bounds={[shape.boundsSW, shape.boundsNE]} pathOptions={SAVED_OPTS} />;
  if (shape.latlngs && shape.type === 'Polygon')
    return <Polygon positions={shape.latlngs} pathOptions={SAVED_OPTS} />;
  if (shape.latlngs)
    return <Polyline positions={shape.latlngs} pathOptions={SAVED_OPTS} />;
  return null;
}

const PRESET_TYPE_COLOR: Record<string, string> = {
  landmark: '#f97316',
  airport:  '#3b82f6',
  port:     '#8b5cf6',
  research: '#10b981',
};

// ── Edit dialog ───────────────────────────────────────────────────────────────
interface EditFormData {
  name: string;
  type: string;
  description: string;
}

type EditTarget =
  | { kind: 'drawn';      shape: DrawnShape }
  | { kind: 'saved';      shape: StoredShape }
  | { kind: 'preset';     item: CustomMapItem }
  | { kind: 'new-preset' }
  | null;

function toForm(target: Exclude<EditTarget, null>): EditFormData {
  if (target.kind === 'drawn')  return { name: target.shape.name, type: target.shape.type, description: target.shape.description ?? '' };
  if (target.kind === 'saved')  return { name: target.shape.name, type: target.shape.type, description: target.shape.description ?? '' };
  if (target.kind === 'preset') return { name: target.item.name,  type: target.item.type,  description: target.item.description };
  /* new-preset */              return { name: '',                 type: 'landmark',         description: '' };
}

function ShapeEditDialog({
  target,
  onClose,
  onSave,
}: {
  target: EditTarget;
  onClose: () => void;
  onSave: (data: EditFormData) => void;
}) {
  const [form, setForm] = useState<EditFormData>({ name: '', type: '', description: '' });

  useEffect(() => {
    if (target) setForm(toForm(target));
  }, [target]);

  const set = (field: keyof EditFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const typeEditable = target?.kind === 'preset' || target?.kind === 'new-preset';
  const title =
    target?.kind === 'new-preset' ? 'Add Preset Location' :
    target?.kind === 'preset'     ? 'Edit Preset Location' :
    target?.kind === 'saved'      ? 'Edit Saved Shape' :
    target?.kind === 'drawn'      ? 'Edit Drawn Shape' : '';

  return (
    <Dialog open={target !== null} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={form.name} onChange={set('name')} size="small" fullWidth />
          <TextField label="Type" value={form.type} onChange={set('type')} size="small" fullWidth disabled={!typeEditable} />
          <TextField label="Description" value={form.description} onChange={set('description')} size="small" fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(form)}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CustomMap() {
  const dispatch      = useDispatch<AppDispatch>();
  const customItems   = useSelector((s: RootState) => s.maps.customItems);
  const customLoading = useSelector((s: RootState) => s.maps.customLoading);
  const drawnShapes   = useSelector((s: RootState) => s.maps.drawnShapes);
  const savedShapes   = useSelector((s: RootState) => s.maps.savedShapes);
  const shapesSaving  = useSelector((s: RootState) => s.maps.shapesSaving);

  const [shapes, setShapes]                     = useState<DrawnShape[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [editTarget, setEditTarget]             = useState<EditTarget>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (customItems.length === 0) dispatch(fetchCustomMap());
  }, [dispatch, customItems.length]);

  useEffect(() => {
    dispatch(fetchShapes());
  }, [dispatch]);

  const handleShapeAdded = (shape: DrawnShape) => {
    setShapes((prev) => [...prev, shape]);
    dispatch(addDrawnShape({ id: shape.id, type: shape.type, name: shape.name, ...shape.coords }));
  };

  const handleShapeRemoved = (id: number) => {
    setShapes((prev) => prev.filter((s) => s.id !== id));
    dispatch(removeDrawnShape(id));
  };

  const removeShape = (shape: DrawnShape) => {
    (shape.layer as any).pm?.remove?.();
    if (mapRef.current?.hasLayer(shape.layer)) {
      mapRef.current.removeLayer(shape.layer);
    }
    setShapes((prev) => prev.filter((s) => s.id !== shape.id));
    dispatch(removeDrawnShape(shape.id));
  };

  const handlePresetClick = (id: number, lat: number, lng: number) => {
    setSelectedPresetId(id);
    mapRef.current?.setView([lat, lng], 12);
  };

  const zoomToStoredShape = (shape: typeof savedShapes[number]) => {
    if (!mapRef.current) return;
    if (shape.boundsNE && shape.boundsSW) {
      mapRef.current.fitBounds([shape.boundsSW, shape.boundsNE], { padding: [40, 40], maxZoom: 16 });
    } else if (shape.lat !== undefined && shape.lng !== undefined) {
      mapRef.current.setView([shape.lat, shape.lng], 14);
    } else if (shape.latlngs && shape.latlngs.length > 0) {
      mapRef.current.fitBounds(
        L.latLngBounds(shape.latlngs.map((ll) => L.latLng(ll[0], ll[1]))),
        { padding: [40, 40], maxZoom: 16 },
      );
    }
  };

  const zoomToShape = (shape: DrawnShape) => {
    if (!mapRef.current) return;
    const layer = shape.layer as any;
    if (typeof layer.getBounds === 'function') {
      mapRef.current.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 16 });
    } else if (typeof layer.getLatLng === 'function') {
      mapRef.current.setView(layer.getLatLng(), 14);
    }
  };

  const handleEditSave = (data: EditFormData) => {
    if (!editTarget) return;

    if (editTarget.kind === 'drawn') {
      dispatch(updateDrawnShape({ id: editTarget.shape.id, name: data.name, description: data.description }));
      setShapes((prev) =>
        prev.map((s) => s.id === editTarget.shape.id ? { ...s, name: data.name, description: data.description } : s)
      );
    }

    if (editTarget.kind === 'saved') {
      dispatch(updateSavedShape({ ...editTarget.shape, name: data.name, description: data.description }));
    }

    if (editTarget.kind === 'preset') {
      dispatch(updatePreset({ ...editTarget.item, name: data.name, type: data.type, description: data.description }));
    }

    if (editTarget.kind === 'new-preset') {
      dispatch(addPreset({ name: data.name, type: data.type || 'landmark', description: data.description, lat: 0, lng: 0 }));
    }

    setEditTarget(null);
  };

  const typeColor: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'> = {
    Marker:    'warning',
    Circle:    'success',
    Rectangle: 'secondary',
    Polygon:   'primary',
    Line:      'info',
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Custom Map
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Drawing Tools (Leaflet Geoman)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Use the toolbar on the left to draw shapes. Each drawn shape is added to
          the list below — click a row to zoom to it, or delete it with the trash icon.
        </Typography>

        {customLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ height: 500, borderRadius: 1, overflow: 'hidden', mb: 2 }}>
            <MapContainer
              center={[48, 15]}
              zoom={4}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapRefSetter mapRef={mapRef} />
              <GeomanControls
                onShapeAdded={handleShapeAdded}
                onShapeRemoved={handleShapeRemoved}
              />
              {savedShapes.map((s) => <SavedShapeLayer key={s.id} shape={s} />)}
              {customItems.map((item) => {
                const selected = selectedPresetId === item.id;
                return (
                  <CircleMarker
                    key={item.id}
                    center={[item.lat, item.lng]}
                    radius={selected ? 13 : 9}
                    pathOptions={{
                      color: selected ? '#1d4ed8' : '#fff',
                      weight: selected ? 3 : 1.5,
                      fillColor: PRESET_TYPE_COLOR[item.type] ?? '#6b7280',
                      fillOpacity: selected ? 1 : 0.9,
                    }}
                    eventHandlers={{
                      click: () => handlePresetClick(item.id, item.lat, item.lng),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -8]}>
                      <strong>{item.name}</strong>
                      <br />
                      {item.description}
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </Box>
        )}

        {/* ── Drawn shapes ────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Drawn shapes ({shapes.length})
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={shapesSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            disabled={drawnShapes.length === 0 || shapesSaving}
            onClick={async () => {
              try {
                await dispatch(saveShapes(drawnShapes)).unwrap();
                shapes.forEach((s) => {
                  (s.layer as any).pm?.remove?.();
                  if (mapRef.current?.hasLayer(s.layer)) mapRef.current.removeLayer(s.layer);
                });
                setShapes([]);
                dispatch(clearDrawnShapes());
              } catch { /* error already stored in Redux state */ }
            }}
          >
            {shapesSaving ? 'Saving…' : 'Save to backend'}
          </Button>
        </Box>

        {shapes.length === 0 ? (
          <Typography variant="body2" color="text.disabled">
            No shapes yet — draw something on the map.
          </Typography>
        ) : (
          <List dense disablePadding>
            {shapes.map((shape) => (
              <ListItem
                key={shape.id}
                disablePadding
                secondaryAction={
                  <Box sx={{ display: 'flex' }}>
                    <IconButton size="small" onClick={() => setEditTarget({ kind: 'drawn', shape })}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => removeShape(shape)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemButton onClick={() => zoomToShape(shape)} sx={{ pr: 10 }}>
                  <Chip
                    label={shape.type}
                    size="small"
                    color={typeColor[shape.type] ?? 'default'}
                    sx={{ mr: 1.5, minWidth: 88 }}
                  />
                  <ListItemText
                    primary={shape.name}
                    slotProps={{ primary: { variant: 'body2' } }}
                  />
                  <CenterFocusStrongIcon fontSize="small" sx={{ color: 'text.disabled', ml: 1 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        {/* ── Saved shapes (from backend) ──────────────────────────────────── */}
        {savedShapes.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
              Saved shapes ({savedShapes.length})
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                loaded from backend
              </Typography>
            </Typography>
            <List dense disablePadding>
              {savedShapes.map((shape) => (
                <ListItem
                  key={shape.id}
                  disablePadding
                  secondaryAction={
                    <Box sx={{ display: 'flex' }}>
                      <IconButton size="small" onClick={() => setEditTarget({ kind: 'saved', shape })}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => dispatch(deleteSavedShape(shape.id))}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemButton onClick={() => zoomToStoredShape(shape)} sx={{ pr: 10 }}>
                    <Chip
                      label={shape.type}
                      size="small"
                      sx={{ mr: 1.5, minWidth: 88, bgcolor: '#2563eb', color: '#fff' }}
                    />
                    <ListItemText
                      primary={shape.name || `Shape #${shape.id}`}
                      secondary={shape.description || undefined}
                      slotProps={{ primary: { variant: 'body2' }, secondary: { variant: 'caption' } }}
                    />
                    <CenterFocusStrongIcon fontSize="small" sx={{ color: 'text.disabled', ml: 1 }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* ── Preset locations ─────────────────────────────────────────────── */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Preset locations ({customItems.length})
          </Typography>
          <IconButton size="small" title="Add preset" onClick={() => setEditTarget({ kind: 'new-preset' })}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
        <List dense disablePadding>
          {customItems.map((item) => (
            <ListItem
              key={item.id}
              disablePadding
              secondaryAction={
                <Box sx={{ display: 'flex' }}>
                  <IconButton size="small" onClick={() => setEditTarget({ kind: 'preset', item })}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => dispatch(deletePreset(item.id))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              }
            >
              <ListItemButton
                selected={selectedPresetId === item.id}
                onClick={() => handlePresetClick(item.id, item.lat, item.lng)}
                sx={{ pr: 10 }}
              >
                <Box
                  sx={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0, mr: 1.5,
                    bgcolor: PRESET_TYPE_COLOR[item.type] ?? '#6b7280',
                  }}
                />
                <ListItemText
                  primary={item.name}
                  secondary={item.description}
                  slotProps={{ primary: { variant: 'body2' }, secondary: { variant: 'caption' } }}
                />
                <Chip label={item.type} size="small" sx={{ ml: 1, fontSize: '0.7rem' }} />
                <CenterFocusStrongIcon fontSize="small" sx={{ color: 'text.disabled', ml: 1 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <ShapeEditDialog
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEditSave}
        />
      </Paper>
    </Box>
  );
}
