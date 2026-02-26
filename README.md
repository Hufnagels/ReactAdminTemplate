# React Admin Template

A full-stack admin dashboard template built with **React 19 + MUI + Redux Toolkit** on the frontend and **FastAPI** on the backend. All backend data is stored in-memory (mock) so the project runs with zero database setup.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19, TypeScript, Vite |
| UI library | MUI v7 (Material UI) + MUI X Tree View |
| State management | Redux Toolkit + React Redux |
| Routing | React Router v7 |
| Charts | Recharts, D3.js |
| Maps | React Leaflet, Leaflet Geoman (drawing) |
| Tables | Material React Table v3 |
| File handling | react-dropzone, react-pdf, xlsx (SheetJS), mammoth, react-avatar-editor |
| Styling | MUI theming + Tailwind CSS v4 |
| Backend | FastAPI (Python) |
| Auth | JWT (HS256, 24-hour tokens) |

---

## Getting Started

### Backend
```bash
cd backend
pip install fastapi uvicorn python-jose[cryptography] pydantic
uvicorn main:app --reload
# Runs on http://localhost:8000
# Interactive API docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Demo credentials
| Email | Password | Role |
|---|---|---|
| admin@example.com | password123 | admin |
| editor@example.com | password123 | editor |

---

## Project Structure

```
ReactAdminTemplate/
├── backend/
│   ├── main.py               # FastAPI app, CORS, router registration
│   └── routes/
│       ├── auth.py           # JWT login endpoint
│       ├── users.py          # User CRUD + /me profile endpoints
│       ├── maps.py           # History markers, GeoJSON, presets, drawn shapes
│       └── files.py          # File upload / download / metadata CRUD
│
└── frontend/src/
    ├── app/
    │   └── store.ts          # Redux store (6 slices registered)
    ├── features/
    │   ├── auth/authSlice.ts
    │   ├── theme/themeSlice.ts
    │   ├── charts/chartsSlice.ts
    │   ├── users/usersSlice.ts
    │   ├── maps/mapsSlice.ts
    │   └── files/filesSlice.ts
    ├── pages/
    │   ├── Landing.tsx
    │   ├── SignIn.tsx
    │   ├── Dashboard.tsx
    │   ├── Typography.tsx
    │   ├── charts/Charts.tsx
    │   ├── charts/RidgelineChart.tsx
    │   ├── users/Users.tsx
    │   ├── users/UserAccount.tsx
    │   ├── files/FileManager.tsx
    │   ├── files/FileManager2.tsx
    │   ├── maps/HistoryMap.tsx
    │   ├── maps/GeoJsonMap.tsx
    │   └── maps/CustomMap.tsx
    ├── components/common/
    │   ├── FileDropzone.tsx
    │   ├── fuctions.tsx        # getStrength() password helper
    │   ├── HadlingAvatars/
    │   │   ├── AvatarDropzone.tsx
    │   │   └── AvatarCropDialog.tsx
    │   └── viewers/
    │       ├── ImageViewer.tsx
    │       ├── PdfViewer.tsx
    │       ├── SpreadsheetViewer.tsx
    │       └── DocViewer.tsx
    └── routes/
        └── routes.tsx          # Route config object tree + flattenRoutes()
```

---

## Pages & Features

### Landing — `/`
Public landing page. Displays the app name and a **Sign In** call-to-action button. No Redux state.

---

### Sign In — `/signin`
Two-panel authentication form.
- **Left panel** — demo video placeholder (hidden on mobile).
- **Right panel** — email + password form with **show/hide password toggle**.
- Pre-fills `admin@example.com / password123` for quick demo access.
- On success dispatches `signIn()` and redirects to `/dashboard`.
- Shows inline error from `state.auth.error` on failed login.

---

### Dashboard — `/dashboard`
Overview page with static KPI widgets and a weekly visits chart.
- **4 stat cards** — Total Users, Revenue, Orders, Growth (with positive/negative trend indicators).
- **Weekly Visits bar chart** — 7-day data rendered with Recharts.
- All data is local to the component; no API calls.

---

### Typography — `/typography`
Design-system reference page. Showcases all MUI typography variants — `h1`–`h6`, `subtitle1/2`, `body1/2`, `caption`, `overline`. Static, no Redux.

---

### Charts

#### Bar & Donut — `/charts/barchart`
- **Bar chart** — 7-month sales vs. revenue comparison (Recharts `BarChart`).
- **Donut chart** — Traffic-source breakdown (Recharts `PieChart`).
- Data from `chartsSlice` (static mock, no API calls).
- Orange colour palette matching the light theme.

#### Ridgeline Chart — `/charts/ridgeline`
- D3.js ridge-line density chart showing 6 monthly value distributions.
- Uses kernel density estimation (`kernelEpanechnikov` bandwidth).
- Generates 300 random normally-distributed values per category.
- Re-renders automatically on light/dark theme switch.

---

### Users — `/users`
Full user management built on **material-react-table**.

**Table capabilities:**
- Global search, column filters, sortable columns, pagination (5 / 10 / 25 rows).
- **Role** column — colour-coded MUI `Chip`: `admin` = red, `editor` = blue, `viewer` = grey.
- **Status** column — MUI `Chip`: `active` = green, `inactive` = grey.
- Inline **Edit** and **Delete** action buttons per row.
- **Add User** toolbar button opens the create dialog.

**UserDialog (add / edit modal):**
| Field | Behaviour |
|---|---|
| Avatar | Toggle between letter-initials and uploaded photo; photo uses `AvatarDropzone` + crop dialog |
| Name | Free text |
| Email | Validated against RFC 5322 pattern; error shown on blur |
| Role | Select: `admin`, `editor`, `viewer` |
| Status | Select: `active`, `inactive` |
| Joined | Date picker |
| Password | Show/hide toggle; live `LinearProgress` strength bar (Weak / Fair / Good / Strong) |

Save is disabled until email is valid and (for new users) a password is provided.

---

### User Account — `/account`
Personal profile page for the signed-in user. Hidden from the sidebar navigation.
- Displays current name, email, and role (read-only chip).
- **Avatar** — toggle between letter avatar and photo; photo goes through the crop dialog before saving.
- **New Password** field with show/hide toggle.
- Submitting dispatches `updateProfile()` → `PUT /users/me`.

---

### File Manager — `/files/files1`
Drag-and-drop file manager with folder organisation and real-time search.

**Upload flow:**
1. Drop files onto the `FileDropzone` (images, PDF, XLS/XLSX, DOC/DOCX, CSV, TXT).
2. A **FileInfoDialog** opens per file to collect **description**, **tags** (chip input), **project**, and **folder**.
3. File content is base64-encoded (data-URL) and stored via `POST /files/`.

**Browse & navigate:**
- **Search bar** — filters by filename, tags, and project in real-time. Active search spans all folders.
- **Folder cards** — clickable cards in the root view navigate into a named folder.
- **Breadcrumbs** — shows `All Files / folderName` with a back link to root.

**File cards:**
- Images show a thumbnail preview; all other types show a colour-coded icon.
- Displays name, size, upload date, project label, description, and tags.
- **Edit** opens `EditDialog` pre-filled with existing metadata.
- **Delete** dispatches `deleteFile()` immediately.
- **Click** opens the appropriate type-specific viewer.

**Viewers:**
| File type | Viewer | Library |
|---|---|---|
| Image | `ImageViewer` | react-avatar-editor — zoom + rotate sliders, view-only |
| PDF | `PdfViewer` | react-pdf — page-by-page navigation |
| XLS / XLSX / CSV | `SpreadsheetViewer` | xlsx (SheetJS) → sticky-header MUI Table |
| DOC / DOCX / TXT | `DocViewer` | mammoth (DOCX → HTML) / atob (TXT → `<pre>`) |

---

### File Manager v2 — `/files/files2`
Enhanced file manager with a **MUI X SimpleTreeView** sidebar replacing the folder-card navigation.

**Tree panel (left, 240 px, sticky):**
- **`All Files`** root node — shows total file count; root node cannot be collapsed.
- **Folder child nodes** — one per unique `folder` value; shows name + file count badge.
- Selecting a tree node instantly filters the right-side file grid.
- **Search bar** inside the panel; when a query is active the folder filter is suspended and results span all folders.
- A context label shows `Searching across all folders` or `Folder: <name>` depending on state.

**Folder lock:**
- Each folder node has a **lock toggle button** (🔒).
- Clicking it dispatches `toggleFolderLock(folderName)` to the Redux store.
- **Locked folder** — icon and label dim; lock button turns red.
- **Files in a locked folder** — Edit and Delete buttons are disabled; a lock icon appears in the card footer.
- Lock state is stored in `state.files.lockedFolders: string[]` and persists for the session.
- Upload dialog pre-fills the Folder field with the currently selected tree node.

---

### History Map — `/maps/history`
World map displaying 15 global financial centres as circle markers.
- Marker **colour** = performance: green (positive change) → red (negative change).
- Click a marker → side panel shows city name, rate value, and % daily change.
- Data from `GET /maps/history`.

---

### GeoJSON Map — `/maps/geojson`
Choropleth world map colouring 8 regions by a performance index (0–100).
- 5-step colour scale (light → dark as value increases).
- Click a polygon → side panel shows region name, value, population, GDP, and growth.
- Data from `GET /maps/geojson`.

---

### Custom Map — `/maps/custom`
Interactive map combining drawing tools and preset location management.

**Preset locations (side panel):**
- Loads landmarks, airports, ports, and research sites from `GET /maps/custom`.
- Add / Edit / Delete presets with a dialog (name, type, description, coordinates).
- Clicking a preset centres and zooms the map to that location.

**Drawing tools (Leaflet Geoman):**
- Draw **circles**, **rectangles**, **polygons**, and **polylines** directly on the map.
- Edit and delete previously drawn shapes.
- **Save Shapes** — posts drawn shapes to `POST /maps/shapes` and clears the local buffer.
- Saved shapes are loaded on next visit via `GET /maps/shapes`.
- Edit and delete saved shapes via the shapes panel.

---

## Redux Slices

### `auth` — `state.auth`
| Field | Type | Description |
|---|---|---|
| `token` | `string \| null` | JWT stored in `localStorage` |
| `user` | `User \| null` | `{ id, name, email, role, avatar_mode, avatar_base64 }` |
| `loading` | `boolean` | Pending request indicator |
| `error` | `string \| null` | Last auth error message |

**Reducers:** `signOut()`, `setUser(user)`
**Thunks:** `signIn({ email, password })`, `fetchCurrentUser()`, `updateProfile({ name?, email?, avatar_base64?, avatar_mode? })`

---

### `theme` — `state.theme`
| Field | Type | Description |
|---|---|---|
| `mode` | `'light' \| 'dark'` | Persisted to `localStorage` |

**Reducers:** `toggleTheme()`, `setTheme(mode)`

---

### `charts` — `state.charts`
| Field | Type | Description |
|---|---|---|
| `barData` | `BarDataPoint[]` | 7 months × `{ month, sales, revenue }` |
| `donutData` | `DonutDataPoint[]` | 4 traffic sources × `{ name, value }` |

Static mock data; no thunks.

---

### `users` — `state.users`
| Field | Type | Description |
|---|---|---|
| `list` | `UserRow[]` | `{ id, name, email, role, status, joined, avatar_mode?, avatar_base64? }` |
| `loading` | `boolean` | Fetch in-progress |
| `saving` | `boolean` | Create/update/delete in-progress |
| `error` | `string \| null` | |

**Thunks:** `fetchUsers()`, `createUser(payload)`, `updateUser(user)`, `deleteUser(id)`

---

### `maps` — `state.maps`
| Field | Type | Description |
|---|---|---|
| `markers` | `HistoryMarker[]` | `{ id, name, lat, lng, value, change, project }` |
| `geoData` | `GeoJSON \| null` | 8-region FeatureCollection |
| `customItems` | `CustomMapItem[]` | Preset locations |
| `drawnShapes` | `DrawnShape[]` | In-progress drawing buffer (local only) |
| `savedShapes` | `StoredShape[]` | Shapes persisted on the backend |

**Thunks:** `fetchHistoryMarkers`, `fetchGeoJson`, `fetchCustomMap`, `addPreset`, `updatePreset`, `deletePreset`, `fetchShapes`, `saveShapes`, `updateSavedShape`, `deleteSavedShape`
**Reducers:** `addDrawnShape`, `updateDrawnShape`, `removeDrawnShape`, `clearDrawnShapes`

---

### `files` — `state.files`
| Field | Type | Description |
|---|---|---|
| `list` | `FileItem[]` | `{ id, name, mime_type, size, description, tags, uploaded, project, folder, content_base64? }` |
| `loading` | `boolean` | Fetch in-progress |
| `saving` | `boolean` | Upload/update/delete in-progress |
| `error` | `string \| null` | |
| `lockedFolders` | `string[]` | Folder names currently locked in File Manager v2 |

**Thunks:** `fetchFiles()`, `fetchFile(id)`, `uploadFile(payload)`, `updateFile({ id, description, tags, project, folder })`, `deleteFile(id)`
**Reducers:** `toggleFolderLock(folderName)` — adds to / removes from `lockedFolders`

---

## Backend API

All endpoints (except `/auth/login`) require an `Authorization: Bearer <token>` header.

### Auth — `/auth`
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `{ access_token, token_type, user }` |

### Users — `/users`
| Method | Path | Description |
|---|---|---|
| GET | `/users/me` | Current user profile |
| PUT | `/users/me` | Update name, email, avatar |
| GET | `/users/` | List all users (10 seed entries) |
| POST | `/users/` | Create user (auto-increment ID) |
| PUT | `/users/{id}` | Update user by ID |
| DELETE | `/users/{id}` | Delete user by ID |

### Maps — `/maps`
| Method | Path | Description |
|---|---|---|
| GET | `/maps/history` | 15 financial centre markers |
| GET | `/maps/geojson` | 8-region GeoJSON FeatureCollection |
| GET | `/maps/custom` | List preset locations (12 seeds) |
| POST | `/maps/custom` | Add preset location |
| PUT | `/maps/custom/{id}` | Update preset location |
| DELETE | `/maps/custom/{id}` | Delete preset location |
| GET | `/maps/shapes` | List saved drawn shapes |
| POST | `/maps/shapes` | Append new drawn shapes (accumulates) |
| PUT | `/maps/shapes/{id}` | Update saved shape |
| DELETE | `/maps/shapes/{id}` | Delete saved shape |

### Files — `/files`
| Method | Path | Description |
|---|---|---|
| GET | `/files/` | List all files — `content_base64` excluded |
| GET | `/files/{id}` | Single file including `content_base64` |
| POST | `/files/` | Upload file (full payload including base64) |
| PUT | `/files/{id}` | Update description, tags, project, folder |
| DELETE | `/files/{id}` | Delete file |

---

## Common Components

### `FileDropzone`
Drag-and-drop zone. Accepts: images, PDF, XLS/XLSX, DOC/DOCX, CSV, TXT.
**Props:** `onFiles(files: File[]) => void`

### `AvatarDropzone`
Single-image drop zone for avatar upload.
**Props:** `onFile(objectUrl: string) => void`, `compact?: boolean`

### `AvatarCropDialog`
Crop/zoom/rotate dialog using `react-avatar-editor`. Calls `onApply(base64)` when confirmed.
**Props:** `open`, `onClose`, `onApply(base64: string)`, `image: string | null`, `title`

### `ImageViewer`
Full-screen dialog. Zoom slider (0.5×–4×) + rotation slider (0°–360°). View-only, no save.
**Props:** `open`, `onClose`, `src: string`, `title?: string`

### `PdfViewer`
Dialog rendering a PDF via `react-pdf`. Previous/Next page navigation, shows current page number.
**Props:** `open`, `onClose`, `src: string`, `title?: string`

### `SpreadsheetViewer`
Dialog that parses XLS/XLSX/CSV using SheetJS and renders the first sheet as a sticky-header MUI Table (max height 500 px).
**Props:** `open`, `onClose`, `src: string`, `fileName: string`

### `DocViewer`
Dialog for DOCX and TXT. DOCX → HTML via `mammoth` (rendered with `dangerouslySetInnerHTML`). TXT → decoded with `atob` and shown in a monospace `<pre>` block.
**Props:** `open`, `onClose`, `src: string`, `mimeType: string`, `fileName: string`

### `getStrength(password)` — `components/common/fuctions.tsx`
Scores a password 1–4 and returns `{ score, label, color }` for the strength indicator bar.

| Score | Label | Colour |
|---|---|---|
| 1 | Weak | red |
| 2 | Fair | orange |
| 3 | Good | light green |
| 4 | Strong | dark green |

---

## Routing

Routes are declared as a typed `RouteConfig[]` tree in `routes/routes.tsx`. The `children` field enables grouped sidebar items.

```
/                        Landing              (public)
/signin                  Sign In              (public)
/dashboard               Dashboard            (nav)
/account                 User Account         (hidden from nav)
/typography              Typography           (nav)
/charts                  ── group ──          (nav)
  /charts/barchart       Bar & Donut Charts
  /charts/ridgeline      Ridgeline Chart
/users                   Users Table          (nav)
/files                   ── group ──          (nav)
  /files/files1          File Manager
  /files/files2          File Manager v2
/maps                    ── group ──          (nav)
  /maps/history          History Map
  /maps/geojson          GeoJSON Map
  /maps/custom           Custom / Drawing Map
```

**`flattenRoutes(list)`** — recursively flattens the config tree into routable leaf nodes (nodes that have an `element` component). Used by the React Router setup.

---

## Theme

Two colour modes, toggled via the header button. Mode is persisted to `localStorage`.

| Mode | Primary colour |
|---|---|
| Light | Orange `#f97316` |
| Dark | Orange `#f97316` (same accent, dark backgrounds) |
