/*
 * pages/maps/GeoJsonMap.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose : Choropleth map that colours world regions by a performance index
 *           using GeoJSON polygons. Clicking a region shows its details in a
 *           side panel.
 *
 * Relationships
 *   Dispatches : mapsSlice.fetchGeoJson
 *   Reads      : state.maps.{ geoData, geoLoading }
 *   Library    : react-leaflet (MapContainer, TileLayer, GeoJSON)
 *
 * Key types
 *   RegionProps – GeoJSON feature properties: { id, name, value, population, gdp, growth }
 *
 * Key state
 *   selected – RegionProps | null; the currently clicked region
 *
 * Key helpers
 *   getRegionColor(value) – maps 0–100 index to a 5-step colour scale
 *   regionStyle(feature)  – Leaflet PathOptions derived from feature value
 *   geoKey / prevGeoData  – force-remount GeoJSON layer when data first arrives
 */
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useDispatch, useSelector } from 'react-redux';
import type { Layer, PathOptions, LeafletMouseEvent } from 'leaflet';
import type { FeatureCollection, Feature, GeoJsonProperties, Geometry } from 'geojson';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { fetchGeoJson } from '../../features/maps/mapsSlice';
import type { RootState, AppDispatch } from '../../app/store';

interface RegionProps {
  id: number;
  name: string;
  value: number;
  population: string;
  gdp: string;
  growth: string;
}

function getRegionColor(value: number): string {
  if (value >= 85) return '#1a9850';
  if (value >= 70) return '#91cf60';
  if (value >= 55) return '#fee08b';
  if (value >= 45) return '#fc8d59';
  return '#d73027';
}

function regionStyle(feature?: Feature<Geometry, GeoJsonProperties>): PathOptions {
  const val = (feature?.properties as RegionProps | undefined)?.value ?? 0;
  return { fillColor: getRegionColor(val), fillOpacity: 0.6, color: '#555', weight: 1.5 };
}

const LEGEND_STEPS = [
  { color: '#1a9850', label: '≥ 85 — Excellent' },
  { color: '#91cf60', label: '70–84 — Good' },
  { color: '#fee08b', label: '55–69 — Fair' },
  { color: '#fc8d59', label: '45–54 — Weak' },
  { color: '#d73027', label: '< 45 — Poor' },
];

export default function GeoJsonMap() {
  const dispatch  = useDispatch<AppDispatch>();
  const geoData   = useSelector((s: RootState) => s.maps.geoData);
  const loading   = useSelector((s: RootState) => s.maps.geoLoading);
  const [selected, setSelected] = useState<RegionProps | null>(null);

  // Increment key when store data first arrives to force GeoJSON layer re-mount
  const geoKey      = useRef(0);
  const prevGeoData = useRef<FeatureCollection | null>(null);
  if (geoData && geoData !== prevGeoData.current) {
    geoKey.current += 1;
    prevGeoData.current = geoData;
  }

  useEffect(() => {
    if (!geoData) dispatch(fetchGeoJson());
  }, [dispatch, geoData]);

  function onEachFeature(feature: Feature<Geometry, GeoJsonProperties>, layer: Layer) {
    const props = feature.properties as RegionProps;
    layer.on({
      mouseover: (e: LeafletMouseEvent) => e.target.setStyle({ fillOpacity: 0.85, weight: 2.5 }),
      mouseout:  (e: LeafletMouseEvent) => e.target.setStyle({ fillOpacity: 0.6,  weight: 1.5 }),
      click: () => setSelected(props),
    });
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        GeoJSON Map
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Regional Performance Index (react-leaflet + GeoJSON)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choropleth map coloured by performance index. Click a region for details.
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
                {geoData && (
                  <GeoJSON
                    key={geoKey.current}
                    data={geoData}
                    style={regionStyle}
                    onEachFeature={onEachFeature}
                  />
                )}
              </MapContainer>
            </Box>

            {/* Info panel */}
            <Box sx={{ width: { xs: '100%', md: 220 }, flexShrink: 0 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Index scale
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
                {LEGEND_STEPS.map((s) => (
                  <Box key={s.color} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 14, height: 14, bgcolor: s.color, flexShrink: 0, borderRadius: 0.5 }} />
                    <Typography variant="caption">{s.label}</Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                {selected ? selected.name : 'Click a region'}
              </Typography>
              {selected ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {[
                    { label: 'Index',      value: selected.value },
                    { label: 'Population', value: selected.population },
                    { label: 'GDP',        value: selected.gdp },
                    { label: 'Growth',     value: selected.growth },
                  ].map((row) => (
                    <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                      <Typography variant="caption" fontWeight={600}>{row.value}</Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" color="text.disabled">
                  Select a region to see its details.
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
