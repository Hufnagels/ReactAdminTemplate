## Project structure
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
## To run
### Frontend:
```bash
cd frontend && npm run dev
```

### Backend:
```bash
cd backend && .venv/bin/uvicorn main:app --reload
```

Demo login: admin@example.com / password123

