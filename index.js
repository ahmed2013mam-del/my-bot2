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

// ================= DATABASE (IN MEMORY) =================
const guildAdmins = new Map();

// ================= SAFE HELPERS =================
function isOwner(message) {
  return message.author.id === OWNER_ID;
}

function getMe(guild) {
  return guild.members.me || guild.members.cache.get(client.user.id);
}

function isAdmin(message) {
  const admins = guildAdmins.get(message.guild.id);
  return admins?.has(message.author.id);
}

function canUse(message) {
  return message.guild.ownerId === message.author.id || isAdmin(message);
}

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= GUILD LOG JOIN =================
client.on("guildCreate", async (guild) => {
  const logGuild = client.guilds.cache.get(CONTROL_GUILD_ID);
  if (!logGuild) return;

  const me = getMe(logGuild);
  if (!me) return;

  const channel =
    logGuild.systemChannel ||
    logGuild.channels.cache.find(c =>
      c.type === ChannelType.GuildText &&
      c.permissionsFor(me)?.has("SendMessages")
    );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("📥 Joined Server")
    .setColor(0x00ff99)
    .addFields(
      { name: "Name", value: guild.name, inline: true },
      { name: "ID", value: guild.id, inline: true },
      { name: "Members", value: `${guild.memberCount}`, inline: true }
    )
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => {});
});

// ================= GUILD LOG LEAVE =================
client.on("guildDelete", async (guild) => {
  const logGuild = client.guilds.cache.get(CONTROL_GUILD_ID);
  if (!logGuild) return;

  const me = getMe(logGuild);
  if (!me) return;

  const channel =
    logGuild.systemChannel ||
    logGuild.channels.cache.find(c =>
      c.type === ChannelType.GuildText &&
      c.permissionsFor(me)?.has("SendMessages")
    );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("📤 Left Server")
    .setColor(0xff0000)
    .addFields(
      { name: "Name", value: guild.name, inline: true },
      { name: "ID", value: guild.id, inline: true }
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

  const isControl = message.guild.id === CONTROL_GUILD_ID;

  // ================= MAINTENANCE / OFF CHECK =================
  if (botState === "off" && !isOwner(message))
    return message.reply("⛔ البوت متوقف");

  if (botState === "maintenance" && !isOwner(message))
    return message.reply("🛠️ البوت في صيانة");

  // ================= HELP =================
  if (cmd === "help") {
    const embed = new EmbedBuilder()
      .setTitle("📖 NexusCore Help")
      .setColor(0x2b2d31)
      .setDescription("Developed by Row Studio")
      .addFields(
        { name: "🛡️ Moderation", value: "`ban` `kick`", inline: true },
        { name: "📢 Broadcast", value: "`bc`", inline: true },
        { name: "🏗️ Create", value: "`cch` `cct` `cct-ch`", inline: false }
      );

    if (isControl) {
      embed.addFields({
        name: "👑 Control Panel",
        value: "`offbot` `hardware` `ramoff` `lvserver` `addadmin` `rmvadmin`"
      });
    }

    return message.channel.send({ embeds: [embed] });
  }

  // ================= ADD ADMIN =================
  if (cmd === "addadmin") {
    if (!isOwner(message))
      return message.reply("❌ للأونر فقط");

    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ منشن شخص");

    if (!guildAdmins.has(message.guild.id))
      guildAdmins.set(message.guild.id, new Set());

    guildAdmins.get(message.guild.id).add(user.id);

    return message.reply(`✅ Admin Added: ${user.tag}`);
  }

  // ================= REMOVE ADMIN =================
  if (cmd === "rmvadmin") {
    if (!isOwner(message))
      return message.reply("❌ للأونر فقط");

    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ منشن شخص");

    guildAdmins.get(message.guild.id)?.delete(user.id);

    return message.reply(`❌ Admin Removed: ${user.tag}`);
  }

  // ================= OWNER COMMANDS ONLY =================
  if (["offbot", "hardware", "ramoff", "lvserver"].includes(cmd)) {
    if (!isOwner(message))
      return message.reply("❌ هذا الأمر للمالك فقط");
  }

  // ================= OFFBOT =================
  if (cmd === "offbot") {
    botState = "off";
    return message.reply("⛔ Bot Stopped");
  }

  // ================= HARDWARE =================
  if (cmd === "hardware") {
    botState = "maintenance";
    return message.reply("🛠️ Maintenance Mode");
  }

  // ================= RAMOFF =================
  if (cmd === "ramoff") {
    const embed = new EmbedBuilder()
      .setTitle("🔴 Nexus Shutdown")
      .setColor(0xff0000)
      .setDescription("System shutdown initiated")
      .setTimestamp();

    let sent = 0;

    for (const guild of client.guilds.cache.values()) {
      const me = getMe(guild);
      if (!me) continue;

      const channel =
        guild.systemChannel ||
        guild.channels.cache.find(c =>
          c.type === ChannelType.GuildText &&
          c.permissionsFor(me)?.has("SendMessages")
        );

      if (!channel) continue;

      setTimeout(() => {
        channel.send({ embeds: [embed] }).catch(() => {});
      }, sent * 1200);

      sent++;
    }

    setTimeout(() => {
      botState = "off";
    }, sent * 1300);

    return message.reply(`🔴 Sent to ${sent} servers`);
  }

  // ================= LEAVE SERVER =================
  if (cmd === "lvserver") {
    const id = args[0];
    if (!id) return message.reply("❌ Provide Server ID");

    const guild = client.guilds.cache.get(id);
    if (!guild) return message.reply("❌ Not Found");

    await guild.leave();
    return message.reply("✅ Left Server");
  }

  // ================= NORMAL PERMISSION =================
  if (!canUse(message))
    return message.reply("❌ No permission");

  // ================= BASIC COMMANDS =================
  if (cmd === "kick") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention user");
    if (!user.kickable) return message.reply("❌ Can't kick");

    await user.kick();
    return message.reply("👢 Kicked");
  }

  if (cmd === "ban") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention user");
    if (!user.bannable) return message.reply("❌ Can't ban");

    await user.ban();
    return message.reply("🔨 Banned");
  }

  if (cmd === "bc") {
    const text = args.join(" ");
    if (!text) return message.reply("Write message");

    message.guild.members.cache.forEach(m => {
      if (!m.user.bot) m.send(text).catch(() => {});
    });

    return message.reply("📢 Sent");
  }

  if (cmd === "cch") {
    const name = args.join("-");
    await message.guild.channels.create({ name, type: ChannelType.GuildText });
    return message.reply("Created");
  }

  if (cmd === "cct") {
    const name = args.join(" ");
    await message.guild.channels.create({ name, type: ChannelType.GuildCategory });
    return message.reply("Created");
  }

  if (cmd === "cct-ch") {
    const [cat, room] = args.join(" ").split("|");

    const category = await message.guild.channels.create({
      name: cat || "category",
      type: ChannelType.GuildCategory
    });

    await message.guild.channels.create({
      name: (room || "room").toLowerCase(),
      type: ChannelType.GuildText,
      parent: category.id
    });

    return message.reply("Done");
  }
});

client.login(process.env.TOKEN);
