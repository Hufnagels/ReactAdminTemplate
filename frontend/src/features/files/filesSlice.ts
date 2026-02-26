/*
 * features/files/filesSlice.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose : Redux slice for the File Manager feature. Manages the in-memory
 *           list of uploaded files and exposes CRUD async thunks that talk to
 *           the mock /files backend.
 *
 * Relationships
 *   API       : GET/POST/PUT/DELETE /files/  (backend/routes/files.py)
 *   Consumed  : pages/files/FileManager.tsx
 *   Registered: app/store.ts (key: "files")
 *
 * Key types
 *   FileItem  – { id, name, mime_type, size, description, tags, uploaded, project, folder, content_base64? }
 *   FilesState – { list, loading, saving, error }
 *
 * Thunks
 *   fetchFiles  – GET  /files/            (list without content)
 *   fetchFile   – GET  /files/{id}        (single file with content_base64)
 *   uploadFile  – POST /files/            (full payload inc. content_base64)
 *   updateFile  – PUT  /files/{id}        (description, tags, project, folder)
 *   deleteFile  – DELETE /files/{id}
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';

export interface FileItem {
  id:              number;
  name:            string;
  mime_type:       string;
  size:            number;
  description:     string;
  tags:            string[];
  uploaded:        string;
  project:         string;   // cross-feature metadata grouping
  folder:          string;   // subdirectory name ("" = root)
  content_base64?: string;
}

interface FilesState {
  list:    FileItem[];
  loading: boolean;
  saving:  boolean;
  error:   string | null;
}

const initialState: FilesState = {
  list:    [],
  loading: false,
  saving:  false,
  error:   null,
};

const API = 'http://localhost:8000/files';
const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

// ── Thunks ────────────────────────────────────────────────────────────────────
export const fetchFiles = createAsyncThunk(
  'files/fetchFiles',
  async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    const res = await fetch(`${API}/`, { headers: authHeader(token!) });
    if (!res.ok) return rejectWithValue(await res.text());
    return (await res.json()) as FileItem[];
  }
);

export const fetchFile = createAsyncThunk(
  'files/fetchFile',
  async (id: number, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    const res = await fetch(`${API}/${id}`, { headers: authHeader(token!) });
    if (!res.ok) return rejectWithValue(await res.text());
    return (await res.json()) as FileItem;
  }
);

export const uploadFile = createAsyncThunk(
  'files/uploadFile',
  async (
    payload: Omit<FileItem, 'id'> & { content_base64: string },
    { getState, rejectWithValue }
  ) => {
    const token = (getState() as RootState).auth.token;
    const res = await fetch(`${API}/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token!) },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) return rejectWithValue(await res.text());
    return (await res.json()) as FileItem;
  }
);

export const updateFile = createAsyncThunk(
  'files/updateFile',
  async (
    payload: { id: number; description: string; tags: string[]; project: string; folder: string },
    { getState, rejectWithValue }
  ) => {
    const token = (getState() as RootState).auth.token;
    const { id, ...body } = payload;
    const res = await fetch(`${API}/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader(token!) },
      body:    JSON.stringify(body),
    });
    if (!res.ok) return rejectWithValue(await res.text());
    return (await res.json()) as FileItem;
  }
);

export const deleteFile = createAsyncThunk(
  'files/deleteFile',
  async (id: number, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    const res = await fetch(`${API}/${id}`, {
      method:  'DELETE',
      headers: authHeader(token!),
    });
    if (!res.ok) return rejectWithValue(await res.text());
    return id;
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────
const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchFiles
      .addCase(fetchFiles.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchFiles.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; })
      .addCase(fetchFiles.rejected,  (s, a) => { s.loading = false; s.error = a.payload as string; })

      // fetchFile (merges content_base64 into existing list item)
      .addCase(fetchFile.fulfilled, (s, a) => {
        const idx = s.list.findIndex((f) => f.id === a.payload.id);
        if (idx !== -1) s.list[idx] = a.payload;
      })

      // uploadFile
      .addCase(uploadFile.pending,   (s) => { s.saving = true;  s.error = null; })
      .addCase(uploadFile.fulfilled, (s, a) => { s.saving = false; s.list.push(a.payload); })
      .addCase(uploadFile.rejected,  (s, a) => { s.saving = false; s.error = a.payload as string; })

      // updateFile
      .addCase(updateFile.pending,   (s) => { s.saving = true;  s.error = null; })
      .addCase(updateFile.fulfilled, (s, a) => {
        s.saving = false;
        const idx = s.list.findIndex((f) => f.id === a.payload.id);
        if (idx !== -1) s.list[idx] = { ...s.list[idx], ...a.payload };
      })
      .addCase(updateFile.rejected,  (s, a) => { s.saving = false; s.error = a.payload as string; })

      // deleteFile
      .addCase(deleteFile.pending,   (s) => { s.saving = true;  s.error = null; })
      .addCase(deleteFile.fulfilled, (s, a) => {
        s.saving = false;
        s.list   = s.list.filter((f) => f.id !== a.payload);
      })
      .addCase(deleteFile.rejected,  (s, a) => { s.saving = false; s.error = a.payload as string; });
  },
});

export default filesSlice.reducer;
