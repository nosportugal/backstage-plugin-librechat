import {createDevApp} from "@backstage/frontend-dev-utils";
import {
  createFrontendPlugin,
  PageBlueprint,
  PluginHeaderActionBlueprint,
  createRouteRef,
} from "@backstage/frontend-plugin-api";
import {Link} from "@backstage/ui";
import {RiGithubFill} from "@remixicon/react";
import libreChatPlugin from "../src";
import {ChatBubble} from "../src/components/ChatBubble";

const REPO_URL = "https://github.com/nosportugal/backstage-plugin-librechat";

const devRouteRef = createRouteRef();

const devPage = PageBlueprint.make({
  name: "home",
  params: {
    path: "/",
    title: "LibreChat Plugin Dev",
    routeRef: devRouteRef,
    loader: async () => (
      <div style={{padding: 32}}>
        <p>Look for the chat bubble in the bottom-right corner.</p>
        <ChatBubble />
      </div>
    ),
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
  extensions: [devPage, githubHeaderAction],
  routes: {root: devRouteRef},
});

createDevApp({features: [libreChatPlugin, devPlugin]});
