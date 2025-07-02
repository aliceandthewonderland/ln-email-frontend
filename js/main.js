import { sendEmail, checkApiHealth, deleteEmails } from './api.js';
import { showStatus, showView, clearComposeForm, updateHealthStatus, updateHealthStatusLoading, getSelectedEmailIds, clearSelectedEmails, renderEmailList, updateConnectButtonState } from './ui.js';
import { handleConnect, handleDisconnect, tryAutoConnect, performLoginHealthCheck } from './auth.js';
import { isValidEmail } from './utils.js';
import { refreshInbox } from './inbox.js';
import { HEALTH_CHECK_INTERVAL } from './config.js';

async function handleRefreshClick() {
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshIcon = refreshBtn.querySelector('i');
    
    const originalClasses = refreshIcon.className;
    refreshIcon.className = 'fas fa-sync-alt fa-spin';
    refreshBtn.disabled = true;
    
    try {
        await refreshInbox();
    } finally {
        refreshIcon.className = originalClasses;
        refreshBtn.disabled = false;
    }
}

async function handleHealthCheck() {
    const refreshHealthBtn = document.getElementById('refreshHealthBtn');
    const refreshHealthIcon = refreshHealthBtn.querySelector('i');
    
    const originalClasses = refreshHealthIcon.className;
    refreshHealthIcon.className = 'fas fa-sync-alt fa-spin';
    refreshHealthBtn.disabled = true;
    
    updateHealthStatusLoading();
    
    try {
        const healthResult = await checkApiHealth();
        updateHealthStatus(healthResult);
        
        if (healthResult.success) {
            showStatus('LNEmail API is currently healthy!', 'success');
        }
    } catch (error) {
        updateHealthStatus({ success: false, error: error.message });
    } finally {
        refreshHealthIcon.className = originalClasses;
        refreshHealthBtn.disabled = false;
    }
}

async function performAutomaticHealthCheck() {
    try {
        const healthResult = await checkApiHealth();
        updateHealthStatus(healthResult);
        
        // Only show error messages for automatic checks, not success messages
        if (!healthResult.success) {
            showStatus('Automatic health check failed - API may be down', 'error');
        }
    } catch (error) {
        updateHealthStatus({ success: false, error: error.message });
    }
}

async function handleSendEmail(e) {
    e.preventDefault();
    
    const recipient = document.getElementById('recipient').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const body = document.getElementById('body').value.trim();

    if (!recipient || !subject || !body) {
        showStatus('Please fill in all fields', 'error');
        return;
    }

    if (!isValidEmail(recipient)) {
        showStatus('Please enter a valid email address', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;

    try {
        const response = await sendEmail(recipient, subject, body);
        showStatus('Email sent successfully!', 'success');
        clearComposeForm();
        showView('inbox');
        
        if (response.payment_hash) {
            showStatus(`Payment hash: ${response.payment_hash}`, 'info');
        }
    } catch (error) {
        showStatus(`Failed to send email: ${error.message}`, 'error');
    } finally {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Email';
        submitBtn.disabled = false;
    }
}

async function handleDeleteSelected() {
    const selectedIds = getSelectedEmailIds();
    
    if (selectedIds.length === 0) {
        showStatus('No emails selected for deletion', 'error');
        return;
    }

    // Show confirmation dialog
    const confirmMessage = `Are you sure you want to delete ${selectedIds.length} email${selectedIds.length > 1 ? 's' : ''}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
        return;
    }

    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    deleteBtn.disabled = true;

    try {
        const response = await deleteEmails(selectedIds);
        
        if (response.success) {
            showStatus(`Successfully deleted ${selectedIds.length} email${selectedIds.length > 1 ? 's' : ''}`, 'success');
            clearSelectedEmails();
            // Refresh the inbox to show updated email list
            await refreshInbox();
        } else {
            throw new Error(response.error || 'Failed to delete emails');
        }
    } catch (error) {
        showStatus(`Failed to delete emails: ${error.message}`, 'error');
    } finally {
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = selectedIds.length === 0;
    }
}

function bindEvents() {
    // Authentication events
    document.getElementById('connectBtn').addEventListener('click', handleConnect);
    document.getElementById('disconnectBtn').addEventListener('click', handleDisconnect);
    
    // Login health check events
    document.getElementById('loginRefreshHealthBtn').addEventListener('click', async () => {
        const loginRefreshHealthBtn = document.getElementById('loginRefreshHealthBtn');
        const loginRefreshHealthIcon = loginRefreshHealthBtn.querySelector('i');
        
        const originalClasses = loginRefreshHealthIcon.className;
        loginRefreshHealthIcon.className = 'fas fa-sync-alt fa-spin';
        loginRefreshHealthBtn.disabled = true;
        
        try {
            await performLoginHealthCheck();
        } finally {
            loginRefreshHealthIcon.className = originalClasses;
            loginRefreshHealthBtn.disabled = false;
        }
    });
    
    // Toggle login health details
    document.getElementById('loginHealthStatus').addEventListener('click', () => {
        const details = document.getElementById('loginHealthDetails');
        details.classList.toggle('hidden');
    });

    // Allow enter key to connect (if health check passes)
    document.getElementById('accessToken').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const connectBtn = document.getElementById('connectBtn');
            if (!connectBtn.disabled) {
                handleConnect();
            }
        }
    });

    // Navigation events
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            showView(item.dataset.view);
        });
    });

    // Compose events
    document.getElementById('composeBtn').addEventListener('click', () => showView('compose'));
    document.getElementById('composeForm').addEventListener('submit', handleSendEmail);
    document.getElementById('clearForm').addEventListener('click', clearComposeForm);

    // Email list events
    document.getElementById('refreshBtn').addEventListener('click', handleRefreshClick);
    document.getElementById('backToInbox').addEventListener('click', () => showView('inbox'));

    // Health check events
    document.getElementById('refreshHealthBtn').addEventListener('click', handleHealthCheck);

    // Delete emails events - using event delegation since button is dynamically created
    document.addEventListener('click', (e) => {
        if (e.target.closest('#deleteSelectedBtn')) {
            handleDeleteSelected();
        }
    });
}

function init() {
    bindEvents();
    tryAutoConnect();
    
    // Perform initial health check
    handleHealthCheck();
    
    // Set up automatic health checking every 5 minutes
    setInterval(performAutomaticHealthCheck, HEALTH_CHECK_INTERVAL);
    console.log(`Automatic health checking enabled (every ${HEALTH_CHECK_INTERVAL / 60000} minutes)`);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init); 