class Modal {
    constructor() {
        // Create container for modal overlays if it doesn't exist
        this.modalContainer = document.getElementById('modal-container');
        if (!this.modalContainer) {
            this.modalContainer = document.createElement('div');
            this.modalContainer.id = 'modal-container';
            document.body.appendChild(this.modalContainer);
        }

        // Track modal state
        this.openModals = 0;

        // Store original body styles
        this.originalBodyStyles = {
            overflow: '',
            paddingRight: ''
        };

        // Bind methods to maintain 'this' context
        this.handleKeydown = this.handleKeydown.bind(this);

        // Add keyboard event listener
        document.addEventListener('keydown', this.handleKeydown);
    }

    /**
     * Opens a modal by ID
     * @param {string} modalId - The ID of the modal element to open
     */
    openModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) {
            console.error(`Modal with ID "${modalId}" not found`);
            return;
        }

        // Store the currently focused element to restore focus later
        this.lastFocusedElement = document.activeElement;

        // Get or create the overlay for this modal
        let overlay = modalElement.closest('.ptn-modal-overlay');
        if (!overlay) {
            // If modal doesn't have an overlay parent, create one
            overlay = this.createOverlay(modalElement);
        }

        // Lock scrolling on the body
        this.lockBodyScroll();

        // Show the overlay and modal
        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        overlay.setAttribute('aria-hidden', 'false');

        // Add close handler to the overlay
        this.addOverlayClickHandler(overlay);

        // Setup focus trap
        this.trapFocus(modalElement);

        // Increment open modals count
        this.openModals++;

        // Dispatch custom event for frameworks to hook into
        const event = new CustomEvent('modalOpened', {
            detail: { modalId: modalId }
        });
        document.dispatchEvent(event);
    }

    /**
     * Prevents body scrolling while maintaining modal scrollability
     */
    lockBodyScroll() {
        if (this.openModals === 0) {
            // Store original body styles before modifying
            this.originalBodyStyles = {
                overflow: document.body.style.overflow,
                paddingRight: document.body.style.paddingRight
            };

            // Calculate scrollbar width to prevent layout shift when scrollbar disappears
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

            // Apply styles to body
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = scrollbarWidth + 'px';
        }
    }

    /**
     * Restores body scrolling
     */
    unlockBodyScroll() {
        if (this.openModals === 0) {
            // Restore original body styles
            document.body.style.overflow = this.originalBodyStyles.overflow;
            document.body.style.paddingRight = this.originalBodyStyles.paddingRight;
        }
    }

    /**
     * Creates an overlay for a modal if needed
     * @param {HTMLElement} modalElement - The modal element
     * @return {HTMLElement} The created overlay
     */
    createOverlay(modalElement) {
        // Only create overlay if modal doesn't have one
        const existingParent = modalElement.parentElement;

        // Create overlay element
        const overlay = document.createElement('div');
        overlay.className = 'ptn-modal-overlay';
        Object.assign(overlay.style, {
            visibility: 'hidden',
            opacity: '0',
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: '1000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: 'visibility 0s, opacity 0.3s ease-in-out'
        });

        // Set ARIA attributes for accessibility
        overlay.setAttribute('role', 'presentation');
        overlay.setAttribute('aria-hidden', 'true');

        // Move the modal to overlay
        existingParent.removeChild(modalElement);
        overlay.appendChild(modalElement);

        // Ensure modal has proper ARIA roles
        if (!modalElement.getAttribute('role')) {
            modalElement.setAttribute('role', 'dialog');
        }
        if (!modalElement.getAttribute('aria-modal')) {
            modalElement.setAttribute('aria-modal', 'true');
        }

        // Add styling to modal if not already styled
        if (!modalElement.classList.contains('ptn-modal-styled')) {
            Object.assign(modalElement.style, {
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '0',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: modalElement.dataset.modalSize || '800px',
                boxSizing: 'border-box',
                position: 'relative',
                overflowY: 'auto',
                maxHeight: '90vh'
            });
            modalElement.classList.add('ptn-modal-styled');
        }

        // Add overlay to container
        this.modalContainer.appendChild(overlay);

        return overlay;
    }

    /**
     * Add click handler to close modal when clicking outside
     * @param {HTMLElement} overlay - The modal overlay element
     */
    addOverlayClickHandler(overlay) {
        const handleOutsideClick = (e) => {
            if (e.target === overlay) {
                this.closeModal(overlay.querySelector('[role="dialog"]').id);
                overlay.removeEventListener('click', handleOutsideClick);
            }
        };

        overlay.addEventListener('click', handleOutsideClick);
    }

    /**
     * Closes a modal by ID
     * @param {string} modalId - The ID of the modal element to close
     */
    closeModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) return;

        const overlay = modalElement.closest('.ptn-modal-overlay');
        if (!overlay) return;

        // Hide the overlay
        Object.assign(overlay.style, {
            visibility: 'hidden',
            opacity: '0'
        });
        overlay.setAttribute('aria-hidden', 'true');

        // Remove focus trap
        document.removeEventListener('focus', this.currentEnforceFocus, true);

        // Decrement open modals count
        this.openModals = Math.max(0, this.openModals - 1);

        // Unlock body scroll if no modals are open
        this.unlockBodyScroll();

        // Return focus to the last focused element
        if (this.lastFocusedElement) {
            this.lastFocusedElement.focus();
        }

        // Dispatch custom event for frameworks to hook into
        const event = new CustomEvent('modalClosed', {
            detail: { modalId: modalId }
        });
        document.dispatchEvent(event);
    }

    /**
     * Closes all open modals
     */
    closeAllModals() {
        const overlays = document.querySelectorAll('.ptn-modal-overlay');
        overlays.forEach(overlay => {
            Object.assign(overlay.style, {
                visibility: 'hidden',
                opacity: '0'
            });
            overlay.setAttribute('aria-hidden', 'true');
        });

        // Reset open modals count
        this.openModals = 0;

        // Unlock body scroll
        this.unlockBodyScroll();

        // Remove focus trap
        document.removeEventListener('focus', this.currentEnforceFocus, true);

        // Return focus to the last focused element
        if (this.lastFocusedElement) {
            this.lastFocusedElement.focus();
        }
    }

    /**
     * Sets up focus trapping within the modal
     * @param {HTMLElement} modalElement - The modal element to trap focus in
     */
    trapFocus(modalElement) {
        const focusableElements = modalElement.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Focus the first element
        firstElement.focus();

        // Handle Tab key navigation
        modalElement.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });

        // Create and attach focus enforcement
        const enforceFocus = (e) => {
            if (!modalElement.contains(e.target)) {
                e.preventDefault();
                firstElement.focus();
            }
        };

        // Store reference to current enforce function so we can remove it later
        this.currentEnforceFocus = enforceFocus;
        document.addEventListener('focus', enforceFocus, true);
    }

    /**
     * Handle keyboard events, specifically the Escape key
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleKeydown(e) {
        if (e.key === 'Escape') {
            const visibleOverlays = Array.from(
                document.querySelectorAll('.ptn-modal-overlay')
            ).filter(
                overlay => overlay.style.visibility === 'visible'
            );

            if (visibleOverlays.length > 0) {
                // Close the topmost modal (last in the DOM)
                const topmostOverlay = visibleOverlays[visibleOverlays.length - 1];
                const modalElement = topmostOverlay.querySelector('[role="dialog"]');
                if (modalElement) {
                    this.closeModal(modalElement.id);
                }
            }
        }
    }

    /**
     * Clean up all event listeners
     */
    destroy() {
        document.removeEventListener('keydown', this.handleKeydown);
        document.removeEventListener('focus', this.currentEnforceFocus, true);

        // Ensure body scroll is unlocked
        this.openModals = 0;
        this.unlockBodyScroll();
    }
}

// Initialize a single modal instance
const modalSystem = new Modal();

// Export functions for external use
window.openModal = (modalId) => modalSystem.openModal(modalId);
window.closeModal = (modalId) => modalSystem.closeModal(modalId);
window.closeAllModals = () => modalSystem.closeAllModals();