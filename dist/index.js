// index.js
import "dotenv/config";
import * as config from "./config.js";
import { Client, GatewayIntentBits } from "discord.js";
import { Sern, makeDependencies } from "@sern/handler";
import { Publisher } from "@sern/publisher";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Make sure this is enabled for text commands!
  ],
});

await makeDependencies(({ add }) => {
  add("@sern/client", client);
  add(
    "publisher",
    (deps) =>
      new Publisher(
        deps["@sern/modules"],
        deps["@sern/emitter"],
        deps["@sern/logger"]
      )
  );
});

Sern.init(config);
client.login();

export { client };