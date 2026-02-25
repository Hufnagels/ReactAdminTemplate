"""
routes/maps.py
─────────────────────────────────────────────────────────────────────────────
Purpose : FastAPI router for all map-related data — financial history markers,
          GeoJSON region polygons, custom preset locations, and user-drawn
          shapes. All endpoints require a valid Bearer JWT.

Used by : main.py (mounted under /maps prefix)

Key variables
  HISTORY_MARKERS  – static list of 15 financial centre dicts { id, name, lat, lng, value, change }
  GEOJSON_DATA     – static FeatureCollection with 8 world-region polygons
  _CUSTOM_ITEMS    – mutable in-memory list of preset location dicts (12 seeds)
  _next_custom_id  – auto-increment counter for new presets (starts at 13)
  _SAVED_SHAPES    – mutable in-memory list of user-drawn shape dicts
  _next_shape_id   – auto-increment counter for saved shapes (starts at 1)

Endpoints
  GET    /maps/history          – returns HISTORY_MARKERS
  GET    /maps/geojson          – returns GEOJSON_DATA
  GET    /maps/custom           – lists preset locations
  POST   /maps/custom           – adds a preset location
  PUT    /maps/custom/{id}      – updates a preset location
  DELETE /maps/custom/{id}      – deletes a preset location
  GET    /maps/shapes           – lists saved shapes
  POST   /maps/shapes           – appends new drawn shapes (accumulates, does not replace)
  PUT    /maps/shapes/{id}      – updates a saved shape
  DELETE /maps/shapes/{id}      – deletes a saved shape
"""
from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
security = HTTPBearer()

HISTORY_MARKERS = [
    {"id": 1,  "name": "New York",    "lat": 40.71,  "lng": -74.01, "value": 1.082, "change":  0.15},
    {"id": 2,  "name": "London",      "lat": 51.51,  "lng":  -0.13, "value": 0.856, "change": -0.23},
    {"id": 3,  "name": "Tokyo",       "lat": 35.69,  "lng": 139.69, "value": 148.5, "change":  0.85},
    {"id": 4,  "name": "Frankfurt",   "lat": 50.11,  "lng":   8.68, "value": 1.082, "change":  0.12},
    {"id": 5,  "name": "Sydney",      "lat": -33.87, "lng": 151.21, "value": 1.534, "change": -0.45},
    {"id": 6,  "name": "Toronto",     "lat": 43.65,  "lng": -79.38, "value": 1.357, "change":  0.08},
    {"id": 7,  "name": "Singapore",   "lat":  1.35,  "lng": 103.82, "value": 1.341, "change": -0.11},
    {"id": 8,  "name": "Zurich",      "lat": 47.38,  "lng":   8.54, "value": 0.902, "change":  0.33},
    {"id": 9,  "name": "Hong Kong",   "lat": 22.32,  "lng": 114.17, "value": 7.823, "change": -0.62},
    {"id": 10, "name": "Dubai",       "lat": 25.20,  "lng":  55.27, "value": 3.673, "change":  0.21},
    {"id": 11, "name": "São Paulo",   "lat": -23.55, "lng": -46.63, "value": 5.013, "change":  0.38},
    {"id": 12, "name": "Mumbai",      "lat": 19.08,  "lng":  72.88, "value": 83.5,  "change":  0.52},
    {"id": 13, "name": "Shanghai",    "lat": 31.23,  "lng": 121.47, "value": 7.254, "change": -0.18},
    {"id": 14, "name": "Johannesburg","lat": -26.20, "lng":  28.04, "value": 18.32, "change": -0.41},
    {"id": 15, "name": "Seoul",       "lat": 37.57,  "lng": 126.98, "value": 1325.0,"change":  1.24},
]

GEOJSON_DATA = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": 1, "name": "North America",
                "value": 88, "population": "370M", "gdp": "$28T", "growth": "+2.3%",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[-130,25],[-60,25],[-60,55],[-130,55],[-130,25]]],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": 2, "name": "Western Europe",
                "value": 92, "population": "190M", "gdp": "$8.2T", "growth": "+1.8%",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[-10,36],[20,36],[20,55],[-10,55],[-10,36]]],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": 3, "name": "Eastern Europe",
                "value": 67, "population": "120M", "gdp": "$2.1T", "growth": "+3.1%",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[20,44],[40,44],[40,60],[20,60],[20,44]]],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": 4, "name": "East Asia",
                "value": 79, "population": "1.6B", "gdp": "$18T", "growth": "+4.5%",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[100,20],[145,20],[145,45],[100,45],[100,20]]],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": 5, "name": "South Asia",
                "value": 58, "population": "1.9B", "gdp": "$4.5T", "growth": "+6.2%",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[60,5],[100,5],[100,35],[60,35],[60,5]]],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": 6, "name": "Sub-Saharan Africa",
                "value": 41, "population": "1.1B", "gdp": "$1.8T", "growth": "+3.7%",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[-20,-35],[50,-35],[50,10],[-20,10],[-20,-35]]],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": 7, "name": "Latin America",
                "value": 54, "population": "430M", "gdp": "$4.2T", "growth": "+2.8%",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[-82,-55],[-34,-55],[-34,14],[-82,14],[-82,-55]]],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": 8, "name": "Middle East",
                "value": 73, "population": "250M", "gdp": "$3.9T", "growth": "+3.4%",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[32,12],[65,12],[65,38],[32,38],[32,12]]],
            },
        },
    ],
}


# ── Preset locations (mutable in-memory store) ────────────────────────────────
_CUSTOM_ITEMS: list[dict[str, Any]] = [
    {"id":  1, "name": "Eiffel Tower",      "lat":  48.858, "lng":   2.294, "type": "landmark", "description": "Paris, France"},
    {"id":  2, "name": "Colosseum",          "lat":  41.890, "lng":  12.492, "type": "landmark", "description": "Rome, Italy"},
    {"id":  3, "name": "Sagrada Família",    "lat":  41.404, "lng":   2.174, "type": "landmark", "description": "Barcelona, Spain"},
    {"id":  4, "name": "Brandenburg Gate",   "lat":  52.516, "lng":  13.377, "type": "landmark", "description": "Berlin, Germany"},
    {"id":  5, "name": "Acropolis",          "lat":  37.971, "lng":  23.726, "type": "landmark", "description": "Athens, Greece"},
    {"id":  6, "name": "Schiphol Airport",   "lat":  52.310, "lng":   4.768, "type": "airport",  "description": "Amsterdam, Netherlands"},
    {"id":  7, "name": "Heathrow Airport",   "lat":  51.470, "lng":  -0.454, "type": "airport",  "description": "London, UK"},
    {"id":  8, "name": "Charles de Gaulle",  "lat":  49.009, "lng":   2.548, "type": "airport",  "description": "Paris, France"},
    {"id":  9, "name": "Port of Rotterdam",  "lat":  51.900, "lng":   4.480, "type": "port",     "description": "Rotterdam, Netherlands"},
    {"id": 10, "name": "Port of Antwerp",    "lat":  51.260, "lng":   4.400, "type": "port",     "description": "Antwerp, Belgium"},
    {"id": 11, "name": "CERN",               "lat":  46.234, "lng":   6.055, "type": "research", "description": "Geneva, Switzerland"},
    {"id": 12, "name": "ESA HQ",             "lat":  48.797, "lng":   2.223, "type": "research", "description": "Paris, France"},
]
_next_custom_id = 13


# ── Saved drawn shapes (mutable in-memory store) ──────────────────────────────
_SAVED_SHAPES: list[dict[str, Any]] = []
_next_shape_id = 1


# ── History markers ───────────────────────────────────────────────────────────
@router.get("/history")
def get_history(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return HISTORY_MARKERS


# ── GeoJSON ───────────────────────────────────────────────────────────────────
@router.get("/geojson")
def get_geojson(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return GEOJSON_DATA


# ── Preset locations CRUD ─────────────────────────────────────────────────────
@router.get("/custom")
def get_custom(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return _CUSTOM_ITEMS


@router.post("/custom")
def add_custom(
    item: dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    global _next_custom_id
    new_item = {**item, "id": _next_custom_id}
    _next_custom_id += 1
    _CUSTOM_ITEMS.append(new_item)
    return new_item


@router.put("/custom/{item_id}")
def update_custom(
    item_id: int,
    item: dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    for i, ci in enumerate(_CUSTOM_ITEMS):
        if ci["id"] == item_id:
            _CUSTOM_ITEMS[i] = {**ci, **item, "id": item_id}
            return _CUSTOM_ITEMS[i]
    raise HTTPException(status_code=404, detail="Preset not found")


@router.delete("/custom/{item_id}")
def delete_custom(
    item_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    global _CUSTOM_ITEMS
    before = len(_CUSTOM_ITEMS)
    _CUSTOM_ITEMS = [ci for ci in _CUSTOM_ITEMS if ci["id"] != item_id]
    if len(_CUSTOM_ITEMS) == before:
        raise HTTPException(status_code=404, detail="Preset not found")
    return {"ok": True}


# ── Saved shapes CRUD ─────────────────────────────────────────────────────────
@router.get("/shapes")
def get_shapes(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return _SAVED_SHAPES


@router.post("/shapes")
def save_shapes(
    shapes: list[dict[str, Any]],
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    global _SAVED_SHAPES, _next_shape_id
    for shape in shapes:
        _SAVED_SHAPES.append({**shape, "id": _next_shape_id})
        _next_shape_id += 1
    return _SAVED_SHAPES


@router.put("/shapes/{shape_id}")
def update_shape(
    shape_id: int,
    shape: dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    for i, s in enumerate(_SAVED_SHAPES):
        if s["id"] == shape_id:
            _SAVED_SHAPES[i] = {**s, **shape, "id": shape_id}
            return _SAVED_SHAPES[i]
    raise HTTPException(status_code=404, detail="Shape not found")


@router.delete("/shapes/{shape_id}")
def delete_shape(
    shape_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    global _SAVED_SHAPES
    before = len(_SAVED_SHAPES)
    _SAVED_SHAPES = [s for s in _SAVED_SHAPES if s["id"] != shape_id]
    if len(_SAVED_SHAPES) == before:
        raise HTTPException(status_code=404, detail="Shape not found")
    return {"ok": True}
