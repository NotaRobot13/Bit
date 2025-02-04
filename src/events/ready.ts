import { bgMagentaBright } from "colorette";
import { Client } from "discord.js";
import boot from "../services/boot";
import { log } from "../services/logger";
import Cache from "../cache/Cache";

module.exports = {
  name: "ready",
  once: true,
  async execute(client: Client) {
    const environment = boot.environment();

    log.info(
      `Client ready with ${client.users.cache.size} users across ${
        client.guilds.cache.size
      } guilds in ${bgMagentaBright(environment)} mode.`
    );

    await Cache.reset().then(async () => {
      await Cache.sync().then((dur) =>
        log.info(`SQLite Cache synchronized in ${dur}.`)
      );
    });
  },
};
