/*
 * pages/maps/HistoryMap.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose : Interactive world map showing financial centre performance as
 *           colour-coded circle markers. A side panel displays a colour
 *           legend and details for the selected marker.
 *
 * Relationships
 *   Dispatches : mapsSlice.fetchHistoryMarkers
 *   Reads      : state.maps.{ markers, markersLoading }
 *   Library    : react-leaflet (MapContainer, TileLayer, CircleMarker, Tooltip)
 *
 * Key state
 *   selected – HistoryMarker | null; the currently clicked marker
 *
 * Key helper
 *   getColor(change) – maps daily % change to one of four colours
 *                      (green gradient for gains, red for losses)
 */
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { fetchHistoryMarkers } from '../../features/maps/mapsSlice';
import type { HistoryMarker } from '../../features/maps/mapsSlice';
import type { RootState, AppDispatch } from '../../app/store';

function getColor(change: number): string {
  if (change > 0.3)  return '#1a9850';
  if (change > 0)    return '#91cf60';
  if (change > -0.3) return '#fc8d59';
  return '#d73027';
}

const LEGEND = [
  { color: '#1a9850', label: 'Strong gain  (> +0.3%)' },
  { color: '#91cf60', label: 'Gain  (0 to +0.3%)' },
  { color: '#fc8d59', label: 'Loss  (0 to −0.3%)' },
  { color: '#d73027', label: 'Strong loss  (< −0.3%)' },
];

export default function HistoryMap() {
  const dispatch = useDispatch<AppDispatch>();
  const markers  = useSelector((s: RootState) => s.maps.markers);
  const loading  = useSelector((s: RootState) => s.maps.markersLoading);
  const [selected, setSelected] = useState<HistoryMarker | null>(null);

  useEffect(() => {
    if (markers.length === 0) dispatch(fetchHistoryMarkers());
  }, [dispatch, markers.length]);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        History Map
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Global Market Overview (react-leaflet)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Markers show financial centres coloured by daily change. Click a marker for details.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
            <Box sx={{ flex: '1 1 0', minWidth: 0, height: 500, borderRadius: 1, overflow: 'hidden' }}>
              <MapContainer
                center={[20, 10]}
                zoom={2}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {markers.map((m) => (
                  <CircleMarker
                    key={m.id}
                    center={[m.lat, m.lng]}
                    radius={selected?.id === m.id ? 18 : 14}
                    pathOptions={{
                      color: selected?.id === m.id ? '#1d4ed8' : '#fff',
                      weight: selected?.id === m.id ? 3 : 1.5,
                      fillColor: getColor(m.change),
                      fillOpacity: 0.88,
                    }}
                    eventHandlers={{ click: () => setSelected(m) }}
                  >
                    <Tooltip direction="top" offset={[0, -10]}>
                      <strong>{m.name}</strong>
                      <br />
                      Value: {m.value}
                      <br />
                      Change: {m.change > 0 ? '+' : ''}{m.change}%
                    </Tooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            </Box>

            {/* Info panel */}
            <Box sx={{ width: { xs: '100%', md: 220 }, flexShrink: 0 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Change scale
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
                {LEGEND.map((l) => (
                  <Box key={l.color} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: l.color, flexShrink: 0 }} />
                    <Typography variant="caption">{l.label}</Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                {selected ? selected.name : 'Click a marker'}
              </Typography>
              {selected ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {[
                    { label: 'Value',  value: selected.value },
                    { label: 'Change', value: `${selected.change > 0 ? '+' : ''}${selected.change}%` },
                    { label: 'Lat',    value: selected.lat },
                    { label: 'Lng',    value: selected.lng },
                  ].map((row) => (
                    <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                      <Typography variant="caption" fontWeight={600}>{row.value}</Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" color="text.disabled">
                  Select a marker to see its details.
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
