// Canvas Drawing Script with Interactive Scalable Shapes
const canvas = document.getElementById("freedomBoard");
const ctx = canvas.getContext("2d", { willReadFrequently: false });
const gridCanvas = document.getElementById("gridCanvas");
const gridCtx = gridCanvas.getContext("2d");
const canvasContainer = document.getElementById("canvasContainer");
const deleteModal = document.getElementById("deleteModal");
const clearBoardBtn = document.getElementById("clearBoard");
const confirmDelete = document.getElementById("confirmDelete");
const cancelDelete = document.getElementById("cancelDelete");
const shapesBtn = document.getElementById("shapesBtn");
const shapeMenu = document.getElementById("shapeMenu");
const shapeOptionsBtns = document.querySelectorAll(".shapeOption");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");

// Enable smooth rendering
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

// Core variables
let drawing = false;
let currentTool = "pencil";
let strokeColor = "#111";
let strokeWidth = 2;
let currentShape = "rectangle";
let showGrid = false;
const gridSize = 25;
let bgImage = null;
let isFullscreen = false;

// Shape drawing variables
let shapeStartPos = null;
let savedCanvasState = null;

// Undo / Redo
let history = [];
let historyStep = -1;

// ---------------- Modal Events ----------------
clearBoardBtn.addEventListener("click", () => deleteModal.classList.remove("hidden"));
cancelDelete.addEventListener("click", () => deleteModal.classList.add("hidden"));
confirmDelete.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
    deleteModal.classList.add("hidden");
});

// ---------------- Fullscreen ----------------
fullscreenBtn.addEventListener("click", () => {
    if (!isFullscreen) {
        if (canvasContainer.requestFullscreen) {
            canvasContainer.requestFullscreen();
        } else if (canvasContainer.webkitRequestFullscreen) {
            canvasContainer.webkitRequestFullscreen();
        } else if (canvasContainer.msRequestFullscreen) {
            canvasContainer.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
});

// Listen for fullscreen changes
document.addEventListener("fullscreenchange", handleFullscreenChange);
document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
document.addEventListener("msfullscreenchange", handleFullscreenChange);

function handleFullscreenChange() {
    isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    if (isFullscreen) {
        canvasContainer.style.maxWidth = "100%";
        canvasContainer.style.height = "100vh";
    } else {
        canvasContainer.style.maxWidth = "1100px";
        canvasContainer.style.height = "clamp(250px, 60vh, 600px)";
    }
    setTimeout(() => resizeCanvas(true), 100);
}

// ---------------- Undo/Redo Buttons ----------------
undoBtn.addEventListener("click", () => {
    if (historyStep > 0) {
        historyStep--;
        restoreState(historyStep);
    }
});

redoBtn.addEventListener("click", () => {
    if (historyStep < history.length - 1) {
        historyStep++;
        restoreState(historyStep);
    }
});

// ---------------- Save / Restore ----------------
function saveState(saveLocal = true) {
    history = history.slice(0, historyStep + 1);
    const dataURL = canvas.toDataURL();
    history.push({
        data: dataURL,
        width: canvas.width,
        height: canvas.height
    });
    historyStep++;
    if (saveLocal) {
        localStorage.setItem("freedomBoard", dataURL);
        localStorage.setItem("freedomBoardWidth", canvas.width);
        localStorage.setItem("freedomBoardHeight", canvas.height);
    }
}

function restoreState(step) {
    if (step < 0 || step >= history.length) {
        historyStep = Math.max(0, Math.min(step, history.length - 1));
        return;
    }
    const state = history[step];
    const img = new Image();
    img.src = state.data;
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawGridLayer();
    };
}

function redrawCanvas(img = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgImage) ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    drawGridLayer();
}

// ---------------- Grid ----------------
function drawGridLayer() {
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    if (!showGrid) return;
    gridCtx.save();
    gridCtx.strokeStyle = "rgba(0,0,0,0.1)";
    gridCtx.lineWidth = 1;
    for (let x = 0; x <= gridCanvas.width; x += gridSize) {
        gridCtx.beginPath();
        gridCtx.moveTo(x, 0);
        gridCtx.lineTo(x, gridCanvas.height);
        gridCtx.stroke();
    }
    for (let y = 0; y <= gridCanvas.height; y += gridSize) {
        gridCtx.beginPath();
        gridCtx.moveTo(0, y);
        gridCtx.lineTo(gridCanvas.width, y);
        gridCtx.stroke();
    }
    gridCtx.restore();
}

// ---------------- Mouse / Touch ----------------
function getPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches) {
        return {
            x: (e.touches[0].clientX - rect.left) * scaleX,
            y: (e.touches[0].clientY - rect.top) * scaleY
        };
    } else {
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
}

// ---------------- Drawing Functions ----------------
function startDrawing(e) {
    const pos = getPosition(e);
    if (currentTool === "shape") {
        shapeStartPos = pos;
        savedCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        drawing = true;
    } else {
        drawing = true;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }
    e.preventDefault();
}

function draw(e) {
    if (!drawing) return;
    const pos = getPosition(e);

    if (currentTool === "shape" && shapeStartPos) {
        // Restore canvas and draw preview
        ctx.putImageData(savedCanvasState, 0, 0);
        drawInteractiveShape(shapeStartPos.x, shapeStartPos.y, pos.x, pos.y);
    } else if (currentTool !== "shape") {
        ctx.globalCompositeOperation = currentTool === "eraser" ? "destination-out" : "source-over";
        ctx.strokeStyle = currentTool === "eraser" ? "rgba(0,0,0,1)" : strokeColor;
        ctx.lineWidth = currentTool === "pencil" ? 2 :
            currentTool === "marker" ? 6 :
                currentTool === "paint" ? 12 :
                    currentTool === "eraser" ? 12 : strokeWidth;
        ctx.lineTo(pos.x, pos.y);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
    }
    e.preventDefault();
}

function stopDrawing(e) {
    if (!drawing) return;

    if (currentTool === "shape" && shapeStartPos) {
        const pos = getPosition(e);
        ctx.putImageData(savedCanvasState, 0, 0);
        drawInteractiveShape(shapeStartPos.x, shapeStartPos.y, pos.x, pos.y);
        shapeStartPos = null;
        savedCanvasState = null;
        saveState();
    } else if (currentTool !== "shape") {
        ctx.closePath();
        saveState();
    }

    drawing = false;
}

// ---------------- Interactive Shape Drawing ----------------
function drawInteractiveShape(x1, y1, x2, y2) {
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Translate and rotate for shapes (except circle)
    if (currentShape !== "circle") {
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        ctx.translate(-centerX, -centerY);
    }

    switch (currentShape) {
        case "rectangle":
            ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), width, height);
            break;

        case "square":
            const size = Math.max(width, height);
            ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), size, size);
            break;

        case "circle":
            const radius = Math.sqrt(width * width + height * height) / 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
            break;

        case "ellipse":
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;

        case "triangle":
            ctx.beginPath();
            ctx.moveTo(centerX, Math.min(y1, y2));
            ctx.lineTo(Math.min(x1, x2), Math.min(y1, y2) + height);
            ctx.lineTo(Math.min(x1, x2) + width, Math.min(y1, y2) + height);
            ctx.closePath();
            ctx.stroke();
            break;

        case "star":
            drawStar(centerX, centerY, 5, Math.max(width, height) / 2, Math.max(width, height) / 4);
            break;

        case "hexagon":
            drawPolygon(centerX, centerY, 6, Math.max(width, height) / 2);
            break;

        case "pentagon":
            drawPolygon(centerX, centerY, 5, Math.max(width, height) / 2);
            break;

        case "arrow":
            drawArrow(Math.min(x1, x2), Math.min(y1, y2), width, height);
            break;

        case "line":
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            break;
    }

    ctx.restore();
}

function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    ctx.beginPath();
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.stroke();
}

function drawPolygon(cx, cy, sides, radius) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
}

function drawArrow(x, y, width, height) {
    const headWidth = width / 2;
    const headHeight = height / 3;

    ctx.beginPath();
    // Arrow shaft
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width / 2, y + height - headHeight);
    // Arrow head left
    ctx.moveTo(x, y + height - headHeight);
    ctx.lineTo(x + width / 2, y + height);
    // Arrow head right
    ctx.lineTo(x + width, y + height - headHeight);
    ctx.stroke();
}

// ---------------- Canvas Events ----------------
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseleave", stopDrawing);
canvas.addEventListener("touchstart", startDrawing, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
canvas.addEventListener("touchend", stopDrawing);

// ---------------- Tool Buttons ----------------
document.querySelectorAll(".toolBtn").forEach(btn =>
    btn.addEventListener("click", () => {
        currentTool = btn.dataset.tool;
        // Visual feedback - highlight active tool
        document.querySelectorAll(".toolBtn").forEach(b => b.classList.remove("ring-2", "ring-pink-500"));
        btn.classList.add("ring-2", "ring-pink-500");
    })
);

// ---------------- Color Picker ----------------
document.getElementById("colorPicker")?.addEventListener("input", e => strokeColor = e.target.value);

// ---------------- Undo / Redo (Keyboard) ----------------
document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "z" && historyStep > 0) {
        e.preventDefault();
        historyStep--;
        restoreState(historyStep);
    }
    if (e.ctrlKey && e.key === "y" && historyStep < history.length - 1) {
        e.preventDefault();
        historyStep++;
        restoreState(historyStep);
    }
});

// ---------------- Grid Toggle ----------------
document.getElementById("gridToggle").addEventListener("click", () => {
    showGrid = !showGrid;
    drawGridLayer();
});

// ---------------- Background Upload ----------------
document.getElementById("bgUpload").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            bgImage = img;
            redrawCanvas();
            saveState();
        }
    }
    reader.readAsDataURL(file);
});

// ---------------- Download Canvas ----------------
document.getElementById("downloadCanvas").addEventListener("click", () => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");

    if (bgImage) tempCtx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    else { tempCtx.fillStyle = "#fff"; tempCtx.fillRect(0, 0, canvas.width, canvas.height); }

    tempCtx.drawImage(canvas, 0, 0);
    const link = document.createElement("a");
    link.download = `wordwise-drawing-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL();
    link.click();
});

// ---------------- Shapes Menu ----------------
shapesBtn.addEventListener("click", () => shapeMenu.classList.toggle("hidden"));
shapeOptionsBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        currentShape = btn.dataset.shape;
        currentTool = "shape";
        shapeMenu.classList.add("hidden");
        shapesBtn.title = "Shape: " + currentShape;
    });
});

// ---------------- Responsive Canvas (FIXED) ----------------
function resizeCanvas(maintainContent = false) {
    // Save current canvas content before resize
    const tempData = maintainContent && canvas.width > 0 ? canvas.toDataURL() : null;
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;

    // Set new dimensions
    const newWidth = canvas.parentElement.clientWidth;
    const newHeight = canvas.parentElement.clientHeight;

    canvas.width = newWidth;
    canvas.height = newHeight;
    gridCanvas.width = newWidth;
    gridCanvas.height = newHeight;

    // Restore smooth rendering settings after resize
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Restore content if exists
    if (tempData) {
        const img = new Image();
        img.src = tempData;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Scale the image to fit new canvas size while maintaining aspect ratio
            const scale = Math.min(newWidth / oldWidth, newHeight / oldHeight);
            const scaledWidth = oldWidth * scale;
            const scaledHeight = oldHeight * scale;
            const x = (newWidth - scaledWidth) / 2;
            const y = (newHeight - scaledHeight) / 2;

            ctx.drawImage(img, 0, 0, oldWidth, oldHeight, x, y, scaledWidth, scaledHeight);
            drawGridLayer();
        };
    } else {
        drawGridLayer();
    }
}

// Debounce resize to improve performance
let resizeTimeout;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => resizeCanvas(true), 150);
});

// ---------------- Load Saved Canvas ----------------
const saved = localStorage.getItem("freedomBoard");
const savedWidth = localStorage.getItem("freedomBoardWidth");
const savedHeight = localStorage.getItem("freedomBoardHeight");

if (saved) {
    const img = new Image();
    img.src = saved;
    img.onload = () => {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        gridCanvas.width = canvas.width;
        gridCanvas.height = canvas.height;

        // Restore smooth rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Scale saved image to fit current canvas
        if (savedWidth && savedHeight) {
            const scale = Math.min(canvas.width / savedWidth, canvas.height / savedHeight);
            const scaledWidth = savedWidth * scale;
            const scaledHeight = savedHeight * scale;
            const x = (canvas.width - scaledWidth) / 2;
            const y = (canvas.height - scaledHeight) / 2;
            ctx.drawImage(img, 0, 0, savedWidth, savedHeight, x, y, scaledWidth, scaledHeight);
        } else {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        saveState(false);
        drawGridLayer();
    }
} else {
    resizeCanvas(false);
}

// Set initial tool highlight
document.querySelector('[data-tool="pencil"]')?.classList.add("ring-2", "ring-pink-500");
