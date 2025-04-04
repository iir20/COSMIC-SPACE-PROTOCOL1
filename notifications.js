/**
 * Cosmic Space Protocol - Notifications System
 * 
 * This file handles showing notifications to users throughout the application
 */

class NotificationSystem {
    constructor() {
        this.container = null;
        this.initialized = false;
        this.queue = [];
        this.maxVisible = 3;
        this.visibleCount = 0;
        this.defaultDuration = 5000; // 5 seconds
        this.animationDuration = 300; // 0.3 seconds
    }
    
    // Initialize notification system
    initialize() {
        if (this.initialized) return;
        
        console.log('Initializing notification system');
        
        // Create notification container if it doesn't exist
        let container = document.getElementById('notificationContainer');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
            
            // Add styles if not already present
            this.addStyles();
        }
        
        this.container = container;
        this.initialized = true;
        
        // Process any queued notifications
        this.processQueue();
        
        // Register globally
        window.notifications = this;
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('notificationSystemInitialized'));
        
        console.log('Notification system initialized');
    }
    
    // Alias for initialize to maintain compatibility
    init() {
        return this.initialize();
    }
    
    // Add notification styles to document
    addStyles() {
        // Check if styles already exist
        if (document.getElementById('notification-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 350px;
                pointer-events: none;
            }
            
            .notification {
                background: rgba(10, 10, 30, 0.85);
                backdrop-filter: blur(10px);
                border-radius: 8px;
                padding: 12px 15px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                margin-bottom: 10px;
                color: white;
                transform: translateX(120%);
                transition: transform 0.3s ease-out;
                animation: slide-in 0.3s forwards;
                pointer-events: auto;
                border-left: 4px solid #5b5be6;
                opacity: 0;
            }
            
            .notification.show {
                opacity: 1;
            }
            
            .notification.hide {
                animation: slide-out 0.3s forwards;
            }
            
            .notification-title {
                font-weight: bold;
                margin-bottom: 5px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .notification-close {
                cursor: pointer;
                font-size: 18px;
                color: rgba(255, 255, 255, 0.7);
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.2s;
            }
            
            .notification-close:hover {
                color: white;
            }
            
            .notification-message {
                font-size: 14px;
                line-height: 1.4;
            }
            
            .notification-progress {
                height: 3px;
                background: rgba(255, 255, 255, 0.2);
                margin-top: 8px;
                position: relative;
                border-radius: 1.5px;
                overflow: hidden;
            }
            
            .notification-progress-bar {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 100%;
                background: rgba(255, 255, 255, 0.7);
                transform-origin: left;
            }
            
            /* Notification types */
            .notification.success { border-left-color: #10b981; }
            .notification.error { border-left-color: #ef4444; }
            .notification.warning { border-left-color: #f59e0b; }
            .notification.info { border-left-color: #3b82f6; }
            
            @keyframes slide-in {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slide-out {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(120%); opacity: 0; }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Show a notification
    show(type, message, title = null) {
        // Initialize if not already
        if (!this.initialized) {
            this.queue.push({ type, message, title });
            this.initialize();
            return;
        }
        
        // Default title based on type if not provided
        if (!title) {
            switch (type) {
                case 'success': title = 'Success'; break;
                case 'error': title = 'Error'; break;
                case 'warning': title = 'Warning'; break;
                case 'info': title = 'Information'; break;
                default: title = 'Notification';
            }
        }
        
        // If at max visible, queue the notification
        if (this.visibleCount >= this.maxVisible) {
            this.queue.push({ type, message, title });
            return;
        }
        
        // Create the notification
        this.createNotification(type, message, title);
    }
    
    // Create a notification element
    createNotification(type, message, title) {
        // Increment visible count
        this.visibleCount++;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Create content
        notification.innerHTML = `
            <div class="notification-title">
                <span>${title}</span>
                <span class="notification-close">&times;</span>
            </div>
            <div class="notification-message">${message}</div>
            <div class="notification-progress">
                <div class="notification-progress-bar"></div>
            </div>
        `;
        
        // Add to container
        this.container.appendChild(notification);
        
        // Force browser reflow/repaint to ensure animation works
        notification.offsetHeight;
        
        // Add show class to trigger animation
        notification.classList.add('show');
        
        // Set up progress bar animation
        const progressBar = notification.querySelector('.notification-progress-bar');
        progressBar.style.transition = `transform ${this.defaultDuration / 1000}s linear`;
        progressBar.style.transform = 'scaleX(0)';
        
        // Add close handler
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        // Auto remove after duration
        setTimeout(() => {
            this.removeNotification(notification);
        }, this.defaultDuration);
    }
    
    // Remove a notification
    removeNotification(notification) {
        // Skip if already being removed (has hide class)
        if (notification.classList.contains('hide')) return;
        
        // Add hide class
        notification.classList.add('hide');
        notification.classList.remove('show');
        
        // Wait for animation to complete
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            
            // Decrement visible count
            this.visibleCount--;
            
            // Process next in queue if any
            this.processQueue();
        }, this.animationDuration);
    }
    
    // Process notification queue
    processQueue() {
        // Process queued notifications if any
        while (this.visibleCount < this.maxVisible && this.queue.length > 0) {
            const { type, message, title } = this.queue.shift();
            this.createNotification(type, message, title);
        }
    }
    
    // Clear all notifications
    clearAll() {
        // Clear queue
        this.queue = [];
        
        // Remove all visible notifications
        const notifications = this.container.querySelectorAll('.notification');
        notifications.forEach(notification => {
            this.removeNotification(notification);
        });
    }
}

// Initialize the notification system
const notificationSystem = new NotificationSystem();

// Initialize notification system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    notificationSystem.initialize();
});

// Export to window object
window.notifications = notificationSystem; 