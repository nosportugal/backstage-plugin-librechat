// eslint-disable-next-line @backstage/no-undeclared-imports
import {createBackend} from "@backstage/backend-defaults";
import libreChatBackend from "./index";

const backend = createBackend();
backend.add(libreChatBackend);
backend.start();
