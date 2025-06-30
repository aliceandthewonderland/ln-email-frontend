import { sendEmail, checkApiHealth } from './api.js';
import { showStatus, showView, clearComposeForm, updateHealthStatus, updateHealthStatusLoading } from './ui.js';
import { handleConnect, handleDisconnect, tryAutoConnect } from './auth.js';
import { isValidEmail } from './utils.js';
import { refreshInbox } from './inbox.js';

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
            showStatus('API health check completed successfully', 'success');
        }
    } catch (error) {
        updateHealthStatus({ success: false, error: error.message });
    } finally {
        refreshHealthIcon.className = originalClasses;
        refreshHealthBtn.disabled = false;
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

function bindEvents() {
    document.getElementById('connectBtn').addEventListener('click', handleConnect);
    document.getElementById('accessToken').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleConnect();
    });

    document.getElementById('refreshBtn').addEventListener('click', handleRefreshClick);
    document.getElementById('composeBtn').addEventListener('click', () => showView('compose'));
    document.getElementById('disconnectBtn').addEventListener('click', handleDisconnect);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            if (view) showView(view);
        });
    });

    document.getElementById('composeForm').addEventListener('submit', handleSendEmail);
    document.getElementById('clearForm').addEventListener('click', clearComposeForm);

    document.getElementById('backToInbox').addEventListener('click', () => showView('inbox'));
    document.getElementById('refreshHealthBtn').addEventListener('click', handleHealthCheck);
}

function init() {
    bindEvents();
    tryAutoConnect();
    
    // Perform initial health check
    handleHealthCheck();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init); 