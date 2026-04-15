import {useState, useEffect} from "react";

export interface PageContext {
  url: string;
  path: string;
  title: string;
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
    title: document.title,
  }));

  useEffect(() => {
    const update = () => {
      setContext({
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
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
