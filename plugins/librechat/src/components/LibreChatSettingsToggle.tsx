import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import Switch from "@material-ui/core/Switch";
import Tooltip from "@material-ui/core/Tooltip";
import {useApi, configApiRef} from "@backstage/frontend-plugin-api";
import {useLibreChatSettings} from "../hooks/useLibreChatSettings";

/**
 * A settings row that lets the user show or hide the LibreChat chat bubble.
 *
 * Designed to slot into the user-settings "Appearance" card alongside the
 * built-in Theme / Pin Sidebar toggles. The preference is persisted per user
 * and read live by the chat bubble.
 *
 * When the bubble is disabled globally via the `librechat.enabled` config flag,
 * this row renders nothing since the user toggle would have no effect.
 *
 * @public
 */
export function LibreChatSettingsToggle() {
  const configApi = useApi(configApiRef);
  const {settings, saveEnabled} = useLibreChatSettings();

  const configEnabled =
    configApi.getOptionalBoolean("librechat.enabled") ?? true;
  if (!configEnabled) {
    return null;
  }

  const name = configApi.getOptionalString("librechat.name");
  const title = name ? `${name} Chat` : "AI Chat Assistant";

  return (
    <ListItem>
      <ListItemText
        primary={title}
        secondary="Show the AI chat bubble across the portal"
      />
      <ListItemSecondaryAction>
        <Tooltip
          placement="top"
          arrow
          title={settings.enabled ? "Hide chat bubble" : "Show chat bubble"}
        >
          <Switch
            color="primary"
            checked={settings.enabled}
            onChange={(_event, checked) => void saveEnabled(checked)}
            inputProps={{"aria-label": "Toggle chat bubble"}}
          />
        </Tooltip>
      </ListItemSecondaryAction>
    </ListItem>
  );
}
