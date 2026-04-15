import {createBackend} from "@backstage/backend-defaults";
import libreChatBackend from "../src";

const backend = createBackend();
backend.add(libreChatBackend);
backend.start();
