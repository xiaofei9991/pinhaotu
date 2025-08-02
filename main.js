// main.js - 通用功能、初始化、标签切换

// 全局变量
let advancedDecomposeUnlocked = false;
let shareModalShown = false;

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 显示进度条
function showProgress(message = 'Processing...') {
    const overlay = document.getElementById('progressOverlay');
    const text = document.getElementById('progressText');
    const fill = document.getElementById('progressFill');
    
    text.textContent = message;
    fill.style.width = '0%';
    overlay.style.display = 'flex';
}

// 更新进度条
function updateProgress(percent, message) {
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    
    fill.style.width = percent + '%';
    if (message) {
        text.textContent = message;
    }
}

// 隐藏进度条
function hideProgress() {
    const overlay = document.getElementById('progressOverlay');
    overlay.style.display = 'none';
}

// 标签管理
function showTab(tabName) {
    const tabs = ['decompose', 'blend', 'help', 'about'];
    tabs.forEach(tab => {
        const content = document.getElementById(tab + 'Content');
        const tabButton = document.getElementById(tab + 'Tab');
        const tabButtonMobile = document.getElementById(tab + 'TabMobile');
        
        if (tab === tabName) {
            content.classList.remove('hidden');
            tabButton?.classList.add('border-b-2', 'border-primary', 'text-primary');
            tabButton?.classList.remove('text-gray-700');
            tabButtonMobile?.classList.add('border-b-2', 'border-primary', 'text-primary');
            tabButtonMobile?.classList.remove('text-gray-500');
        } else {
            content.classList.add('hidden');
            tabButton?.classList.remove('border-b-2', 'border-primary', 'text-primary');
            tabButton?.classList.add('text-gray-700');
            tabButtonMobile?.classList.remove('border-b-2', 'border-primary', 'text-primary');
            tabButtonMobile?.classList.add('text-gray-500');
        }
    });
}

// FAQ Toggle
function toggleFAQ(element) {
    const answer = element.nextElementSibling;
    const icon = element.querySelector('.faq-icon');
    
    answer.classList.toggle('open');
    icon.classList.toggle('rotated');
}

// 分享模态框函数
function openShareModal() {
    document.getElementById('shareModal').style.display = 'block';
    shareModalShown = true;
}

function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
}

// 社交分享函数
function shareToTwitter() {
    const text = "🎨 Just discovered Picgle - an amazing free tool for image decomposition and blending! Create stunning visual effects with Voronoi patterns and advanced layer blending. Check it out:";
    const url = "https://www.picgle.org";
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    unlockAdvancedFeatures();
}

function shareToFacebook() {
    const url = "https://www.picgle.org";
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    unlockAdvancedFeatures();
}

function shareToLinkedIn() {
    const title = "Picgle - Advanced Image Processing Tool";
    const summary = "Free online tool for image decomposition and blending with advanced features";
    const url = "https://www.picgle.org";
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    unlockAdvancedFeatures();
}

function shareToReddit() {
    const title = "Picgle - Free Advanced Image Processing Tool";
    const url = "https://www.picgle.org";
    window.open(`https://reddit.com/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
    unlockAdvancedFeatures();
}

function shareToTelegram() {
    const text = "🎨 Check out Picgle - an amazing free tool for image decomposition and blending!";
    const url = "https://www.picgle.org";
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
    unlockAdvancedFeatures();
}

function shareToWhatsApp() {
    const text = "🎨 Check out Picgle - an amazing free tool for image decomposition and blending! https://www.picgle.org";
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    unlockAdvancedFeatures();
}

function unlockAdvancedFeatures() {
    advancedDecomposeUnlocked = true;
    const numPiecesInput = document.getElementById('numPieces');
    const numPiecesLabel = document.getElementById('numPiecesLabel');
    const unlockButton = document.getElementById('unlockAdvancedDecomposeButton');
    
    numPiecesInput.max = 100;
    numPiecesLabel.textContent = "Number of Pieces (5-100, unlocked!)";
    unlockButton.textContent = "✅ Advanced unlocked - Thanks for sharing!";
    unlockButton.disabled = true;
    unlockButton.classList.remove('bg-orange-500', 'hover:bg-orange-600');
    unlockButton.classList.add('bg-green-500', 'opacity-75', 'cursor-not-allowed');
    
    closeShareModal();
    
    setTimeout(() => {
        alert("🎉 Advanced features unlocked! You can now create 5-100 pieces. Thanks for sharing Picgle!");
    }, 500);
}

// 水印功能
function addWatermark(container, show = true) {
    const watermark = container.querySelector('.watermark');
    if (watermark) {
        watermark.style.display = show ? 'block' : 'none';
    }
}

function updateWatermarkVisibility() {
    const decomposeWatermarkEnabled = document.getElementById('decomposeWatermarkToggle').checked;
    const originalWatermark = document.getElementById('originalWatermark');
    if (originalWatermark) {
        originalWatermark.style.display = decomposeWatermarkEnabled ? 'block' : 'none';
    }

    const blendWatermarkEnabled = document.getElementById('blendWatermarkToggle').checked;
    const previewWatermark = document.getElementById('previewWatermark');
    if (previewWatermark) {
        previewWatermark.style.display = blendWatermarkEnabled ? 'block' : 'none';
    }
}

// 自定义文件输入处理
function updateFileLabel(input, labelId, multiple = false) {
    const label = document.getElementById(labelId);
    const fileText = label.querySelector('.file-text');
    
    if (input.files && input.files.length > 0) {
        label.classList.add('has-file');
        if (multiple && input.files.length > 1) {
            fileText.textContent = `${input.files.length} files selected`;
        } else {
            const fileName = input.files[0].name;
            if (fileName.length > 20) {
                fileText.textContent = fileName.substring(0, 17) + '...';
            } else {
                fileText.textContent = fileName;
            }
        }
    } else {
        label.classList.remove('has-file');
        fileText.textContent = multiple ? 'Choose Files' : 'Choose File';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 关闭模态框
    window.onclick = function(event) {
        const modal = document.getElementById('shareModal');
        if (event.target === modal) {
            closeShareModal();
        }
    };

    // 移动视口优化
    function handleMobileViewport() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    window.addEventListener('resize', handleMobileViewport);
    window.addEventListener('orientationchange', handleMobileViewport);
    handleMobileViewport();

    // 防止缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
            if (e.target.tagName === 'CANVAS') {
                e.preventDefault();
            }
        }
        lastTouchEnd = now;
    }, false);
});