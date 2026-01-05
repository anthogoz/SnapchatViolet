
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
    isDragging: false,
    isResizing: false,
    selectedBandId: null
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
                const fontSize = 42 * (item.scale || 1);
                ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const x = item.x * CANVAS_WIDTH;
                const y = item.y * CANVAS_HEIGHT;

                // Shadow for visibility
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 4;
                ctx.fillStyle = 'white';

                // Use new Emoji Drawer
                drawTextWithEmojis(ctx, item.text, x, y, fontSize);

                // Reset shadow
                ctx.shadowColor = 'transparent';
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

    // 3. Selection Overlay
    if (appState.selectedBandId) {
        const band = appState.bands.find(b => b.id === appState.selectedBandId);
        if (band) {
            ctx.save();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.shadowColor = "black";
            ctx.shadowBlur = 3;

            if (band.type === 'sticker' && band.image) {
                const width = CANVAS_WIDTH * band.scale;
                const height = width * (band.image.height / band.image.width);
                const x = (band.x * CANVAS_WIDTH) - (width / 2);
                const y = (band.y * CANVAS_HEIGHT) - (height / 2);

                // Outline
                ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);

                // Resize Handle (Bottom Right)
                const handleX = x + width;
                const handleY = y + height;

                ctx.beginPath();
                ctx.arc(handleX, handleY, 8, 0, Math.PI * 2);
                ctx.fillStyle = "#ffffff";
                ctx.fill();
                ctx.stroke(); // Outline to match selection style


            } else if (band.type === 'free' && band.text) {
                const baseSize = 42;
                const scale = band.scale || 1;
                const fontSize = baseSize * scale;
                const metrics = getTextMetrics(ctx, band.text, fontSize);

                const w = metrics.width;
                const h = metrics.height;

                const x = (band.x * CANVAS_WIDTH) - (w / 2) - 10;
                const y = (band.y * CANVAS_HEIGHT) - (h / 2) - 10;

                const boxW = w + 20;
                const boxH = h + 20;

                // Outline
                ctx.strokeRect(x, y, boxW, boxH);

                // Resize Handle (Bottom Right)
                const handleX = x + boxW;
                const handleY = y + boxH;

                ctx.beginPath();
                ctx.arc(handleX, handleY, 8, 0, Math.PI * 2);
                ctx.fillStyle = "#ffffff";
                ctx.fill();
                ctx.stroke();

            } else if (band.type === 'band') {
                const bandHeight = Math.max(30, CANVAS_HEIGHT * BAND_HEIGHT_RATIO);
                const yPos = band.y * (CANVAS_HEIGHT - bandHeight);
                ctx.strokeRect(0, yPos, CANVAS_WIDTH, bandHeight);
            }

            ctx.restore();
        }
    }
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
                    const fontSize = 42 * (band.scale || 1);
                    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    const x = band.x * CANVAS_WIDTH;
                    const y = band.y * CANVAS_HEIGHT;

                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 4;
                    ctx.fillStyle = 'white';

                    drawTextWithEmojis(ctx, band.text, x, y, fontSize);

                    ctx.shadowColor = 'transparent';
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
    appState.selectedBandId = id;
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
        scale: 1.0, // Default scale
        fryScore: 0.5
    });
    appState.selectedBandId = id;
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

        // Header: Icon + Input/Label + Delete
        let headerHTML = '';
        if (band.type === 'sticker') {
            headerHTML = `
                <div style="display: flex; gap: 10px; align-items: center; flex: 1;">
                    <span style="font-size: 1.4rem;">${icon}</span>
                    <span style="font-size: 14px; color: #ccc; font-weight:bold;">Image Sticker</span>
                </div>
            `;
        } else {
            headerHTML = `
                <div style="display: flex; gap: 10px; align-items: center; flex: 1;">
                    <span style="font-size: 1.4rem;">${icon}</span>
                    <textarea 
                        class="band-input" 
                        placeholder="Votre texte..." 
                        oninput="window.appHandlers.updateText('${band.id}', this.value)"
                        style="width: 100%; resize: vertical; min-height: 38px; font-family:inherit;"
                        rows="1"
                    >${band.text}</textarea>
                </div>
            `;
        }

        headerHTML += `<button class="delete-btn" onclick="window.appHandlers.remove('${band.id}')">🗑</button>`;

        // Sliders Area
        let slidersHTML = '';

        // Size Slider (Sticker only)
        if (band.type === 'sticker') {
            slidersHTML += `
                <div style="margin-top: 10px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="font-size:12px; color:#aaa;">Taille</span>
                    </div>
                    <input type="range" 
                        min="0.1" max="1.5" step="0.05" 
                        value="${band.scale}" 
                        oninput="window.appHandlers.updateSize('${band.id}', this.value)"
                    >
                </div>
            `;
        }

        // Fry Slider (Everyone)
        slidersHTML += `
            <div style="margin-top: 10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="font-size:12px; color:#aaa;">Destruction 🔥</span>
                </div>
                <input type="range" 
                    min="0" max="1" step="0.01" 
                    value="${band.fryScore !== undefined ? band.fryScore : 0.5}" 
                    oninput="window.appHandlers.updateFry('${band.id}', this.value)"
                >
            </div>
        `;

        div.innerHTML = `
            <div class="band-controls">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    ${headerHTML}
                </div>
                ${slidersHTML}
            </div>
        `;
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

    // 1. Check Resize Handle Hit (Priority)
    if (appState.selectedBandId) {
        const band = appState.bands.find(b => b.id === appState.selectedBandId);
        if (band) {
            let handleX, handleY;

            if (band.type === 'sticker' && band.image) {
                const width = CANVAS_WIDTH * band.scale;
                const height = width * (band.image.height / band.image.width);
                const x = (band.x * CANVAS_WIDTH) - (width / 2);
                const y = (band.y * CANVAS_HEIGHT) - (height / 2);
                handleX = x + width;
                handleY = y + height;
            } else if (band.type === 'free' && band.text) {
                const baseSize = 42;
                const scale = band.scale || 1;
                const fontSize = baseSize * scale;

                ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                const metrics = getTextMetrics(ctx, band.text, fontSize);
                const w = metrics.width;
                const h = metrics.height;

                const cx = band.x * CANVAS_WIDTH;
                const cy = band.y * CANVAS_HEIGHT;

                // Handle Pos: Bottom Right of Box
                handleX = cx + w / 2 + 10;
                handleY = cy + h / 2 + 10;
            }

            if (handleX !== undefined) {
                const dx = coords.x - handleX;
                const dy = coords.y - handleY;
                if (dx * dx + dy * dy <= 20 * 20) {
                    appState.isResizing = true;
                    dragInfo.target = band.id;
                    dragInfo.startX = coords.x;
                    dragInfo.startY = coords.y;
                    dragInfo.initialScale = band.scale !== undefined ? band.scale : 1.0;
                    return;
                }
            }
        }
    }

    let hitBand = null;
    const fontFree = "bold 42px Arial, sans-serif";

    // Check bands hitting (iterate top-down)
    for (let i = appState.bands.length - 1; i >= 0; i--) {
        const band = appState.bands[i];

        if (band.type === 'free') {
            // Free Text Hit Test
            if (band.text) {
                const baseSize = 42;
                const scale = band.scale || 1;
                const fontSize = baseSize * scale;
                ctx.font = `bold ${fontSize}px Arial, sans-serif`;

                const metrics = getTextMetrics(ctx, band.text, fontSize);
                const width = metrics.width;
                const height = metrics.height;

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

    // Selection Logic
    appState.selectedBandId = hitBand ? hitBand.id : null;

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

    render();
}

function handleMouseMove(e) {
    const coords = getCanvasCoordinates(e);

    // Cursor Hover Feedback
    if (!appState.isDragging && !appState.isResizing) {
        let hover = false;

        // Check handle hover first
        if (appState.selectedBandId) {
            const band = appState.bands.find(b => b.id === appState.selectedBandId);
            if (band) {
                let handleX, handleY;
                if (band.type === 'sticker' && band.image) {
                    const width = CANVAS_WIDTH * band.scale;
                    const height = width * (band.image.height / band.image.width);
                    const x = (band.x * CANVAS_WIDTH) - (width / 2);
                    const y = (band.y * CANVAS_HEIGHT) - (height / 2);
                    handleX = x + width;
                    handleY = y + height;
                } else if (band.type === 'free' && band.text) {
                    const baseSize = 42;
                    const scale = band.scale || 1;
                    const fontSize = baseSize * scale;
                    ctx.font = `bold ${fontSize}px Arial, sans-serif`;

                    const metrics = getTextMetrics(ctx, band.text, fontSize);
                    const w = metrics.width;
                    const h = metrics.height;

                    // Handle Pos: Bottom Right of Box
                    const cx = band.x * CANVAS_WIDTH;
                    const cy = band.y * CANVAS_HEIGHT;
                    handleX = cx + w / 2 + 10;
                    handleY = cy + h / 2 + 10;
                }

                if (handleX !== undefined) {
                    const dx = coords.x - handleX;
                    const dy = coords.y - handleY;
                    if (dx * dx + dy * dy <= 15 * 15) {
                        canvas.style.cursor = 'nwse-resize';
                        return;
                    }
                }
            }
        }

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

    // Resizing Logic
    if (appState.isResizing) {
        if (e.type === 'touchmove') e.preventDefault();
        const band = appState.bands.find(b => b.id === dragInfo.target);
        if (band) {
            const delta = coords.x - dragInfo.startX; // Drag right to increase
            // Sensitivity: 200px = +1.0 scale
            const newScale = dragInfo.initialScale + (delta / 200);
            band.scale = Math.max(0.05, Math.min(3.0, newScale));
            render();

            // Sync UI slider if possible (but we don't have direct ref, rely on render re-creating UI? No renderBandsList not called)
            // But we can update the slider value if it exists in DOM
            // This is optional but nice.
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
    if (appState.isResizing) {
        appState.isResizing = false;
        canvas.style.cursor = 'default';
        if (appState.fryLevel > 0) debouncedFry();
        renderBandsList(); // Sync UI slider
        return;
    }

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

// Helper to measure text (multiline + emojis)
function getTextMetrics(ctx, text, fontSize) {
    if (!text) return { width: 0, height: 0, lines: [] };

    // Split lines
    const rawLines = text.split('\n');
    const lines = [];
    let maxWidth = 0;

    // Line Height Factor
    const lineHeight = fontSize * 1.2;

    for (const lineStr of rawLines) {
        // Segment
        const segments = Array.from(segmenter.segment(lineStr)).map(s => s.segment);
        const parts = [];
        let lineWidth = 0;

        for (const seg of segments) {
            if (isEmoji(seg)) {
                const dim = fontSize * 1.05;
                parts.push({ type: 'emoji', val: seg, width: dim });
                lineWidth += dim;
            } else {
                const w = ctx.measureText(seg).width;
                parts.push({ type: 'text', val: seg, width: w });
                lineWidth += w;
            }
        }

        lines.push({ parts, width: lineWidth });
        if (lineWidth > maxWidth) maxWidth = lineWidth;
    }

    const totalHeight = lines.length * lineHeight;
    return { width: maxWidth, height: totalHeight, lines, lineHeight };
}

function drawTextWithEmojis(ctx, text, x, y, fontSize) {
    if (!text) return;

    const metrics = getTextMetrics(ctx, text, fontSize);

    // Vertical centering
    // y is center.
    // Start Y = y - totalHeight / 2.
    // First line center Y = StartY + lineHeight / 2.
    // Or simpler: StartY = y - (metrics.height / 2) + (metrics.lineHeight / 2) ?
    // Let's settle on: we draw each line with baseline='middle'.
    // Top of block = y - metrics.height / 2.
    // Line 1 center = Top + lineHeight / 2.

    const startY = y - (metrics.height / 2) + (metrics.lineHeight / 2);

    const savedAlign = ctx.textAlign;
    const savedBaseline = ctx.textBaseline;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    metrics.lines.forEach((line, index) => {
        const lineY = startY + (index * metrics.lineHeight);

        // Center line horizontally
        let currentX = x - (line.width / 2);

        for (const part of line.parts) {
            if (part.type === 'text') {
                ctx.fillStyle = "#ffffff";
                ctx.fillText(part.val, currentX, lineY);
            } else {
                const hex = getEmojiHex(part.val);
                const cacheKey = `apple-${hex}`;

                if (emojiCache[cacheKey] && emojiCache[cacheKey].complete && emojiCache[cacheKey].naturalWidth !== 0) {
                    const img = emojiCache[cacheKey];
                    ctx.drawImage(img, currentX, lineY - part.width / 2, part.width, part.width);
                } else if (!emojiCache[cacheKey]) {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@14.0.0/img/apple/64/${hex}.png`;
                    emojiCache[cacheKey] = img;
                    img.onload = () => render();
                }
            }
            currentX += part.width;
        }
    });

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
            appState.selectedBandId = id;
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
