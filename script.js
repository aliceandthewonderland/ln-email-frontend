// LNemail API Client
class LNemailClient {
    constructor() {
        this.baseURL = 'https://lnemail.net/api/v1';
        this.accessToken = null;
        this.accountInfo = null;
        this.emails = [];
        this.currentView = 'inbox';
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.showTokenModal();
    }

    // Event Binding
    bindEvents() {
        // Token modal
        document.getElementById('connectBtn').addEventListener('click', () => this.handleConnect());
        document.getElementById('accessToken').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleConnect();
        });

        // Header buttons
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshInbox());
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
                this.hideTokenModal();
                this.showMainApp();
                this.refreshInbox();
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
        this.accessToken = null;
        this.accountInfo = null;
        this.emails = [];
        this.hideMainApp();
        this.showTokenModal();
        this.clearComposeForm();
        document.getElementById('accessToken').value = '';
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

            this.emails = emails;
            this.renderEmailList();
            this.updateInboxCount();
            this.showStatus(`Loaded ${emails.length} emails`, 'success');
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
            const preview = this.truncateText(email.body || email.content || 'No content', 100);
            
            return `
                <div class="email-item ${email.read === false ? 'unread' : ''}" data-email-id="${email.id}">
                    <div class="email-header">
                        <div class="email-from">${this.escapeHtml(email.from || email.sender || 'Unknown Sender')}</div>
                        <div class="email-date">${date}</div>
                    </div>
                    <div class="email-subject">${this.escapeHtml(email.subject || 'No Subject')}</div>
                    <div class="email-preview">${this.escapeHtml(preview)}</div>
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

        this.showView('emailDetail');
    }

    updateInboxCount() {
        const count = this.emails.length;
        document.getElementById('inboxCount').textContent = count;
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
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LNemailClient();
}); 