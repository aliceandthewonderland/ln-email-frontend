import { state } from './state.js';
import { ITEMS_PER_PAGE } from './config.js';
import { fetchEmailContent } from './api.js';
import { escapeHtml, formatEmailBody, getFileIcon, isTextFile, isValidBase64 } from './utils.js';
import { openEmail } from './inbox.js';

export function showStatus(message, type = 'info') {
    const statusContainer = document.getElementById('statusContainer');
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                type === 'error' ? 'exclamation-circle' : 
                'info-circle';
    
    statusDiv.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    statusContainer.appendChild(statusDiv);

    setTimeout(() => {
        if (statusDiv.parentNode) {
            statusDiv.parentNode.removeChild(statusDiv);
        }
    }, 5000);
}

export function showTokenModal() {
    document.getElementById('tokenModal').classList.add('active');
    document.getElementById('accessToken').focus();
}

export function hideTokenModal() {
    document.getElementById('tokenModal').classList.remove('active');
}

export function showMainApp() {
    document.getElementById('mainApp').classList.add('active');
}

export function hideMainApp() {
    document.getElementById('mainApp').classList.remove('active');
}

export function updateAccountDisplay() {
    if (state.accountInfo) {
        document.getElementById('accountEmail').textContent = state.accountInfo.email_address;
        
        const expiryDate = new Date(state.accountInfo.expires_at);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        let relativeText;
        if (daysUntilExpiry > 1) relativeText = `Expires in ${daysUntilExpiry} days`;
        else if (daysUntilExpiry === 1) relativeText = 'Expires tomorrow';
        else if (daysUntilExpiry === 0) relativeText = 'Expires today';
        else relativeText = 'Expired';
        
        const exactDate = expiryDate.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        
        const fullExpiryText = `${relativeText} (${exactDate})`;
        
        document.getElementById('accountExpiry').textContent = fullExpiryText;
        document.getElementById('accountExpiry').title = `Full expiry: ${expiryDate.toLocaleString()}`;
    }
}

export function showView(viewName) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');

    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));

    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
        targetView.classList.add('active');
        state.currentView = viewName;
    }
}

export function renderEmailList() {
    const emailList = document.getElementById('emailList');
    
    if (state.emails.length === 0) {
        renderEmptyInbox();
        return;
    }

    const totalPages = Math.ceil(state.emails.length / ITEMS_PER_PAGE);

    if (state.currentPage > totalPages && totalPages > 0) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedEmails = state.emails.slice(startIndex, endIndex);

    const emailRows = paginatedEmails.map(email => {
        const date = new Date(email.date || email.timestamp || Date.now());
        const isToday = date.toDateString() === new Date().toDateString();
        const isThisYear = date.getFullYear() === new Date().getFullYear();
        
        let dateDisplay;
        if (isToday) {
            dateDisplay = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else if (isThisYear) {
            dateDisplay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
            dateDisplay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        
        const senderName = (email.from || email.sender || 'Unknown Sender').replace(/<.*?>/, '').trim() || 'Unknown Sender';
        const subject = email.subject || 'No Subject';
        const isUnread = email.read === false;
        
        return `
            <div class="inbox-email-row ${isUnread ? 'inbox-unread' : 'inbox-read'}" data-email-id="${email.id}">
                <div class="inbox-cell inbox-status-cell"><i class="fas ${isUnread ? 'fa-circle' : 'fa-envelope-open'} read-status-icon"></i></div>
                <div class="inbox-cell inbox-sender-cell">${escapeHtml(senderName)}</div>
                <div class="inbox-cell inbox-subject-cell">${escapeHtml(subject)}</div>
                <div class="inbox-cell inbox-date-cell">${dateDisplay}</div>
            </div>
        `;
    }).join('');

    emailList.innerHTML = `
        <div class="inbox-table">
            <div class="inbox-table-header">
                <div class="inbox-header-status"></div>
                <div class="inbox-header-sender">From</div>
                <div class="inbox-header-subject">Subject</div>
                <div class="inbox-header-date">Date</div>
            </div>
            <div class="inbox-table-body">${emailRows}</div>
        </div>
        ${renderPaginationControls(totalPages)}
    `;

    emailList.querySelectorAll('.inbox-email-row').forEach(item => {
        item.addEventListener('click', () => openEmail(item.dataset.emailId));
    });

    bindPaginationEvents();
}

function renderPaginationControls(totalPages) {
    if (totalPages <= 1) return '';

    let paginationHtml = `<div class="pagination-controls" style="text-align: center; margin-top: 15px;">`;
    paginationHtml += `<button class="pagination-btn" data-page="${state.currentPage - 1}" ${state.currentPage === 1 ? 'disabled' : ''} style="margin: 0 5px; padding: 5px 10px; cursor: pointer;"><i class="fas fa-chevron-left"></i> Prev</button>`;
    paginationHtml += `<span class="pagination-info" style="margin: 0 10px;">Page ${state.currentPage} of ${totalPages}</span>`;
    paginationHtml += `<button class="pagination-btn" data-page="${state.currentPage + 1}" ${state.currentPage === totalPages ? 'disabled' : ''} style="margin: 0 5px; padding: 5px 10px; cursor: pointer;">Next <i class="fas fa-chevron-right"></i></button>`;
    paginationHtml += `</div>`;
    return paginationHtml;
}

function bindPaginationEvents() {
    document.querySelectorAll('.pagination-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const page = parseInt(e.currentTarget.dataset.page);
            if (page) {
                state.currentPage = page;
                renderEmailList();
            }
        });
    });
}

function renderEmptyInbox() {
    document.getElementById('emailList').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <h3>No emails found</h3>
            <p>Your inbox is empty or there was an issue loading your emails.<br>Try refreshing or check your connection.</p>
        </div>
    `;
}

export function updateInboxCount() {
    const count = state.emails.filter(email => email.read === false).length;
    document.getElementById('inboxCount').textContent = count;
}

export function displayEmailAttachments(attachments) {
    const attachmentsContainer = document.getElementById('emailAttachments');
    
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
        attachmentsContainer.innerHTML = '';
        return;
    }

    state.currentAttachments = attachments;

    const attachmentsList = attachments.map((attachment, index) => {
        const filename = attachment.filename || `Attachment ${index + 1}`;
        const hasContent = attachment.content && attachment.content.length > 0;
        const contentSize = hasContent ? Math.round(attachment.content.length / 1024) : 0;
        const contentType = getFileIcon(filename);
        const isText = isTextFile(filename);

        return `
            <div class="attachment-detail" data-attachment-index="${index}">
                <div class="attachment-info">
                    <i class="fas ${contentType.icon}"></i>
                    <span class="attachment-name">${escapeHtml(filename)}</span>
                    ${hasContent ? `<span class="attachment-size">(${contentSize}KB)</span>` : ''}
                </div>
                <div class="attachment-actions">
                    ${hasContent ? `
                        <button class="btn-small attachment-download-btn"><i class="fas fa-download"></i> Download</button>
                        ${isText ? `<button class="btn-small attachment-preview-btn"><i class="fas fa-eye"></i> Preview</button>` : `<span class="attachment-note">Preview not available</span>`}
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    attachmentsContainer.innerHTML = `
        <div class="attachments-section">
            <h4><i class="fas fa-paperclip"></i> Attachments (${attachments.length})</h4>
            <div class="attachments-list-detail">${attachmentsList}</div>
        </div>
    `;

    attachmentsContainer.querySelectorAll('.attachment-download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.attachment-detail').dataset.attachmentIndex);
            downloadAttachment(index);
        });
    });

    attachmentsContainer.querySelectorAll('.attachment-preview-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.attachment-detail').dataset.attachmentIndex);
            previewAttachment(index);
        });
    });
}

function downloadAttachment(index) {
    const attachment = state.currentAttachments[index];
    if (!attachment) return;

    try {
        if (!attachment.content || attachment.content.trim() === '') {
            showStatus(`No content available for ${attachment.filename}`, 'error');
            return;
        }

        let blob;
        if (isTextFile(attachment.filename) && !isValidBase64(attachment.content)) {
            blob = new Blob([attachment.content], { type: 'text/plain' });
        } else {
            const binaryString = atob(attachment.content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            blob = new Blob([bytes]);
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.filename;
        document.body.appendChild(a);
a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus(`Downloaded ${attachment.filename}`, 'success');
    } catch (error) {
        console.error('Failed to download attachment:', error);
        showStatus(`Failed to download ${attachment.filename}: ${error.message}`, 'error');
    }
}

function previewAttachment(index) {
    const attachment = state.currentAttachments[index];
    if (!attachment) return;

    try {
        if (!attachment.content || attachment.content.trim() === '') {
            showStatus(`No content available for ${attachment.filename}`, 'error');
            return;
        }
        
        const textContent = isValidBase64(attachment.content) ? atob(attachment.content) : attachment.content;
        const modalContent = `<textarea disabled style="width: 100%; height: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 15px; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.4; background: #f8f9fa; resize: none; outline: none;">${escapeHtml(textContent)}</textarea>`;

        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;`;
        modal.innerHTML = `
            <div class="preview-content" style="background: white; border-radius: 8px; width: 80vw; height: 80vh; max-width: 1200px; max-height: 800px; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                <div class="preview-header" style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <h3 style="margin: 0; color: #333;">${escapeHtml(attachment.filename)}</h3>
                    <button class="close-preview" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">&times;</button>
                </div>
                <div class="preview-body" style="flex: 1; padding: 20px; overflow: auto; display: flex; flex-direction: column;">
                    ${modalContent}
                </div>
                <div class="preview-actions" style="padding: 15px 20px; border-top: 1px solid #eee; text-align: right; flex-shrink: 0;">
                    <button class="btn-small preview-download-btn"><i class="fas fa-download"></i> Download</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);

        const closeModal = () => document.body.removeChild(modal);
        
        modal.querySelector('.preview-download-btn').addEventListener('click', () => downloadAttachment(index));
        modal.querySelector('.close-preview').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    } catch (error) {
        console.error('Failed to preview attachment:', error);
        showStatus(`Failed to preview ${attachment.filename}: ${error.message}`, 'error');
    }
}

export function clearComposeForm() {
    document.getElementById('recipient').value = '';
    document.getElementById('subject').value = '';
    document.getElementById('body').value = '';
}
