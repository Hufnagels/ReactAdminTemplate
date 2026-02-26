/*
 * pages/files/FileManager2.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose : Improved file manager with a MUI X SimpleTreeView sidebar for
 *           folder navigation. Left panel shows a hierarchical folder tree;
 *           right panel shows the file grid with search and type-specific
 *           viewers. Selecting a tree node filters the file grid instantly.
 *
 * Relationships
 *   Dispatches : filesSlice.{ fetchFiles, fetchFile, uploadFile, updateFile, deleteFile }
 *   Reads      : state.files.{ list, loading, saving }
 *   Components : FileDropzone, ImageViewer, PdfViewer, SpreadsheetViewer, DocViewer
 *
 * Key sub-components (file-local)
 *   FileInfoDialog – collects metadata before upload
 *   EditDialog    – updates description / tags / project / folder
 *   FileCard      – individual file card in the grid
 *
 * Key state
 *   selectedItem  – currently selected tree node id ('root' | 'folder-<name>')
 *   currentFolder – null = all files | string = inside that named folder
 *   searchQuery   – real-time name / tag / project filter (spans all folders)
 *   queue         – Files[] waiting for FileInfoDialog
 */
import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
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
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import ArticleIcon from '@mui/icons-material/Article';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SearchIcon from '@mui/icons-material/Search';
import type { RootState, AppDispatch } from '../../app/store';
import type { FileItem } from '../../features/files/filesSlice';
import { fetchFiles, fetchFile, uploadFile, updateFile, deleteFile, toggleFolderLock } from '../../features/files/filesSlice';
import FileDropzone from '../../components/common/FileDropzone';
import ImageViewer from '../../components/common/viewers/ImageViewer';
import PdfViewer from '../../components/common/viewers/PdfViewer';
import SpreadsheetViewer from '../../components/common/viewers/SpreadsheetViewer';
import DocViewer from '../../components/common/viewers/DocViewer';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(n: number): string {
  if (n < 1024)         return `${n} B`;
  if (n < 1024 * 1024)  return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string, size = 48) {
  const sx = { fontSize: size };
  if (mimeType.startsWith('image/'))     return <ImageIcon        sx={{ ...sx, color: '#4caf50' }} />;
  if (mimeType === 'application/pdf')    return <PictureAsPdfIcon sx={{ ...sx, color: '#f44336' }} />;
  if (mimeType.includes('spreadsheet') || mimeType === 'text/csv' || mimeType.includes('excel'))
                                          return <TableChartIcon  sx={{ ...sx, color: '#2196f3' }} />;
  if (mimeType.includes('word') || mimeType === 'text/plain')
                                          return <ArticleIcon     sx={{ ...sx, color: '#ff9800' }} />;
  return <InsertDriveFileIcon sx={{ ...sx, color: 'text.disabled' }} />;
}

function viewerType(mimeType: string): 'image' | 'pdf' | 'spreadsheet' | 'doc' {
  if (mimeType.startsWith('image/'))   return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('spreadsheet') || mimeType === 'text/csv' || mimeType.includes('excel'))
    return 'spreadsheet';
  return 'doc';
}

// ── Tree label components ─────────────────────────────────────────────────────
function AllFilesLabel({ count }: { count: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.25 }}>
      <FolderOpenIcon sx={{ fontSize: 18, color: 'primary.main' }} />
      <Typography variant="body2" fontWeight={600} component="span">All Files</Typography>
      <Typography variant="caption" color="text.secondary">({count})</Typography>
    </Box>
  );
}

function FolderLabel({ name, count, locked, onToggleLock }: {
  name:         string;
  count:        number;
  locked:       boolean;
  onToggleLock: (e: React.MouseEvent) => void;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.25, width: '100%' }}>
      <FolderIcon sx={{ fontSize: 18, color: locked ? 'text.disabled' : 'warning.main', flexShrink: 0 }} />
      <Typography variant="body2" component="span" sx={{ flex: 1, color: locked ? 'text.disabled' : 'text.primary' }}>
        {name}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>({count})</Typography>
      <Tooltip title={locked ? 'Unlock folder' : 'Lock folder'} placement="right">
        <IconButton
          size="small"
          onClick={onToggleLock}
          sx={{ p: 0.25, ml: 0.5, flexShrink: 0 }}
          color={locked ? 'error' : 'default'}
        >
          {locked ? <LockIcon sx={{ fontSize: 14 }} /> : <LockOpenIcon sx={{ fontSize: 14 }} />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ── FileInfoDialog ────────────────────────────────────────────────────────────
interface PendingFile { file: File }

function FileInfoDialog({
  pending, onCancel, onUpload, saving, defaultFolder, lockedFolders,
}: {
  pending:       PendingFile | null;
  onCancel:      () => void;
  onUpload:      (desc: string, tags: string[], project: string, folder: string) => void;
  saving:        boolean;
  defaultFolder: string;
  lockedFolders: string[];
}) {
  const [description, setDescription] = useState('');
  const [tags,        setTags]        = useState<string[]>([]);
  const [project,     setProject]     = useState('');
  const [folder,      setFolder]      = useState('');

  useEffect(() => {
    if (pending) { setDescription(''); setTags([]); setProject(''); setFolder(defaultFolder); }
  }, [pending, defaultFolder]);

  if (!pending) return null;
  const { file } = pending;

  const folderIsLocked = folder !== '' && lockedFolders.includes(folder);

  return (
    <Dialog open onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>File Info</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {getFileIcon(file.type)}
            <Box>
              <Typography variant="body1" fontWeight={600}>{file.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {file.type || 'unknown'} · {formatBytes(file.size)}
              </Typography>
            </Box>
          </Box>

          <TextField
            label="Description" multiline minRows={2} fullWidth size="small"
            value={description} onChange={(e) => setDescription(e.target.value)}
          />

          <Autocomplete
            multiple freeSolo options={[]}
            value={tags} onChange={(_, v) => setTags(v as string[])}
            slotProps={{ chip: { size: 'small' } as object }}
            renderInput={(params) => (
              <TextField {...params} label="Tags" size="small" placeholder="Type and press Enter" />
            )}
          />

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              label="Project" size="small" sx={{ flex: 1 }}
              value={project} onChange={(e) => setProject(e.target.value)}
              placeholder="e.g. analytics"
            />
            <TextField
              label="Folder" size="small" sx={{ flex: 1 }}
              value={folder} onChange={(e) => setFolder(e.target.value)}
              placeholder="e.g. reports"
              error={folderIsLocked}
            />
          </Box>

          {folderIsLocked && (
            <Alert severity="error" icon={<LockIcon fontSize="inherit" />}>
              Folder <strong>{folder}</strong> is locked — unlock it first to upload here.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={saving || folderIsLocked}
          onClick={() => onUpload(description, tags, project, folder)}>
          {saving ? 'Uploading…' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── EditDialog ────────────────────────────────────────────────────────────────
function EditDialog({
  file, onClose, onSave, saving,
}: {
  file:    FileItem | null;
  onClose: () => void;
  onSave:  (desc: string, tags: string[], project: string, folder: string) => void;
  saving:  boolean;
}) {
  const [description, setDescription] = useState('');
  const [tags,        setTags]        = useState<string[]>([]);
  const [project,     setProject]     = useState('');
  const [folder,      setFolder]      = useState('');

  useEffect(() => {
    if (file) {
      setDescription(file.description);
      setTags(file.tags);
      setProject(file.project);
      setFolder(file.folder);
    }
  }, [file]);

  if (!file) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit — {file.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Description" multiline minRows={2} fullWidth size="small"
            value={description} onChange={(e) => setDescription(e.target.value)}
          />
          <Autocomplete
            multiple freeSolo options={[]}
            value={tags} onChange={(_, v) => setTags(v as string[])}
            slotProps={{ chip: { size: 'small' } as object }}
            renderInput={(params) => (
              <TextField {...params} label="Tags" size="small" placeholder="Type and press Enter" />
            )}
          />
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              label="Project" size="small" sx={{ flex: 1 }}
              value={project} onChange={(e) => setProject(e.target.value)}
            />
            <TextField
              label="Folder" size="small" sx={{ flex: 1 }}
              value={folder} onChange={(e) => setFolder(e.target.value)}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={saving}
          onClick={() => onSave(description, tags, project, folder)}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── FileCard ──────────────────────────────────────────────────────────────────
function FileCard({ file, onView, onEdit, onDelete, locked }: {
  file:     FileItem;
  onView:   (file: FileItem) => void;
  onEdit:   (file: FileItem) => void;
  onDelete: (id: number) => void;
  locked:   boolean;
}) {
  const isImage = file.mime_type.startsWith('image/');

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={() => onView(file)}
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}>
        <Box sx={{
          height: 120, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'action.hover', overflow: 'hidden',
        }}>
          {isImage && file.content_base64 ? (
            <Box component="img" src={file.content_base64} alt={file.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          {file.project && (
            <Typography variant="caption" color="primary" display="block">
              {file.project}
            </Typography>
          )}
          {file.description && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{
              mt: 0.5, overflow: 'hidden',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {file.description}
            </Typography>
          )}
          {file.tags.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {file.tags.map((t) => <Chip key={t} label={t} size="small" variant="outlined" />)}
            </Box>
          )}
        </CardContent>
      </CardActionArea>

      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        {locked && (
          <Tooltip title="Folder is locked">
            <LockIcon sx={{ fontSize: 14, color: 'text.disabled', mr: 'auto', ml: 0.5 }} />
          </Tooltip>
        )}
        <IconButton size="small" disabled={locked} onClick={() => onEdit(file)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" disabled={locked} onClick={() => onDelete(file.id)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
}

// ── FileManager2 page ─────────────────────────────────────────────────────────
export default function FileManager2() {
  const dispatch = useDispatch<AppDispatch>();
  const list          = useSelector((s: RootState) => s.files.list);
  const loading       = useSelector((s: RootState) => s.files.loading);
  const saving        = useSelector((s: RootState) => s.files.saving);
  const lockedFolders = useSelector((s: RootState) => s.files.lockedFolders);

  const [queue,         setQueue]         = useState<File[]>([]);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [selectedItem,  setSelectedItem]  = useState<string>('root');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>(['root']);
  const [editTarget,    setEditTarget]    = useState<FileItem | null>(null);
  const [viewerFile,    setViewerFile]    = useState<FileItem | null>(null);

  const pending: PendingFile | null = queue.length > 0 ? { file: queue[0] } : null;

  useEffect(() => {
    if (list.length === 0) dispatch(fetchFiles());
  }, [dispatch, list.length]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const folders = useMemo(
    () => [...new Set(list.map((f) => f.folder).filter(Boolean))].sort(),
    [list]
  );

  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return list.filter((f) => {
      const matchSearch = !q
        || f.name.toLowerCase().includes(q)
        || f.tags.some((t) => t.toLowerCase().includes(q))
        || f.project.toLowerCase().includes(q);
      // When searching, show across all folders
      if (q) return matchSearch;
      // No search: filter by tree selection
      if (currentFolder === null) return true;      // "All Files" node
      return f.folder === currentFolder;
    });
  }, [list, searchQuery, currentFolder]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSelect = (_: React.SyntheticEvent | null, id: string | null) => {
    if (!id) return;
    setSelectedItem(id);
    setSearchQuery('');
    if (id === 'root') {
      setCurrentFolder(null);
    } else {
      setCurrentFolder(id.slice('folder-'.length));
    }
  };

  const handleToggleLock = (name: string) => dispatch(toggleFolderLock(name));

  const handleExpandedItemsChange = (_: React.SyntheticEvent | null, ids: string[]) => {
    // Always keep root expanded — prevent collapse
    setExpandedItems(ids.includes('root') ? ids : ['root', ...ids]);
  };

  const handleDrop = (files: File[]) => setQueue((q) => [...q, ...files]);

  const handleUpload = (desc: string, tags: string[], project: string, folder: string) => {
    const file = queue[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const today   = new Date().toISOString().slice(0, 10);
      await dispatch(uploadFile({
        name:           file.name,
        mime_type:      file.type || 'application/octet-stream',
        size:           file.size,
        description:    desc,
        tags,
        uploaded:       today,
        project,
        folder,
        content_base64: dataUrl,
      }));
      setQueue((q) => q.slice(1));
    };
    reader.readAsDataURL(file);
  };

  const handleView = async (file: FileItem) => {
    if (!file.content_base64) {
      const result = await dispatch(fetchFile(file.id));
      if (fetchFile.fulfilled.match(result)) setViewerFile(result.payload);
    } else {
      setViewerFile(file);
    }
  };

  const handleSaveEdit = async (desc: string, tags: string[], project: string, folder: string) => {
    if (!editTarget) return;
    await dispatch(updateFile({ id: editTarget.id, description: desc, tags, project, folder }));
    setEditTarget(null);
  };

  // ── Viewer routing ──────────────────────────────────────────────────────────
  const vType = viewerFile ? viewerType(viewerFile.mime_type) : null;
  const vSrc  = viewerFile?.content_base64 ?? '';

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        File Manager
      </Typography>
      
      {/* Dropzone */}
      {/* <Box sx={{ mb: 3 }}>
        <FileDropzone onFiles={handleDrop} />
      </Box> */}

      <Grid container spacing={{ xs: 2, md: 3 }} columns={{ xs: 2, sm: 8, md: 12, lg: 12, xl: 16 }}>
          {/* <Grid  size={{ xs: 12, sm: 12, md: 4, lg: 3, xl: 3 }} sx={{ display: { xs: 'none', sm: 'block' } }}> */}
          <Grid size={{ xs: 2, sm: 4, md: 4 , lg: 3, xl: 3 }} sx={{  display: { xs: 'none', sm: 'none' , md:'block'} }}>
                
            <Stack
              direction="column"
              divider={<Divider orientation="vertical" flexItem />}
              spacing={2}
            >
              {/* Toolbar: search + context label */}
            
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  placeholder="Search files…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ width: 260 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                
              </Box>
              
              {/* ── Left: Tree panel ── */}
              <Paper
                variant="outlined"
                sx={{  flexShrink: 0, p: 1.5, position: 'sticky', top: 16 }}
              >
                
                
                <Typography variant="caption" color="text.secondary" fontWeight={600}
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.8, px: 0.5 }}>
                  Folders
                </Typography>
                <Divider sx={{ my: 1 }} />

                {searchQuery ? (
                    <Typography variant="body2" color="text.secondary">
                      Searching across all folders
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {currentFolder ? <>Folder: <strong>{currentFolder}</strong></> : 'Showing all files'}
                    </Typography>
                  ) }
                <Divider sx={{ my: 1 }} />
                <SimpleTreeView
                  selectedItems={selectedItem}
                  onSelectedItemsChange={handleSelect}
                  expandedItems={expandedItems}
                  onExpandedItemsChange={handleExpandedItemsChange}
                  sx={{ '& .MuiTreeItem-root': { userSelect: 'none' } }}
                >
                  <TreeItem
                    itemId="root"
                    label={<AllFilesLabel count={list.length} />}
                  >
                    {folders.map((name) => (
                      <TreeItem
                        key={name}
                        itemId={`folder-${name}`}
                        label={
                          <FolderLabel
                            name={name}
                            count={list.filter((f) => f.folder === name).length}
                            locked={lockedFolders.includes(name)}
                            onToggleLock={(e) => { e.stopPropagation(); handleToggleLock(name); }}
                          />
                        }
                      />
                    ))}
                  </TreeItem>
                </SimpleTreeView>
              </Paper>

              {/* Dropzone */}
              <Box sx={{  mb: 3,display: { xs: 'none', sm: 'none' , md:'block'} }}>
                <FileDropzone onFiles={handleDrop} />
              </Box>
            </Stack>
            
          </Grid>
          {/* <Grid  size={{ xs: 2, sm: 4, md: 8 , lg: 9, xl: 10 }} sx={{ display: { xs: 'block', sm: 'block' } }}> */}
          <Grid  size={{ xs: 12, sm: 12, md: 8 , lg: 9, xl: 13 }}>
          {/* Two-panel layout */}
      {/* <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}> */}

          {/* Dropzone */}
          <Box sx={{  mb: 3,display: { xs: 'block', sm: 'block' , md:'none'} }}>
            <FileDropzone onFiles={handleDrop} />
          </Box>
          
          {/* File grid */}
          {loading ? (
            <Grid container spacing={2}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                  <Skeleton variant="rounded" height={220} />
                </Grid>
              ))}
            </Grid>
          ) : filteredList.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">
                {searchQuery
                  ? `No files match "${searchQuery}".`
                  : currentFolder
                    ? `No files in "${currentFolder}".`
                    : 'No files yet. Drop some above to get started.'}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredList.map((file) => (
                <Grid key={file.id} size={{ xs: 12, sm: 12, md: 6, lg: 4, xl: 3 }}>
                  <FileCard
                    file={file}
                    onView={handleView}
                    onEdit={setEditTarget}
                    onDelete={(id) => dispatch(deleteFile(id))}
                    locked={file.folder !== '' && lockedFolders.includes(file.folder)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        {/* </Box>
      </Box> */}
          </Grid>
      </Grid>
      {/* Dropzone */}
      {/* <Box sx={{ mb: 3 }}>
        <FileDropzone onFiles={handleDrop} />
      </Box> */}

      

      {/* Dialogs */}
      <FileInfoDialog
        pending={pending}
        onCancel={() => setQueue((q) => q.slice(1))}
        onUpload={handleUpload}
        saving={saving}
        defaultFolder={currentFolder ?? ''}
        lockedFolders={lockedFolders}
      />
      <EditDialog
        file={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
        saving={saving}
      />

      {/* Viewers */}
      {vType === 'image' && (
        <ImageViewer open onClose={() => setViewerFile(null)} src={vSrc} title={viewerFile?.name} />
      )}
      {vType === 'pdf' && (
        <PdfViewer open onClose={() => setViewerFile(null)} src={vSrc} title={viewerFile?.name} />
      )}
      {vType === 'spreadsheet' && (
        <SpreadsheetViewer open onClose={() => setViewerFile(null)} src={vSrc} fileName={viewerFile?.name ?? ''} />
      )}
      {vType === 'doc' && (
        <DocViewer open onClose={() => setViewerFile(null)} src={vSrc}
          mimeType={viewerFile?.mime_type ?? ''} fileName={viewerFile?.name ?? ''} />
      )}
    </Box>
  );
}
