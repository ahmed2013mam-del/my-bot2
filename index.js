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
// online | off | maintenance | ramoff

const guildAdmins = new Map();

// ================= STATUS =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  const statuses = [
    "Created by Row Studio",
    "NexusCore System",
    "Watching Servers"
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

// ================= PERMISSION =================
function isAuthorized(message) {
  if (!message.guild) return false;
  if (message.guild.ownerId === message.author.id) return true;

  const admins = guildAdmins.get(message.guild.id);
  return admins?.has(message.author.id);
}

function noPerm(message) {
  return message.reply("❌ ليس لديك صلاحية");
}

// ================= MESSAGE =================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const prefix = prefixes.find(p => message.content.startsWith(p));
  if (!prefix) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ❌ لو البوت في صيانة
  if (botState === "maintenance") {
    return message.reply("🛠️ البوت في صيانة حالياً");
  }

  // ================= HELP =================
if (cmd === "help") {
  const embed = new EmbedBuilder()
    .setTitle("📖 NexusCore Control Panel")
    .setDescription("### Developed by Row Studios")
    .setColor(0x2b2d31)
    .addFields(
      { name: "🛡️ Moderation", value: "`ban` `kick`", inline: true },
      { name: "📢 Broadcast", value: "`bc`", inline: true },
      { name: "🏗️ Create", value: "`cch` `cct` `cct-ch`", inline: false }
    )
    .setFooter({ text: "Nexus System" })
    .setTimestamp();

  // أوامر التحكم تظهر فقط في سيرفر التحكم
  if (message.guild.id === CONTROL_GUILD) {
    embed.addFields({
      name: "👑 Owner Control",
      value: "`LvServer`\n`offbot`\n`Hardware`\n`Ramoff`",
      inline: false
    });
  }

  return message.channel.send({ embeds: [embed] });
}

  // ================= CONTROL ONLY SERVER =================
  const isControl = message.guild.id === CONTROL_GUILD;

  // ================= OFFBOT =================
if (cmd === "offbot") {

  // يعمل فقط في سيرفر التحكم
  if (!isControl)
    return message.reply("❌ هذا الأمر يعمل فقط في سيرفر التحكم.");

  // لا يستطيع استخدامه إلا مالك البوت
  if (message.author.id !== OWNER_ID)
    return message.reply("❌ هذا الأمر مخصص لمالك البوت فقط.");

  botState = "off";

  return message.reply(
    "✅ تم تفعيل وضع BlackList.\n\n❌ لا يمكنك استخدام الصلاحيات، السيرفر بلاك ليست."
  );
}

  // ================= HARDWARE =================
  if (cmd === "hardware") {
    if (!isControl)
      return message.reply("❌ لا يمكنك استخدام الصلاحيات , السيرفر بلاك ليست");

    botState = "maintenance";
    return message.reply("🛠️ البوت في صيانه");
  }

  // ================= RAMOFF =================
  if (cmd === "ramoff") {
    if (!isControl)
      return message.reply("❌ لا يمكنك استخدام الصلاحيات , السيرفر بلاك ليست");

    botState = "ramoff";
    return message.reply("⛔ تم اطفاء البوت رسمياً");
  }

  // ================= LVSERVER =================
  if (cmd === "lvserver") {
    if (!isControl)
      return message.reply("❌ هذا السيرفر ليس سيرفر التحكم");

    await message.guild.leave();
    return;
  }

  // ================= BLOCK IF OFF =================
  if (botState === "off") {
    return message.reply("⛔ البوت متوقف حالياً");
  }

  // ================= NORMAL PERMISSION =================
  if (!isAuthorized(message)) return noPerm(message);

  // ================= BAN =================
  if (cmd === "ban") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("منشن شخص");
    if (!user.bannable) return message.reply("❌ لا يمكن حظره");

    await user.ban();
    return message.reply("🔨 تم الحظر");
  }

  // ================= KICK =================
  if (cmd === "kick") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("منشن شخص");
    if (!user.kickable) return message.reply("❌ لا يمكن طرده");

    await user.kick();
    return message.reply("👢 تم الطرد");
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

  // ================= CREATE CHANNEL =================
  if (cmd === "cch") {
    const name = args.join("-");
    if (!name) return message.reply("اكتب اسم");

    await message.guild.channels.create({
      name,
      type: ChannelType.GuildText
    });

    return message.reply("✅ تم إنشاء روم");
  }

  // ================= CREATE CATEGORY =================
  if (cmd === "cct") {
    const name = args.join(" ");
    if (!name) return message.reply("اكتب اسم");

    await message.guild.channels.create({
      name,
      type: ChannelType.GuildCategory
    });

    return message.reply("📁 تم إنشاء كاتاجوري");
  }

  // ================= CAT + ROOM =================
  if (cmd === "cct-ch") {
    const input = args.join(" ");
    const [cat, room] = input.split("|");

    const category = await message.guild.channels.create({
      name: cat || "category",
      type: ChannelType.GuildCategory
    });

    await message.guild.channels.create({
      name: (room || "room").toLowerCase(),
      type: ChannelType.GuildText,
      parent: category.id
    });

    return message.reply("✅ تم إنشاء كاتاجوري + روم");
  }
});

client.login(process.env.TOKEN);
