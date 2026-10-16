// Global Real-Time Progress Bar Controller
// Dispatches browser events for zero-latency instant feedback on clicks, navigations, and async operations.

export interface ProgressOptions {
  duration?: number;
  minProgress?: number;
  isAsync?: boolean;
}

const START_EVENT = "road:progress:start";
const DONE_EVENT = "road:progress:done";
const UPDATE_EVENT = "road:progress:update";

/**
 * Triggers the global top progress bar immediately.
 * If a Promise is passed, the progress bar remains active and trickles until the promise settles.
 */
export function startGlobalProgress(
  promiseOrOptions?: Promise<unknown> | ProgressOptions
): () => void {
  if (typeof window === "undefined") return () => {};

  let isPromise = false;

  if (promiseOrOptions && typeof (promiseOrOptions as Promise<unknown>).then === "function") {
    isPromise = true;
    const promise = promiseOrOptions as Promise<unknown>;
    
    window.dispatchEvent(
      new CustomEvent(START_EVENT, { detail: { isAsync: true } })
    );

    const finish = () => {
      window.dispatchEvent(new CustomEvent(DONE_EVENT));
    };

    promise.then(finish, finish);
    return finish;
  }

  const options = (promiseOrOptions as ProgressOptions) || {};
  window.dispatchEvent(
    new CustomEvent(START_EVENT, { detail: options })
  );

  return () => {
    window.dispatchEvent(new CustomEvent(DONE_EVENT));
  };
}

/**
 * Completes the global top progress bar immediately.
 */
export function finishGlobalProgress() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DONE_EVENT));
}

/**
 * Updates the current progress percentage manually (0 - 100).
 */
export function updateGlobalProgress(percent: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { percent } }));
}

/**
 * Wrap an async function or promise to automatically track real-time progress.
 */
export async function withGlobalProgress<T>(fnOrPromise: (() => Promise<T>) | Promise<T>): Promise<T> {
  const promise = typeof fnOrPromise === "function" ? fnOrPromise() : fnOrPromise;
  startGlobalProgress(promise);
  return promise;
}

/**
 * Attaches a global click listener to document so that ANY button, link, or interactive trigger
 * shows the real-time progress bar instantly with 0ms latency.
 */
export function initGlobalClickProgress(): () => void {
  if (typeof window === "undefined") return () => {};

  const handleClick = (e: MouseEvent) => {
    // Check if target or parent is an interactive button or clickable link
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const interactiveEl = target.closest<HTMLElement>(
      "button, [role='button'], a, input[type='button'], input[type='submit'], summary, [data-interactive='true']"
    );

    if (!interactiveEl) return;

    // Ignore if explicitly marked with data-no-progress or disabled
    if (
      interactiveEl.hasAttribute("disabled") ||
      interactiveEl.getAttribute("aria-disabled") === "true" ||
      interactiveEl.getAttribute("data-no-progress") === "true"
    ) {
      return;
    }

    // For plain anchor links with '#' only on same view, skip if desired, else trigger
    const href = interactiveEl.getAttribute("href");
    if (href === "#") return;

    // Instant trigger
    startGlobalProgress({ duration: 450 });
  };

  document.addEventListener("click", handleClick, { capture: true, passive: true });

  return () => {
    document.removeEventListener("click", handleClick, { capture: true });
  };
}
