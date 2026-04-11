# StarVector Service

Generates SVG illustrations from text prompts using the [StarVector](https://github.com/joanrod/star-vector) foundation model.

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8010 --reload
```

Then set in your Next.js `.env.local`:

```
STARVECTOR_SERVICE_URL=http://localhost:8010
```

## GPU options

| Environment | Notes |
|---|---|
| Local (Apple Silicon) | Uses MPS if available; falls back to CPU — slow but functional for testing |
| RunPod / Modal | Recommended for production; use the 8B model for best quality |
| Google Colab (free T4) | Run with `ngrok` to expose the endpoint |

To use the 8B model, change `MODEL_NAME` in `model.py`:

```python
MODEL_NAME = "starvector/starvector-8b-im2svg"
```

## API

`POST /generate`
```json
{ "prompt": "stochastic kinetic Monte Carlo simulation diagram", "max_new_tokens": 1024 }
```

Returns:
```json
{ "svg": "<svg>...</svg>", "raw": "..." }
```

`GET /health` — returns `{ "status": "ok", "device": "cuda" }`
