from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader, PdfWriter
import io
import json

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 4.5 * 1024 * 1024

@app.post("/api/page_count")
async def page_count(file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 4.5MB)")
    reader = PdfReader(io.BytesIO(content))
    return {"page_count": len(reader.pages)}

@app.post("/api/merge")
async def merge_pdfs(files: list[UploadFile] = File(...)):
    writer = PdfWriter()
    for file in files:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"{file.filename} exceeds 4.5MB limit")
        reader = PdfReader(io.BytesIO(content))
        for page in reader.pages:
            writer.add_page(page)
    
    out_stream = io.BytesIO()
    writer.write(out_stream)
    out_stream.seek(0)
    return Response(content=out_stream.read(), media_type="application/pdf")

@app.post("/api/slice")
async def slice_pdf(file: UploadFile = File(...), pages_to_delete: str = Form(...)):
    content = await file.read()
    pages = json.loads(pages_to_delete)
    reader = PdfReader(io.BytesIO(content))
    writer = PdfWriter()
    
    for i, page in enumerate(reader.pages, start=1):
        if i not in pages:
            writer.add_page(page)
            
    out_stream = io.BytesIO()
    writer.write(out_stream)
    out_stream.seek(0)
    return Response(content=out_stream.read(), media_type="application/pdf")

@app.post("/api/reorder")
async def reorder_pdf(file: UploadFile = File(...), page_order: str = Form(...)):
    content = await file.read()
    order = json.loads(page_order)
    reader = PdfReader(io.BytesIO(content))
    writer = PdfWriter()
    
    max_page = len(reader.pages)
    for p in order:
        if p < 1 or p > max_page:
            raise HTTPException(status_code=400, detail=f"Invalid page: {p}")
        writer.add_page(reader.pages[p - 1])
        
    out_stream = io.BytesIO()
    writer.write(out_stream)
    out_stream.seek(0)
    return Response(content=out_stream.read(), media_type="application/pdf")
