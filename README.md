# LED Pattern Studio

A browser-based, interactive 16\u00d796 LED pattern editor and playlist manager, designed to be run on a Raspberry Pi or PC and accessed across your local network.

## Features

- **Pattern Editor**: A 16x96 interactive grid. Tap, click, or drag to paint pixels.
- **Premium UI**: Built with a sleek, dark-mode glassmorphism design (Vanilla CSS, no external frameworks).
- **Color Palette**: Supports Off, Red, Green, and Orange LED states.
- **Brush & Zoom Controls**: Adjustable brush scale (1px to 5px) and canvas zoom.
- **Library Manager**: Save patterns as presets to a visually distinct library grid.
- **Drag-and-Drop Playlist**: Drag presets directly into the playlist timeline, reorder them, and configure per-step durations.
- **Live Playback**: Play, pause, and loop back your created playlist sequence.
- **Cross-device**: Hosted locally; edit and control the display from your phone, tablet, or another PC on the same Wi-Fi.

## File Structure

```text
LEDpanel/
\u251c\u2500\u2500 server.py                # FastAPI Python Server
\u251c\u2500\u2500 requirements.txt         # Server dependencies
\u251c\u2500\u2500 data/
\u2502   \u251c\u2500\u2500 presets.json         # Stores all saved presets
\u2502   \u2514\u2500\u2500 playlist.json        # Stores chronological playlist data
\u2514\u2500\u2500 static/
    \u251c\u2500\u2500 index.html           # Main Front-end structure
    \u251c\u2500\u2500 style.css            # Vanilla CSS styling
    \u2514\u2500\u2500 script.js            # Frontend logic (Canvas, Drag&Drop, State sync)
```

## Installation & Running

### Requirements
- Python 3.x
- `pip`

### 1. Install Dependencies
Run the following script to install the FastAPI and Uvicorn server dependencies:
```bash
python3 -m pip install -r requirements.txt
```

### 2. Start the Server
Start the backend server on your host machine (e.g., Raspberry Pi):
```bash
uvicorn server:app --host 0.0.0.0 --port 8000
```

### 3. Open the Studio
- On the host machine: Go to `http://localhost:8000`
- On a secondary device (e.g., phone): Go to `http://<HOST_IP>:8000` (ensure devices are on the same Wi-Fi)

## Hardware Integration

The MVP includes a stub endpoint designed for easy physical matrix pairing. Inside `server.py`, locate the `POST /api/display` endpoint:

```python
@app.post("/api/display")
def display_frame(frame: Dict[str, Any]):
    # Replace this stub with your GPIO/SPI push logic.
    print(f"Received frame to display: ...")
    return {"status": "acknowledged"}
```

Convert the `frame.get("pixels")` array into the exact data structure expected by your LED matrix driver (bitplanes, scan rows, etc.) and push it out via SPI or GPIO.
