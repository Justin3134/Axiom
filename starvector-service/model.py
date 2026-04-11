"""
StarVector model loader.

Swap MODEL_NAME to starvector/starvector-8b-im2svg for production quality.
Requires a GPU with ~6 GB VRAM for 1B; ~16 GB for 8B.
On CPU (e.g. Apple Silicon without MPS support) generation will be very slow.
"""

import torch
from transformers import AutoModelForCausalLM, AutoProcessor

MODEL_NAME = "starvector/starvector-1b-im2svg"

_model = None
_processor = None
_device = None


def load_model():
    global _model, _processor, _device

    if _model is not None:
        return _model, _processor, _device

    _device = (
        "cuda"
        if torch.cuda.is_available()
        else "mps"
        if torch.backends.mps.is_available()
        else "cpu"
    )

    dtype = torch.float16 if _device != "cpu" else torch.float32

    _model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=dtype,
        trust_remote_code=True,
    ).to(_device)
    _model.eval()

    _processor = AutoProcessor.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
    )

    return _model, _processor, _device
