/**
 * RFB Loader Utility
 * Handles loading of noVNC RFB module with proper CommonJS compatibility
 * Uses CDN fallback if npm package import fails
 */

let RFB = null;
let loadingPromise = null;

// Load from CDN as fallback
const loadFromCDN = () => {
    return new Promise((resolve, reject) => {
        if (window.RFB) {
            resolve(window.RFB);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@novnc/novnc@1.6.0/lib/rfb.js';
        script.async = true;
        script.onload = () => {
            if (window.RFB) {
                resolve(window.RFB);
            } else {
                reject(new Error('RFB not found after CDN load'));
            }
        };
        script.onerror = () => {
            reject(new Error('Failed to load noVNC from CDN'));
        };
        document.head.appendChild(script);
    });
};

export const loadRFB = async () => {
    if (RFB) {
        return RFB;
    }

    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = (async () => {
        try {
            // Try importing from npm package first
            try {
                // Use dynamic import with template literal to avoid static analysis
                const modulePath = '@novnc/novnc/lib/rfb';
                const module = await import(/* @vite-ignore */ modulePath);
                
                // Handle both default export and named export
                RFB = module.default || module.RFB || module;
                
                // If RFB is still not found, check module.exports
                if (!RFB || (typeof RFB !== 'function' && typeof RFB !== 'object')) {
                    RFB = module.exports?.default || module.exports?.RFB || module.exports || module;
                }
                
                if (RFB && (typeof RFB === 'function' || typeof RFB === 'object')) {
                    return RFB;
                }
            } catch (npmError) {
                console.warn('Failed to load noVNC from npm package, trying CDN:', npmError.message);
            }

            // Fallback to CDN
            console.log('Loading noVNC from CDN...');
            RFB = await loadFromCDN();
            return RFB;
        } catch (error) {
            console.error('Error loading RFB:', error);
            throw new Error(`Failed to load noVNC: ${error.message}`);
        }
    })();

    return loadingPromise;
};

export default loadRFB;

