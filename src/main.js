import './style.css'
import { supabase } from './supabase'

// DOM Elements
const externalsGrid = document.getElementById('externals-grid');
const loadingSkeleton = document.getElementById('loading-skeleton');
const noResults = document.getElementById('no-results');
const searchInput = document.getElementById('search-input');
const uploadModal = document.getElementById('upload-modal');
const modalContainer = document.getElementById('modal-container');
const openUploadBtn = document.getElementById('open-upload-modal');
const closeUploadBtn = document.getElementById('close-upload-modal');
const closeModalOverlay = document.getElementById('close-modal-overlay');
const uploadForm = document.getElementById('upload-form');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

let allExternals = [];

// Initialize Lucide Icons
function initIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Helper: Relative Time
function formatRelativeTime(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    const units = [
        { name: 'yr', seconds: 31536000 },
        { name: 'mo', seconds: 2592000 },
        { name: 'day', seconds: 86400 },
        { name: 'hr', seconds: 3600 },
        { name: 'min', seconds: 60 },
        { name: 'sec', seconds: 1 }
    ];
    
    for (const unit of units) {
        if (diffInSeconds >= unit.seconds) {
            const count = Math.floor(diffInSeconds / unit.seconds);
            return `${count} ${unit.name}${count !== 1 ? 's' : ''} ago`;
        }
    }
    return 'Just now';
}

// Helper: Copy to Clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Link copied to clipboard!', 'clipboard-check');
    } catch (err) {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy link.', 'alert-circle');
    }
}

// Fetch Externals
async function fetchExternals() {
    try {
        const { data, error } = await supabase
            .from('externals')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allExternals = data;
        renderExternals(allExternals);
    } catch (error) {
        console.error('Error fetching externals:', error.message);
        showToast('Error loading resources.', 'alert-triangle');
    }
}

// Render Externals to Grid
function renderExternals(items) {
    if (!externalsGrid) return;
    
    externalsGrid.innerHTML = '';
    
    if (items.length === 0) {
        loadingSkeleton.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }

    noResults.classList.add('hidden');
    loadingSkeleton.classList.add('hidden');

    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'external-card animate-fade-in';
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="card-icon">
                    <i data-lucide="folder-code"></i>
                </div>
                <button class="copy-btn" data-link="${item.drive_link}" title="Copy Link">
                    <i data-lucide="copy" class="w-4 h-4"></i>
                </button>
            </div>
            <div>
                <h3 class="card-title">${escapeHTML(item.name)}</h3>
                <div class="card-meta">
                    <div class="flex items-center gap-1.5">
                        <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                        <span>${formatRelativeTime(item.created_at)}</span>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <a href="${item.drive_link}" target="_blank" class="drive-link-btn">
                    <span>Access Drive</span>
                    <i data-lucide="arrow-up-right" class="w-4 h-4"></i>
                </a>
                <div class="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Public
                </div>
            </div>
        `;
        
        // Add copy event listener
        const copyBtn = card.querySelector('.copy-btn');
        copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            copyToClipboard(item.drive_link);
        });
        
        externalsGrid.appendChild(card);
    });
    
    initIcons();
}

// Add New External
async function handleUpload(e) {
    e.preventDefault();
    
    const name = document.getElementById('external-name').value;
    const link = document.getElementById('drive-link').value;
    const submitBtn = document.getElementById('submit-btn');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin w-5 h-5"></i><span>Finalizing...</span>';
    initIcons();

    try {
        const { data, error } = await supabase
            .from('externals')
            .insert([{ name, drive_link: link }])
            .select();

        if (error) throw error;

        showToast('Resource published!', 'check');
        toggleModal(false);
        uploadForm.reset();
        
        if (data) {
            allExternals = [data[0], ...allExternals];
            renderExternals(allExternals);
        }
    } catch (error) {
        console.error('Error uploading:', error.message);
        showToast('Publication failed.', 'alert-circle');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Publish to Hub</span><i data-lucide="plus-circle" class="w-5 h-5"></i>';
        initIcons();
    }
}

// Search Logic
let searchTimeout;
function handleSearch(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const term = e.target.value.toLowerCase();
        const filtered = allExternals.filter(item => 
            item.name.toLowerCase().includes(term)
        );
        renderExternals(filtered);
    }, 150);
}

// Modal Logic
function toggleModal(show) {
    if (show) {
        uploadModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            modalContainer.classList.add('show');
            modalContainer.classList.remove('scale-95', 'opacity-0');
        }, 10);
    } else {
        modalContainer.classList.remove('show');
        modalContainer.classList.add('scale-95', 'opacity-0');
        document.body.style.overflow = '';
        setTimeout(() => {
            uploadModal.classList.add('hidden');
        }, 300);
    }
}

// Toast Logic
function showToast(message, iconName) {
    toastMessage.textContent = message;
    const icon = document.getElementById('toast-icon');
    icon.setAttribute('data-lucide', iconName);
    initIcons();
    
    toast.style.pointerEvents = 'auto';
    toast.classList.add('show');
    toast.classList.remove('opacity-0', 'translate-y-10');
    
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('opacity-0', 'translate-y-10');
        toast.style.pointerEvents = 'none';
    }, 3000);
}

// Helpers
function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

// Event Listeners
if (openUploadBtn) openUploadBtn.addEventListener('click', () => toggleModal(true));
if (closeUploadBtn) closeUploadBtn.addEventListener('click', () => toggleModal(false));
if (closeModalOverlay) closeModalOverlay.addEventListener('click', () => toggleModal(false));
if (uploadForm) uploadForm.addEventListener('submit', handleUpload);
if (searchInput) searchInput.addEventListener('input', handleSearch);

// Real-time Subscriptions
function setupRealtime() {
    supabase
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'externals',
            },
            (payload) => {
                if (!allExternals.find(item => item.id === payload.new.id)) {
                    allExternals = [payload.new, ...allExternals];
                    renderExternals(allExternals);
                }
            }
        )
        .subscribe();
}

// Scroll Effects
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 40) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

// Init
initIcons();
fetchExternals();
setupRealtime();
