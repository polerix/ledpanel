import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any

app = FastAPI(title="LED Pattern Studio")

# Setup directories
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

PRESETS_FILE = os.path.join(DATA_DIR, "presets.json")
PLAYLIST_FILE = os.path.join(DATA_DIR, "playlist.json")

def init_file(filepath, default_data):
    if not os.path.exists(filepath):
        with open(filepath, "w") as f:
            json.dump(default_data, f)

init_file(PRESETS_FILE, [])
init_file(PLAYLIST_FILE, [])

class Preset(BaseModel):
    id: str
    name: str
    pixels: List[int]

class PlaylistItem(BaseModel):
    id: str
    preset_id: str
    duration_ms: int

@app.get("/api/presets")
def get_presets():
    try:
        with open(PRESETS_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/presets")
def save_presets(presets: List[Dict[str, Any]]):
    try:
        with open(PRESETS_FILE, "w") as f:
            json.dump(presets, f)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/playlist")
def get_playlist():
    try:
        with open(PLAYLIST_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/playlist")
def save_playlist(playlist: List[Dict[str, Any]]):
    try:
        with open(PLAYLIST_FILE, "w") as f:
            json.dump(playlist, f)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/display")
def display_frame(frame: Dict[str, Any]):
    # Stub endpoint for hardware integration
    # Here is where the real GPIO/SPI driver code would go, pushing `frame.get("pixels")` out
    print(f"Received frame to display (first 10 pixels): {frame.get('pixels', [])[:10]}...")
    return {"status": "acknowledged"}

# Serve static files from the static directory
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
