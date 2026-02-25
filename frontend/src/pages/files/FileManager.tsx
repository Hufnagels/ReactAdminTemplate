/*
 * pages/files/FileManager.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose : Full-featured file manager page. Users drop files onto the
 *           dropzone, add a description and tags via FileInfoDialog, then the
 *           file is uploaded and shown as a card. Clicking a card opens a
 *           type-appropriate viewer. Cards support inline edit and delete.
 *
 * Relationships
 *   Dispatches : filesSlice.{ fetchFiles, fetchFile, uploadFile, updateFile, deleteFile }
 *   Reads      : state.files.{ list, loading, saving }
 *   Components : FileDropzone, ImageViewer, PdfViewer, SpreadsheetViewer, DocViewer
 *
 * Key sub-components (file-local)
 *   FileInfoDialog – collects description + tags before upload
 *   FileCard       – grid card for a single file item
 *
 * Key helpers
 *   formatBytes(n)        – "1.2 MB" / "340 KB"
 *   getFileIcon(mimeType) – returns a color-coded MUI icon node
 *   mimeFromFile(file)    – canonical MIME string for the file
 */
import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import ArticleIcon from '@mui/icons-material/Article';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import type { RootState, AppDispatch } from '../../app/store';
import type { FileItem } from '../../features/files/filesSlice';
import { fetchFiles, fetchFile, uploadFile, updateFile, deleteFile } from '../../features/files/filesSlice';
import FileDropzone from '../../components/common/FileDropzone';
import ImageViewer from '../../components/common/viewers/ImageViewer';
import PdfViewer from '../../components/common/viewers/PdfViewer';
import SpreadsheetViewer from '../../components/common/viewers/SpreadsheetViewer';
import DocViewer from '../../components/common/viewers/DocViewer';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(n: number): string {
  if (n < 1024)        return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/'))      return <ImageIcon        sx={{ fontSize: 48, color: '#4caf50' }} />;
  if (mimeType === 'application/pdf')     return <PictureAsPdfIcon sx={{ fontSize: 48, color: '#f44336' }} />;
  if (mimeType.includes('spreadsheet') || mimeType === 'text/csv' || mimeType.includes('excel'))
                                           return <TableChartIcon  sx={{ fontSize: 48, color: '#2196f3' }} />;
  if (mimeType.includes('word') || mimeType === 'text/plain')
                                           return <ArticleIcon     sx={{ fontSize: 48, color: '#ff9800' }} />;
  return <InsertDriveFileIcon sx={{ fontSize: 48, color: 'text.disabled' }} />;
}

function viewerType(mimeType: string): 'image' | 'pdf' | 'spreadsheet' | 'doc' {
  if (mimeType.startsWith('image/'))    return 'image';
  if (mimeType === 'application/pdf')  return 'pdf';
  if (mimeType.includes('spreadsheet') || mimeType === 'text/csv' || mimeType.includes('excel'))
    return 'spreadsheet';
  return 'doc';
}

// ── FileInfoDialog ────────────────────────────────────────────────────────────
interface PendingFile {
  file:        File;
  description: string;
  tags:        string[];
}

function FileInfoDialog({
  pending,
  onCancel,
  onUpload,
  saving,
}: {
  pending:  PendingFile | null;
  onCancel: () => void;
  onUpload: (desc: string, tags: string[]) => void;
  saving:   boolean;
}) {
  const [description, setDescription] = useState('');
  const [tags, setTags]               = useState<string[]>([]);

  useEffect(() => {
    if (pending) { setDescription(''); setTags([]); }
  }, [pending]);

  if (!pending) return null;

  const { file } = pending;
  const sizeFmt  = formatBytes(file.size);

  return (
    <Dialog open onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>File Info</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* File summary */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {getFileIcon(file.type)}
            <Box>
              <Typography variant="body1" fontWeight={600}>{file.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {file.type || 'unknown'} · {sizeFmt}
              </Typography>
            </Box>
          </Box>

          <TextField
            label="Description"
            multiline
            minRows={2}
            fullWidth
            size="small"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={tags}
            onChange={(_, v) => setTags(v as string[])}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={key} label={option} size="small" {...tagProps} />;
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                size="small"
                placeholder="Type a tag and press Enter"
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={saving} onClick={() => onUpload(description, tags)}>
          {saving ? 'Uploading…' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── EditDialog ────────────────────────────────────────────────────────────────
function EditDialog({
  file,
  onClose,
  onSave,
  saving,
}: {
  file:    FileItem | null;
  onClose: () => void;
  onSave:  (desc: string, tags: string[]) => void;
  saving:  boolean;
}) {
  const [description, setDescription] = useState('');
  const [tags, setTags]               = useState<string[]>([]);

  useEffect(() => {
    if (file) { setDescription(file.description); setTags(file.tags); }
  }, [file]);

  if (!file) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit — {file.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Description"
            multiline
            minRows={2}
            fullWidth
            size="small"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={tags}
            onChange={(_, v) => setTags(v as string[])}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={key} label={option} size="small" {...tagProps} />;
              })
            }
            renderInput={(params) => (
              <TextField {...params} label="Tags" size="small" placeholder="Type a tag and press Enter" />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={saving} onClick={() => onSave(description, tags)}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── FileCard ──────────────────────────────────────────────────────────────────
function FileCard({
  file,
  onView,
  onEdit,
  onDelete,
}: {
  file:     FileItem;
  onView:   (file: FileItem) => void;
  onEdit:   (file: FileItem) => void;
  onDelete: (id: number) => void;
}) {
  const isImage = file.mime_type.startsWith('image/');

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={() => onView(file)} sx={{ flex: 1 }}>
        {/* Thumbnail / icon area */}
        <Box
          sx={{
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            overflow: 'hidden',
          }}
        >
          {isImage && file.content_base64 ? (
            <Box
              component="img"
              src={file.content_base64}
              alt={file.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            getFileIcon(file.mime_type)
          )}
        </Box>

        <CardContent sx={{ pb: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap title={file.name}>
            {file.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatBytes(file.size)} · {file.uploaded}
          </Typography>
          {file.description && (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{
                mt: 0.5,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {file.description}
            </Typography>
          )}
          {file.tags.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {file.tags.map((t) => (
                <Chip key={t} label={t} size="small" variant="outlined" />
              ))}
            </Box>
          )}
        </CardContent>
      </CardActionArea>

      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <IconButton size="small" onClick={() => onEdit(file)}><EditIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={() => onDelete(file.id)}><DeleteIcon fontSize="small" /></IconButton>
      </CardActions>
    </Card>
  );
}

// ── FileManager page ──────────────────────────────────────────────────────────
export default function FileManager() {
  const dispatch = useDispatch<AppDispatch>();
  const list     = useSelector((s: RootState) => s.files.list);
  const loading  = useSelector((s: RootState) => s.files.loading);
  const saving   = useSelector((s: RootState) => s.files.saving);

  // Queue of files dropped but not yet uploaded
  const [queue,   setQueue]   = useState<File[]>([]);
  const pending: PendingFile | null = useMemo(
    () => (queue.length > 0 ? { file: queue[0], description: '', tags: [] } : null),
    [queue]
  );

  // Edit dialog
  const [editTarget, setEditTarget] = useState<FileItem | null>(null);

  // Viewer state
  const [viewerFile, setViewerFile] = useState<FileItem | null>(null);

  useEffect(() => {
    if (list.length === 0) dispatch(fetchFiles());
  }, [dispatch, list.length]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDrop = (files: File[]) => setQueue((q) => [...q, ...files]);

  const handleUpload = async (description: string, tags: string[]) => {
    const file = queue[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl      = reader.result as string;
      const content_base64 = dataUrl; // keep full data URL for viewers
      const today        = new Date().toISOString().slice(0, 10);
      await dispatch(uploadFile({
        name:    file.name,
        mime_type: file.type || 'application/octet-stream',
        size:    file.size,
        description,
        tags,
        uploaded: today,
        content_base64,
      }));
      setQueue((q) => q.slice(1)); // advance to next in queue
    };
    reader.readAsDataURL(file);
  };

  const handleView = async (file: FileItem) => {
    // If content not loaded yet, fetch it first
    if (!file.content_base64) {
      const result = await dispatch(fetchFile(file.id));
      if (fetchFile.fulfilled.match(result)) {
        setViewerFile(result.payload);
      }
    } else {
      setViewerFile(file);
    }
  };

  const handleSaveEdit = async (description: string, tags: string[]) => {
    if (!editTarget) return;
    await dispatch(updateFile({ id: editTarget.id, description, tags }));
    setEditTarget(null);
  };

  // ── Viewer routing ────────────────────────────────────────────────────────
  const vType = viewerFile ? viewerType(viewerFile.mime_type) : null;
  const vSrc  = viewerFile?.content_base64 ?? '';

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        File Manager
      </Typography>

      {/* Dropzone */}
      <Box sx={{ mb: 3 }}>
        <FileDropzone onFiles={handleDrop} />
      </Box>

      {/* File info dialog (one file at a time from queue) */}
      <FileInfoDialog
        pending={pending}
        onCancel={() => setQueue((q) => q.slice(1))}
        onUpload={handleUpload}
        saving={saving}
      />

      {/* Edit dialog */}
      <EditDialog
        file={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
        saving={saving}
      />

      {/* File grid */}
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Skeleton variant="rounded" height={220} />
            </Grid>
          ))}
        </Grid>
      ) : list.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No files yet. Drop some above to get started.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {list.map((file) => (
            <Grid key={file.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <FileCard
                file={file}
                onView={handleView}
                onEdit={setEditTarget}
                onDelete={(id) => dispatch(deleteFile(id))}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Viewers ── */}
      {vType === 'image' && (
        <ImageViewer
          open
          onClose={() => setViewerFile(null)}
          src={vSrc}
          title={viewerFile?.name}
        />
      )}
      {vType === 'pdf' && (
        <PdfViewer
          open
          onClose={() => setViewerFile(null)}
          src={vSrc}
          title={viewerFile?.name}
        />
      )}
      {vType === 'spreadsheet' && (
        <SpreadsheetViewer
          open
          onClose={() => setViewerFile(null)}
          src={vSrc}
          fileName={viewerFile?.name ?? ''}
        />
      )}
      {vType === 'doc' && (
        <DocViewer
          open
          onClose={() => setViewerFile(null)}
          src={vSrc}
          mimeType={viewerFile?.mime_type ?? ''}
          fileName={viewerFile?.name ?? ''}
        />
      )}
    </Box>
  );
}
