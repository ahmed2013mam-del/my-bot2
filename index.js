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

// ================= OWNER CHECK =================
function isOwner(message) {
  return message.author.id === OWNER_ID;
}

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= GUILD LOG (JOIN) =================
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

// ================= GUILD LOG (LEAVE) =================
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
      )
      .setFooter({ text: "NexusCore System" });

    if (isControl) {
      embed.addFields({
        name: "👑 Owner Control",
        value: "`offbot` `hardware` `ramoff` `lvserver`"
      });
    }

    return message.channel.send({ embeds: [embed] });
  }

  // ================= OWNER COMMANDS =================
  if (cmd === "offbot") {
    if (!isControl) return message.reply("❌ فقط سيرفر التحكم");
    if (!isOwner(message)) return message.reply("❌ لمالك البوت فقط");

    botState = "off";
    return message.reply("⛔ تم إيقاف البوت");
  }

  if (cmd === "hardware") {
    if (!isControl) return message.reply("❌ فقط سيرفر التحكم");
    if (!isOwner(message)) return message.reply("❌ لمالك البوت فقط");

    botState = "maintenance";
    return message.reply("🛠️ وضع الصيانة مفعل");
  }

  if (cmd === "ramoff") {
    if (!isControl) return message.reply("❌ فقط سيرفر التحكم");
    if (!isOwner(message)) return message.reply("❌ لمالك البوت فقط");

    const embed = new EmbedBuilder()
      .setTitle("🔴 Nexus Shutdown")
      .setColor(0xff0000)
      .setDescription("تم إيقاف البوت نهائياً")
      .setTimestamp();

    let sent = 0;

    for (const guild of client.guilds.cache.values()) {
      const channel =
        guild.systemChannel ||
        guild.channels.cache.find(c =>
          c.type === ChannelType.GuildText &&
          c.permissionsFor(guild.members.me)?.has("SendMessages")
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

    return message.reply(`🔴 تم الإرسال إلى ${sent} سيرفر`);
  }

  if (cmd === "lvserver") {
    if (!isOwner(message))
      return message.reply("❌ لمالك البوت فقط");

    const id = args[0];
    if (!id) return message.reply("❌ ضع ID السيرفر");

    const guild = client.guilds.cache.get(id);
    if (!guild) return message.reply("❌ غير موجود");

    await guild.leave();
    return message.reply("✅ تم الخروج");
  }

  // ================= BASIC =================
  if (botState === "off")
    return message.reply("⛔ البوت متوقف");

  if (cmd === "ban") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("منشن شخص");
    if (!user.bannable) return message.reply("❌ ممنوع");

    await user.ban();
    return message.reply("🔨 تم الحظر");
  }

  if (cmd === "kick") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("منشن شخص");

    await user.kick();
    return message.reply("👢 تم الطرد");
  }

  if (cmd === "bc") {
    const text = args.join(" ");
    if (!text) return message.reply("اكتب رسالة");

    message.guild.members.cache.forEach(m => {
      if (!m.user.bot) m.send(text).catch(() => {});
    });

    return message.reply("📢 تم الإرسال");
  }

  if (cmd === "cch") {
    const name = args.join("-");
    await message.guild.channels.create({ name, type: ChannelType.GuildText });
    return message.reply("تم إنشاء روم");
  }

  if (cmd === "cct") {
    const name = args.join(" ");
    await message.guild.channels.create({ name, type: ChannelType.GuildCategory });
    return message.reply("تم إنشاء كاتيجوري");
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

    return message.reply("تم إنشاء كامل");
  }
});

client.login(process.env.TOKEN);
