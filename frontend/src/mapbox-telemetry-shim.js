// Small shim to suppress Mapbox telemetry POSTs to events.mapbox.com which
// are often blocked by adblockers and produce repeated console errors.
// Call suppressMapboxTelemetry() as early as possible (before Mapbox is used).

export function suppressMapboxTelemetry() {
  if (typeof window === 'undefined') return;

  // Patch fetch to short-circuit events.mapbox.com requests
  try {
    const originalFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : input && input.url;
        if (url && url.includes('events.mapbox.com')) {
          // Return a resolved Response-like object to keep callers happy
          return Promise.resolve(new Response(null, { status: 204, statusText: 'No Content' }));
        }
      } catch (e) {
        // ignore
      }
      return originalFetch(input, init);
    };
  } catch (e) {
    // Some environments may not allow overriding fetch
    // ignore and continue
  }

  // Patch XMLHttpRequest to no-op events.mapbox.com requests
  try {
    const XHR = window.XMLHttpRequest;
    if (XHR && XHR.prototype && !XHR.prototype.__mapboxTelemetryPatched) {
      const proto = XHR.prototype;
      const originalOpen = proto.open;
      const originalSend = proto.send;

      proto.open = function (method, url) {
        try {
          this.__mapboxTelemetryUrl = url;
        } catch (e) { }
        return originalOpen.apply(this, arguments);
      };

      proto.send = function (body) {
        try {
          if (this.__mapboxTelemetryUrl && this.__mapboxTelemetryUrl.includes('events.mapbox.com')) {
            // Simulate a successful no-content response without network request
            this.readyState = 4;
            this.status = 204;
            this.response = null;
            if (typeof this.onload === 'function') {
              try { this.onload({ target: this }); } catch (e) { }
            }
            if (typeof this.onreadystatechange === 'function') {
              try { this.onreadystatechange({ target: this }); } catch (e) { }
            }
            return;
          }
        } catch (e) {
          // fall through to real send
        }
        return originalSend.apply(this, arguments);
      };

      proto.__mapboxTelemetryPatched = true;
    }
  } catch (e) {
    // ignore patch failures
  }
}

export default suppressMapboxTelemetry;

// Run automatically when this module is imported so the shim is active
// before other modules (like Mapbox) have a chance to make telemetry calls.
try {
  suppressMapboxTelemetry();
} catch (e) {
  // ignore any errors during auto-invocation
}
