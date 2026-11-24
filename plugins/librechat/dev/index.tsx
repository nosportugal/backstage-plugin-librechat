import {createDevApp} from "@backstage/frontend-dev-utils";
import {
  createFrontendPlugin,
  PageBlueprint,
  PluginHeaderActionBlueprint,
  createRouteRef,
} from "@backstage/frontend-plugin-api";
import {useState} from "react";
import {Link} from "@backstage/ui";
import {RiGithubFill} from "@remixicon/react";
import libreChatPlugin from "../src";

const REPO_URL = "https://github.com/nosportugal/backstage-plugin-librechat";

const devRouteRef = createRouteRef();

const devPage = PageBlueprint.make({
  name: "home",
  params: {
    path: "/",
    title: "LibreChat Plugin Dev",
    routeRef: devRouteRef,
    // The chat bubble is mounted globally by the plugin itself
    // (AppRootElementBlueprint), so it must not be rendered again here.
    loader: async () => (
      <div style={{padding: 32}}>
        <p>Look for the chat bubble in the bottom-right corner.</p>
      </div>
    ),
  },
});

const searchRouteRef = createRouteRef();

/**
 * Mock search results page. Like Backstage's /search, it ends with a pager
 * whose "Next" button sits at the bottom-right of the content, which is where
 * the bubble rests by default on other pages.
 */
function MockSearchPage() {
  const [page, setPage] = useState(1);
  return (
    <div style={{padding: 24}}>
      <p>Page {page}</p>
      {Array.from({length: 30}, (_, i) => (
        <p key={i} style={{margin: "16px 0"}}>
          Result {(page - 1) * 30 + i + 1}
        </p>
      ))}
      <nav
        aria-label="Search pagination"
        style={{display: "flex", justifyContent: "flex-end", gap: 8}}
      >
        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Previous
        </button>
        <button type="button" onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </nav>
    </div>
  );
}

const searchPage = PageBlueprint.make({
  name: "search",
  params: {
    path: "/search",
    title: "Search (mock)",
    routeRef: searchRouteRef,
    loader: async () => <MockSearchPage />,
  },
});

/** Adds a GitHub link to the app-shell plugin header. */
const githubHeaderAction = PluginHeaderActionBlueprint.make({
  name: "github-link",
  params: (defineParams) =>
    defineParams({
      loader: async () => (
        <Link
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="View on GitHub"
        >
          <RiGithubFill size={20} aria-label="GitHub repository" />
        </Link>
      ),
    }),
});

const devPlugin = createFrontendPlugin({
  pluginId: "dev",
  extensions: [devPage, searchPage, githubHeaderAction],
  routes: {root: devRouteRef, search: searchRouteRef},
});

createDevApp({features: [libreChatPlugin, devPlugin]});
