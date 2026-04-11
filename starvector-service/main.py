"""
StarVector FastAPI service.

Start with:
    uvicorn main:app --host 0.0.0.0 --port 8010 --reload

Set STARVECTOR_SERVICE_URL=http://localhost:8010 in the Next.js .env.local.
"""

import re
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model import load_model

app = FastAPI(title="StarVector SVG Generation Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once on startup
model, processor, device = load_model()


class GenerateRequest(BaseModel):
    prompt: str
    max_new_tokens: int = 1024
    temperature: float = 0.7


def extract_svg(text: str) -> str:
    """
    Pull the first complete <svg>...</svg> block from model output.
    StarVector sometimes wraps the SVG in prose — this strips it cleanly.
    """
    match = re.search(r"(<svg[\s\S]*?</svg>)", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    # Fallback: return the whole output if no tags found (let the client handle it)
    return text.strip()


@app.post("/generate")
async def generate_svg(req: GenerateRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="prompt must not be empty")

    inputs = processor(text=req.prompt, return_tensors="pt").to(device)

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=req.max_new_tokens,
            do_sample=True,
            temperature=req.temperature,
        )

    raw = processor.decode(output_ids[0], skip_special_tokens=True)
    svg = extract_svg(raw)

    return {"svg": svg, "raw": raw}


@app.get("/health")
def health():
    return {"status": "ok", "device": str(device)}
