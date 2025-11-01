// Common EQBench utilities for dark mode, email display, and dropdown functionality

function setupDarkModeToggle() {
    var toggle = document.getElementById('darkModeToggle');
    var label = document.getElementById('toggleLabel');

    const savedMode = localStorage.getItem('darkModeEnabled');
    if (savedMode) {
        document.body.classList.toggle('dark-mode', savedMode === 'true');
        toggle.checked = savedMode === 'true';
        label.textContent = savedMode === 'true' ? 'Dark' : 'Light';
    }

    toggle.addEventListener('change', function() {
        document.body.classList.toggle('dark-mode', this.checked);
        label.textContent = this.checked ? 'Dark' : 'Light';
        localStorage.setItem('darkModeEnabled', this.checked);
    });
}

function applySystemTheme() {
    if (localStorage.getItem('darkModeEnabled') === null) {
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const toggle = document.getElementById('darkModeToggle');
        const label = document.getElementById('toggleLabel');

        document.body.classList.toggle('dark-mode', prefersDarkMode);
        toggle.checked = prefersDarkMode;
        label.textContent = prefersDarkMode ? 'Dark' : 'Light';
    }
}

function displayEncodedEmail() {
    var encodedUser = '&#99;&#111;&#110;&#116;&#97;&#99;&#116;';
    var encodedDomain = '&#101;&#113;&#98;&#101;&#110;&#99;&#104;&#46;&#99;&#111;&#109;';
    var emailElement = document.getElementById('email');
    emailElement.innerHTML = decodeHtmlEntities(encodedUser + '&#64;' + encodedDomain);

    var emailAddress = emailElement.innerText;
    emailElement.innerHTML = `<a href="mailto:${emailAddress}">Contact</a>`;
}

function decodeHtmlEntities(encodedString) {
    var textArea = document.createElement('textarea');
    textArea.innerHTML = encodedString;
    return textArea.value;
}

// Legacy dropdown toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const dropdownToggle = document.getElementById('legacyDropdownToggle');
    const dropdownMenu = document.getElementById('legacyDropdownMenu');

    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!dropdownToggle.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }
});
