import { state } from './state.js';
import { checkAccountAuthorization } from './api.js';
import { showStatus, showTokenModal, hideTokenModal, showMainApp, hideMainApp, updateAccountDisplay, clearComposeForm } from './ui.js';
import { refreshInbox, startAutoRefresh, stopAutoRefresh } from './inbox.js';

function getSavedToken() {
    try {
        return localStorage.getItem('lnemail_access_token');
    } catch (error) {
        console.error('Failed to get saved token:', error);
        return null;
    }
}

function saveToken(token) {
    try {
        localStorage.setItem('lnemail_access_token', token);
        console.log('Token saved to localStorage');
    } catch (error) {
        console.error('Failed to save token:', error);
    }
}

function clearSavedToken() {
    try {
        localStorage.removeItem('lnemail_access_token');
        console.log('Saved token cleared from localStorage');
    } catch (error) {
        console.error('Failed to clear saved token:', error);
    }
}

export async function handleConnect() {
    const token = document.getElementById('accessToken').value.trim();
    if (!token) {
        showStatus('Please enter your access token', 'error');
        return;
    }

    const connectBtn = document.getElementById('connectBtn');
    const originalText = connectBtn.innerHTML;
    connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    connectBtn.disabled = true;

    try {
        state.accessToken = token;
        
        if (await checkAccountAuthorization()) {
            saveToken(token);
            hideTokenModal();
            showMainApp();
            updateAccountDisplay();
            await refreshInbox();
            startAutoRefresh();
            showStatus('Connected successfully!', 'success');
        } else {
            state.accessToken = null;
            showStatus('Authorization failed. Please check your access token.', 'error');
        }
    } catch (error) {
        state.accessToken = null;
        showStatus(`Connection failed: ${error.message}`, 'error');
    } finally {
        connectBtn.innerHTML = originalText;
        connectBtn.disabled = false;
    }
}

export function handleDisconnect() {
    stopAutoRefresh();
    clearSavedToken();
    
    state.accessToken = null;
    state.accountInfo = null;
    state.emails = [];
    state.currentPage = 1;
    
    hideMainApp();
    showTokenModal();
    clearComposeForm();
    document.getElementById('accessToken').value = '';
    document.getElementById('accountEmail').textContent = 'Loading...';
    document.getElementById('accountExpiry').textContent = 'Loading...';
    showStatus('Disconnected', 'info');
}

export async function tryAutoConnect() {
    const savedToken = getSavedToken();
    if (savedToken) {
        document.getElementById('accessToken').value = savedToken;
        state.accessToken = savedToken;
        
        if (await checkAccountAuthorization()) {
            hideTokenModal();
            showMainApp();
            updateAccountDisplay();
            await refreshInbox();
            startAutoRefresh();
            showStatus('Connected!', 'success');
            return;
        } else {
            clearSavedToken();
            state.accessToken = null;
        }
    }
    showTokenModal();
} 