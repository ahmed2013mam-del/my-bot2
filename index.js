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

const CONTROL_GUILD = "1521376881746907177";
const OWNER_ID = "1087144363219484683";

let botState = "online";

const guildAdmins = new Map();

// ================= OWNER CHECK =================
function isOwner(message) {
  return message.author.id === OWNER_ID;
}

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  const statuses = [
    "NexusCore System",
    "Watching Servers",
    "Created by Row Studio"
  ];

  let i = 0;

  setInterval(() => {
    client.user.setPresence({
      activities: [{ name: statuses[i], type: 3 }],
      status: botState === "off" ? "invisible" : "dnd"
    });

    i = (i + 1) % statuses.length;
  }, 10000);
});

// ================= MESSAGE =================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const prefix = prefixes.find(p => message.content.startsWith(p));
  if (!prefix) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const isControl = message.guild.id === CONTROL_GUILD;

  // ================= HELP =================
  if (cmd === "help") {
    const embed = new EmbedBuilder()
      .setTitle("📖 NexusCore Control Panel")
      .setColor(0x2b2d31)
      .setDescription("Developed by Row Studios")
      .addFields(
        { name: "🛡️ Moderation", value: "`ban` `kick`" },
        { name: "📢 Broadcast", value: "`bc`" },
        { name: "🏗️ Create", value: "`cch` `cct` `cct-ch`" }
      );

    if (isControl) {
      embed.addFields({
        name: "👑 Owner Control",
        value: "`offbot` `hardware` `ramoff` `lvserver`"
      });
    }

    return message.channel.send({ embeds: [embed] });
  }

  // ================= OFFBOT =================
  if (cmd === "offbot") {
    if (!isControl) return message.reply("❌ فقط في سيرفر التحكم");
    if (!isOwner(message)) return message.reply("❌ لمالك البوت فقط");

    botState = "off";
    return message.reply("⛔ تم إيقاف البوت");
  }

  // ================= HARDWARE =================
  if (cmd === "hardware") {
    if (!isControl) return message.reply("❌ فقط في سيرفر التحكم");
    if (!isOwner(message)) return message.reply("❌ لمالك البوت فقط");

    botState = "maintenance";
    return message.reply("🛠️ وضع الصيانة مفعل");
  }

  // ================= RAMOFF (FANCY SHUTDOWN) =================
  if (cmd === "ramoff") {
    if (!isControl) return message.reply("❌ فقط في سيرفر التحكم");
    if (!isOwner(message)) return message.reply("❌ لمالك البوت فقط");

    const embed = new EmbedBuilder()
      .setTitle("🔴 NEXUS CORE SHUTDOWN")
      .setColor(0xff0000)
      .setDescription(
        "📢 اعلان رسمي\n\n" +
        "تم إنهاء سلسلة Nexus Series بشكل نهائي.\n" +
        "تم إيقاف البوت من جميع الأنظمة.\n\n" +
        "🙏 شكراً لكم"
      )
      .setFooter({ text: "Row Studio • NexusCore Final" })
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
      }, sent * 1500);

      sent++;
    }

    setTimeout(() => {
      botState = "off";
    }, sent * 1600);

    return message.reply(`🔴 تم الإرسال إلى ${sent} سيرفر`);
  }

  // ================= LVSERVER =================
  if (cmd === "lvserver") {
    if (!isOwner(message))
      return message.reply("❌ هذا الأمر لمالك البوت فقط");

    const id = args[0];
    if (!id) return message.reply("❌ استخدم: !lvserver <id>");

    const guild = client.guilds.cache.get(id);
    if (!guild) return message.reply("❌ البوت غير موجود في السيرفر");

    await guild.leave();
    return message.reply("✅ تم الخروج من السيرفر");
  }

  // ================= BLOCK =================
  if (botState === "off") {
    return message.reply("⛔ البوت متوقف حالياً");
  }

  // ================= BASIC =================
  if (cmd === "bc") {
    const text = args.join(" ");
    if (!text) return message.reply("اكتب رسالة");

    message.guild.members.cache.forEach(m => {
      if (!m.user.bot) m.send(text).catch(() => {});
    });

    return message.reply("📢 تم الإرسال");
  }

  if (cmd === "ban") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("منشن شخص");
    if (!user.bannable) return message.reply("❌ لا يمكن حظره");

    await user.ban();
    return message.reply("🔨 تم الحظر");
  }

  if (cmd === "kick") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("منشن شخص");
    if (!user.kickable) return message.reply("❌ لا يمكن طرده");

    await user.kick();
    return message.reply("👢 تم الطرد");
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

    return message.reply("تم إنشاء كاتيجوري + روم");
  }
});

client.login(process.env.TOKEN);
    
