type VitalMetricName = 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';

interface VitalMetric {
  name: VitalMetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

function logMetric(metric: VitalMetric) {
  // Kept local for now; can be sent to analytics endpoint later.
  console.info(`[WebVital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
}

function ratingFor(name: VitalMetricName, value: number): VitalMetric['rating'] {
  switch (name) {
    case 'LCP':
      if (value <= 2500) return 'good';
      if (value <= 4000) return 'needs-improvement';
      return 'poor';
    case 'INP':
      if (value <= 200) return 'good';
      if (value <= 500) return 'needs-improvement';
      return 'poor';
    case 'CLS':
      if (value <= 0.1) return 'good';
      if (value <= 0.25) return 'needs-improvement';
      return 'poor';
    case 'FCP':
      if (value <= 1800) return 'good';
      if (value <= 3000) return 'needs-improvement';
      return 'poor';
    case 'TTFB':
      if (value <= 800) return 'good';
      if (value <= 1800) return 'needs-improvement';
      return 'poor';
    default:
      return 'needs-improvement';
  }
}

export function initWebVitals() {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const entry = entries[entries.length - 1];
      if (!entry) return;
      logMetric({ name: 'LCP', value: entry.startTime, rating: ratingFor('LCP', entry.startTime) });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    const fcpObserver = new PerformanceObserver((list) => {
      const entry = list.getEntries().find((item) => item.name === 'first-contentful-paint');
      if (!entry) return;
      logMetric({ name: 'FCP', value: entry.startTime, rating: ratingFor('FCP', entry.startTime) });
    });
    fcpObserver.observe({ type: 'paint', buffered: true });

    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value || 0;
        }
      }
      logMetric({ name: 'CLS', value: clsValue, rating: ratingFor('CLS', clsValue) });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    const inpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries() as Array<PerformanceEntry & { duration?: number }>;
      const worst = entries.reduce((acc, item) => Math.max(acc, item.duration || 0), 0);
      if (worst > 0) {
        logMetric({ name: 'INP', value: worst, rating: ratingFor('INP', worst) });
      }
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 40 } as PerformanceObserverInit);

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      const ttfb = nav.responseStart;
      logMetric({ name: 'TTFB', value: ttfb, rating: ratingFor('TTFB', ttfb) });
    }
  } catch {
    // Silently ignore unsupported observers in old browsers.
  }
}
