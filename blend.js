// blend.js - 图像混合相关功能

(function() {
    // 混合功能相关变量
    let imageLayers = [];
    const defaultPreviewBg = '#e5e7eb';
    let activeBlendConfig = {
        mode: 'normal',
        baseBackground: defaultPreviewBg
    };
    let isGlobalInverted = false;

    // SVG 水印定义
    const svgWatermark = `
    <svg width="60" height="20" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad">
          <stop offset="0%" stop-color="rgba(0,0,0,0.8)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.4)"/>
        </linearGradient>
      </defs>
      <rect width="60" height="20" fill="url(#grad)" rx="3"/>
      <text x="30" y="14" text-anchor="middle" fill="white" font-size="10" font-weight="bold">Picgle</text>
    </svg>`;

    // DOM元素
    const blendImageUpload = document.getElementById('blendImageUpload');
const blendModeSelect = document.getElementById('blendModeSelect');
const globalInvertToggleBtn = document.getElementById('globalInvertToggleBtn');
const previewAreaContainer = document.getElementById('previewAreaContainer');
const previewArea = document.getElementById('previewArea');
const layerManager = document.getElementById('layerManager');
const downloadButton = document.getElementById('downloadButton');
const clearAllBtn = document.getElementById('clearAllBtn');
const whiteBgMultiplyBtn = document.getElementById('whiteBgMultiplyBtn');
const blackBgScreenBtn = document.getElementById('blackBgScreenBtn');
const advancedBlendToggleBtn = document.getElementById('advancedBlendToggle');
const advancedBlendOptionsDiv = document.getElementById('advancedBlendOptions');
const blendWatermarkToggle = document.getElementById('blendWatermarkToggle');

// 创建 SVG 水印图像
async function createSvgWatermarkImage() {
    return new Promise((resolve, reject) => {
        const blob = new Blob([svgWatermark], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        
        img.src = url;
    });
}

// 清除所有图片
function clearAllImages() {
    imageLayers = [];
    blendImageUpload.value = '';
    updateFileLabel(blendImageUpload, 'blendFileLabel', true);
    activeBlendConfig = {
        mode: 'normal',
        baseBackground: defaultPreviewBg
    };
    blendModeSelect.value = 'normal';
    isGlobalInverted = false;
    if (!advancedBlendOptionsDiv.classList.contains('hidden')) {
        advancedBlendOptionsDiv.classList.add('hidden');
    }
    updateActiveButtonStates();
    renderAll();
}

// 设置快速混合模式
function setQuickBlendMode(mode, bgColor) {
    activeBlendConfig.mode = mode;
    activeBlendConfig.baseBackground = bgColor;
    advancedBlendOptionsDiv.classList.add('hidden');
    blendModeSelect.value = mode;
    updateActiveButtonStates();
    applyStylesToPreview();
}

// 切换高级模式
function toggleAdvancedMode() {
    const isHidden = advancedBlendOptionsDiv.classList.toggle('hidden');
    if (!isHidden) {
        activeBlendConfig.mode = blendModeSelect.value;
        activeBlendConfig.baseBackground = defaultPreviewBg;
    } else {
        if (!(activeBlendConfig.baseBackground === 'white' && activeBlendConfig.mode === 'multiply') &&
            !(activeBlendConfig.baseBackground === 'black' && activeBlendConfig.mode === 'screen')) {
            activeBlendConfig.mode = 'normal';
            blendModeSelect.value = 'normal';
            activeBlendConfig.baseBackground = defaultPreviewBg;
        }
    }
    updateActiveButtonStates();
    applyStylesToPreview();
}

// 更新按钮状态
function updateActiveButtonStates() {
    const whiteMultiplyActive = advancedBlendOptionsDiv.classList.contains('hidden') &&
        activeBlendConfig.mode === 'multiply' && activeBlendConfig.baseBackground === 'white';
    const blackScreenActive = advancedBlendOptionsDiv.classList.contains('hidden') &&
        activeBlendConfig.mode === 'screen' && activeBlendConfig.baseBackground === 'black';

    if (whiteMultiplyActive) {
        whiteBgMultiplyBtn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        whiteBgMultiplyBtn.classList.add('bg-green-500', 'text-white');
    } else {
        whiteBgMultiplyBtn.classList.remove('bg-green-500', 'text-white');
        whiteBgMultiplyBtn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
    }

    if (blackScreenActive) {
        blackBgScreenBtn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        blackBgScreenBtn.classList.add('bg-green-500', 'text-white');
    } else {
        blackBgScreenBtn.classList.remove('bg-green-500', 'text-white');
        blackBgScreenBtn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
    }

    if (!advancedBlendOptionsDiv.classList.contains('hidden')) {
        advancedBlendToggleBtn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        advancedBlendToggleBtn.classList.add('bg-green-500', 'text-white');
    } else {
        advancedBlendToggleBtn.classList.remove('bg-green-500', 'text-white');
        advancedBlendToggleBtn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
    }

    if (isGlobalInverted) {
        globalInvertToggleBtn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        globalInvertToggleBtn.classList.add('bg-green-500', 'text-white');
    } else {
        globalInvertToggleBtn.classList.remove('bg-green-500', 'text-white');
        globalInvertToggleBtn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
    }
}

// 处理图片上传
async function handleImageUpload(event) {
    const files = event.target.files;
    if (!files.length) return;
    
    showProgress('Loading images...');
    
    const newLayers = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
            try {
                updateProgress((i / files.length) * 100, `Loading ${file.name}...`);
                const src = await readFileAsDataURL(file);
                newLayers.push({
                    id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    src: src,
                    name: file.name,
                    filters: { invert: false }
                });
            } catch (err) {
                console.error("File reading error:", err);
                alert(`Error reading ${file.name}`);
            }
        }
    }
    
    imageLayers = [...newLayers.reverse(), ...imageLayers];
    hideProgress();
    renderAll();
}

// 读取文件为DataURL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

// 渲染所有内容
function renderAll() {
    renderLayerManager();
    renderPreviewImages();
    applyStylesToPreview();
}

// 渲染图层管理器
function renderLayerManager() {
    layerManager.innerHTML = '';
    if (!imageLayers.length) {
        layerManager.innerHTML = '<p class="text-center text-gray-500 text-sm">Please upload images first.</p>';
        return;
    }
    imageLayers.forEach((layer) => {
        const item = document.createElement('div');
        item.className = 'layer-item flex items-center justify-between p-2 bg-white border border-gray-200 mb-2 rounded cursor-grab shadow-sm hover:shadow-md transition-shadow duration-200 mobile-layer-item';
        item.draggable = true;
        item.dataset.id = layer.id;

        const leftSection = document.createElement('div');
        leftSection.className = 'flex items-center flex-1';

        const thumb = document.createElement('img');
        thumb.src = layer.src;
        thumb.className = 'w-8 h-6 sm:w-10 sm:h-8 mobile-layer-thumb object-cover rounded border border-gray-300 mr-2 sm:mr-3';
        thumb.alt = "Layer thumbnail";

        const name = document.createElement('span');
        name.className = 'text-xs sm:text-sm text-gray-800 truncate flex-1 pr-2';
        name.textContent = layer.name.length > 15 ? layer.name.substring(0, 12) + '...' : layer.name;

        const invertBtn = document.createElement('button');
        invertBtn.textContent = 'Invert';
        invertBtn.className = 'px-2 py-1 text-xs rounded transition-colors duration-200';
        if (layer.filters.invert) {
            invertBtn.classList.add('bg-green-500', 'text-white');
        } else {
            invertBtn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        }
        invertBtn.dataset.layerId = layer.id;
        invertBtn.onclick = function() {
            const currentLayer = imageLayers.find(l => l.id === this.dataset.layerId);
            if (currentLayer) {
                currentLayer.filters.invert = !currentLayer.filters.invert;
                if (currentLayer.filters.invert) {
                    this.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                    this.classList.add('bg-green-500', 'text-white');
                } else {
                    this.classList.remove('bg-green-500', 'text-white');
                    this.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                }
                applyStylesToPreview();
            }
        };

        leftSection.appendChild(thumb);
        leftSection.appendChild(name);
        item.appendChild(leftSection);
        item.appendChild(invertBtn);
        layerManager.appendChild(item);

        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
    });
}

// 渲染预览图片
function renderPreviewImages() {
    previewArea.innerHTML = '';
    [...imageLayers].reverse().forEach(layer => {
        const img = document.createElement('img');
        img.src = layer.src;
        img.alt = layer.name;
        img.dataset.id = layer.id;
        img.className = 'absolute top-0 left-0 w-full h-full object-contain';
        previewArea.appendChild(img);
    });
    updateWatermarkVisibility();
}

// 应用样式到预览
function applyStylesToPreview() {
    previewAreaContainer.style.backgroundColor = activeBlendConfig.baseBackground;
    const images = previewArea.getElementsByTagName('img');
    for (let i = 0; i < images.length; i++) {
        const imgElement = images[i];
        const layerId = imgElement.dataset.id;
        const layerData = imageLayers.find(l => l.id === layerId);
        if (!layerData) continue;
        imgElement.style.filter = layerData.filters.invert ? 'invert(1)' : 'none';
        const isBottomLayerInStack = (imageLayers.length > 0 && layerId === imageLayers[imageLayers.length - 1].id);
        if (isBottomLayerInStack || imageLayers.length <= 1) {
            imgElement.style.mixBlendMode = 'normal';
        } else {
            imgElement.style.mixBlendMode = activeBlendConfig.mode;
        }
    }
    previewAreaContainer.style.filter = isGlobalInverted ? 'invert(1)' : 'none';
}

// 拖放功能
let draggedItem = null;
let dropIndicator = null;

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.layer-item:not(.dragging)')];
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

function handleDragStart(e) {
    draggedItem = e.target.closest('.layer-item');
    if (!draggedItem) return;
    draggedItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedItem.dataset.id);
    if (!dropIndicator) {
        dropIndicator = document.createElement('div');
        dropIndicator.className = 'drop-indicator';
    }
}

function handleDragOver(e) {
    e.preventDefault();
    const container = layerManager;
    const afterElement = getDragAfterElement(container, e.clientY);
    const draggingElement = container.querySelector('.dragging');
    if (afterElement == null) {
        if (draggingElement !== container.lastChild && (container.lastChild !== dropIndicator || !container.contains(dropIndicator))) {
            container.appendChild(dropIndicator);
        }
    } else {
        if (draggingElement !== afterElement && (afterElement.previousSibling !== draggingElement || !container.contains(dropIndicator))) {
            container.insertBefore(dropIndicator, afterElement);
        }
    }
}

function handleDragLeave(e) {
    if (!layerManager.contains(e.relatedTarget) && dropIndicator && dropIndicator.parentNode) {
        dropIndicator.parentNode.removeChild(dropIndicator);
    }
}

function handleDrop(e) {
    e.preventDefault();
    if (!draggedItem) return;
    const draggedId = draggedItem.dataset.id;
    const draggedIndex = imageLayers.findIndex(l => l.id === draggedId);
    if (draggedIndex === -1) {
        if (dropIndicator && dropIndicator.parentNode) {
            dropIndicator.parentNode.removeChild(dropIndicator);
        }
        draggedItem = null;
        return;
    }
    const [draggedLayerData] = imageLayers.splice(draggedIndex, 1);
    let targetIndex;
    if (dropIndicator && dropIndicator.parentNode) {
        targetIndex = Array.from(layerManager.children).indexOf(dropIndicator);
        imageLayers.splice(targetIndex, 0, draggedLayerData);
        dropIndicator.parentNode.removeChild(dropIndicator);
    } else {
        imageLayers.push(draggedLayerData);
    }
    renderAll();
}

function handleDragEnd(e) {
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
    }
    draggedItem = null;
    if (dropIndicator && dropIndicator.parentNode) {
        dropIndicator.parentNode.removeChild(dropIndicator);
    }
}

// 下载图片
async function downloadImage() {
    if (!imageLayers.length) {
        alert("No images to download.");
        return;
    }
    
    showProgress('Creating blended image...');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const previewRect = previewAreaContainer.getBoundingClientRect();
    canvas.width = previewRect.width > 0 ? previewRect.width : 700;
    canvas.height = previewRect.height > 0 ? previewRect.height : 525;

    ctx.fillStyle = activeBlendConfig.baseBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const reversedLayers = [...imageLayers].reverse();
    for (let i = 0; i < reversedLayers.length; i++) {
        const layer = reversedLayers[i];
        updateProgress((i / reversedLayers.length) * 90, `Processing layer ${i + 1}...`);
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = (err) => {
                console.error(`Error loading image ${layer.name} for canvas:`, err);
                reject(err);
            };
            img.src = layer.src;
        });
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.naturalWidth || img.width;
        tempCanvas.height = img.naturalHeight || img.height;
        if (layer.filters.invert) {
            tempCtx.filter = 'invert(1)';
        }
        tempCtx.drawImage(img, 0, 0);
        
        const hRatio = canvas.width / tempCanvas.width;
        const vRatio = canvas.height / tempCanvas.height;
        const ratio = Math.min(hRatio, vRatio);
        const drawWidth = tempCanvas.width * ratio;
        const drawHeight = tempCanvas.height * ratio;
        const drawX = (canvas.width - drawWidth) / 2;
        const drawY = (canvas.height - drawHeight) / 2;
        
        const isBottomLayerInStack = (imageLayers.length > 0 && layer.id === imageLayers[imageLayers.length - 1].id);
        if (isBottomLayerInStack || imageLayers.length <= 1) {
            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.globalCompositeOperation = activeBlendConfig.mode;
        }
        ctx.drawImage(tempCanvas, drawX, drawY, drawWidth, drawHeight);
    }
    ctx.globalCompositeOperation = 'source-over';
    
    // 添加 SVG 水印
    if (blendWatermarkToggle.checked) {
        try {
            const watermarkImg = await createSvgWatermarkImage();
            ctx.drawImage(watermarkImg, canvas.width - 65, canvas.height - 25);
        } catch (err) {
            console.error('Failed to create SVG watermark, using fallback:', err);
            // 备用方案：使用原始 Canvas 方式
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(canvas.width - 60, canvas.height - 25, 50, 15);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Arial';
            ctx.fillText('Picgle', canvas.width - 55, canvas.height - 13);
        }
    }
    
    if (isGlobalInverted) {
        updateProgress(95, 'Applying global inversion...');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let j = 0; j < data.length; j += 4) {
            data[j] = 255 - data[j];
            data[j + 1] = 255 - data[j + 1];
            data[j + 2] = 255 - data[j + 2];
        }
        ctx.putImageData(imageData, 0, 0);
    }
    
    try {
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `picgle_blended_image_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) {
        console.error("Error creating data URL or downloading:", e);
        alert("Failed to download image.");
    }
    
    hideProgress();
}

// 初始化混合功能
function initBlend() {
    blendImageUpload.addEventListener('change', (event) => {
        updateFileLabel(event.target, 'blendFileLabel', true);
        handleImageUpload(event);
    });
    
    blendModeSelect.addEventListener('change', () => {
        if (advancedBlendOptionsDiv.classList.contains('hidden')) return;
        activeBlendConfig.mode = blendModeSelect.value;
        activeBlendConfig.baseBackground = defaultPreviewBg;
        updateActiveButtonStates();
        applyStylesToPreview();
    });
    
    globalInvertToggleBtn.addEventListener('click', () => {
        isGlobalInverted = !isGlobalInverted;
        updateActiveButtonStates();
        applyStylesToPreview();
    });
    
    downloadButton.addEventListener('click', downloadImage);
    clearAllBtn.addEventListener('click', clearAllImages);
    whiteBgMultiplyBtn.addEventListener('click', () => setQuickBlendMode('multiply', 'white'));
    blackBgScreenBtn.addEventListener('click', () => setQuickBlendMode('screen', 'black'));
    advancedBlendToggleBtn.addEventListener('click', toggleAdvancedMode);
    blendWatermarkToggle.addEventListener('change', updateWatermarkVisibility);
    
    // 初始化
    updateActiveButtonStates();
    renderLayerManager();
}

    // 文档加载完成后初始化
    document.addEventListener('DOMContentLoaded', initBlend);
})();