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
        showToast('Error loading data. Check console.', 'alert-circle');
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
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.innerHTML = `
            <div class="card-icon">
                <i data-lucide="file-code"></i>
            </div>
            <div>
                <h3 class="card-title">${escapeHTML(item.name)}</h3>
                <p class="text-slate-500 text-sm mt-1">Uploaded ${new Date(item.created_at).toLocaleDateString()}</p>
            </div>
            <div class="card-footer">
                <a href="${item.drive_link}" target="_blank" class="drive-link-btn">
                    <i data-lucide="external-link"></i>
                    <span>View Drive</span>
                </a>
                <span class="text-slate-500 text-xs">Shared publically</span>
            </div>
        `;
        
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
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin w-5 h-5"></i><span>Uploading...</span>';
    initIcons();

    try {
        const { data, error } = await supabase
            .from('externals')
            .insert([{ name, drive_link: link }])
            .select();

        if (error) throw error;

        showToast('Successfully added!', 'check-circle');
        toggleModal(false);
        uploadForm.reset();
        
        // Update local list manually for immediate feedback
        if (data) {
            allExternals = [data[0], ...allExternals];
            renderExternals(allExternals);
        }
    } catch (error) {
        console.error('Error uploading:', error.message);
        showToast('Failed to upload. Try again.', 'x-circle');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Upload Repository</span><i data-lucide="send" class="w-5 h-5"></i>';
        initIcons();
    }
}

// Search Logic
function handleSearch(e) {
    const term = e.target.value.toLowerCase();
    const filtered = allExternals.filter(item => 
        item.name.toLowerCase().includes(term)
    );
    renderExternals(filtered);
}

// Modal Logic
function toggleModal(show) {
    if (show) {
        uploadModal.classList.remove('hidden');
        setTimeout(() => {
            modalContainer.classList.add('show');
            modalContainer.classList.remove('scale-95', 'opacity-0');
        }, 10);
    } else {
        modalContainer.classList.remove('show');
        modalContainer.classList.add('scale-95', 'opacity-0');
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
    toast.classList.remove('opacity-0', 'translate-y-10');
    
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('opacity-0', 'translate-y-10');
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
                console.log('New external added:', payload.new);
                // Only add if not already in list (avoid duplicates from manual add)
                if (!allExternals.find(item => item.id === payload.new.id)) {
                    allExternals = [payload.new, ...allExternals];
                    renderExternals(allExternals);
                }
            }
        )
        .subscribe();
}

// Init
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 20) {
        nav.classList.add('py-2');
        nav.classList.remove('py-4');
    } else {
        nav.classList.remove('py-2');
        nav.classList.add('py-4');
    }
});

initIcons();
fetchExternals();
setupRealtime();
