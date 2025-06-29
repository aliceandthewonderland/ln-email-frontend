// LNemail API Client
class LNemailClient {
    constructor() {
        this.baseURL = '/api/lnemail';
        this.accessToken = null;
        this.accountInfo = null;
        this.emails = [];
        this.currentView = 'inbox';
        this.autoRefreshTimer = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.tryAutoConnect();
    }

    // Event Binding
    bindEvents() {
        // Token modal
        document.getElementById('connectBtn').addEventListener('click', () => this.handleConnect());
        document.getElementById('accessToken').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleConnect();
        });

        // Header buttons
        document.getElementById('refreshBtn').addEventListener('click', () => this.handleRefreshClick());
        document.getElementById('composeBtn').addEventListener('click', () => this.showView('compose'));
        document.getElementById('disconnectBtn').addEventListener('click', () => this.handleDisconnect());

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                if (view) this.showView(view);
            });
        });

        // Compose form
        document.getElementById('composeForm').addEventListener('submit', (e) => this.handleSendEmail(e));
        document.getElementById('clearForm').addEventListener('click', () => this.clearComposeForm());

        // Email detail navigation
        document.getElementById('backToInbox').addEventListener('click', () => this.showView('inbox'));
    }

    // Auto-connect with saved token
    async tryAutoConnect() {
        const savedToken = this.getSavedToken();
        
        if (savedToken) {
            console.log('Found saved token, attempting auto-connect...');
            
            // Set the token in the input field
            document.getElementById('accessToken').value = savedToken;
            
            // Try to connect automatically
            this.accessToken = savedToken;
            const isAuthorized = await this.checkAccountAuthorization();
            
            if (isAuthorized) {
                console.log('Auto-connect successful');
                this.hideTokenModal();
                this.showMainApp();
                this.updateAccountDisplay();
                this.refreshInbox();
                this.startAutoRefresh();
                this.showStatus('Connected!', 'success');
                return;
            } else {
                console.log('Saved token is invalid, clearing it');
                this.clearSavedToken();
                this.accessToken = null;
            }
        }
        
        // Show token modal if auto-connect failed or no saved token
        this.showTokenModal();
    }

    // Local Storage Methods
    getSavedToken() {
        try {
            return localStorage.getItem('lnemail_access_token');
        } catch (error) {
            console.error('Failed to get saved token:', error);
            return null;
        }
    }

    saveToken(token) {
        try {
            localStorage.setItem('lnemail_access_token', token);
            console.log('Token saved to localStorage');
        } catch (error) {
            console.error('Failed to save token:', error);
        }
    }

    clearSavedToken() {
        try {
            localStorage.removeItem('lnemail_access_token');
            console.log('Saved token cleared from localStorage');
        } catch (error) {
            console.error('Failed to clear saved token:', error);
        }
    }

    // Authentication
    async handleConnect() {
        const token = document.getElementById('accessToken').value.trim();
        
        if (!token) {
            this.showStatus('Please enter your access token', 'error');
            return;
        }

        // Show loading state
        const connectBtn = document.getElementById('connectBtn');
        const originalText = connectBtn.innerHTML;
        connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        connectBtn.disabled = true;

        try {
            this.accessToken = token;
            
            // Check account authorization first
            const isAuthorized = await this.checkAccountAuthorization();
            
            if (isAuthorized) {
                // Save token to localStorage on successful connection
                this.saveToken(token);
                
                this.hideTokenModal();
                this.showMainApp();
                this.updateAccountDisplay();
                this.refreshInbox();
                this.startAutoRefresh();
                this.showStatus('Connected successfully!', 'success');
            } else {
                // Reset token if authorization failed
                this.accessToken = null;
                this.showStatus('Authorization failed. Please check your access token.', 'error');
            }
        } catch (error) {
            this.accessToken = null;
            this.showStatus(`Connection failed: ${error.message}`, 'error');
        } finally {
            // Restore button state
            connectBtn.innerHTML = originalText;
            connectBtn.disabled = false;
        }
    }

    async checkAccountAuthorization() {
        try {
            const response = await this.makeRequest('/account');
            
            // Validate response format
            if (!response || typeof response !== 'object') {
                console.error('Invalid response format: expected object');
                return false;
            }
            
            // Check required fields
            if (!response.email_address || typeof response.email_address !== 'string') {
                console.error('Invalid response: missing or invalid email_address field');
                return false;
            }
            
            if (!response.expires_at || typeof response.expires_at !== 'string') {
                console.error('Invalid response: missing or invalid expires_at field');
                return false;
            }
            
            // Validate expires_at is a valid ISO date string
            const expiresAt = new Date(response.expires_at);
            if (isNaN(expiresAt.getTime())) {
                console.error('Invalid response: expires_at is not a valid date');
                return false;
            }
            
            // Check if token has expired
            if (expiresAt <= new Date()) {
                console.error('Token has expired');
                this.showStatus('Your access token has expired. Please get a new one.', 'error');
                return false;
            }
            
            // Store account info for potential future use
            this.accountInfo = {
                email_address: response.email_address,
                expires_at: response.expires_at,
                expires_date: expiresAt
            };
            
            console.log(`Account authorized for: ${response.email_address}, expires: ${expiresAt.toLocaleString()}`);
            return true;
        } catch (error) {
            console.error('Account authorization check failed:', error);
            return false;
        }
    }

    handleDisconnect() {
        // Stop auto-refresh
        this.stopAutoRefresh();
        
        // Clear saved token from localStorage
        this.clearSavedToken();
        
        this.accessToken = null;
        this.accountInfo = null;
        this.emails = [];
        this.hideMainApp();
        this.showTokenModal();
        this.clearComposeForm();
        document.getElementById('accessToken').value = '';
        // Clear account display
        document.getElementById('accountEmail').textContent = 'Loading...';
        document.getElementById('accountExpiry').textContent = 'Loading...';
        this.showStatus('Disconnected', 'info');
    }

    // UI Management
    showTokenModal() {
        document.getElementById('tokenModal').classList.add('active');
        document.getElementById('accessToken').focus();
    }

    hideTokenModal() {
        document.getElementById('tokenModal').classList.remove('active');
    }

    showMainApp() {
        document.getElementById('mainApp').classList.add('active');
    }

    hideMainApp() {
        document.getElementById('mainApp').classList.remove('active');
    }

    updateAccountDisplay() {
        if (this.accountInfo) {
            // Update email address
            document.getElementById('accountEmail').textContent = this.accountInfo.email_address;
            
            // Format and update expiry date
            const expiryDate = new Date(this.accountInfo.expires_at);
            const now = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            
            let relativeText;
            if (daysUntilExpiry > 1) {
                relativeText = `Expires in ${daysUntilExpiry} days`;
            } else if (daysUntilExpiry === 1) {
                relativeText = 'Expires tomorrow';
            } else if (daysUntilExpiry === 0) {
                relativeText = 'Expires today';
            } else {
                relativeText = 'Expired';
            }
            
            // Format exact date
            const exactDate = expiryDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Combine relative and exact date
            const fullExpiryText = `${relativeText} (${exactDate})`;
            
            document.getElementById('accountExpiry').textContent = fullExpiryText;
            document.getElementById('accountExpiry').title = `Full expiry: ${expiryDate.toLocaleString()}`;
        }
    }

    showView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        const targetView = document.getElementById(`${viewName}View`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
        }
    }

    showStatus(message, type = 'info') {
        const statusContainer = document.getElementById('statusContainer');
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 
                    'info-circle';
        
        statusDiv.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
        statusContainer.appendChild(statusDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.parentNode.removeChild(statusDiv);
            }
        }, 5000);
    }

    // Handle refresh button click with animation
    async handleRefreshClick() {
        const refreshBtn = document.getElementById('refreshBtn');
        const refreshIcon = refreshBtn.querySelector('i');
        
        // Store original classes and add spinning animation
        const originalClasses = refreshIcon.className;
        refreshIcon.className = 'fas fa-sync-alt fa-spin';
        refreshBtn.disabled = true;
        
        try {
            await this.refreshInbox();
        } finally {
            // Restore original icon and enable button
            refreshIcon.className = originalClasses;
            refreshBtn.disabled = false;
        }
    }

    // Auto-refresh functionality
    startAutoRefresh() {
        // Clear any existing timer first
        this.stopAutoRefresh();
        
        // Set up auto-refresh every 10 seconds
        this.autoRefreshTimer = setInterval(async () => {
            if (this.accessToken && this.currentView === 'inbox') {
                try {
                    await this.refreshInbox();
                } catch (error) {
                    console.error('Auto-refresh failed:', error);
                }
            }
        }, 5000); // 5 seconds
        
        console.log('Auto-refresh started (every 10 seconds)');
    }

    stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
            console.log('Auto-refresh stopped');
        }
    }

    // API Methods
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authorization header for all endpoints when we have a token
        if (this.accessToken) {
            config.headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error('API Request failed:', error);
            
            // Provide more helpful error messages for common issues
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Please make sure you\'re running this app through a web server (not file://) to avoid CORS issues. Try running: python -m http.server 8000');
            }
            
            throw error;
        }
    }

    async refreshInbox() {
        if (!this.accessToken) {
            this.showStatus('Please connect with your access token first', 'error');
            return;
        }

        const loadingElement = document.getElementById('inboxLoading');
        loadingElement.classList.remove('hidden');

        try {
            const response = await this.makeRequest('/emails');
            
            // Handle different response formats
            let emails = [];
            if (Array.isArray(response)) {
                emails = response;
            } else if (response.emails && Array.isArray(response.emails)) {
                emails = response.emails;
            } else if (response.data && Array.isArray(response.data)) {
                emails = response.data;
            }

            // Fetch detailed content for each email to get attachments info
            const detailedEmails = await Promise.all(
                emails.map(async (email) => {
                    try {
                        const detailedEmail = await this.getEmailContent(email.id);
                        return detailedEmail || email; // Fallback to original if detailed fetch fails
                    } catch (error) {
                        console.warn(`Failed to fetch details for email ${email.id}:`, error);
                        return email; // Fallback to original email
                    }
                })
            );

            this.emails = detailedEmails;
            this.renderEmailList();
            this.updateInboxCount();
            // const unreadCount = this.emails.filter(email => email.read === false).length;
            // this.showStatus(`Total ${unreadCount} emails unread`, 'success');
        } catch (error) {
            console.error('Failed to refresh inbox:', error);
            this.showStatus(`Failed to load emails: ${error.message}`, 'error');
            this.renderEmptyInbox();
        } finally {
            loadingElement.classList.add('hidden');
        }
    }

    async getEmailContent(emailId) {
        try {
            const email = await this.makeRequest(`/emails/${emailId}`);
            return email;
        } catch (error) {
            console.error('Failed to get email content:', error);
            this.showStatus(`Failed to load email: ${error.message}`, 'error');
            return null;
        }
    }

    async sendEmail(recipient, subject, body) {
        try {
            const response = await this.makeRequest('/email/send', {
                method: 'POST',
                body: JSON.stringify({
                    recipient: recipient,
                    subject: subject,
                    body: body
                })
            });

            return response;
        } catch (error) {
            console.error('Failed to send email:', error);
            throw error;
        }
    }

    // Email Management
    renderEmailList() {
        const emailList = document.getElementById('emailList');
        
        if (this.emails.length === 0) {
            this.renderEmptyInbox();
            return;
        }

        emailList.innerHTML = this.emails.map(email => {
            const date = new Date(email.date || email.timestamp || Date.now()).toLocaleDateString();
            const bodyContent = email.body || email.content || 'No content';
            const preview = this.truncateText(bodyContent, 100);
            
            // Create attachments preview
            const attachmentsPreview = this.createAttachmentsPreview(email.attachments);
            
            return `
                <div class="email-item ${email.read === false ? 'unread' : ''}" data-email-id="${email.id}">
                    <div class="email-header">
                        <div class="email-from">${this.escapeHtml(email.from || email.sender || 'Unknown Sender')}</div>
                        <div class="email-date">${date}</div>
                    </div>
                    <div class="email-subject">${this.escapeHtml(email.subject || 'No Subject')}</div>
                    <div class="email-preview">
                        <div class="preview-body">${this.escapeHtml(preview)}</div>
                        ${attachmentsPreview}
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        emailList.querySelectorAll('.email-item').forEach(item => {
            item.addEventListener('click', () => {
                const emailId = item.dataset.emailId;
                this.openEmail(emailId);
            });
        });
    }

    renderEmptyInbox() {
        const emailList = document.getElementById('emailList');
        emailList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No emails found</h3>
                <p>Your inbox is empty or there was an issue loading your emails.<br>
                Try refreshing or check your connection.</p>
            </div>
        `;
    }

    async openEmail(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (!email) {
            this.showStatus('Email not found', 'error');
            return;
        }

        // Try to get full email content if we only have a preview
        let fullEmail = email;
        if (!email.fullContent) {
            fullEmail = await this.getEmailContent(emailId);
            if (!fullEmail) return;
        }

        // Update email detail view
        document.getElementById('emailSubject').textContent = fullEmail.subject || 'No Subject';
        document.getElementById('emailFrom').textContent = fullEmail.from || fullEmail.sender || 'Unknown Sender';
        document.getElementById('emailDate').textContent = new Date(fullEmail.date || fullEmail.timestamp || Date.now()).toLocaleString();
        document.getElementById('emailBody').innerHTML = this.formatEmailBody(fullEmail.body || fullEmail.content || 'No content available');
        
        // Display attachments
        this.displayEmailAttachments(fullEmail.attachments);

        this.showView('emailDetail');
    }

    updateInboxCount() {
        const count = this.emails.filter(email => email.read === false).length;
        document.getElementById('inboxCount').textContent = count;
    }

    displayEmailAttachments(attachments) {
        const attachmentsContainer = document.getElementById('emailAttachments');
        
        if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
            attachmentsContainer.innerHTML = '';
            return;
        }

        // Store attachments in instance variable for reliable access
        this.currentAttachments = attachments;

        const attachmentsList = attachments.map((attachment, index) => {
            const filename = attachment.filename || `Attachment ${index + 1}`;
            const hasContent = attachment.content && attachment.content.length > 0;
            const contentSize = hasContent ? Math.round(attachment.content.length / 1024) : 0;
            const contentType = this.getFileIcon(filename);
            const isTextFile = this.isTextFile(filename);

            return `
                <div class="attachment-detail" data-attachment-index="${index}">
                    <div class="attachment-info">
                        <i class="fas ${contentType.icon}"></i>
                        <span class="attachment-name">${this.escapeHtml(filename)}</span>
                        ${hasContent ? `<span class="attachment-size">(${contentSize}KB)</span>` : ''}
                    </div>
                    ${hasContent && isTextFile ? `
                        <div class="attachment-actions">
                            <button class="btn-small attachment-download-btn">
                                <i class="fas fa-download"></i> Download
                            </button>
                            <button class="btn-small attachment-preview-btn">
                                <i class="fas fa-eye"></i> Preview
                            </button>
                        </div>
                    ` : hasContent ? `
                        <div class="attachment-actions">
                            <span class="attachment-note">Preview not available for this file type</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        attachmentsContainer.innerHTML = `
            <div class="attachments-section">
                <h4><i class="fas fa-paperclip"></i> Attachments (${attachments.length})</h4>
                <div class="attachments-list-detail">
                    ${attachmentsList}
                </div>
            </div>
        `;

        // Add event listeners for attachment buttons
        attachmentsContainer.querySelectorAll('.attachment-download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const attachmentDetail = e.target.closest('.attachment-detail');
                const index = parseInt(attachmentDetail.dataset.attachmentIndex);
                const attachment = this.currentAttachments[index];
                if (attachment) {
                    this.downloadAttachment(index, attachment.filename, attachment.content);
                }
            });
        });

        attachmentsContainer.querySelectorAll('.attachment-preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const attachmentDetail = e.target.closest('.attachment-detail');
                const index = parseInt(attachmentDetail.dataset.attachmentIndex);
                const attachment = this.currentAttachments[index];
                if (attachment) {
                    this.previewAttachment(index, attachment.filename, attachment.content);
                }
            });
        });
    }

    // Compose Email
    async handleSendEmail(e) {
        e.preventDefault();
        
        const recipient = document.getElementById('recipient').value.trim();
        const subject = document.getElementById('subject').value.trim();
        const body = document.getElementById('body').value.trim();

        if (!recipient || !subject || !body) {
            this.showStatus('Please fill in all fields', 'error');
            return;
        }

        if (!this.isValidEmail(recipient)) {
            this.showStatus('Please enter a valid email address', 'error');
            return;
        }

        try {
            // Disable form during sending
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;

            const response = await this.sendEmail(recipient, subject, body);
            
            this.showStatus('Email sent successfully!', 'success');
            this.clearComposeForm();
            this.showView('inbox');
            
            // If response contains payment info, show it
            if (response.payment_hash) {
                this.showStatus(`Payment hash: ${response.payment_hash}`, 'info');
            }
        } catch (error) {
            this.showStatus(`Failed to send email: ${error.message}`, 'error');
        } finally {
            // Re-enable form
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Email';
            submitBtn.disabled = false;
        }
    }

    clearComposeForm() {
        document.getElementById('recipient').value = '';
        document.getElementById('subject').value = '';
        document.getElementById('body').value = '';
    }

    createAttachmentsPreview(attachments) {
        if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
            return '';
        }

        const attachmentsList = attachments.map(attachment => {
            const filename = attachment.filename || 'Unknown file';
            const hasContent = attachment.content && attachment.content.length > 0;
            const contentSize = hasContent ? `(${Math.round(attachment.content.length / 1024)}KB)` : '';
            
            return `<span class="attachment-item">
                <i class="fas fa-paperclip"></i> ${this.escapeHtml(filename)} ${contentSize}
            </span>`;
        }).join('');

        return `<div class="attachments-preview">
            <div class="attachments-label">
                <i class="fas fa-paperclip"></i> ${attachments.length} attachment${attachments.length > 1 ? 's' : ''}:
            </div>
            <div class="attachments-list">${attachmentsList}</div>
        </div>`;
    }

    // Utility Methods
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatEmailBody(body) {
        // Basic formatting - convert line breaks to <br>
        return this.escapeHtml(body).replace(/\n/g, '<br>');
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isTextFile(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const textExtensions = ['txt', 'asc', 'sig', 'gpg', 'pgp', 'csv', 'json', 'xml', 'log'];
        return textExtensions.includes(extension);
    }

    isValidBase64(str) {
        if (!str || typeof str !== 'string') {
            return false;
        }
        
        const trimmedStr = str.trim();
        if (trimmedStr === '') {
            return false; // Empty string is not valid Base64
        }

        try {
            // The most reliable way to check for Base64 is to decode it.
            // We also re-encode (`btoa`) to ensure it's a canonical representation,
            // which handles some edge cases.
            return btoa(atob(trimmedStr)) === trimmedStr;
        } catch (err) {
            // If atob() throws an error, it's not valid Base64.
            return false;
        }
    }

    getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': { icon: 'fa-file-pdf', color: '#dc3545' },
            'doc': { icon: 'fa-file-word', color: '#2b579a' },
            'docx': { icon: 'fa-file-word', color: '#2b579a' },
            'xls': { icon: 'fa-file-excel', color: '#107c41' },
            'xlsx': { icon: 'fa-file-excel', color: '#107c41' },
            'ppt': { icon: 'fa-file-powerpoint', color: '#d24726' },
            'pptx': { icon: 'fa-file-powerpoint', color: '#d24726' },
            'txt': { icon: 'fa-file-alt', color: '#6c757d' },
            'asc': { icon: 'fa-file-code', color: '#6c757d' },
            'sig': { icon: 'fa-file-code', color: '#6c757d' },
            'gpg': { icon: 'fa-file-code', color: '#6c757d' },
            'pgp': { icon: 'fa-file-code', color: '#6c757d' },
            'csv': { icon: 'fa-file-csv', color: '#28a745' },
            'json': { icon: 'fa-file-code', color: '#6c757d' },
            'xml': { icon: 'fa-file-code', color: '#6c757d' },
            'log': { icon: 'fa-file-alt', color: '#6c757d' },
            'jpg': { icon: 'fa-file-image', color: '#28a745' },
            'jpeg': { icon: 'fa-file-image', color: '#28a745' },
            'png': { icon: 'fa-file-image', color: '#28a745' },
            'gif': { icon: 'fa-file-image', color: '#28a745' },
            'zip': { icon: 'fa-file-archive', color: '#ffc107' },
            'rar': { icon: 'fa-file-archive', color: '#ffc107' },
            'mp3': { icon: 'fa-file-audio', color: '#17a2b8' },
            'mp4': { icon: 'fa-file-video', color: '#6f42c1' },
            'avi': { icon: 'fa-file-video', color: '#6f42c1' }
        };
        
        return iconMap[extension] || { icon: 'fa-file', color: '#6c757d' };
    }

    downloadAttachment(index, filename, content) {
        try {
            if (!content || content.trim() === '') {
                this.showStatus(`No content available for ${filename}`, 'error');
                return;
            }

            let blob;
            // For text files, check if they are Base64. If not, treat as plain text.
            // For non-text files, assume they are always Base64.
            if (this.isTextFile(filename) && !this.isValidBase64(content)) {
                blob = new Blob([content], { type: 'text/plain' });
            } else {
                // An exception will be caught below if atob fails.
                const binaryString = atob(content);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                blob = new Blob([bytes]);
            }

            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showStatus(`Downloaded ${filename}`, 'success');
        } catch (error) {
            console.error('Failed to download attachment:', error);
            this.showStatus(`Failed to download ${filename}: ${error.message}`, 'error');
        }
    }

    previewAttachment(index, filename, content) {
        try {
            if (!content || content.trim() === '') {
                this.showStatus(`No content available for ${filename}`, 'error');
                return;
            }

            const extension = filename.split('.').pop().toLowerCase();
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif'];

            let modalContent = '';
            let postRenderAction = () => {};

            if (imageExtensions.includes(extension)) {
                // Images are assumed to be Base64
                const binaryString = atob(content);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: `image/${extension === 'jpg' ? 'jpeg' : extension}` });
                const url = URL.createObjectURL(blob);
                
                modalContent = `<img src="${url}" alt="${this.escapeHtml(filename)}" style="
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    display: block;
                    margin: 0 auto;
                ">`;
                postRenderAction = () => URL.revokeObjectURL(url);

            } else if (this.isTextFile(filename)) {
                // For text files, decode if Base64, otherwise use as-is.
                const textContent = this.isValidBase64(content) ? atob(content) : content;
                modalContent = `<textarea disabled style="
                    width: 100%;
                    height: 100%;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 15px;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    line-height: 1.4;
                    background: #f8f9fa;
                    resize: none;
                    outline: none;
                ">${this.escapeHtml(textContent)}</textarea>`;
            } else {
                this.showStatus(`Preview not available for this file type. Try downloading instead.`, 'info');
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'preview-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;
            modal.innerHTML = `
                <div class="preview-content" style="
                    background: white;
                    border-radius: 8px;
                    width: 80vw;
                    height: 80vh;
                    max-width: 1200px;
                    max-height: 800px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                ">
                    <div class="preview-header" style="
                        padding: 20px;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-shrink: 0;
                    ">
                        <h3 style="margin: 0; color: #333;">${this.escapeHtml(filename)}</h3>
                        <button class="close-preview" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #666;
                            padding: 0;
                            width: 30px;
                            height: 30px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">&times;</button>
                    </div>
                    <div class="preview-body" style="
                        flex: 1;
                        padding: 20px;
                        overflow: auto;
                        display: flex;
                        flex-direction: column;
                    ">
                        ${modalContent}
                    </div>
                    <div class="preview-actions" style="
                        padding: 15px 20px;
                        border-top: 1px solid #eee;
                        text-align: right;
                        flex-shrink: 0;
                    ">
                        <button class="btn-small preview-download-btn" data-index="${index}">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);

            const closeModal = () => {
                postRenderAction();
                document.body.removeChild(modal);
            };
            
            modal.querySelector('.preview-download-btn').addEventListener('click', () => {
                const attachment = this.currentAttachments[index];
                if (attachment) {
                    this.downloadAttachment(index, attachment.filename, attachment.content);
                }
            });
            
            modal.querySelector('.close-preview').addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });

        } catch (error) {
            console.error('Failed to preview attachment:', error);
            this.showStatus(`Failed to preview ${filename}: ${error.message}`, 'error');
        }
    }
}

// Initialize the application when DOM is loaded
let client;
document.addEventListener('DOMContentLoaded', () => {
    client = new LNemailClient();
}); 