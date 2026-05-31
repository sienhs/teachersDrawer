import os
import tempfile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from parser.activity_plan import parse_activity_plan

app = FastAPI(title="HWP Parser", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/parse")
async def parse(file: UploadFile = File(...)):
    name = (file.filename or "").lower()
    if not (name.endswith(".hwp") or name.endswith(".hwpx")):
        raise HTTPException(status_code=400, detail="HWP 또는 HWPX 파일만 허용됩니다.")

    suffix = ".hwpx" if name.endswith(".hwpx") else ".hwp"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = parse_activity_plan(tmp_path)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
