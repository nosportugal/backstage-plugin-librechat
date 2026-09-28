import {makeStyles, Theme} from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemText from "@material-ui/core/ListItemText";
import Divider from "@material-ui/core/Divider";
import Button from "@material-ui/core/Button";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import DeleteSweepIcon from "@material-ui/icons/DeleteSweep";
import type {LibreChatConversation} from "../hooks/useLibreChatHistory";

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1, 1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  headerTitle: {
    fontWeight: 600,
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    overflowY: "auto",
    minHeight: 0,
  },
  empty: {
    padding: theme.spacing(3, 2),
    textAlign: "center",
  },
  footer: {
    padding: theme.spacing(1, 1.5),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
}));

interface HistoryTabProps {
  conversations: LibreChatConversation[];
  activeConversationId: string | null;
  onBack: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
}

/** In-panel history view, mirroring the Settings tab pattern. */
export function HistoryTab({
  conversations,
  activeConversationId,
  onBack,
  onSelect,
  onDelete,
  onDeleteAll,
}: HistoryTabProps) {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <IconButton size="small" onClick={onBack} title="Back to chat">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography className={classes.headerTitle}>Chat history</Typography>
      </div>

      <div className={classes.content}>
        {conversations.length === 0 ? (
          <Typography
            className={classes.empty}
            variant="body2"
            color="textSecondary"
          >
            No saved conversations
          </Typography>
        ) : (
          <List dense disablePadding>
            {conversations.map((conversation, idx) => (
              <div key={conversation.id}>
                {idx > 0 && <Divider component="li" />}
                <ListItem
                  button
                  selected={conversation.id === activeConversationId}
                  onClick={() => onSelect(conversation.id)}
                >
                  <ListItemText
                    primary={conversation.title}
                    secondary={new Date(
                      conversation.updatedAt,
                    ).toLocaleString()}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      edge="end"
                      title={`Delete ${conversation.title}`}
                      aria-label={`Delete ${conversation.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(conversation.id);
                      }}
                    >
                      <DeleteSweepIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </div>
            ))}
          </List>
        )}
      </div>

      <div className={classes.footer}>
        <Button
          size="small"
          color="secondary"
          disabled={conversations.length === 0}
          onClick={onDeleteAll}
        >
          Delete all history
        </Button>
      </div>
    </div>
  );
}
