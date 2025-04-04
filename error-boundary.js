class ErrorBoundary {
    static handleError(error, componentStack) {
        // Ignore manifest file errors as they're not critical
        if (error.message.includes('MANIFEST-000001')) {
            console.warn('Manifest file error (non-critical):', error);
            return;
        }

        console.error('Application error:', error);
        console.error('Component stack:', componentStack);
        
        // Show user-friendly error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = `
            <h3>Something went wrong</h3>
            <p>Please try refreshing the page. If the problem persists, contact support.</p>
        `;
        
        document.body.appendChild(errorMessage);
    }
}

// Add global error handler
window.addEventListener('error', (event) => {
    ErrorBoundary.handleError(event.error, event.filename);
}); 