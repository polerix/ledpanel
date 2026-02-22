const ROWS = 16;
const COLS = 96;
const TOTAL_PIXELS = ROWS * COLS;

// State
let pixels = new Array(TOTAL_PIXELS).fill(0);
let currentColor = 1; // 0=Off, 1=Red, 2=Green, 3=Orange
let brushSize = 1;

let presets = [];
let playlist = [];

let isDrawing = false;
let isPlaying = false;
let playInterval = null;
let playIndex = 0;

// Color maps
const colors = {
    0: 'var(--c-off)',
    1: 'var(--c-red)',
    2: 'var(--c-green)',
    3: 'var(--c-orange)'
};
const colorsRgb = {
    0: [15, 15, 18],
    1: [255, 60, 60],
    2: [60, 255, 60],
    3: [255, 165, 0]
};

// DOM Elements
const canvas = document.getElementById('led-canvas');
const colorBtns = document.querySelectorAll('.color-btn');
const brushSizeInput = document.getElementById('brush-size');
const brushVal = document.getElementById('brush-val');
const zoomScaleInput = document.getElementById('zoom-scale');
const zoomVal = document.getElementById('zoom-val');
const presetNameInput = document.getElementById('preset-name');
const savePresetBtn = document.getElementById('save-preset-btn');
const clearCanvasBtn = document.getElementById('clear-canvas-btn');
const sendDisplayBtn = document.getElementById('send-display-btn');
const presetsGrid = document.getElementById('presets-grid');
const presetCount = document.getElementById('preset-count');
const playlistContainer = document.getElementById('playlist-container');
const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');
const emptyState = document.querySelector('.playlist-empty-state');
const indicator = document.querySelector('.indicator');

// Templates
const tplPreset = document.getElementById('tpl-preset-card');
const tplPlaylist = document.getElementById('tpl-playlist-item');

// --- Initialization ---
function init() {
    createCanvas();
    fetchSystemState();
    setupEvents();
    pulseIndicator();
}

function pulseIndicator() {
    indicator.style.background = 'var(--primary)';
    indicator.style.boxShadow = '0 0 8px var(--primary)';
}

function errorIndicator() {
    indicator.style.background = 'var(--danger)';
    indicator.style.boxShadow = '0 0 8px var(--danger)';
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// --- Editor Canvas ---
function createCanvas() {
    canvas.innerHTML = '';
    for (let i = 0; i < TOTAL_PIXELS; i++) {
        const p = document.createElement('div');
        p.className = 'pixel';
        p.dataset.index = i;
        canvas.appendChild(p);
    }
}

function getPixelIndex(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return -1;
    return r * COLS + c;
}

function drawPixel(index) {
    if (index < 0 || index >= TOTAL_PIXELS) return;

    // Handle Brush Size
    const r = Math.floor(index / COLS);
    const c = index % COLS;
    const offset = Math.floor(brushSize / 2);

    for (let i = -offset; i <= offset; i++) {
        for (let j = -offset; j <= offset; j++) {
            const tr = r + i;
            const tc = c + j;
            const tIndex = getPixelIndex(tr, tc);

            if (tIndex !== -1) {
                pixels[tIndex] = currentColor;
                updatePixelDOM(tIndex);
            }
        }
    }
}

function updatePixelDOM(index) {
    const p = canvas.children[index];
    const color = pixels[index];
    p.style.background = colors[color];
    p.style.boxShadow = color === 0 ? 'none' : `0 0 4px ${colors[color]}`;
}

function clearCanvas() {
    pixels.fill(0);
    for (let i = 0; i < TOTAL_PIXELS; i++) {
        updatePixelDOM(i);
    }
}

// --- API Calls ---
async function fetchSystemState() {
    try {
        const [presetsRes, playlistRes] = await Promise.all([
            fetch('/api/presets'),
            fetch('/api/playlist')
        ]);
        presets = await presetsRes.json();
        playlist = await playlistRes.json();
        renderPresets();
        renderPlaylist();
    } catch (e) {
        console.error("Error loading state", e);
        errorIndicator();
    }
}

async function syncPresets() {
    try {
        await fetch('/api/presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(presets)
        });
    } catch (e) { console.error(e); }
}

async function syncPlaylist() {
    try {
        await fetch('/api/playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(playlist)
        });
    } catch (e) { console.error(e); }
}

async function sendToDisplay(frameData) {
    try {
        indicator.style.background = 'var(--accent)';
        indicator.style.boxShadow = '0 0 15px var(--accent)';
        await fetch('/api/display', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pixels: frameData })
        });
        setTimeout(pulseIndicator, 200);
    } catch (e) {
        console.error(e);
        errorIndicator();
    }
}

// --- Preview Generation ---
function drawToCanvasElement(canvasEl, pixelData) {
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    const pixelW = canvasEl.width / COLS;
    const pixelH = canvasEl.height / ROWS;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const idx = r * COLS + c;
            const colorCode = pixelData[idx] || 0;
            if (colorCode !== 0) {
                const rgb = colorsRgb[colorCode];
                ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
                ctx.fillRect(c * pixelW, r * pixelH, pixelW, pixelH);
            }
        }
    }
}

// --- Render UI ---
function renderPresets() {
    presetsGrid.innerHTML = '';
    presetCount.textContent = presets.length;

    presets.forEach(p => {
        const clone = tplPreset.content.cloneNode(true);
        const card = clone.querySelector('.preset-card');
        const nameEl = clone.querySelector('.preset-name');
        const canvasEl = clone.querySelector('canvas');
        const delBtn = clone.querySelector('.delete-preset-btn');

        card.dataset.id = p.id;
        nameEl.textContent = p.name;

        drawToCanvasElement(canvasEl, p.pixels);

        // Drag Events
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', p.id);
            setTimeout(() => card.classList.add('dragging'), 0);
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });

        // Delete Preset
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            presets = presets.filter(pr => pr.id !== p.id);
            savePresetsAndRender();
        });

        // Click to load into editor
        card.addEventListener('click', () => {
            pixels = [...p.pixels];
            presetNameInput.value = p.name;
            for (let i = 0; i < TOTAL_PIXELS; i++) updatePixelDOM(i);
        });

        presetsGrid.appendChild(card);
    });
}

function savePresetsAndRender() {
    renderPresets();
    syncPresets();
    // Also re-render playlist to update previews if they depended on deleted items
    // (Optional logic: delete playlist items that rely on deleted presets)
    playlist = playlist.filter(item => presets.find(p => p.id === item.preset_id));
    renderPlaylist();
    syncPlaylist();
}

function renderPlaylist() {
    // Clear elements except empty state
    Array.from(playlistContainer.children).forEach(child => {
        if (!child.classList.contains('playlist-empty-state')) {
            child.remove();
        }
    });

    if (playlist.length === 0) {
        emptyState.style.display = 'flex';
        playBtn.disabled = true;
    } else {
        emptyState.style.display = 'none';
        playBtn.disabled = false;
    }

    playlist.forEach((item, index) => {
        const preset = presets.find(p => p.id === item.preset_id);
        if (!preset) return; // shouldn't happen based on sync logic

        const clone = tplPlaylist.content.cloneNode(true);
        const el = clone.querySelector('.playlist-item');
        const nameEl = clone.querySelector('.playlist-item-name');
        const canvasEl = clone.querySelector('canvas');
        const durInput = clone.querySelector('.duration-input');
        const rmBtn = clone.querySelector('.remove-btn');

        el.dataset.id = item.id;
        el.dataset.index = index;
        nameEl.textContent = preset.name;
        durInput.value = item.duration_ms;

        drawToCanvasElement(canvasEl, preset.pixels);

        if (index === playIndex && isPlaying) {
            el.classList.add('playing');
        }

        durInput.addEventListener('change', (e) => {
            item.duration_ms = parseInt(e.target.value) || 1000;
            syncPlaylist();
        });

        rmBtn.addEventListener('click', () => {
            playlist.splice(index, 1);
            renderPlaylist();
            syncPlaylist();
        });

        // Drag to reorder logic inside playlist
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/sort', index);
            setTimeout(() => el.classList.add('dragging'), 0);
        });
        el.addEventListener('dragend', () => el.classList.remove('dragging'));

        playlistContainer.appendChild(el);
    });
}

// --- Playback Logic ---
function togglePlayback() {
    if (isPlaying) {
        stopPlayback();
    } else {
        startPlayback();
    }
}

function startPlayback() {
    if (playlist.length === 0) return;
    isPlaying = true;
    playBtn.textContent = '⏸ Pause';
    playBtn.classList.replace('primary', 'accent');
    stopBtn.disabled = false;

    playIndex = 0;
    playStep();
}

function stopPlayback() {
    isPlaying = false;
    clearTimeout(playInterval);
    playBtn.textContent = '▶ Play';
    playBtn.classList.replace('accent', 'primary');
    stopBtn.disabled = true;

    // Remove playing class from all
    document.querySelectorAll('.playlist-item.playing').forEach(el => el.classList.remove('playing'));
}

async function playStep() {
    if (!isPlaying || playlist.length === 0) return;

    if (playIndex >= playlist.length) {
        playIndex = 0; // loop
    }

    const item = playlist[playIndex];
    const preset = presets.find(p => p.id === item.preset_id);

    renderPlaylist(); // to highlight playing item

    if (preset) {
        // Option 1: Display in editor
        pixels = [...preset.pixels];
        for (let i = 0; i < TOTAL_PIXELS; i++) updatePixelDOM(i);

        // Option 2: Send to backend
        sendToDisplay(preset.pixels);
    }

    playInterval = setTimeout(() => {
        playIndex++;
        playStep();
    }, item.duration_ms);
}


// --- Event Listeners Setup ---
function setupEvents() {
    // Editor Tools
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentColor = parseInt(btn.dataset.color);
        });
    });

    brushSizeInput.addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
        brushVal.textContent = brushSize + 'px';
    });

    zoomScaleInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        zoomVal.textContent = val.toFixed(1) + 'x';
        canvas.style.transform = `scale(${val})`;
    });

    // Canvas Drawing
    canvas.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('pixel')) {
            isDrawing = true;
            drawPixel(parseInt(e.target.dataset.index));
        }
    });
    window.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing && e.target.classList.contains('pixel')) {
            drawPixel(parseInt(e.target.dataset.index));
        }
    });

    // Editor Actions
    clearCanvasBtn.addEventListener('click', clearCanvas);

    sendDisplayBtn.addEventListener('click', () => {
        sendToDisplay(pixels);
    });

    savePresetBtn.addEventListener('click', () => {
        const name = presetNameInput.value.trim() || `Preset ${presets.length + 1}`;
        const preset = {
            id: generateId(),
            name: name,
            pixels: [...pixels]
        };
        presets.push(preset);
        presetNameInput.value = '';
        savePresetsAndRender();
    });

    // Playlist Drag and Drop
    playlistContainer.addEventListener('dragover', e => {
        e.preventDefault();
        playlistContainer.classList.add('drag-over');

        // Find insert position
        const dragging = document.querySelector('.dragging');
        if (!dragging) return;

        const afterElement = getDragAfterElement(playlistContainer, e.clientY);
        if (afterElement == null) {
            playlistContainer.appendChild(dragging);
        } else {
            playlistContainer.insertBefore(dragging, afterElement);
        }
    });

    playlistContainer.addEventListener('dragleave', () => {
        playlistContainer.classList.remove('drag-over');
    });

    playlistContainer.addEventListener('drop', e => {
        e.preventDefault();
        playlistContainer.classList.remove('drag-over');

        const presetId = e.dataTransfer.getData('text/plain');
        const sortIndex = e.dataTransfer.getData('text/sort');

        if (presetId) {
            // Dropped a preset from library
            // Re-calculate playlist array based on DOM order
            playlistContainer.appendChild(document.createElement('div')); // placeholder to let DOM sort out element position
            setTimeout(() => rebuildPlaylistFromDOM(presetId, e.clientY), 0);
        } else if (sortIndex !== '') {
            // Reordering existing item
            setTimeout(() => rebuildPlaylistFromDOM(), 0);
        }
    });

    // Playback
    playBtn.addEventListener('click', togglePlayback);
    stopBtn.addEventListener('click', stopPlayback);
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.playlist-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function rebuildPlaylistFromDOM(newPresetId = null, dropY = 0) {
    const itemsEl = [...playlistContainer.querySelectorAll('.playlist-item')];
    let newPlaylist = [];

    // If we're dropping a new preset, we need to insert it at the correct index
    let inserted = false;

    itemsEl.forEach((el, index) => {
        // It's an existing item
        if (el.dataset.id) {
            const item = playlist.find(i => i.id === el.dataset.id);
            if (item) newPlaylist.push(item);
        } else if (el.classList.contains('dragging')) {
            // Wait, we didn't add data-id to the newly created elements from library drag.
            // Actually, HTML5 dragdrop just appends the existing card? No, preset cards aren't moved.
            // When we drag from library `.preset-card` the browser might move the element if we appended it, 
            // but in dragover I did `playlistContainer.appendChild(dragging)`. 
            // That moves the card out of the library grid! Let's abort that and handle it better.
        }
    });

    // Fix for cross-container dropping logic
    // Instead of letting the browser move the library card into the playlist, 
    // let's derive order purely from standard drag event and insert manually.
}

// Better drag drop handling that doesn't break DOM:
let dragSrcEl = null;

document.addEventListener('dragstart', e => {
    dragSrcEl = e.target;
});

// We override the complicated DOM rebuilding with a simpler one:
playlistContainer.addEventListener('drop', function (e) {
    // Handled in existing listener, let's patch the logic here by redefining it completely below inside init to be safer, or just do it right here:
});

function handleDropEvent(e) {
    e.preventDefault();
    playlistContainer.classList.remove('drag-over');

    const presetId = e.dataTransfer.getData('text/plain');
    const sortIndex = e.dataTransfer.getData('text/sort');

    const afterEl = getDragAfterElement(playlistContainer, e.clientY);
    let targetIndex = playlist.length;

    if (afterEl) {
        targetIndex = parseInt(afterEl.dataset.index);
    }

    if (presetId) {
        // Insert new item at targetIndex
        const newItem = {
            id: generateId(),
            preset_id: presetId,
            duration_ms: 1000
        };
        playlist.splice(targetIndex, 0, newItem);
    } else if (sortIndex !== '') {
        const sIdx = parseInt(sortIndex);
        if (sIdx === targetIndex) return; // no move

        const item = playlist.splice(sIdx, 1)[0];
        // Adjust targetIndex if we removed an item before it
        if (sIdx < targetIndex) targetIndex--;
        playlist.splice(targetIndex, 0, item);
    }

    renderPlaylist();
    syncPlaylist();
}

// Replace the previous drop handler inside setupEvents with our clean one:
const oldSetupEvents = setupEvents;
setupEvents = function () {
    oldSetupEvents();

    // Clean up the DOM dragging bug logic by resetting the listeners block
    const clone = playlistContainer.cloneNode(true);
    playlistContainer.parentNode.replaceChild(clone, playlistContainer);
    // Re-bind
    window.playlistContainer = document.getElementById('playlist-container');

    playlistContainer.addEventListener('dragover', e => {
        e.preventDefault();
        playlistContainer.classList.add('drag-over');
        const dragging = document.querySelector('.dragging[data-index]'); // only sort internal items visually
        if (dragging) {
            const afterElement = getDragAfterElement(playlistContainer, e.clientY);
            if (afterElement) {
                playlistContainer.insertBefore(dragging, afterElement);
            } else {
                playlistContainer.appendChild(dragging);
            }
        }
    });
    playlistContainer.addEventListener('dragleave', () => playlistContainer.classList.remove('drag-over'));
    playlistContainer.addEventListener('drop', handleDropEvent);
}

// Start
init();
