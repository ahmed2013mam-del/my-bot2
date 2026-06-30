const {
  Client,
  GatewayIntentBits,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("NexusCore Online"));
app.listen(process.env.PORT || 3000);

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= CONFIG =================
const prefixes = ["!", "?"];

const CONTROL_GUILD_ID = "1521376881746907177";
const OWNER_ID = "1087144363219484683";

let botState = "online";

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= HELP FUNCTION =================
function isOwner(message) {
  return message.author.id === OWNER_ID;
}

// ================= LOG GUILD JOIN =================
client.on("guildCreate", async (guild) => {

  const logGuild = client.guilds.cache.get(CONTROL_GUILD_ID);
  if (!logGuild) return;

  const channel =
    logGuild.systemChannel ||
    logGuild.channels.cache.find(c =>
      c.type === ChannelType.GuildText &&
      c.permissionsFor(logGuild.members.me)?.has("SendMessages")
    );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("📥 Joined New Server")
    .setColor(0x00ff99)
    .addFields(
      { name: "🏷️ Server Name", value: guild.name, inline: true },
      { name: "🆔 Server ID", value: guild.id, inline: true },
      { name: "👥 Members", value: `${guild.memberCount}`, inline: true }
    )
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => {});
});

// ================= LOG GUILD LEAVE =================
client.on("guildDelete", async (guild) => {

  const logGuild = client.guilds.cache.get(CONTROL_GUILD_ID);
  if (!logGuild) return;

  const channel =
    logGuild.systemChannel ||
    logGuild.channels.cache.find(c =>
      c.type === ChannelType.GuildText &&
      c.permissionsFor(logGuild.members.me)?.has("SendMessages")
    );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("📤 Left Server")
    .setColor(0xff0000)
    .addFields(
      { name: "🏷️ Server Name", value: guild.name, inline: true },
      { name: "🆔 Server ID", value: guild.id, inline: true }
    )
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => {});
});

// ================= MESSAGE =================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const prefix = prefixes.find(p => message.content.startsWith(p));
  if (!prefix) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (cmd === "help") {
    const embed = new EmbedBuilder()
      .setTitle("📖 NexusCore Help")
      .setColor(0x2b2d31)
      .setDescription("Developed by Row Studio");

    return message.channel.send({ embeds: [embed] });
  }

  // مثال حماية
  if (cmd === "ramoff") {
    if (!isOwner(message))
      return message.reply("❌ هذا الأمر لمالك البوت فقط");

    botState = "off";
    return message.reply("🔴 تم إيقاف البوت");
  }
});

client.login(process.env.TOKEN);
