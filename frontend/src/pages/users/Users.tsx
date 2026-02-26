/*
 * pages/users/Users.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose : User management table page. Full CRUD: lists all users, opens a
 *           modal to add or edit a user (with avatar, email validation, and
 *           password strength indicator), and supports inline row deletion.
 *
 * Relationships
 *   Dispatches : usersSlice.{ fetchUsers, createUser, updateUser, deleteUser }
 *   Reads      : state.users.{ list, loading }
 *   Libraries  : material-react-table v3
 *   Uses       : components/common/AvatarDropzone, AvatarCropDialog
 *
 * Key components
 *   UserDialog – add/edit modal with avatar toggle, email validation,
 *                password strength bar (LinearProgress), and crop dialog
 *
 * Key types
 *   UserFormData – local form state { name, email, role, status, joined,
 *                  password, avatar_mode, avatar_base64 }
 *   DialogTarget – UserRow | 'new' | null
 *
 * Key helpers
 *   getStrength(pw) – scores password 1–4; returns { score, label, color }
 */
import { useEffect, useMemo, useState } from 'react';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import type { MRT_ColumnDef } from 'material-react-table';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import LinearProgress from '@mui/material/LinearProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { fetchUsers, createUser, updateUser, deleteUser } from '../../features/users/usersSlice';
import type { UserRow } from '../../features/users/usersSlice';
import type { RootState, AppDispatch } from '../../app/store';
import AvatarDropzone from '../../components/common/HadlingAvatars/AvatarDropzone';
import AvatarCropDialog from '../../components/common/HadlingAvatars/AvatarCropDialog';
import { getStrength } from '../../components/common/fuctions';


// ── User dialog ───────────────────────────────────────────────────────────────
type DialogTarget = UserRow | 'new' | null;

interface UserFormData {
  name: string;
  email: string;
  role: string;
  status: string;
  joined: string;
  password: string;
  avatar_mode: 'letter' | 'image';
  avatar_base64: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toForm(target: Exclude<DialogTarget, null>): UserFormData {
  if (target === 'new')
    return { name: '', email: '', role: 'viewer', status: 'active', joined: new Date().toISOString().slice(0, 10), password: '', avatar_mode: 'letter', avatar_base64: null };
  return {
    name: target.name, email: target.email, role: target.role,
    status: target.status, joined: target.joined, password: '',
    avatar_mode: target.avatar_mode ?? 'letter',
    avatar_base64: target.avatar_base64 ?? null,
  };
}

function UserDialog({ target, onClose, onSave }: {
  target: DialogTarget;
  onClose: () => void;
  onSave: (data: UserFormData) => void;
}) {
  const [form, setForm] = useState<UserFormData>({
    name: '', email: '', role: 'viewer', status: 'active',
    joined: '', password: '', avatar_mode: 'letter', avatar_base64: null,
  });
  const [emailTouched, setEmailTouched]   = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [cropOpen, setCropOpen]           = useState(false);
  const [cropImage, setCropImage]         = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setForm(toForm(target));
      setEmailTouched(false);
      setShowPassword(false);
      setCropImage(null);
    }
  }, [target]);

  const set = (field: keyof UserFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const openCropWith = (img: string) => { setCropImage(img); setCropOpen(true); };

  const isNew      = target === 'new';
  const emailError = emailTouched && !EMAIL_RE.test(form.email);
  const strength   = getStrength(form.password);
  const canSave    = EMAIL_RE.test(form.email) && (!isNew || form.password.length > 0);
  const initials   = form.name[0]?.toUpperCase() ?? '?';

  return (
    <>
      {/* ── Main dialog ─────────────────────────────────────────────────── */}
      <Dialog open={target !== null} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isNew ? 'Add User' : 'Edit User'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>

            {/* Avatar */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                Avatar
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                {form.avatar_mode === 'image' && form.avatar_base64 ? (
                  <Avatar src={form.avatar_base64} sx={{ width: 56, height: 56, mt: 0.5 }} />
                ) : (
                  <Avatar sx={{ width: 56, height: 56, mt: 0.5, bgcolor: 'primary.main', fontSize: '1.4rem' }}>
                    {initials}
                  </Avatar>
                )}
                <Stack spacing={1} sx={{ flex: 1 }}>
                  <ToggleButtonGroup
                    value={form.avatar_mode}
                    exclusive
                    size="small"
                    onChange={(_, v) => {
                      if (v) setForm((p) => ({ ...p, avatar_mode: v, avatar_base64: v === 'letter' ? null : p.avatar_base64 }));
                    }}
                  >
                    <ToggleButton value="letter">
                      <TextFieldsIcon fontSize="small" sx={{ mr: 0.5 }} />Letter
                    </ToggleButton>
                    <ToggleButton value="image">
                      <ImageIcon fontSize="small" sx={{ mr: 0.5 }} />Image
                    </ToggleButton>
                  </ToggleButtonGroup>
                  {form.avatar_mode === 'image' && (
                    form.avatar_base64 ? (
                      <Button size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }}
                        onClick={() => openCropWith(form.avatar_base64!)}>
                        Change photo
                      </Button>
                    ) : (
                      <AvatarDropzone onFile={openCropWith} />
                    )
                  )}
                </Stack>
              </Box>
            </Box>

            <TextField label="Name"  value={form.name}  onChange={set('name')}  size="small" fullWidth />
            <TextField
              label="Email"
              value={form.email}
              onChange={set('email')}
              onBlur={() => setEmailTouched(true)}
              size="small"
              fullWidth
              type="email"
              error={emailError}
              helperText={emailError ? 'Enter a valid email address' : undefined}
            />
            <TextField label="Role" value={form.role} onChange={set('role')} size="small" fullWidth select>
              {['admin', 'editor', 'viewer'].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField label="Status" value={form.status} onChange={set('status')} size="small" fullWidth select>
              {['active', 'inactive'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField
              label="Joined"
              value={form.joined}
              onChange={set('joined')}
              size="small"
              fullWidth
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
            />

            {/* Password + strength */}
            <Box>
              <FormControl fullWidth size="small" variant="outlined">
                <InputLabel htmlFor="user-dialog-password">
                  {isNew ? 'Password' : 'New Password'}
                </InputLabel>
                <OutlinedInput
                  id="user-dialog-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder={isNew ? '' : 'Leave blank to keep current'}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'hide the password' : 'display the password'}
                        onClick={() => setShowPassword((s) => !s)}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseUp={(e) => e.preventDefault()}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label={isNew ? 'Password' : 'New Password'}
                />
              </FormControl>
              {form.password && (
                <Box sx={{ mt: 0.75 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(strength.score / 4) * 100}
                    sx={{
                      height: 5, borderRadius: 3, bgcolor: 'divider',
                      '& .MuiLinearProgress-bar': { bgcolor: strength.color, transition: 'none' },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: strength.color }}>
                    {strength.label} — use 8+ chars, uppercase, number and symbol for a strong password
                  </Typography>
                </Box>
              )}
            </Box>

          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" disabled={!canSave} onClick={() => onSave(form)}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* ── Crop dialog ─────────────────────────────────────────────────── */}
      <AvatarCropDialog
        open={cropOpen}
        onClose={() => setCropOpen(false)}
        onApply={(base64) => setForm((p) => ({ ...p, avatar_base64: base64 }))}
        image={cropImage}
        title="Edit Photo"
      />
    </>
  );
}

// ── Users page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const dispatch = useDispatch<AppDispatch>();
  const data     = useSelector((s: RootState) => s.users.list);
  const loading  = useSelector((s: RootState) => s.users.loading);
  const [dialogTarget, setDialogTarget] = useState<DialogTarget>(null);

  useEffect(() => {
    if (data.length === 0) dispatch(fetchUsers());
  }, [dispatch, data.length]);

  const handleSave = (form: UserFormData) => {
    const { password, ...rest } = form;
    const payload = { ...rest, ...(password ? { password } : {}) };
    if (dialogTarget === 'new') {
      dispatch(createUser(payload));
    } else if (dialogTarget) {
      dispatch(updateUser({ ...dialogTarget, ...payload }));
    }
    setDialogTarget(null);
  };

  const columns = useMemo<MRT_ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'User',
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {row.original.avatar_mode === 'image' && row.original.avatar_base64 ? (
              <Avatar src={row.original.avatar_base64} sx={{ width: 32, height: 32 }} />
            ) : (
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
                {row.original.name[0]}
              </Avatar>
            )}
            <Typography variant="body2" fontWeight={500}>{row.original.name}</Typography>
          </Box>
        ),
      },
      { accessorKey: 'email',  header: 'Email'  },
      {
        accessorKey: 'role',
        header: 'Role',
        Cell: ({ cell }) => {
          const role = cell.getValue<string>();
          const color =
            role === 'admin'  ? 'error'   :
            role === 'editor' ? 'info' : 'default';
          return <Chip label={role} size="small" color={color} />;
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue<string>()}
            size="small"
            color={cell.getValue<string>() === 'active' ? 'success' : 'default'}
          />
        ),
      },
      { accessorKey: 'joined', header: 'Joined' },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data,
    enableColumnFilters: true,
    enableGlobalFilter: true,
    enableSorting: true,
    enablePagination: true,
    enableRowActions: true,
    positionActionsColumn: 'last',
    state: { isLoading: loading },
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
      showGlobalFilter: true,
      density: 'compact',
    },
    muiSearchTextFieldProps: { placeholder: 'Search users…', size: 'small', sx: { width: 280 } },
    muiPaginationProps: { rowsPerPageOptions: [5, 10, 25] },
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex' }}>
        <IconButton size="small" onClick={() => setDialogTarget(row.original)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => dispatch(deleteUser(row.original.id))}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    ),
    renderTopToolbarCustomActions: () => (
      <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setDialogTarget('new')}>
        Add User
      </Button>
    ),
  });

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Users
      </Typography>
      <MaterialReactTable table={table} />
      <UserDialog
        target={dialogTarget}
        onClose={() => setDialogTarget(null)}
        onSave={handleSave}
      />
    </Box>
  );
}
