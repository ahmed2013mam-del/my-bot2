const {
  Client,
  GatewayIntentBits,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const express = require("express");
const fs = require("fs");

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

// ================= PERSISTENT ADMINS =================
const ADMIN_FILE = "./admins.json";

function loadAdmins() {
  if (!fs.existsSync(ADMIN_FILE)) return {};
  return JSON.parse(fs.readFileSync(ADMIN_FILE, "utf8"));
}

function saveAdmins(data) {
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(data, null, 2));
}

let guildAdmins = loadAdmins();

// ================= HELPERS =================
function isOwner(message) {
  return message.author.id === OWNER_ID;
}

function isAdmin(message) {
  const admins = guildAdmins[message.guild.id];
  return admins?.includes(message.author.id);
}

function canUse(message) {
  return message.guild.ownerId === message.author.id || isAdmin(message);
}

function getMe(guild) {
  return guild.members.me || guild.members.cache.get(client.user.id);
}

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= LOG JOIN =================
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
      { name: "ID", value: guild.id, inline: true }
    )
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => {});
});

// ================= LOG LEAVE =================
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

  // ================= BLOCK STATES =================
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
        { name: "🛡️ Moderation", value: "`ban` `kick`" },
        { name: "📢 Broadcast", value: "`bc`" },
        { name: "🏗️ Create", value: "`cch` `cct` `cct-ch`" },
        { name: "🎨 Roles", value: "`crl` `crlmulti`" },
        { name: "⚙️ Server", value: "`chname` `chphoto`" },
        { name: "👑 Admin", value: "`addadmin` `rmvadmin`" }
      );

    if (isControl) {
      embed.addFields({
        name: "👑 Control",
        value: "`offbot` `hardware` `ramoff` `lvserver`"
      });
    }

    return message.channel.send({ embeds: [embed] });
  }

  // ================= ADMIN ADD =================
  if (cmd === "addadmin") {
    if (!isOwner(message))
      return message.reply("❌ للأونر فقط");

    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ منشن شخص");

    if (!guildAdmins[message.guild.id])
      guildAdmins[message.guild.id] = [];

    if (!guildAdmins[message.guild.id].includes(user.id))
      guildAdmins[message.guild.id].push(user.id);

    saveAdmins(guildAdmins);

    return message.reply(`✅ Added Admin: ${user.tag}`);
  }

  // ================= ADMIN REMOVE =================
  if (cmd === "rmvadmin") {
    if (!isOwner(message))
      return message.reply("❌ للأونر فقط");

    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ منشن شخص");

    guildAdmins[message.guild.id] =
      (guildAdmins[message.guild.id] || []).filter(id => id !== user.id);

    saveAdmins(guildAdmins);

    return message.reply(`❌ Removed Admin: ${user.tag}`);
  }

  // ================= PERMISSION CHECK =================
  if (!canUse(message))
    return message.reply("❌ لا تملك صلاحية");

  // ================= KICK =================
  if (cmd === "kick") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("منشن شخص");
    if (!user.kickable) return message.reply("❌ لا يمكن طرده");

    await user.kick();
    return message.reply("👢 تم الطرد");
  }

  // ================= BAN =================
  if (cmd === "ban") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("منشن شخص");
    if (!user.bannable) return message.reply("❌ لا يمكن حظره");

    await user.ban();
    return message.reply("🔨 تم الحظر");
  }

  // ================= BC =================
  if (cmd === "bc") {
    const text = args.join(" ");
    if (!text) return message.reply("اكتب رسالة");

    message.guild.members.cache.forEach(m => {
      if (!m.user.bot) m.send(text).catch(() => {});
    });

    return message.reply("📢 تم الإرسال");
  }

  // ================= CRL =================
  if (cmd === "crl") {
    const color = args[0];
    const name = args.slice(1).join(" ");

    if (!color || !name)
      return message.reply("!crl red المؤسس");

    const role = await message.guild.roles.create({
      name,
      color: color.toUpperCase()
    });

    return message.reply(`✅ Role Created: ${role.name}`);
  }

  // ================= CRLMULTI =================
  if (cmd === "crlmulti") {
    const count = parseInt(args[0]);
    const name = args.slice(1).join(" ");

    if (!count || !name)
      return message.reply("!crlmulti 5 Staff");

    for (let i = 1; i <= count; i++) {
      await message.guild.roles.create({
        name: `${name} ${i}`
      });
    }

    return message.reply("✅ Done");
  }

  // ================= CHNAME =================
  if (cmd === "chname") {
    const name = args.join(" ");
    if (!name) return message.reply("اكتب اسم");

    await message.guild.setName(name);
    return message.reply("✅ Changed");
  }

  // ================= CHPHOTO =================
  if (cmd === "chphoto") {
    const url = args[0];
    if (!url) return message.reply("ضع رابط الصورة");

    await message.guild.setIcon(url);
    return message.reply("✅ Changed Icon");
  }

  // ================= OFFBOT =================
  if (cmd === "offbot") {
    if (!isOwner(message))
      return message.reply("❌ فقط المالك");

    botState = "off";
    return message.reply("⛔ Stopped");
  }

  // ================= HARDWARE =================
  if (cmd === "hardware") {
    if (!isOwner(message))
      return message.reply("❌ فقط المالك");

    botState = "maintenance";
    return message.reply("🛠️ Maintenance");
  }

  // ================= RAMOFF =================
  if (cmd === "ramoff") {
    if (!isOwner(message))
      return message.reply("❌ فقط المالك");

    botState = "off";
    return message.reply("🔴 Shutdown");
  }

  // ================= LVSERVER =================
  if (cmd === "lvserver") {
    if (!isOwner(message))
      return message.reply("❌ فقط المالك");

    const id = args[0];
    const guild = client.guilds.cache.get(id);
    if (!guild) return message.reply("❌ Not found");

    await guild.leave();
    return message.reply("🚪 Left Server");
  }
});

client.login(process.env.TOKEN);
