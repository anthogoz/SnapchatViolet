
// DOM Elements
const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const imageUpload = document.getElementById('imageUpload');
const bandsContainer = document.getElementById('bandsContainer');
const mainAddBtn = document.getElementById('mainAddBtn');
const addOptions = document.getElementById('addOptions');
const addBandBtn = document.getElementById('addBandBtn');
const addTextBtn = document.getElementById('addTextBtn');
const addStickerBtn = document.getElementById('addStickerBtn');
const stickerUpload = document.getElementById('stickerUpload');
const frySlider = document.getElementById('frySlider');
const fryValueDisplay = document.getElementById('fryValueDisplay');
const downloadBtn = document.getElementById('downloadBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');

// Constants
const CANVAS_WIDTH = 540;
const CANVAS_HEIGHT = 960; // 9:16 Aspect Ratio
const BAND_HEIGHT_RATIO = 0.05; // 5% of height

// State
let appState = {
    image: null,
    imgX: 0,
    imgY: 0,
    baseScale: 1,
    zoomFactor: 1,
    bands: [],
    fryLevel: 10,
    tintLevel: 20, // 0-100
    isFrying: false,
    isDragging: false
};

let dragInfo = {
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    target: null
};

// ... (Dragging State remains same) ...
let fryTimeout = null;

// Initialization
function init() {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Safety: ensure overlay is hidden
    loadingOverlay.classList.add('hidden');

    drawPlaceholder();

    // Listeners
    imageUpload.addEventListener('change', handleImageUpload);

    // UI: Add Text Menu Flow
    mainAddBtn.addEventListener('click', () => {
        addOptions.classList.toggle('hidden');
    });

    addBandBtn.addEventListener('click', () => {
        addBand();
        addOptions.classList.add('hidden');
    });

    addTextBtn.addEventListener('click', () => {
        addText();
        addOptions.classList.add('hidden');
    });

    addStickerBtn.addEventListener('click', () => {
        stickerUpload.click();
    });

    stickerUpload.addEventListener('change', handleStickerUpload);

    frySlider.addEventListener('input', updateFryLevel);
    document.getElementById('tintSlider').addEventListener('input', updateTintLevel);
    zoomSlider.addEventListener('input', handleZoom);
    downloadBtn.addEventListener('click', downloadImage);

    // Canvas Interactions
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Touch support center
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
}

// ... (Image handling functions remain same) ...

// ... (Zoom handling remains same) ...

// ... (Bands handling remains same) ...

// ... (Interaction handlers remain same) ...

// ... (Bounds Logic remains same) ...

// Rendering Logic
function updateFryLevel(e) {
    appState.fryLevel = parseInt(e.target.value);
    fryValueDisplay.textContent = appState.fryLevel;
    render();
    debouncedFry();
}

function updateTintLevel(e) {
    appState.tintLevel = parseInt(e.target.value);
    document.getElementById('tintValueDisplay').textContent = appState.tintLevel + '%';
    render();
    debouncedFry();
}

function drawPlaceholder() {
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#333340";
    ctx.textAlign = "center";
    ctx.font = "bold 24px Outfit, sans-serif";
    ctx.fillText("Preview 9:16", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.font = "16px Outfit, sans-serif";
    ctx.fillStyle = "#666";
    ctx.fillText("Charge une image", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
}

function render() {
    // This is the "Clean" render pass. It must be fast (sync).

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Image
    if (appState.image) {
        const scale = appState.baseScale * appState.zoomFactor;
        ctx.drawImage(
            appState.image,
            appState.imgX,
            appState.imgY,
            appState.image.width * scale,
            appState.image.height * scale
        );
    } else {
        drawPlaceholder();
    }

    // 2. Bands & Text
    appState.bands.forEach(item => {
        if (item.type === 'sticker' && item.image) {
            const width = CANVAS_WIDTH * item.scale;
            const height = width * (item.image.height / item.image.width);

            const x = (item.x * CANVAS_WIDTH) - (width / 2);
            const y = (item.y * CANVAS_HEIGHT) - (height / 2);

            ctx.drawImage(item.image, x, y, width, height);

        } else if (item.type === 'free') {
            // Free Floating Text
            if (item.text) {
                const fontSize = 42;
                ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                const x = item.x * CANVAS_WIDTH;
                const y = item.y * CANVAS_HEIGHT;

                // Shadow / Outline for readability
                ctx.shadowColor = "rgba(0,0,0,0.8)";
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                // Use new Emoji Drawer
                drawTextWithEmojis(ctx, item.text, x, y, fontSize);

                // Reset shadow
                ctx.shadowColor = "transparent";
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
        } else {
            // Classic Band
            const bandHeight = Math.max(30, CANVAS_HEIGHT * BAND_HEIGHT_RATIO);
            const fontSize = bandHeight * 0.6;
            const yPos = item.y * (CANVAS_HEIGHT - bandHeight);

            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(0, yPos, CANVAS_WIDTH, bandHeight);

            if (item.text) {
                ctx.fillStyle = "#ffffff";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = `${fontSize}px Arial, sans-serif`;

                // Use new Emoji Drawer
                drawTextWithEmojis(ctx, item.text, CANVAS_WIDTH / 2, yPos + bandHeight / 2, fontSize);
            }
        }
    });
}


function debouncedFry() {
    clearTimeout(fryTimeout);
    fryTimeout = setTimeout(() => {
        // Trigger if either fry OR tint is active
        if (!appState.isDragging && (appState.fryLevel > 0 || appState.tintLevel > 0)) {
            startDeepFry();
        }
    }, 400);
}


async function startDeepFry() {
    if (appState.isFrying) return;
    appState.isFrying = true;
    loadingOverlay.classList.remove('hidden');

    try {
        const rawLevel = appState.fryLevel;
        const tint = appState.tintLevel;
        const bands = appState.bands; // Array of bands

        // Calculate iterations (Exponent curve)
        let totalIterations = 0;
        if (rawLevel > 0) {
            totalIterations = Math.floor(1 + Math.pow(rawLevel - 1, 1.5) * (19 / Math.pow(19, 1.5)));
        }

        // Helper to draw a specific band
        const drawBand = (band) => {
            if (band.type === 'sticker' && band.image) {
                const width = CANVAS_WIDTH * band.scale;
                const height = width * (band.image.height / band.image.width);

                const x = (band.x * CANVAS_WIDTH) - (width / 2);
                const y = (band.y * CANVAS_HEIGHT) - (height / 2);

                ctx.drawImage(band.image, x, y, width, height);

            } else if (band.type === 'free') {
                if (band.text) {
                    const fontSize = 42;
                    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";

                    const x = band.x * CANVAS_WIDTH;
                    const y = band.y * CANVAS_HEIGHT;

                    ctx.shadowColor = "rgba(0,0,0,0.8)";
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;

                    // Use new Emoji Drawer
                    drawTextWithEmojis(ctx, band.text, x, y, fontSize);

                    ctx.shadowColor = "transparent";
                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                }
            } else {
                const bandHeight = Math.max(30, CANVAS_HEIGHT * BAND_HEIGHT_RATIO);
                const fontSize = bandHeight * 0.6;
                const yPos = band.y * (CANVAS_HEIGHT - bandHeight);

                ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                ctx.fillRect(0, yPos, CANVAS_WIDTH, bandHeight);

                if (band.text) {
                    ctx.fillStyle = "#ffffff";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.font = `${fontSize}px Arial, sans-serif`;

                    // Use new Emoji Drawer
                    drawTextWithEmojis(ctx, band.text, CANVAS_WIDTH / 2, yPos + bandHeight / 2, fontSize);
                }
            }
        };

        // 1. Reset Canvas to Base Image Only (Clean Slate)
        // We need to start clean to apply bands progressively
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        if (appState.image) {
            const scale = appState.baseScale * appState.zoomFactor;
            ctx.drawImage(
                appState.image,
                appState.imgX,
                appState.imgY,
                appState.image.width * scale,
                appState.image.height * scale
            );
        } else {
            drawPlaceholder();
        }

        // 2. Progressive Destruction Loop
        if (totalIterations > 0) {
            // Loop from 0 to totalIterations
            for (let i = 0; i <= totalIterations; i++) {
                if (appState.isDragging) break;

                // Check which bands to insert at this step
                // Bands distributed based on their custom 'Fry Score'
                bands.forEach(band => {
                    // fryScore: 1 = Max Fried (insert early), 0 = Clean (insert late)
                    const score = band.fryScore !== undefined ? band.fryScore : 0;
                    const insertionPoint = Math.floor((1 - score) * totalIterations);

                    if (i === insertionPoint) {
                        drawBand(band);
                    }
                });

                // Skip compression if last step (just for adding final clean bands)
                if (i === totalIterations) break;

                // Compression Cycle
                await new Promise(r => requestAnimationFrame(r));
                const dataUrl = canvas.toDataURL('image/jpeg', 0.1);

                await new Promise(resolve => {
                    const img = new Image();
                    img.onload = () => {
                        ctx.filter = 'contrast(1.25) saturate(1.4)';
                        ctx.drawImage(img, 0, 0);
                        ctx.filter = 'none';
                        resolve();
                    };
                    img.src = dataUrl;
                });
            }
        } else {
            // No frying, just draw all bands
            bands.forEach(drawBand);
        }

        // 3. Violet Tint Application
        if (tint > 0) {
            const opacity = (tint / 100) * 0.6;
            ctx.fillStyle = `rgba(138, 43, 226, ${opacity})`;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

    } catch (e) {
        console.error(e);
    } finally {
        appState.isFrying = false;
        loadingOverlay.classList.add('hidden');
    }
}

// Image Handling
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            appState.image = img;

            // Enable controls
            zoomSlider.disabled = false;
            zoomSlider.value = 100;
            appState.zoomFactor = 1;
            zoomValue.textContent = "100%";

            fitImageToCanvas(img);
            render();
            // Trigger initial fry if levels are set
            if (appState.fryLevel > 0 || appState.tintLevel > 0) {
                debouncedFry();
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function fitImageToCanvas(img) {
    // Calculate "Cover" scale
    const scaleX = CANVAS_WIDTH / img.width;
    const scaleY = CANVAS_HEIGHT / img.height;
    appState.baseScale = Math.max(scaleX, scaleY); // Ensure we cover fully

    // Initial center pos
    const currentScale = appState.baseScale * appState.zoomFactor;
    appState.imgX = (CANVAS_WIDTH - img.width * currentScale) / 2;
    appState.imgY = (CANVAS_HEIGHT - img.height * currentScale) / 2;
}

function handleZoom(e) {
    if (!appState.image) return;

    const newVal = parseInt(e.target.value);
    const oldZoom = appState.zoomFactor;
    appState.zoomFactor = newVal / 100;
    zoomValue.textContent = newVal + "%";

    // Zoom logic: Zoom towards center of canvas (simplified)
    // We can just re-center for simplicity or try to keep relative center.
    // Keeping relative center is better UX.

    // Center of canvas in image coords
    const currentScale = appState.baseScale * oldZoom;
    const centerX_Img = (CANVAS_WIDTH / 2 - appState.imgX) / currentScale;
    const centerY_Img = (CANVAS_HEIGHT / 2 - appState.imgY) / currentScale;

    // Apply new zoom
    const newScale = appState.baseScale * appState.zoomFactor;

    // Calculate new TopLeft based on that center point
    // NewX = CanvasCenter - (ImageCenter * NewScale)
    appState.imgX = (CANVAS_WIDTH / 2) - (centerX_Img * newScale);
    appState.imgY = (CANVAS_HEIGHT / 2) - (centerY_Img * newScale);

    clampImagePosition();

    // Instant render for UI responsiveness
    render();
    if (appState.fryLevel > 0) debouncedFry();
}


// Bands Handling
function addBand() {
    const id = Date.now().toString();
    appState.bands.push({
        id,
        type: 'band',
        text: "",
        y: 0.5,
        fryScore: 0.5 // Default to 50% fried
    });
    renderBandsList();
    render();
}

function addText() {
    const id = Date.now().toString();
    appState.bands.push({
        id,
        type: 'free',
        text: "Texte",
        x: 0.5,
        y: 0.5,
        fryScore: 0.5
    });
    renderBandsList();
    render();
}

function removeBand(id) {
    appState.bands = appState.bands.filter(b => b.id !== id);
    renderBandsList();
    render();
}

function updateBandText(id, text) {
    const band = appState.bands.find(b => b.id === id);
    if (band) {
        band.text = text;
        // ALWAYS render instantly for text update so typing feels fast
        render();
        // Then debounce the heavy frying
        if (appState.fryLevel > 0) debouncedFry();
    }
}

function updateBandFry(id, val) {
    const band = appState.bands.find(b => b.id === id);
    if (band) {
        band.fryScore = parseFloat(val);
        // Only triggers deep fry update (render handles clean state, but here we change fry behavior)
        if (appState.fryLevel > 0) debouncedFry();
        // No need to call render() if not frying, as fryScore doesn't affect clean render.
    }
}

function renderBandsList() {
    bandsContainer.innerHTML = '';
    if (appState.bands.length === 0) {
        bandsContainer.innerHTML = '<div class="empty-state">Aucune bande de texte ajoutée.</div>';
        return;
    }
    appState.bands.forEach(band => {
        const div = document.createElement('div');
        div.className = 'band-item';

        let icon = '⬛';
        if (band.type === 'free') icon = '🅰️';
        if (band.type === 'sticker') icon = '🖼️';

        let controlsHTML = '';

        if (band.type === 'sticker') {
            controlsHTML = `
                <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 5px;">
                    <span style="font-size: 1.2rem;">${icon}</span>
                    <span style="font-size: 14px; color: #ccc;">Image</span>
                </div>
                <div class="band-row" style="align-items: center;">
                    <span style="font-size: 12px; color: #666;">📏</span>
                    <input type="range" 
                        min="0.1" max="1.5" step="0.05" 
                        value="${band.scale}" 
                        title="Taille"
                        oninput="window.appHandlers.updateSize('${band.id}', this.value)"
                    >
                    <button class="delete-btn" onclick="window.appHandlers.remove('${band.id}')">🗑</button>
                </div>
             `;
        } else {
            // Text or Band
            controlsHTML = `
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span style="font-size: 1.2rem;">${icon}</span>
                    <input type="text" 
                        class="band-input" 
                        value="${band.text}" 
                        placeholder="Votre texte..." 
                        oninput="window.appHandlers.updateText('${band.id}', this.value)"
                    >
                </div>
            `;
            // Add Fry Slider (common to all, but let's keep deletion here too)
            controlsHTML += `
                <div class="band-row" style="align-items: center;">
                    <span style="font-size: 12px; color: #666;">🔥</span>
                    <input type="range" 
                        id="slider-${band.id}"
                        min="0" max="1" step="0.01" 
                        value="${band.fryScore !== undefined ? band.fryScore : 0.5}" 
                        title="Niveau de destruction"
                        oninput="window.appHandlers.updateFry('${band.id}', this.value)"
                    >
                    <button class="delete-btn" onclick="window.appHandlers.remove('${band.id}')">🗑</button>
                </div>
            `;
        }

        // Wait, Sticker also needs Fry Slider!
        // I should refactor to share Fry Slider.
        // Let's rewrite cleaner.

        if (band.type === 'sticker') {
            div.innerHTML = `
                <div class="band-controls">
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 5px;">
                        <span style="font-size: 1.2rem;">${icon}</span>
                        <input type="range" style="flex:1"
                            min="0.1" max="1.5" step="0.05" 
                            value="${band.scale}" 
                            title="Taille"
                            oninput="window.appHandlers.updateSize('${band.id}', this.value)"
                        >
                    </div>
                    <div class="band-row" style="align-items: center;">
                        <span style="font-size: 12px; color: #666;">🔥</span>
                        <input type="range" 
                            min="0" max="1" step="0.01" 
                            value="${band.fryScore !== undefined ? band.fryScore : 0.5}" 
                            title="Niveau de destruction"
                            oninput="window.appHandlers.updateFry('${band.id}', this.value)"
                        >
                        <button class="delete-btn" onclick="window.appHandlers.remove('${band.id}')">🗑</button>
                    </div>
                </div>
             `;
        } else {
            div.innerHTML = `
                <div class="band-controls">
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="font-size: 1.2rem;">${icon}</span>
                        <input type="text" 
                            class="band-input" 
                            value="${band.text}" 
                            placeholder="Votre texte..." 
                            oninput="window.appHandlers.updateText('${band.id}', this.value)"
                        >
                    </div>
                    <div class="band-row" style="align-items: center;">
                        <span style="font-size: 12px; color: #666;">🔥</span>
                        <input type="range" 
                            min="0" max="1" step="0.01" 
                            value="${band.fryScore !== undefined ? band.fryScore : 0.5}" 
                            title="Niveau de destruction"
                            oninput="window.appHandlers.updateFry('${band.id}', this.value)"
                        >
                        <button class="delete-btn" onclick="window.appHandlers.remove('${band.id}')">🗑</button>
                    </div>
                </div>
             `;
        }
        bandsContainer.appendChild(div);
    });
}

// Interaction Handlers
// Interaction Handlers
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    // Support mix of mouse and touch
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function handleMouseDown(e) {
    if (e.target !== canvas) return;
    if (e.type === 'touchstart' && e.cancelable) e.preventDefault();

    const coords = getCanvasCoordinates(e);

    let hitBand = null;
    const fontFree = "bold 42px Arial, sans-serif";

    // Check bands hitting (iterate top-down)
    for (let i = appState.bands.length - 1; i >= 0; i--) {
        const band = appState.bands[i];

        if (band.type === 'free') {
            // Free Text Hit Test
            if (band.text) {
                ctx.font = fontFree;
                const metrics = ctx.measureText(band.text);
                const width = metrics.width;
                const height = 42;

                const cx = band.x * CANVAS_WIDTH;
                const cy = band.y * CANVAS_HEIGHT;

                const padding = 20;
                const x1 = cx - width / 2 - padding;
                const x2 = cx + width / 2 + padding;
                const y1 = cy - height / 2 - padding;
                const y2 = cy + height / 2 + padding;

                if (coords.x >= x1 && coords.x <= x2 && coords.y >= y1 && coords.y <= y2) {
                    hitBand = band;
                    break;
                }
            }
        } else if (band.type === 'sticker' && band.image) {
            // Sticker Hit Test
            const width = CANVAS_WIDTH * band.scale;
            const height = width * (band.image.height / band.image.width);

            const cx = band.x * CANVAS_WIDTH;
            const cy = band.y * CANVAS_HEIGHT;

            const x1 = cx - width / 2;
            const x2 = cx + width / 2;
            const y1 = cy - height / 2;
            const y2 = cy + height / 2;

            if (coords.x >= x1 && coords.x <= x2 && coords.y >= y1 && coords.y <= y2) {
                hitBand = band;
                break;
            }
        } else {
            // Band Hit Test
            const bandHeight = Math.max(30, CANVAS_HEIGHT * BAND_HEIGHT_RATIO);
            const bandYPx = band.y * (CANVAS_HEIGHT - bandHeight);
            if (coords.y >= bandYPx && coords.y <= bandYPx + bandHeight) {
                hitBand = band;
                break;
            }
        }
    }

    appState.isDragging = true;
    dragInfo.startX = coords.x;
    dragInfo.startY = coords.y;

    if (hitBand) {
        dragInfo.target = hitBand.id;
        dragInfo.initialY = hitBand.y;
        dragInfo.initialX = hitBand.x !== undefined ? hitBand.x : 0.5;

        const isFree = hitBand.type === 'free' || hitBand.type === 'sticker';
        canvas.style.cursor = isFree ? 'move' : 'ns-resize';
    } else {
        dragInfo.target = 'image';
        dragInfo.initialX = appState.imgX;
        dragInfo.initialY = appState.imgY;
        canvas.style.cursor = 'grabbing';
    }
}

function handleMouseMove(e) {
    const coords = getCanvasCoordinates(e);

    // Cursor Hover Feedback
    if (!appState.isDragging) {
        let hover = false;
        const fontFree = "bold 42px Arial, sans-serif";

        for (let i = appState.bands.length - 1; i >= 0; i--) {
            const band = appState.bands[i];

            if (band.type === 'free' && band.text) {
                ctx.font = fontFree;
                const w = ctx.measureText(band.text).width;
                const cx = band.x * CANVAS_WIDTH;
                const cy = band.y * CANVAS_HEIGHT;
                if (Math.abs(coords.x - cx) < w / 2 + 20 && Math.abs(coords.y - cy) < 30) {
                    canvas.style.cursor = 'move';
                    hover = true;
                    break;
                }
            } else if (band.type === 'sticker' && band.image) {
                const w = CANVAS_WIDTH * band.scale;
                const h = w * (band.image.height / band.image.width);
                const cx = band.x * CANVAS_WIDTH;
                const cy = band.y * CANVAS_HEIGHT;
                if (Math.abs(coords.x - cx) < w / 2 && Math.abs(coords.y - cy) < h / 2) {
                    canvas.style.cursor = 'move';
                    hover = true;
                    break;
                }
            } else {
                const bandHeight = Math.max(30, CANVAS_HEIGHT * BAND_HEIGHT_RATIO);
                const bandYPx = band.y * (CANVAS_HEIGHT - bandHeight);
                if (coords.y >= bandYPx && coords.y <= bandYPx + bandHeight) {
                    canvas.style.cursor = 'ns-resize';
                    hover = true;
                    break;
                }
            }
        }

        if (!hover) {
            canvas.style.cursor = appState.image ? 'grab' : 'default';
        }
        return;
    }

    // Dragging Logic
    if (e.type === 'touchmove') e.preventDefault();

    const deltaX = coords.x - dragInfo.startX;
    const deltaY = coords.y - dragInfo.startY;

    if (dragInfo.target === 'image' && appState.image) {
        appState.imgX = dragInfo.initialX + deltaX;
        appState.imgY = dragInfo.initialY + deltaY;
        clampImagePosition();
    } else if (dragInfo.target !== 'image') {
        const band = appState.bands.find(b => b.id === dragInfo.target);
        if (band) {
            if (band.type === 'free' || band.type === 'sticker') {
                // Free Movement
                const dxRatio = deltaX / CANVAS_WIDTH;
                const dyRatio = deltaY / CANVAS_HEIGHT;

                band.x = dragInfo.initialX + dxRatio;
                band.y = dragInfo.initialY + dyRatio;

                // Broad bounds
                band.x = Math.max(-0.2, Math.min(1.2, band.x));
                band.y = Math.max(-0.1, Math.min(1.1, band.y));
            } else {
                // Band Y only
                const bandHeight = Math.max(30, CANVAS_HEIGHT * BAND_HEIGHT_RATIO);
                const trackHeight = CANVAS_HEIGHT - bandHeight;
                let newY = dragInfo.initialY + (deltaY / trackHeight);
                newY = Math.max(0, Math.min(1, newY));
                band.y = newY;
            }

            // Sync slider if exists (fry slider exists, pos slider gone)
            // No pos slider to update.
        }
    }

    render();
}

function handleMouseUp() {
    if (appState.isDragging) {
        appState.isDragging = false;
        canvas.style.cursor = 'grab';
        if (appState.fryLevel > 0) debouncedFry();
    }
}

function handleTouchStart(e) { handleMouseDown(e); }
function handleTouchMove(e) { handleMouseMove(e); }


// Bounds Logic
function clampImagePosition() {
    if (!appState.image) return;

    const currentScale = appState.baseScale * appState.zoomFactor;
    const drawnWidth = appState.image.width * currentScale;
    const drawnHeight = appState.image.height * currentScale;

    // Bounds:
    // x must be <= 0 (so left edge is at or left of canvas left)
    // x + width must be >= CANVAS_WIDTH (so right edge is at or right of canvas right)
    // Implies: x >= CANVAS_WIDTH - drawnWidth

    const minX = CANVAS_WIDTH - drawnWidth;
    const maxX = 0;

    const minY = CANVAS_HEIGHT - drawnHeight;
    const maxY = 0;

    // If drawn dimension is smaller than canvas (shouldn't happen with our baseScale logic, but floating point safety)
    if (drawnWidth < CANVAS_WIDTH) appState.imgX = (CANVAS_WIDTH - drawnWidth) / 2;
    else appState.imgX = Math.min(maxX, Math.max(minX, appState.imgX));

    if (drawnHeight < CANVAS_HEIGHT) appState.imgY = (CANVAS_HEIGHT - drawnHeight) / 2;
    else appState.imgY = Math.min(maxY, Math.max(minY, appState.imgY));
}


// Rendering Logic

function downloadImage() {
    const link = document.createElement('a');
    link.download = `snapchat_violet_${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
}

// --- Emoji Rendering System ---
const emojiCache = {};
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

function isEmoji(segment) {
    return /\p{Emoji_Presentation}/u.test(segment);
}

function getEmojiHex(emoji) {
    // Convert to code points
    const points = [];
    for (const char of emoji) {
        points.push(char.codePointAt(0).toString(16));
    }
    // Remove Variation Selectors (fe0f) if present to match filename conventions for most sets
    // Apple set usually uses standard sequences. 
    // Testing: "❤️" is 2764-fe0f. Apple file is 2764.png? Or 2764-fe0f.png?
    // Usually filenames strip fe0f.
    return points.filter(p => p !== 'fe0f').join('-');
}

function drawTextWithEmojis(ctx, text, x, y, fontSize) {
    if (!text) return;

    // Segment text by graphemes (keeps emoji sequences together)
    const segments = Array.from(segmenter.segment(text)).map(s => s.segment);

    // 1. Measure Total Width to Center
    let totalWidth = 0;
    const parts = []; // { type: 'text'|'emoji', val: string, width: num }

    // Ensure font size is set for measurement
    // We assume caller has set style (bold, family), we just set size
    // Actually caller should set full font string.
    // But we need to measure.
    // Let's assume the context already has the correct font set by caller? 
    // No, `ctx.measureText` relies on current state.
    // Caller sets `ctx.font = ...` before calling.
    // But `fontSize` argument implies we set it?
    // Let's let the caller set the properties, but we might need to know size for emoji scaling.
    // So we assume `ctx.font` is already correct! 
    // But wait, we need `fontSize` for emoji image size. 

    for (const seg of segments) {
        if (isEmoji(seg)) {
            const dim = fontSize * 1.05; // Emojis slightly larger
            parts.push({ type: 'emoji', val: seg, width: dim });
            totalWidth += dim;
        } else {
            const w = ctx.measureText(seg).width;
            parts.push({ type: 'text', val: seg, width: w });
            totalWidth += w;
        }
    }

    // 2. Alignment Logic (Center)
    // We strictly use Center alignment for now as per app design
    let currentX = x - (totalWidth / 2);

    // 3. Draw Loop
    const savedAlign = ctx.textAlign;
    const savedBaseline = ctx.textBaseline;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // We draw parts one by one from left to right starting at `currentX`

    for (const part of parts) {
        if (part.type === 'text') {
            ctx.fillStyle = "#ffffff";
            // Shadow is already handled by context state if set by caller
            ctx.fillText(part.val, currentX, y);
        } else {
            // Draw Emoji
            const hex = getEmojiHex(part.val);
            const cacheKey = `apple-${hex}`;

            if (emojiCache[cacheKey]) {
                if (emojiCache[cacheKey].complete && emojiCache[cacheKey].naturalWidth !== 0) {
                    const img = emojiCache[cacheKey];
                    // Draw centered vertically at y
                    // If height is part.width (square)
                    ctx.drawImage(img, currentX, y - part.width / 2, part.width, part.width);
                }
            } else {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@14.0.0/img/apple/64/${hex}.png`;
                emojiCache[cacheKey] = img;
                img.onload = () => {
                    // Force re-render once loaded
                    render();
                };
            }
        }
        currentX += part.width;
    }

    // Restore
    ctx.textAlign = savedAlign;
    ctx.textBaseline = savedBaseline;
}


function handleStickerUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const id = Date.now().toString();
            appState.bands.push({
                id,
                type: 'sticker',
                image: img,
                x: 0.5,
                y: 0.5,
                scale: 0.3, // Default scale
                fryScore: 0.5
            });
            renderBandsList();
            render();
            // Hide menu
            addOptions.classList.add('hidden');
            // Reset input so same file can be selected again
            stickerUpload.value = '';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function updateStickerScale(id, val) {
    const band = appState.bands.find(b => b.id === id);
    if (band && band.type === 'sticker') {
        band.scale = parseFloat(val);
        render();
        if (appState.fryLevel > 0) debouncedFry();
    }
}

window.appHandlers = {
    updateText: updateBandText,
    updateFry: updateBandFry,
    updateSize: updateStickerScale,
    remove: removeBand
};

init();
