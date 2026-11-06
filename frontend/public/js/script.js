// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
    'use strict'

    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll('.needs-validation')

    // Loop over them and prevent submission
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault()
                event.stopPropagation()
            }

            form.classList.add('was-validated')
        }, false)
    })
})()

// Wanderlust Global Toast Notification System
window.showWanderlustToast = function (message, type = 'info', actionUrl = null, actionText = null) {
    let container = document.getElementById('wanderlust-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'wanderlust-toast-container';
        container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; max-width: 380px; pointer-events: none;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'wanderlust-toast';
    toast.style.cssText = 'pointer-events: auto; background: #253D35; color: #FAF9F6; padding: 12px 20px; border-radius: 999px; box-shadow: 0 10px 25px rgba(0,0,0,0.22); display: flex; align-items: center; gap: 12px; font-size: 0.92rem; font-weight: 500; opacity: 0; transform: translateY(14px); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);';

    let icon = '<i class="fa-solid fa-circle-check" style="color: #4ade80;"></i>';
    if (type === 'error') {
        toast.style.background = '#842029';
        icon = '<i class="fa-solid fa-circle-exclamation" style="color: #f87171;"></i>';
    } else if (type === 'wishlist-add') {
        icon = '<i class="fa-solid fa-heart" style="color: #ff385c;"></i>';
    } else if (type === 'wishlist-remove') {
        icon = '<i class="fa-regular fa-heart" style="color: #D98B61;"></i>';
    }

    let actionBtn = '';
    if (actionUrl && actionText) {
        actionBtn = `<a href="${actionUrl}" style="color: #D98B61; font-weight: 700; text-decoration: underline; margin-left: auto;">${actionText}</a>`;
    }

    toast.innerHTML = `${icon} <span style="flex-grow: 1;">${message}</span> ${actionBtn}`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(14px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};

// Global Wishlist Toggle Interaction
window.handleWishlistToggle = async function (event, btn) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (btn.dataset.processing === "true") return;

    const listingId = btn.getAttribute('data-listing-id');
    if (!listingId) return;

    // Check user authentication state from DOM
    const isUserLoggedIn = document.body.dataset.userLoggedIn === "true";
    if (!isUserLoggedIn) {
        if (window.showWanderlustToast) {
            window.showWanderlustToast("Please log in to save stays to your wishlist.", "error", "/login", "Log In");
        } else {
            window.location.href = "/login";
        }
        return;
    }

    const isCurrentlySaved = btn.classList.contains('active') || btn.getAttribute('data-is-wishlisted') === 'true';
    const method = isCurrentlySaved ? 'DELETE' : 'POST';
    const endpoint = `/wishlist/${listingId}`;

    btn.dataset.processing = "true";
    btn.style.pointerEvents = "none";
    btn.style.opacity = "0.7";

    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            if (window.showWanderlustToast) {
                window.showWanderlustToast("Please log in to manage your wishlist.", "error", "/login", "Log In");
            } else {
                window.location.href = "/login";
            }
            return;
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to update wishlist");
        }

        const data = await response.json();
        const nowWishlisted = data.isWishlisted;

        const icon = btn.querySelector('i');
        const textSpan = btn.querySelector('.wishlist-btn-text');

        if (nowWishlisted) {
            btn.classList.add('active');
            btn.setAttribute('data-is-wishlisted', 'true');
            btn.setAttribute('aria-label', 'Remove from Wishlist');
            btn.setAttribute('title', 'Remove from Wishlist');
            if (icon) {
                icon.className = 'fa-solid fa-heart';
                icon.style.color = '#ff385c';
            }
            if (textSpan) {
                textSpan.textContent = 'Saved';
            }
            if (window.showWanderlustToast) {
                window.showWanderlustToast("Property saved to your wishlist!", "wishlist-add", "/wishlist", "View Wishlist");
            }
        } else {
            btn.classList.remove('active');
            btn.setAttribute('data-is-wishlisted', 'false');
            btn.setAttribute('aria-label', 'Save to Wishlist');
            btn.setAttribute('title', 'Save to Wishlist');
            if (icon) {
                icon.className = 'fa-regular fa-heart';
                icon.style.color = '';
            }
            if (textSpan) {
                textSpan.textContent = 'Save';
            }
            if (window.showWanderlustToast) {
                window.showWanderlustToast("Property removed from wishlist.", "wishlist-remove");
            }
        }

        // Dynamically sync all wishlist badges on the page
        const navLinks = document.querySelectorAll('a[href="/wishlist"]');
        navLinks.forEach(link => {
            let badge = link.querySelector('.badge.bg-danger');
            if (nowWishlisted) {
                if (badge) {
                    badge.textContent = (parseInt(badge.textContent) || 0) + 1;
                } else {
                    const newBadge = document.createElement('span');
                    newBadge.className = 'badge rounded-pill bg-danger ms-1';
                    newBadge.style.fontSize = '0.7rem';
                    newBadge.textContent = '1';
                    link.appendChild(newBadge);
                }
            } else {
                if (badge) {
                    const currentVal = parseInt(badge.textContent) || 1;
                    if (currentVal > 1) {
                        badge.textContent = currentVal - 1;
                    } else {
                        badge.remove();
                    }
                }
            }
        });

    } catch (err) {
        console.error("Wishlist toggle error:", err);
        if (window.showWanderlustToast) {
            window.showWanderlustToast(err.message || "Could not update wishlist.", "error");
        } else {
            alert(err.message || "Could not update wishlist.");
        }
    } finally {
        delete btn.dataset.processing;
        btn.style.pointerEvents = "";
        btn.style.opacity = "";
    }
};