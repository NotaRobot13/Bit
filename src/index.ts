import { Client, Collection, GatewayIntentBits } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";
import boot from "./services/boot";
import { log } from "./services/logger";
import { Sequelize } from "sequelize";
import Cache from "./cache/Cache";
import SQLite from "sqlite3";
dotenv.config();

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ],
});

const environment = boot.environment();
const dbUrl =
  environment == "development"
    ? process.env.DATABASE_URL_DEV
    : process.env.DATABASE_URL_PROD;
const dbUser =
  environment == "development"
    ? process.env.DATABASE_USER_DEV
    : process.env.DATABASE_USER_PROD;
const dbPw =
  environment == "development"
    ? process.env.DATABASE_PW_DEV
    : process.env.DATABASE_PW_PROD;

const db = new Sequelize(dbUrl as string, {
  username: dbUser,
  password: dbPw,
  dialect: "mysql",
  ssl: true,
  logging: log.info.bind(log),
  dialectOptions: {
    ssl: {
      require: true,
    },
    multipleStatements: true,
  },
});

const cache = new Sequelize({
  dialect: "sqlite",
  storage: path.join(__dirname, "..", "cache.sqlite"),
  logging: log.info.bind(log),
  dialectOptions: {
    mode: SQLite.OPEN_READWRITE | SQLite.OPEN_CREATE | SQLite.OPEN_FULLMUTEX,
  },
});

boot.init();

/* Command Handling */

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
// eslint-disable-next-line security/detect-non-literal-fs-filename
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  // eslint-disable-next-line @typescript-eslint/no-var-requires, security/detect-non-literal-require
  const command = require(filePath);
  client.commands.set(command.data?.name, command);
}

/* Event Handling */

const eventsPath = path.join(__dirname, "events");
// eslint-disable-next-line security/detect-non-literal-fs-filename
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  // eslint-disable-next-line @typescript-eslint/no-var-requires, security/detect-non-literal-require
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

/* Text Command Handling */

client.textCommands = new Collection();
const tcpath = path.join(__dirname, "textCommands");
const textCommandFiles = fs
  .readdirSync(tcpath)
  .filter((file) => file.endsWith(".js"));
for (const file of textCommandFiles) {
  const filePath = path.join(tcpath, file);
  const command = require(filePath);
  client.textCommands.set(command.name, command);
}

/* Button Handling */

client.buttons = new Collection();
const buttonPath = path.join(__dirname, "buttons");
const buttonFiles = fs
  .readdirSync(buttonPath)
  .filter((file) => file.endsWith(".js"));
for (const file of buttonFiles) {
  const filePath = path.join(buttonPath, file);
  const button = require(filePath);
  client.buttons.set(button.name, button);
}
/* Menu Handling */

client.menus = new Collection();
const menuPath = path.join(__dirname, "menus");
const menuFiles = fs
  .readdirSync(menuPath)
  .filter((file) => file.endsWith(".js"));
for (const file of menuFiles) {
  const filePath = path.join(menuPath, file);
  const menu = require(filePath);
  client.menus.set(menu.name, menu);
}

declare module "discord.js" {
  export interface Client {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commands: Collection<string, any>;
    textCommands: Collection<string, any>;
    buttons: Collection<string, any>;
    menus: Collection<string, any>;
  }
}

db.authenticate()
  .then(async () => {
    log.info("Database connected.");
    cache
      .authenticate()
      .then(async () => {
        log.info("Cache configured.");
      })
      .catch((err: Error) => {
        log.fatal(`Cache could not be configured: ${err.message}`);
        process.exit(1);
      });
  })
  .catch((err: Error) => {
    log.fatal(`Database could not authenticate: ${err.message}`);
    process.exit(1);
  });

client.login(process.env.DISCORD_TOKEN).then(async () => {
  log.info(`Connected as ${client.user?.tag}.`);
});

export { db, cache };
