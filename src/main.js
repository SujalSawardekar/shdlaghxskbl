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
    
    if (diffInSeconds < 60) return 'Just now';
    
    const units = [
        { name: 'yr', seconds: 31536000 },
        { name: 'mo', seconds: 2592000 },
        { name: 'day', seconds: 86400 },
        { name: 'hr', seconds: 3600 },
        { name: 'min', seconds: 60 }
    ];
    
    for (const unit of units) {
        if (diffInSeconds >= unit.seconds) {
            const count = Math.floor(diffInSeconds / unit.seconds);
            return `${count}${unit.name} ago`;
        }
    }
    return 'Recently';
}

// Helper: Copy to Clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Link copied!', 'clipboard-check');
    } catch (err) {
        showToast('Failed to copy.', 'alert-circle');
    }
}

// Delete Logic
async function handleDelete(id) {
    try {
        const { error } = await supabase
            .from('externals')
            .delete()
            .eq('id', id);

        if (error) throw error;
        showToast('Resource deleted.', 'trash-2');
    } catch (error) {
        console.error('Delete error:', error.message);
        showToast('Failed to delete.', 'alert-triangle');
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
        showToast('Load failure.', 'alert-triangle');
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
        card.className = 'external-card animate-fade-in group';
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="card-icon">
                    <i data-lucide="file-code"></i>
                </div>
                <div class="action-group">
                    <button class="action-btn copy-btn" data-link="${item.drive_link}" title="Copy Link">
                        <i data-lucide="copy"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${item.id}" title="Delete Resource">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
            <div class="space-y-1">
                <h3 class="card-title truncate-2">${escapeHTML(item.name)}</h3>
                <div class="card-meta">
                    <span class="flex items-center gap-1">
                        <i data-lucide="clock" class="w-3 h-3"></i>
                        ${formatRelativeTime(item.created_at)}
                    </span>
                    <span class="bullet">•</span>
                    <span class="text-emerald-500 font-semibold tracking-wide">PUBLIC</span>
                </div>
            </div>
            <div class="card-footer mt-6">
                <a href="${item.drive_link}" target="_blank" class="drive-link-btn w-full justify-center">
                    <span>Open Drive</span>
                    <i data-lucide="arrow-up-right" class="w-4 h-4"></i>
                </a>
            </div>
        `;
        
        // Copy event
        card.querySelector('.copy-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(item.drive_link);
        });
        
        // Delete event
        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Permanently delete this resource?')) {
                handleDelete(item.id);
            }
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
    
    if (!name || !link) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin w-5 h-5"></i><span>Saving...</span>';
    initIcons();

    try {
        const { data, error } = await supabase
            .from('externals')
            .insert([{ name, drive_link: link }])
            .select();

        if (error) throw error;

        showToast('Published!', 'check');
        toggleModal(false);
        uploadForm.reset();
        
        if (data) {
            allExternals = [data[0], ...allExternals];
            renderExternals(allExternals);
        }
    } catch (error) {
        showToast('Error saving.', 'alert-circle');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Publish to Hub</span><i data-lucide="plus-circle" class="w-5 h-5"></i>';
        initIcons();
    }
}

// Search Logic
let searchDebounce;
function handleSearch(e) {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
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
    
    toast.classList.add('show');
    toast.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
    
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
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
        .channel('schema-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'externals' },
            (payload) => {
                if (payload.eventType === 'INSERT') {
                    if (!allExternals.find(item => item.id === payload.new.id)) {
                        allExternals = [payload.new, ...allExternals];
                        renderExternals(allExternals);
                    }
                } else if (payload.eventType === 'DELETE') {
                    allExternals = allExternals.filter(item => item.id !== payload.old.id);
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
