import {useState, useEffect} from "react";

export interface PageContext {
  url: string;
  path: string;
  title: string;
}

/**
 * Normalizes a browser document title by collapsing repeated segments.
 *
 * Backstage builds titles as `<page> | <app.title>`. On pages without a
 * dedicated title the page segment falls back to the app title, producing
 * duplicates like `Backstage | Backstage`. This collapses adjacent repeats.
 */
function normalizeTitle(title: string): string {
  const parts = title
    .split("|")
    .map(part => part.trim())
    .filter(Boolean);
  const deduped = parts.filter((part, index) => part !== parts[index - 1]);
  return deduped.join(" | ");
}

/**
 * Hook that tracks the current Backstage page context.
 * Captures URL, path, and document title so it can be sent
 * alongside chat messages for contextual answers.
 */
export function usePageContext(): PageContext {
  const [context, setContext] = useState<PageContext>(() => ({
    url: window.location.href,
    path: window.location.pathname,
    title: normalizeTitle(document.title),
  }));

  useEffect(() => {
    const update = () => {
      setContext({
        url: window.location.href,
        path: window.location.pathname,
        title: normalizeTitle(document.title),
      });
    };

    // Listen for navigation changes (pushState / popState)
    window.addEventListener("popstate", update);

    // Observe title changes via MutationObserver
    const titleEl = document.querySelector("title");
    let titleObserver: MutationObserver | undefined;
    if (titleEl) {
      titleObserver = new MutationObserver(update);
      titleObserver.observe(titleEl, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    // Patch pushState/replaceState to detect SPA navigation
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = (...args) => {
      origPush(...args);
      update();
    };
    history.replaceState = (...args) => {
      origReplace(...args);
      update();
    };

    return () => {
      window.removeEventListener("popstate", update);
      titleObserver?.disconnect();
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  return context;
}
