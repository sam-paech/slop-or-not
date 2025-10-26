// debug.js - Debug logging utilities

// Set to true to enable verbose debug logging
export let DEBUG_ENABLED = true;

export function setDebug(enabled) {
  DEBUG_ENABLED = enabled;
  console.log(`Debug logging ${enabled ? 'enabled' : 'disabled'}`);
}

export function debug(...args) {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
}

export function debugGroup(label) {
  if (DEBUG_ENABLED) {
    console.group(label);
  }
}

export function debugGroupEnd() {
  if (DEBUG_ENABLED) {
    console.groupEnd();
  }
}

// Expose to window for easy toggling in console
if (typeof window !== 'undefined') {
  window.toggleDebug = () => {
    setDebug(!DEBUG_ENABLED);
  };
  console.log('💡 Tip: Use window.toggleDebug() to enable/disable debug logging');
}
