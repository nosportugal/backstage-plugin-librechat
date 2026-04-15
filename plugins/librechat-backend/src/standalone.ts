import {createBackend} from "@backstage/backend-defaults";
import libreChatBackend from "./index";

const backend = createBackend();
backend.add(libreChatBackend);
backend.start();
