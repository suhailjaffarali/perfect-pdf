from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, uuid, time, threading
from pypdf import PdfReader, PdfWriter

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
MAX_FILES = 50

class MergeRequest(BaseModel):
    file_ids: list[str]

class DeletePagesRequest(BaseModel):
    file_id: str
    pages: list[int]

class ReorderPagesRequest(BaseModel):
    file_id: str
    page_order: list[int]

def get_path(file_id: str) -> str:
    return os.path.join(UPLOAD_DIR, f"{file_id}.pdf")

def schedule_cleanup(background: BackgroundTasks):
    background.add_task(cleanup_old_files)

def cleanup_old_files():
    now = time.time()
    for fname in os.listdir(UPLOAD_DIR):
        fpath = os.path.join(UPLOAD_DIR, fname)
        if os.path.isfile(fpath) and now - os.path.getmtime(fpath) > 3600:
            try:
                os.remove(fpath)
            except Exception:
                pass

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), background: BackgroundTasks = None):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDFs allowed")
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 20 MB)")
    if len(os.listdir(UPLOAD_DIR)) >= MAX_FILES:
        raise HTTPException(status_code=429, detail="Too many files uploaded, try later")
    file_id = str(uuid.uuid4())
    dest = get_path(file_id)
    with open(dest, "wb") as out:
        out.write(content)
    if background:
        schedule_cleanup(background)
    return {"file_id": file_id, "filename": file.filename}

@app.post("/delete_pages")
async def delete_pages(request: DeletePagesRequest, background: BackgroundTasks = None):
    src = get_path(request.file_id)
    if not os.path.exists(src):
        raise HTTPException(status_code=404, detail="File not found")
    reader = PdfReader(src)
    writer = PdfWriter()
    for i, page in enumerate(reader.pages, start=1):
        if i not in request.pages:
            writer.add_page(page)
    out_path = get_path(f"{request.file_id}_edited")
    with open(out_path, "wb") as out:
        writer.write(out)
    if background:
        background.add_task(os.remove, src)
    return {"file_id": f"{request.file_id}_edited"}

@app.post("/reorder_pages")
async def reorder_pages(request: ReorderPagesRequest, background: BackgroundTasks = None):
    src = get_path(request.file_id)
    if not os.path.exists(src):
        raise HTTPException(status_code=404, detail="File not found")
    reader = PdfReader(src)
    writer = PdfWriter()
    
    max_page = len(reader.pages)
    for p in request.page_order:
        if p < 1 or p > max_page:
            raise HTTPException(status_code=400, detail=f"Invalid page number: {p}")
        writer.add_page(reader.pages[p - 1])
        
    out_path = get_path(f"{request.file_id}_reordered")
    with open(out_path, "wb") as out:
        writer.write(out)
        
    if background:
        background.add_task(os.remove, src)
        
    return {"file_id": f"{request.file_id}_reordered"}

@app.post("/merge")
async def merge_pdfs(request: MergeRequest, background: BackgroundTasks = None):
    writer = PdfWriter()
    for fid in request.file_ids:
        path = get_path(fid)
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail=f"File {fid} not found")
        reader = PdfReader(path)
        for page in reader.pages:
            writer.add_page(page)
    out_id = str(uuid.uuid4())
    out_path = get_path(out_id)
    with open(out_path, "wb") as out:
        writer.write(out)
    if background:
        schedule_cleanup(background)
    return {"file_id": out_id}

@app.get("/preview/{file_id}")
async def preview_pdf(file_id: str):
    path = get_path(file_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="application/pdf")

@app.get("/download/{file_id}")
async def download_pdf(file_id: str, name: str = None, background: BackgroundTasks = None):
    path = get_path(file_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    if background:
        background.add_task(os.remove, path)
        
    filename = name if name else f"{file_id}.pdf"
    if not filename.lower().endswith(".pdf"):
        filename += ".pdf"
        
    return FileResponse(path, media_type="application/pdf", filename=filename)

@app.delete("/remove/{file_id}")
async def remove_file(file_id: str):
    path = get_path(file_id)
    if os.path.exists(path):
        os.remove(path)
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/page_count/{file_id}")
async def page_count(file_id: str):
    path = get_path(file_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    reader = PdfReader(path)
    return {"page_count": len(reader.pages)}

@app.on_event("startup")
async def startup_cleanup_task():
    def loop():
        while True:
            cleanup_old_files()
            time.sleep(3600)
    threading.Thread(target=loop, daemon=True).start()

