// decompose.js - 图像分解相关功能

(function() {
    // 分解功能相关变量
    let originalImage = null;
    let originalImageData = null;
    let originalFileName = 'image';
    let currentDecomposedCanvasesData = [];
    let selectedDecomposedBgType = 'transparent';
    let currentBlendMode = 'multiply';
    let currentShapeType = 'blocks';
    let colorInversionActive = false;

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
    const decomposeImageLoader = document.getElementById('decomposeImageLoader');
const numPiecesInput = document.getElementById('numPieces');
const numPiecesLabel = document.getElementById('numPiecesLabel');
const unlockAdvancedDecomposeButton = document.getElementById('unlockAdvancedDecomposeButton');
const shapeTypeRadios = document.querySelectorAll('input[name="shapeType"]');
const blockSizeGroup = document.getElementById('blockSizeGroup');
const blockSizeInput = document.getElementById('blockSize');
const voronoiSeedsGroup = document.getElementById('voronoiSeedsGroup');
const voronoiSeedsInput = document.getElementById('voronoiSeeds');
const decomposeButton = document.getElementById('decomposeButton');
const originalImageCanvas = document.getElementById('originalImageCanvas');
const originalCtx = originalImageCanvas.getContext('2d');
const decomposedContainer = document.getElementById('decomposedImagesContainer');
const recombinedCanvas = document.getElementById('recombinedCanvas');
const recombinedCtx = recombinedCanvas.getContext('2d', { willReadFrequently: true });
const bgButtons = document.querySelectorAll('.bg-btn');
const colorNormalButton = document.getElementById('colorNormalButton');
const colorInvertButton = document.getElementById('colorInvertButton');
const blendModeInfoSpan = document.getElementById('blendModeInfo');
const decomposeWatermarkToggle = document.getElementById('decomposeWatermarkToggle');
const downloadAllZipBtn = document.getElementById('downloadAllZipBtn');

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

// 更新混合模式信息
function updateBlendModeAndInfo() {
    if (selectedDecomposedBgType === 'transparent' || selectedDecomposedBgType === 'white') {
        currentBlendMode = 'multiply';
        blendModeInfoSpan.textContent = '(Multiply blend)';
    } else if (selectedDecomposedBgType === 'black') {
        currentBlendMode = 'screen';
        blendModeInfoSpan.textContent = '(Screen blend)';
    }
}

// 更新画布背景样式
function updateCanvasBackgroundStyle(canvas, isTransparent) {
    if (isTransparent) canvas.classList.add('transparent-bg');
    else canvas.classList.remove('transparent-bg');
}

// 下载单个画布
function downloadCanvasAsImage(canvas, pieceIndex) {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `${originalFileName}_${currentShapeType}_piece_${pieceIndex + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 下载所有图层为ZIP
async function downloadAllAsZip() {
    if (currentDecomposedCanvasesData.length === 0) {
        alert('No decomposed images to download!');
        return;
    }

    showProgress('Preparing ZIP file...');
    
    const zip = new JSZip();
    const imagesFolder = zip.folder(`${originalFileName}_${currentShapeType}_layers`);
    
    // 添加原图
    if (originalImage && originalImageCanvas.width > 0) {
        updateProgress(10, 'Adding original image...');
        const originalBlob = await new Promise(resolve => originalImageCanvas.toBlob(resolve));
        imagesFolder.file(`${originalFileName}_original.png`, originalBlob);
    }
    
    // 添加所有分解的图层
    for (let i = 0; i < currentDecomposedCanvasesData.length; i++) {
        const progress = 10 + (i / currentDecomposedCanvasesData.length) * 70;
        updateProgress(progress, `Adding layer ${i + 1}...`);
        
        const canvas = currentDecomposedCanvasesData[i].canvas;
        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        imagesFolder.file(`${originalFileName}_${currentShapeType}_piece_${i + 1}.png`, blob);
    }
    
    // 添加合并预览
    if (recombinedCanvas.width > 0) {
        updateProgress(80, 'Adding merged preview...');
        const mergedBlob = await new Promise(resolve => recombinedCanvas.toBlob(resolve));
        imagesFolder.file(`${originalFileName}_${currentShapeType}_merged.png`, mergedBlob);
    }
    
    // 生成并下载ZIP
    updateProgress(90, 'Generating ZIP file...');
    const content = await zip.generateAsync({type: "blob"});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${originalFileName}_${currentShapeType}_layers.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    hideProgress();
}

// 触发重新合并预览
function triggerRecombinePreview() {
    if (currentDecomposedCanvasesData.length > 0 && originalImage) {
        let actualBgColorForRecombine;
        if (selectedDecomposedBgType === 'transparent') actualBgColorForRecombine = 'transparent';
        else if (selectedDecomposedBgType === 'white') actualBgColorForRecombine = '#FFFFFF';
        else actualBgColorForRecombine = '#000000';
        recombineForPreview(currentDecomposedCanvasesData, originalImage.width, originalImage.height, actualBgColorForRecombine);
    }
}

// 创建分解的画布
function createDecomposedCanvases(numPieces, width, height, actualBgColorForDecomp) {
    currentDecomposedCanvasesData = [];
    decomposedContainer.innerHTML = '';

    for (let i = 0; i < numPieces; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (actualBgColorForDecomp !== 'transparent') {
            ctx.fillStyle = actualBgColorForDecomp;
            ctx.fillRect(0, 0, width, height);
        } else {
            ctx.clearRect(0, 0, width, height);
        }
        const layerImageData = ctx.getImageData(0, 0, width, height);
        currentDecomposedCanvasesData.push({ canvas, ctx, imageData: layerImageData });

        const itemContainer = document.createElement('div');
        itemContainer.className = 'flex flex-col items-center gap-2 p-2 sm:p-3 bg-gray-100 rounded-lg mobile-layer-item';
        updateCanvasBackgroundStyle(canvas, actualBgColorForDecomp === 'transparent');
        canvas.className = 'max-w-full max-h-[80px] sm:max-h-[120px] rounded border border-gray-300';
        canvas.alt = `Decomposed layer ${i + 1}`;

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'w-full px-2 py-1 bg-success text-white text-xs rounded hover:bg-success-dark transition-colors duration-200 flex items-center justify-center gap-1';
        downloadBtn.innerHTML = `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg> Layer ${i + 1}`;
        downloadBtn.onclick = () => downloadCanvasAsImage(canvas, i);

        itemContainer.appendChild(canvas);
        itemContainer.appendChild(downloadBtn);
        decomposedContainer.appendChild(itemContainer);
    }
    
    // 显示ZIP下载按钮
    if (downloadAllZipBtn) {
        downloadAllZipBtn.style.display = 'inline-flex';
    }
}

// 获取带水印的图像数据
async function getImageDataWithWatermark(originalImage, originalImageData, addWatermark) {
    if (!addWatermark) {
        return originalImageData;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(originalImage, 0, 0);

    // 使用 SVG 水印
    try {
        const watermarkImg = await createSvgWatermarkImage();
        tempCtx.drawImage(watermarkImg, tempCanvas.width - 65, tempCanvas.height - 25);
    } catch (err) {
        console.error('Failed to create SVG watermark, using fallback:', err);
        // 备用方案：使用原始 Canvas 方式
        tempCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        tempCtx.fillRect(tempCanvas.width - 60, tempCanvas.height - 25, 50, 15);
        tempCtx.fillStyle = 'white';
        tempCtx.font = 'bold 10px Arial';
        tempCtx.fillText('Picgle', tempCanvas.width - 55, tempCanvas.height - 13);
    }

    return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
}

// 块状分解
function decomposeImageBlocks(img, imageDataToUse, numPieces, blockSize, actualBgColorForDecomp, invertColors) {
    const { width, height } = img;
    createDecomposedCanvases(numPieces, width, height, actualBgColorForDecomp);

    const totalPixels = width * height;
    let processedPixels = 0;

    for (let y = 0; y < height; y += blockSize) {
        for (let x = 0; x < width; x += blockSize) {
            const pieceIndex = Math.floor(Math.random() * numPieces);
            const targetLayer = currentDecomposedCanvasesData[pieceIndex];
            const targetImageData = targetLayer.imageData.data;

            const currentBlockWidth = Math.min(blockSize, width - x);
            const currentBlockHeight = Math.min(blockSize, height - y);

            for (let blockY = 0; blockY < currentBlockHeight; blockY++) {
                for (let blockX = 0; blockX < currentBlockWidth; blockX++) {
                    const sourcePixelX = x + blockX;
                    const sourcePixelY = y + blockY;

                    const sourceIndex = (sourcePixelY * width + sourcePixelX) * 4;
                    const targetIndex = (sourcePixelY * width + sourcePixelX) * 4;

                    let r = imageDataToUse.data[sourceIndex];
                    let g = imageDataToUse.data[sourceIndex + 1];
                    let b = imageDataToUse.data[sourceIndex + 2];
                    const a = imageDataToUse.data[sourceIndex + 3];

                    if (invertColors) {
                        r = 255 - r; g = 255 - g; b = 255 - b;
                    }

                    targetImageData[targetIndex] = r;
                    targetImageData[targetIndex + 1] = g;
                    targetImageData[targetIndex + 2] = b;
                    targetImageData[targetIndex + 3] = a;
                    
                    processedPixels++;
                }
            }
            
            // 更新进度
            if (processedPixels % 10000 === 0) {
                const progress = (processedPixels / totalPixels) * 100;
                updateProgress(progress, `Processing blocks... ${Math.round(progress)}%`);
            }
        }
    }
    
    currentDecomposedCanvasesData.forEach(layer => {
        layer.ctx.putImageData(layer.imageData, 0, 0);
    });
    
    console.log("Block decomposition complete.");
    hideProgress();
    triggerRecombinePreview();
}

// Voronoi分解
function decomposeImageVoronoi(img, imageDataToUse, numPieces, numVoronoiSeeds, actualBgColorForDecomp, invertColors) {
    const { width, height } = img;
    createDecomposedCanvases(numPieces, width, height, actualBgColorForDecomp);

    const seeds = [];
    for (let i = 0; i < numVoronoiSeeds; i++) {
        seeds.push({
            x: Math.random() * width,
            y: Math.random() * height,
            layerOwner: Math.floor(Math.random() * numPieces)
        });
    }

    const sourceData = imageDataToUse.data;
    const totalPixels = width * height;
    let processedPixels = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let minDistSq = Infinity;
            let closestSeedIndex = -1;

            for (let i = 0; i < seeds.length; i++) {
                const dx = seeds[i].x - x;
                const dy = seeds[i].y - y;
                const distSq = dx * dx + dy * dy;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    closestSeedIndex = i;
                }
            }

            const owningLayerIndex = seeds[closestSeedIndex].layerOwner;
            const targetLayer = currentDecomposedCanvasesData[owningLayerIndex];
            const targetImageData = targetLayer.imageData.data;

            const pixelIndex = (y * width + x) * 4;

            let r = sourceData[pixelIndex];
            let g = sourceData[pixelIndex + 1];
            let b = sourceData[pixelIndex + 2];
            const a = sourceData[pixelIndex + 3];

            if (invertColors) {
                r = 255 - r; g = 255 - g; b = 255 - b;
            }

            targetImageData[pixelIndex] = r;
            targetImageData[pixelIndex + 1] = g;
            targetImageData[pixelIndex + 2] = b;
            targetImageData[pixelIndex + 3] = a;
            
            processedPixels++;
            
            // 更新进度
            if (processedPixels % 10000 === 0) {
                const progress = (processedPixels / totalPixels) * 100;
                updateProgress(progress, `Processing Voronoi... ${Math.round(progress)}%`);
            }
        }
    }

    currentDecomposedCanvasesData.forEach(layer => {
        layer.ctx.putImageData(layer.imageData, 0, 0);
    });

    console.log("Voronoi decomposition complete.");
    hideProgress();
    triggerRecombinePreview();
}

// 重新合并预览
function recombineForPreview(decomposedCanvasesDataToUse, width, height, actualRecombinedBgColor) {
    if (!decomposedCanvasesDataToUse || decomposedCanvasesDataToUse.length === 0) return;

    recombinedCanvas.width = width;
    recombinedCanvas.height = height;

    updateCanvasBackgroundStyle(recombinedCanvas, actualRecombinedBgColor === 'transparent');
    recombinedCtx.clearRect(0, 0, width, height);

    if (actualRecombinedBgColor !== 'transparent') {
        recombinedCtx.fillStyle = actualRecombinedBgColor;
        recombinedCtx.fillRect(0, 0, width, height);
    }

    console.log(`Starting merge preview, blend mode: ${currentBlendMode}, background: ${actualRecombinedBgColor}`);
    decomposedCanvasesDataToUse.forEach(({ canvas }) => {
        recombinedCtx.globalCompositeOperation = currentBlendMode;
        recombinedCtx.drawImage(canvas, 0, 0);
    });
    recombinedCtx.globalCompositeOperation = 'source-over';
    console.log("Merge preview complete.");
}

// 设置颜色反转状态
function setColorInversionVisualState(invert) {
    colorInversionActive = invert;
    if (invert) {
        colorNormalButton.classList.remove('bg-primary', 'text-white');
        colorNormalButton.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        colorInvertButton.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        colorInvertButton.classList.add('bg-primary', 'text-white');
    } else {
        colorNormalButton.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        colorNormalButton.classList.add('bg-primary', 'text-white');
        colorInvertButton.classList.remove('bg-primary', 'text-white');
        colorInvertButton.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
    }
}

// 初始化分解功能
function initDecompose() {
    // 文件输入事件
    decomposeImageLoader.addEventListener('change', (event) => {
        updateFileLabel(event.target, 'decomposeFileLabel', false);
        const file = event.target.files[0];
        if (file) {
            originalFileName = file.name.split('.').slice(0, -1).join('.') || 'image';
            const reader = new FileReader();
            reader.onload = (e) => {
                originalImage = new Image();
                originalImage.onload = () => {
                    originalImageCanvas.width = originalImage.width;
                    originalImageCanvas.height = originalImage.height;
                    originalCtx.drawImage(originalImage, 0, 0);
                    originalImageData = originalCtx.getImageData(0, 0, originalImage.width, originalImage.height);
                    updateCanvasBackgroundStyle(recombinedCanvas, true);
                    currentDecomposedCanvasesData = [];
                    decomposedContainer.innerHTML = '';
                    if (recombinedCanvas.width > 0 && recombinedCanvas.height > 0) {
                        recombinedCtx.clearRect(0, 0, recombinedCanvas.width, recombinedCanvas.height);
                    }
                    updateWatermarkVisibility();
                    
                    // 隐藏ZIP下载按钮
                    if (downloadAllZipBtn) {
                        downloadAllZipBtn.style.display = 'none';
                    }
                };
                originalImage.onerror = () => {
                    alert("Cannot load image.");
                    originalImage = null;
                    originalImageData = null;
                };
                originalImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // 水印切换
    decomposeWatermarkToggle.addEventListener('change', updateWatermarkVisibility);

    // 解锁高级功能
    unlockAdvancedDecomposeButton.addEventListener('click', () => {
        if (!shareModalShown) {
            openShareModal();
        } else {
            unlockAdvancedFeatures();
        }
    });

    // 形状类型切换
    shapeTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentShapeType = e.target.value;
            if (currentShapeType === 'blocks') {
                blockSizeGroup.classList.remove('hidden');
                voronoiSeedsGroup.classList.add('hidden');
            } else {
                blockSizeGroup.classList.add('hidden');
                voronoiSeedsGroup.classList.remove('hidden');
            }
        });
    });

    // 背景按钮
    bgButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            bgButtons.forEach(btn => {
                btn.classList.remove('bg-primary', 'text-white');
                btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
            });
            e.target.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
            e.target.classList.add('bg-primary', 'text-white');
            selectedDecomposedBgType = e.target.dataset.bg;
            updateBlendModeAndInfo();
            triggerRecombinePreview();
        });
    });

    // 颜色按钮
    colorNormalButton.addEventListener('click', () => setColorInversionVisualState(false));
    colorInvertButton.addEventListener('click', () => setColorInversionVisualState(true));

    // 分解按钮
    decomposeButton.addEventListener('click', async () => {
        if (!originalImage || !originalImageData) {
            alert("Please upload an image first!");
            return;
        }

        const numPieces = parseInt(numPiecesInput.value);
        const invert = colorInversionActive;
        let actualBgColor;
        if (selectedDecomposedBgType === 'transparent') actualBgColor = 'transparent';
        else if (selectedDecomposedBgType === 'white') actualBgColor = '#FFFFFF';
        else actualBgColor = '#000000';

        const minPieces = 5;
        const maxPieces = advancedDecomposeUnlocked ? 100 : 15;

        if (isNaN(numPieces) || numPieces < minPieces || numPieces > maxPieces) {
            alert(`Number of pieces must be between ${minPieces} and ${maxPieces}.`);
            return;
        }

        const includeWatermark = decomposeWatermarkToggle.checked;
        
        // 显示进度条
        showProgress('Starting decomposition...');

        try {
            const imageDataToUse = await getImageDataWithWatermark(originalImage, originalImageData, includeWatermark);

            // 使用setTimeout确保UI更新
            setTimeout(() => {
                if (currentShapeType === 'blocks') {
                    const blockSize = parseInt(blockSizeInput.value);
                    if (isNaN(blockSize) || blockSize < 1) {
                        alert("Block size must be at least 1.");
                        hideProgress();
                        return;
                    }
                    console.log(`Starting block decomposition: ${numPieces} pieces, block size ${blockSize}px, background: ${actualBgColor}, invert: ${invert}, watermark: ${includeWatermark}`);
                    decomposeImageBlocks(originalImage, imageDataToUse, numPieces, blockSize, actualBgColor, invert);
                } else {
                    const numVoronoiSeeds = parseInt(voronoiSeedsInput.value);
                    if (isNaN(numVoronoiSeeds) || numVoronoiSeeds < 500 || numVoronoiSeeds > 10000) {
                        alert("Voronoi seed points must be between 500 and 10000.");
                        hideProgress();
                        return;
                    }
                    console.log(`Starting Voronoi decomposition: ${numPieces} pieces, ${numVoronoiSeeds} seeds, background: ${actualBgColor}, invert: ${invert}, watermark: ${includeWatermark}`);
                    decomposeImageVoronoi(originalImage, imageDataToUse, numPieces, numVoronoiSeeds, actualBgColor, invert);
                }
            }, 100);
        } catch (err) {
            console.error('Error during decomposition:', err);
            hideProgress();
            alert('An error occurred during decomposition. Please try again.');
        }
    });

    // ZIP下载按钮
    if (downloadAllZipBtn) {
        downloadAllZipBtn.addEventListener('click', downloadAllAsZip);
    }

    // 添加数值输入防抖
    const debouncedNumPiecesUpdate = debounce((value) => {
        console.log('Number of pieces changed to:', value);
    }, 300);

    const debouncedBlockSizeUpdate = debounce((value) => {
        console.log('Block size changed to:', value);
    }, 300);

    const debouncedVoronoiSeedsUpdate = debounce((value) => {
        console.log('Voronoi seeds changed to:', value);
    }, 300);

    numPiecesInput.addEventListener('input', (e) => {
        debouncedNumPiecesUpdate(e.target.value);
    });

    blockSizeInput.addEventListener('input', (e) => {
        debouncedBlockSizeUpdate(e.target.value);
    });

    voronoiSeedsInput.addEventListener('input', (e) => {
        debouncedVoronoiSeedsUpdate(e.target.value);
    });

    // 初始化
    setColorInversionVisualState(false);
    updateBlendModeAndInfo();
}

    // 文档加载完成后初始化
    document.addEventListener('DOMContentLoaded', initDecompose);
})();