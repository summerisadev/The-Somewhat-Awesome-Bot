import { Client as SClient } from "statcord.js";
import {
  Client,
  Message,
  TextChannel,
  PermissionsBitField
} from "discord.js";
import { config } from "../../data/config";
import { createSimpleLogger } from "simple-node-logger";
import { checkForOwner } from "../Utils";
import { EmbedBuilder } from "@discordjs/builders";
import fs from "fs";
// @ts-ignore
import { AsciiTable3, AlignmentEnum } from "ascii-table3";

// Node logger
const log = createSimpleLogger("./data/mcb.log");

// Automatic command importer
const commandArray: Array<string> = [];
const commandDir: string = `${process.cwd()}/src/commands/`;

fs.readdirSync(commandDir).forEach(file => {
  file = file.replace(/\..+$/, '');
  file = file.toLowerCase();
  if (file.startsWith('temp')) return;
  commandArray.push(file);
  log.info(`Imported Command: ${file}`);
})

const table = new AsciiTable3('Commands')
    .setHeading('Name', 'Description', 'MinArgs', 'MaxArgs')
    .setStyle('unicode-single')

for (let i=0;i<commandArray.length;i++) {
  const cmdToImport = require(`${commandDir}${commandArray[i]}`);
  console.log()
  table.addRow(`${cmdToImport.name}`, cmdToImport.description, cmdToImport.minArgs, cmdToImport.maxArgs)
}

console.log(table.toString());

export default (client: Client, statcord: SClient): void => {
  // @ts-ignore
  client.on("messageCreate", async (msg: Message) => {
    if (!msg.content.startsWith(config.discord.botPrefix) || msg.author.bot)
      return;

    const args = msg.content
      .slice(config.discord.botPrefix.length)
      .trim()
      .split(/ +/);
    const command = args.shift()?.toLowerCase() as string;

    if (commandArray.includes(command)) {
      msg.channel.sendTyping();

      const commandToRun = require(`${commandDir}${command}`);
      if (commandToRun.isOwner || !commandToRun.isOwner === undefined) {
        if (config.discord.botOwners.includes(msg.author.id)) {
          commandToRun.execute(msg, args, client);
          return statcord.postCommand(command, msg.author.id);
        } else {
          return msg.reply(config.responses.noPermission);
        }
      }

      if(commandToRun.requiredPermissions || !commandToRun.requiredPermissions === undefined) {
        if (config.discord.botOwners.includes(msg.author.id)) {
          commandToRun.execute(msg, args, client);
          return statcord.postCommand(command, msg.author.id);
        }
        const member = client.guilds.cache.get(msg.guild!.id)!.members.cache.get(msg.author.id)
        for(let i=0; i<commandToRun.requiredPermissions.length; i++) {
          if (!member!.permissions.has(`${commandToRun.requiredPermissions[i]}`)) return msg.reply(config.responses.noPermission);
        }

        log.info('Special command run!')
        commandToRun.execute(msg, args, client);
        return statcord.postCommand(command, msg.author.id);
      } else {
        commandToRun.execute(msg, args, client);
        return statcord.postCommand(command, msg.author.id);
      }
    } else if (command === "manstatpost") {
      if (checkForOwner(msg.author.id)) return;
      console.log("beans");
      await statcord.post();
    } else {
      await msg.reply('Sorry! Command was not found. Please open a ticket if this is incorrect.')
    }
  });

  client.on("messageCreate", async (msg: Message) => {
    // @ts-expect-error
    if (msg.channel.name.startsWith("ticket-")) {
      const msgArray = msg.content.split(" ");
      for (let i = 0; i < msgArray.length; i++) {
        if (
          msgArray[i] === "automod" ||
          msgArray[i] === "automod," ||
          msgArray[i] === "Automod" ||
          msgArray[i] === "Automod," ||
          msgArray[i] === "AutoMod" ||
          msgArray[i] === "AutoMod,"
        ) {
          const logChannel = msg.guild?.channels.cache.find(
            (c) => c.id === config.discord.logChannel
          ) as TextChannel;
          const embed = new EmbedBuilder()
            .setTitle("AutoMod Ticket Detection")
            .setDescription(
              `Mention of AutoMod has been detected in <#${msg.channel.id}>.`
            )
            .setFooter({ text: "This is a automated notification." })
            .setTimestamp();

          await logChannel.send({
            content: "<@701561771529470074>",
            embeds: [embed],
          });
        }
      }
    }
  });
};
