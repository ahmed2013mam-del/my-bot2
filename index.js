const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot is alive"));
app.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = "!";

// 🟢 صلاحيات الأدمن (مؤقتة)
const guildAdmins = new Map();

// 🔥 تحقق صلاحيات
function isAuthorized(message) {
  if (!message.guild) return false;

  if (message.guild.ownerId === message.author.id)
    return true;

  const admins = guildAdmins.get(message.guild.id);
  return admins?.has(message.author.id);
}

// ❌ رسالة منع عامة
function noPerm(message) {
  return message.reply("❌ ليس لديك صلاحية");
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= COMMAND HANDLER =================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ❌ منع غير المصرح لهم (ما عدا help)
  if (cmd !== "help" && !isAuthorized(message))
    return noPerm(message);

  // ================= HELP =================
  if (cmd === "help") {
    const embed = new EmbedBuilder()
      .setTitle("📖 قائمة أوامر البوت")
      .setDescription("Developed by Row studios")
      .setColor(0x2b2d31)
      .addFields(
        {
          name: "🛡️ الإدارة",
          value:
            "`!ban @user`\n`!kick @user`\n`!adminadd @user`\n`!rmvadmin @user`"
        },
        {
          name: "📢 البث",
          value: "`!bc message`"
        },
        {
          name: "🏗️ الإنشاء",
          value:
            "`!cch name`\n`!cct name`\n`!cct-ch cat|room`"
        }
      )
      .setFooter({ text: "Developed by Row studios" })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  // ================= ADD ADMIN =================
  if (cmd === "adminadd") {
    if (message.guild.ownerId !== message.author.id)
      return message.reply("❌ فقط الأونر");

    const user = message.mentions.users.first();
    if (!user) return message.reply("منشن شخص");

    if (!guildAdmins.has(message.guild.id))
      guildAdmins.set(message.guild.id, new Set());

    guildAdmins.get(message.guild.id).add(user.id);

    return message.reply(`✅ تم إضافة أدمن: ${user.tag}`);
  }

  // ================= REMOVE ADMIN =================
  if (cmd === "rmvadmin") {
    if (message.guild.ownerId !== message.author.id)
      return message.reply("❌ فقط الأونر");

    const user = message.mentions.users.first();
    if (!user) return message.reply("منشن شخص");

    guildAdmins.get(message.guild.id)?.delete(user.id);

    return message.reply(`❌ تم إزالة الأدمن: ${user.tag}`);
  }

  // ================= BAN =================
  if (cmd === "ban") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("منشن شخص");
    if (!user.bannable) return message.reply("❌ ما أقدر أبنده");

    await user.ban();
    return message.reply("🔨 تم الحظر");
  }

  // ================= KICK =================
  if (cmd === "kick") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("منشن شخص");
    if (!user.kickable) return message.reply("❌ ما أقدر أكيكة");

    await user.kick();
    return message.reply("👢 تم الطرد");
  }

  // ================= BROADCAST =================
  if (cmd === "bc") {
    const text = args.join(" ");
    if (!text) return message.reply("اكتب رسالة");

    message.guild.members.cache.forEach((m) => {
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

  // ================= CATEGORY + CHANNEL =================
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
