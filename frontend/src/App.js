import React, { useState } from "react";
import {
  Container, Box, Typography, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, 
  Grid, Card, CardContent, CardActions, Tooltip, Chip, Paper,
  TextField, List, ListItem, ListItemIcon, ListItemText, Divider
} from "@mui/material";
import {
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  PictureAsPdf as PdfIcon,
  Visibility as PreviewIcon,
  Download as DownloadIcon,
  LayersClear as LayersClearIcon,
  AutoAwesomeMosaic as MergeIcon,
  AutoFixHigh as MagicIcon,
  DragIndicator as DragHandleIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Shuffle as ReorderIcon,
  HelpOutline as HelpIcon,
  MenuBook as BookIcon
} from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import axios from "axios";

// DnD Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Use the environment variable if deployed, otherwise fallback to localhost for development
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Vibrant, colorful theme
const theme = createTheme({
  palette: {
    primary: { main: '#8b5cf6' },
    secondary: { main: '#ec4899' },
    success: { main: '#10b981' },
    warning: { main: '#f59e0b' },
    info: { main: '#06b6d4' },
    error: { main: '#f43f5e' },
    background: { default: 'transparent', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Nunito", "Inter", "Roboto", "Helvetica", sans-serif',
    h5: { fontWeight: 800 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 700 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 700, borderRadius: 12, padding: '8px 20px' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 24 }
      }
    }
  },
});

// Sortable Component for Individual Pages inside Reorder Dialog
function SortablePageTile({ pageId, index }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pageId });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <Grid item xs={4} sm={3} md={2} ref={setNodeRef} style={style}>
      <Paper 
        {...attributes} 
        {...listeners}
        elevation={isDragging ? 4 : 1}
        sx={{
          p: 2,
          textAlign: 'center',
          borderRadius: 3,
          background: isDragging ? 'linear-gradient(135deg, #8b5cf6, #c084fc)' : 'white',
          color: isDragging ? 'white' : 'text.primary',
          cursor: 'grab',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isDragging ? 'scale(1.05)' : 'scale(1)',
          '&:active': { cursor: 'grabbing' },
          '&:hover': { 
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
          }
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {pageId}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.9 }}>
          New Page {index}
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', opacity: isDragging ? 1 : 0.4 }}>
          <DragHandleIcon fontSize="small" />
        </Box>
      </Paper>
    </Grid>
  );
}

// Sortable Component for individual file cards
function SortableFileCard({ 
  file, 
  openPreviewDialog, 
  openDeleteDialog, 
  openReorderDialog,
  deleteFile, 
  downloadFile,
  renameFile
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(file.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: file.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const handleSaveRename = () => {
    let finalName = tempName.trim() || "Document.pdf";
    if (!finalName.toLowerCase().endsWith('.pdf')) finalName += '.pdf';
    renameFile(file.id, finalName);
    setIsEditing(false);
  };

  return (
    <Grid item xs={12} sm={6} md={4} ref={setNodeRef} style={style}>
      <Card sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        borderRadius: 4,
        position: 'relative',
        boxShadow: isDragging ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : undefined,
      }}>
        <CardContent sx={{ flexGrow: 1, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Box 
              {...attributes} 
              {...listeners}
              sx={{ 
                p: 1.5, 
                borderRadius: 3, 
                bgcolor: 'rgba(241, 245, 249, 0.8)', 
                mr: 2,
                display: 'flex',
                cursor: 'grab',
                '&:active': { cursor: 'grabbing' },
                color: '#94a3b8',
                '&:hover': { bgcolor: '#e2e8f0', color: '#64748b' }
              }}
              title="Drag to reorder"
            >
              <DragHandleIcon />
            </Box>
            <Box sx={{ overflow: 'hidden', pt: 0.5, flexGrow: 1 }}>
              {isEditing ? (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TextField 
                    size="small" 
                    value={tempName} 
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => { 
                      if(e.key === 'Enter') handleSaveRename(); 
                      if(e.key === 'Escape') { setTempName(file.name); setIsEditing(false); } 
                    }}
                    autoFocus
                    sx={{ mr: 0.5, flexGrow: 1 }}
                  />
                  <IconButton size="small" onClick={handleSaveRename} color="success"><CheckIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => { setTempName(file.name); setIsEditing(false); }} color="error"><CloseIcon fontSize="small" /></IconButton>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="subtitle1" noWrap title={file.name} sx={{ mr: 1, flexGrow: 1 }}>
                    {file.name}
                  </Typography>
                  <IconButton size="small" onClick={() => setIsEditing(true)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              
              <Chip 
                label={`${file.pageCount || '-'} Pages`} 
                size="small" 
                sx={{ mt: 1, bgcolor: '#f0fdfa', color: '#0d9488', fontWeight: 700 }} 
              />
            </Box>
          </Box>
        </CardContent>
        
        <CardActions sx={{ bgcolor: 'rgba(248, 250, 252, 0.6)', p: 2, justifyContent: 'space-between', borderTop: '1px solid rgba(241, 245, 249, 0.8)' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Preview">
              <IconButton onClick={() => openPreviewDialog(file)} size="small" sx={{ color: '#0ea5e9', bgcolor: '#e0f2fe', '&:hover': { bgcolor: '#bae6fd' } }}>
                <PreviewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reorder Pages">
              <IconButton 
                onClick={() => openReorderDialog(file)} 
                disabled={file.pageCount == null || file.pageCount <= 1}
                size="small"
                sx={{ color: '#8b5cf6', bgcolor: '#f3e8ff', '&:hover': { bgcolor: '#e9d5ff' } }}
              >
                <ReorderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Slice Pages">
              <IconButton 
                onClick={() => openDeleteDialog(file)} 
                disabled={file.pageCount == null}
                size="small"
                sx={{ color: '#f59e0b', bgcolor: '#fef3c7', '&:hover': { bgcolor: '#fde68a' } }}
              >
                <LayersClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton onClick={() => deleteFile(file.id)} size="small" sx={{ color: '#f43f5e', bgcolor: '#ffe4e6', '&:hover': { bgcolor: '#fecdd3' } }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Button 
            onClick={() => downloadFile(file.id, file.name)} 
            variant="contained" 
            size="small"
            color="success"
            startIcon={<DownloadIcon />}
            sx={{ boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)' }}
          >
            Save
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );
}

function App() {
  const [files, setFiles] = useState([]);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pagesToDelete, setPagesToDelete] = useState([]);
  
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [pageOrder, setPageOrder] = useState([]); 
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [mergeFilename, setMergeFilename] = useState("Perfect_Merged_Document.pdf");

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handlePageDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setPageOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const onDrop = async (acceptedFiles) => {
    const uploads = await Promise.all(
      acceptedFiles.map(async (file) => {
        if (file.size > 20 * 1024 * 1024) {
          alert(`${file.name} exceeds 20 MB limit`);
          return null;
        }
        try {
          const form = new FormData();
          form.append("file", file);
          const resp = await axios.post(`${API_URL}/upload`, form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          const pcResp = await axios.get(`${API_URL}/page_count/${resp.data.file_id}`);
          return { id: resp.data.file_id, name: file.name, pageCount: pcResp.data.page_count };
        } catch (error) {
          alert(`Failed to upload ${file.name}:\n${error.response?.data?.detail || error.message}`);
          return null;
        }
      })
    );
    setFiles((prev) => [...prev, ...uploads.filter(Boolean)]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxFiles: 5,
    accept: { 'application/pdf': ['.pdf'] }
  });

  const deleteFile = async (id) => {
    await axios.delete(`${API_URL}/remove/${id}`);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const renameFile = (id, newName) => {
    setFiles((prev) => prev.map(f => f.id === id ? { ...f, name: newName } : f));
  };

  const mergeFiles = async () => {
    const ids = files.map((f) => f.id);
    const resp = await axios.post(`${API_URL}/merge`, { file_ids: ids });
    const pcResp = await axios.get(`${API_URL}/page_count/${resp.data.file_id}`);
    
    let finalName = mergeFilename.trim() || "Perfect_Merged_Document.pdf";
    if (!finalName.toLowerCase().endsWith('.pdf')) finalName += '.pdf';

    const merged = { id: resp.data.file_id, name: finalName, pageCount: pcResp.data.page_count };
    setFiles([merged]);
  };

  const downloadFile = (id, name) => {
    const link = document.createElement("a");
    link.href = `${API_URL}/download/${id}?name=${encodeURIComponent(name)}`;
    link.download = name; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const openPreviewDialog = (file) => {
    setSelectedFile(file);
    setPreviewDialogOpen(true);
  };

  const openDeleteDialog = (file) => {
    setSelectedFile(file);
    setPagesToDelete([]);
    setDeleteDialogOpen(true);
  };
  
  const openReorderDialog = (file) => {
    setSelectedFile(file);
    setPageOrder(Array.from({ length: file.pageCount }, (_, i) => String(i + 1)));
    setReorderDialogOpen(true);
  };

  const togglePage = (page) => {
    setPagesToDelete((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    );
  };

  const submitDeletePages = async () => {
    if (!selectedFile) return;
    const resp = await axios.post(`${API_URL}/delete_pages`, {
      file_id: selectedFile.id,
      pages: pagesToDelete,
    });
    const editedId = resp.data.file_id;
    const pcResp = await axios.get(`${API_URL}/page_count/${editedId}`);
    setFiles((prev) =>
      prev.map((f) => (f.id === selectedFile.id ? { id: editedId, name: selectedFile.name, pageCount: pcResp.data.page_count } : f))
    );
    setDeleteDialogOpen(false);
  };

  const submitReorderPages = async () => {
    if (!selectedFile) return;
    const resp = await axios.post(`${API_URL}/reorder_pages`, {
      file_id: selectedFile.id,
      page_order: pageOrder.map(Number),
    });
    const editedId = resp.data.file_id;
    const pcResp = await axios.get(`${API_URL}/page_count/${editedId}`);
    setFiles((prev) =>
      prev.map((f) => (f.id === selectedFile.id ? { id: editedId, name: selectedFile.name, pageCount: pcResp.data.page_count } : f))
    );
    setReorderDialogOpen(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Background Wrapper */}
      <Box sx={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        backgroundImage: `
          radial-gradient(at 10% 10%, rgba(139, 92, 246, 0.15) 0px, transparent 50%),
          radial-gradient(at 90% 10%, rgba(236, 72, 153, 0.15) 0px, transparent 50%),
          radial-gradient(at 50% 90%, rgba(245, 158, 11, 0.15) 0px, transparent 50%)
        `,
        backgroundAttachment: 'fixed',
        pb: 8
      }}>
        
        {/* Glassmorphism App Bar */}
        <AppBar position="sticky" elevation={0} sx={{ 
          bgcolor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.5)',
          zIndex: 1000
        }}>
          <Toolbar sx={{ py: 1 }}>
            <Box sx={{ 
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899, #f59e0b)',
              borderRadius: 2,
              p: 1,
              display: 'flex',
              mr: 2,
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
              <MagicIcon sx={{ color: 'white' }} />
            </Box>
            <Typography variant="h5" sx={{ 
              flexGrow: 1, 
              background: 'linear-gradient(to right, #8b5cf6, #ec4899, #f59e0b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px'
            }}>
              PerfectPDF
            </Typography>
            <Tooltip title="How to use">
              <Button 
                onClick={() => setHelpDialogOpen(true)}
                startIcon={<BookIcon />}
                sx={{ color: '#4f46e5', bgcolor: 'rgba(224, 231, 255, 0.5)', '&:hover': { bgcolor: 'rgba(224, 231, 255, 0.8)' } }}
              >
                Guide
              </Button>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: 6 }}>
          
          {/* Vibrant Dropzone */}
          <Box
            {...getRootProps()}
            sx={{
              border: '3px dashed',
              borderColor: isDragActive ? '#ec4899' : 'rgba(203, 213, 225, 0.8)',
              borderRadius: 6,
              p: 8,
              textAlign: "center",
              background: isDragActive 
                ? 'linear-gradient(135deg, rgba(253, 244, 255, 0.9) 0%, rgba(240, 253, 250, 0.9) 100%)' 
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(248, 250, 252, 0.7) 100%)',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              boxShadow: isDragActive 
                ? '0 15px 30px -5px rgba(236, 72, 153, 0.3)' 
                : '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
              '&:hover': {
                borderColor: '#8b5cf6',
                background: 'linear-gradient(135deg, rgba(250, 245, 255, 0.9) 0%, rgba(240, 253, 244, 0.9) 100%)',
                boxShadow: '0 15px 30px -5px rgba(139, 92, 246, 0.2)'
              }
            }}
          >
            <input {...getInputProps()} />
            <Box sx={{
              width: 90, height: 90, borderRadius: '50%', 
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3,
              boxShadow: '0 8px 16px rgba(236, 72, 153, 0.3)'
            }}>
              <CloudUploadIcon sx={{ fontSize: 45, color: 'white' }} />
            </Box>
            <Typography variant="h5" color="text.primary" gutterBottom>
              {isDragActive ? "Release to unleash colors!" : "Drag & drop your PDFs"}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              or click to browse from your device
            </Typography>
            <Chip 
              label="Max 5 files (20MB each)" 
              size="small" 
              sx={{ mt: 3, bgcolor: 'rgba(241, 245, 249, 0.8)', color: '#64748b', fontWeight: 600 }} 
            />
          </Box>

          {/* Quick Guide - Shows only when no files are uploaded */}
          {files.length === 0 && (
            <Box sx={{ mt: 8 }}>
              <Typography variant="h5" align="center" sx={{ mb: 4, fontWeight: 800, color: '#334155' }}>
                How to use PerfectPDF ✨
              </Typography>
              <Grid container spacing={4}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 4, borderRadius: 4, height: '100%', bgcolor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, color: '#4f46e5' }}>
                      <CloudUploadIcon />
                    </Box>
                    <Typography variant="h6" gutterBottom>1. Upload</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Drag and drop up to 5 PDF files at once (max 20MB each) into the glowing area above. 
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 4, borderRadius: 4, height: '100%', bgcolor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, color: '#db2777' }}>
                      <EditIcon />
                    </Box>
                    <Typography variant="h6" gutterBottom>2. Organize & Edit</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Rename files, preview them, shuffle their internal pages, or slice out unwanted pages completely.
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 4, borderRadius: 4, height: '100%', bgcolor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, color: '#d97706' }}>
                      <MergeIcon />
                    </Box>
                    <Typography variant="h6" gutterBottom>3. Merge & Save</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Drag the file cards to reorder them, type a custom name, and hit "Merge Magic" to combine them into one perfect PDF!
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Action Bar for Multiple Files */}
          {files.length > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 5, mb: -2 }}>
              <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>
                💡 Tip: Drag the cards below to rearrange them before merging.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 2 }}>
                <TextField 
                  size="small"
                  label="Merged Filename"
                  value={mergeFilename}
                  onChange={(e) => setMergeFilename(e.target.value)}
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.8)', 
                    backdropFilter: 'blur(8px)',
                    minWidth: 250,
                    '& .MuiOutlinedInput-root': { borderRadius: 3 }
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<MergeIcon />}
                  onClick={mergeFiles}
                  sx={{ 
                    background: 'linear-gradient(to right, #8b5cf6, #ec4899)',
                    color: 'white',
                    borderRadius: 3,
                    px: 3,
                    boxShadow: '0 4px 14px 0 rgba(236, 72, 153, 0.39)',
                    '&:hover': { background: 'linear-gradient(to right, #7c3aed, #db2777)' }
                  }}
                >
                  Merge Magic
                </Button>
              </Box>
            </Box>
          )}

          {/* Uploaded Files Grid with DnD */}
          {files.length > 0 && (
            <Box sx={{ mt: 6 }}>
              <Typography variant="h6" sx={{ mb: 3, color: '#334155' }}>Your Documents ({files.length})</Typography>
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Grid container spacing={4}>
                  <SortableContext 
                    items={files.map(f => f.id)}
                    strategy={rectSortingStrategy}
                  >
                    {files.map((f) => (
                      <SortableFileCard 
                        key={f.id} 
                        file={f} 
                        openPreviewDialog={openPreviewDialog}
                        openDeleteDialog={openDeleteDialog}
                        openReorderDialog={openReorderDialog}
                        deleteFile={deleteFile}
                        downloadFile={downloadFile}
                        renameFile={renameFile}
                      />
                    ))}
                  </SortableContext>
                </Grid>
              </DndContext>
            </Box>
          )}

        </Container>
      </Box>

      {/* --- INSTRUCTIONS / HELP DIALOG --- */}
      <Dialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #f1f5f9', bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" color="primary">Welcome to PerfectPDF</Typography>
          <IconButton onClick={() => setHelpDialogOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <List sx={{ py: 0 }}>
            <ListItem sx={{ py: 2 }}>
              <ListItemIcon><CloudUploadIcon sx={{ color: '#8b5cf6' }} /></ListItemIcon>
              <ListItemText primary="Uploading" secondary="Drag & drop up to 5 files into the glowing box. Files must be under 20MB." />
            </ListItem>
            <Divider />
            <ListItem sx={{ py: 2 }}>
              <ListItemIcon><EditIcon sx={{ color: '#06b6d4' }} /></ListItemIcon>
              <ListItemText primary="Renaming" secondary="Hover over any uploaded file's name and click the pencil icon to rename it." />
            </ListItem>
            <Divider />
            <ListItem sx={{ py: 2 }}>
              <ListItemIcon><DragHandleIcon sx={{ color: '#64748b' }} /></ListItemIcon>
              <ListItemText primary="Rearranging Files" secondary="Click and drag the grip icon on the left of any file card to change the order they will be merged in." />
            </ListItem>
            <Divider />
            <ListItem sx={{ py: 2 }}>
              <ListItemIcon><ReorderIcon sx={{ color: '#a855f7' }} /></ListItemIcon>
              <ListItemText primary="Reordering Pages" secondary="Click the purple shuffle button to open a grid of pages. Drag and drop the tiles to set a new page order for that document." />
            </ListItem>
            <Divider />
            <ListItem sx={{ py: 2 }}>
              <ListItemIcon><LayersClearIcon sx={{ color: '#f59e0b' }} /></ListItemIcon>
              <ListItemText primary="Deleting Pages" secondary="Click the amber layers button to see all pages. Tap the ones you want to erase (they turn red) and confirm." />
            </ListItem>
            <Divider />
            <ListItem sx={{ py: 2 }}>
              <ListItemIcon><MergeIcon sx={{ color: '#ec4899' }} /></ListItemIcon>
              <ListItemText primary="Merge Magic" secondary="Type a name in the text box and click 'Merge Magic' to combine all files in your current order into one seamless PDF." />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
          <Button onClick={() => setHelpDialogOpen(false)} variant="contained" color="primary">Got it!</Button>
        </DialogActions>
      </Dialog>


      {/* --- PREVIEW DIALOG --- */}
      <Dialog 
        open={previewDialogOpen} 
        onClose={() => setPreviewDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ sx: { height: '85vh', borderRadius: 4, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
          <Typography variant="h6" color="primary">Preview: {selectedFile?.name}</Typography>
          <Button onClick={() => setPreviewDialogOpen(false)} variant="outlined" color="primary" size="small">Close</Button>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {selectedFile && (
            <iframe
              title="PDF Preview"
              src={`${API_URL}/preview/${selectedFile.id}`}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* --- REORDER PAGES DIALOG --- */}
      <Dialog open={reorderDialogOpen} onClose={() => setReorderDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #f1f5f9', bgcolor: '#f3e8ff' }}>
          <Typography variant="h6" sx={{ color: '#7c3aed' }}>Reorder Pages for {selectedFile?.name}</Typography>
          <Typography variant="body2" color="text.secondary">Drag and drop the tiles to set your perfect page order.</Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4, bgcolor: '#f8fafc' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePageDragEnd}>
            <Grid container spacing={2}>
              <SortableContext items={pageOrder} strategy={rectSortingStrategy}>
                {pageOrder.map((pageId, index) => (
                  <SortablePageTile key={pageId} pageId={pageId} index={index + 1} />
                ))}
              </SortableContext>
            </Grid>
          </DndContext>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #f1f5f9', bgcolor: 'white' }}>
          <Button onClick={() => setReorderDialogOpen(false)} color="inherit" sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button 
            onClick={submitReorderPages} 
            variant="contained" 
            sx={{ 
              background: 'linear-gradient(135deg, #8b5cf6, #c084fc)',
              color: 'white',
              boxShadow: '0 4px 14px 0 rgba(139, 92, 246, 0.4)',
              '&:hover': { background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }
            }}
          >
            Save New Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DELETE PAGES DIALOG --- */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #f1f5f9', bgcolor: '#fffbeb' }}>
          <Typography variant="h6" sx={{ color: '#d97706' }}>Slice Pages from {selectedFile?.name}</Typography>
          <Typography variant="body2" color="text.secondary">Tap the pages you want to erase. They will light up in red.</Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4, bgcolor: '#f8fafc' }}>
          <Grid container spacing={2}>
            {selectedFile &&
              Array.from({ length: selectedFile.pageCount }, (_, i) => i + 1).map((page) => {
                const isSelected = pagesToDelete.includes(page);
                return (
                  <Grid item xs={4} sm={3} md={2} key={page}>
                    <Paper 
                      elevation={isSelected ? 4 : 1}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        borderRadius: 3,
                        background: isSelected ? 'linear-gradient(135deg, #f43f5e, #fb7185)' : 'white',
                        color: isSelected ? 'white' : 'text.primary',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        '&:hover': { 
                          transform: 'scale(1.05)',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                        }
                      }}
                      onClick={() => togglePage(page)}
                    >
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>
                        {page}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.9 }}>
                        {isSelected ? 'Erasing...' : 'Keep'}
                      </Typography>
                    </Paper>
                  </Grid>
                )
              })}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #f1f5f9', bgcolor: 'white' }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit" sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button 
            onClick={submitDeletePages} 
            variant="contained" 
            disabled={pagesToDelete.length === 0}
            sx={{ 
              background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
              color: 'white',
              boxShadow: '0 4px 14px 0 rgba(225, 29, 72, 0.4)',
              '&:hover': { background: 'linear-gradient(135deg, #e11d48, #be123c)' }
            }}
          >
            Confirm & Slice
          </Button>
        </DialogActions>
      </Dialog>

    </ThemeProvider>
  );
}

export default App;
