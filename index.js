const {
  Client,
  GatewayIntentBits,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const express = require("express");
const fs = require("fs");

const app = express();
app.get("/", (req, res) => res.send("Bot Online"));
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
const PREFIXES = ["!", "?"];

const OWNER_ID = "1087144363219484683";
const CONTROL_GUILD = "1521376881746907177";

// ================= DATABASE =================
const FILE = "./admins.json";

let db = fs.existsSync(FILE)
  ? JSON.parse(fs.readFileSync(FILE))
  : {};

function saveDB() {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

// ================= HELPERS =================
function isControlGuild(message) {
  return message.guild.id === CONTROL_GUILD;
}

function isOwner(message) {
  return message.author.id === OWNER_ID && isControlGuild(message);
}

function isAdmin(message) {
  return (db[message.guild.id] || []).includes(message.author.id);
}

function canUse(message) {
  // في سيرفر التحكم = أنت كل شيء
  if (isControlGuild(message) && message.author.id === OWNER_ID) return true;

  // باقي السيرفرات = Admin فقط
  return isAdmin(message);
}

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= MESSAGE =================
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const prefix = PREFIXES.find(p => message.content.startsWith(p));
  if (!prefix) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ================= NO PERMISSION =================
  if (!canUse(message) && !["help"].includes(cmd)) {
    return message.reply("❌ ليس لديك صلاحية");
  }

  // ================= HELP =================
  if (cmd === "help") {
    const embed = new EmbedBuilder()
      .setTitle("📖 NexusCore Panel")
      .setColor(0x2b2d31)
      .setDescription("Developed by Row Studio")
      .addFields(
        {
          name: "🛡️ Moderation",
          value: "`ban` `kick`",
          inline: true
        },
        {
          name: "📢 Tools",
          value: "`bc`",
          inline: true
        },
        {
          name: "🏗️ Create",
          value: "`cch` `cct` `cct-ch`",
          inline: false
        },
        {
          name: "🎨 Roles",
          value: "`crl` `crlmulti`",
          inline: false
        },
        {
          name: "👤 Admin System",
          value: "`addadmin` `rmvadmin` `listad`",
          inline: false
        }
      );

    // أوامر التحكم تظهر فقط في سيرفر التحكم
    if (isControlGuild(message)) {
      embed.addFields({
        name: "⚙️ Control Server Only",
        value: "`offbot` `hardware` `ramoff` `lvserver`"
      });
    }

    return message.channel.send({ embeds: [embed] });
  }

  // ================= ADD ADMIN =================
  if (cmd === "addadmin") {
    if (!isControlGuild(message))
      return message.reply("❌ ليس لديك صلاحية");

    if (message.author.id !== OWNER_ID)
      return message.reply("❌ ليس لديك صلاحية");

    const user = message.mentions.users.first();
    if (!user) return message.reply("منشن شخص");

    if (!db[message.guild.id]) db[message.guild.id] = [];

    if (!db[message.guild.id].includes(user.id)) {
      db[message.guild.id].push(user.id);
      saveDB();
    }

    return message.reply(`✅ تم إضافة ${user.tag} Admin`);
  }

  // ================= REMOVE ADMIN =================
  if (cmd === "rmvadmin") {
    const user = message.mentions.users.first();
    if (!user) return message.reply("منشن شخص");

    db[message.guild.id] =
      (db[message.guild.id] || []).filter(id => id !== user.id);

    saveDB();

    return message.reply(`❌ تم حذف ${user.tag} من الأدمن`);
  }

  // ================= LIST ADMINS =================
  if (cmd === "listad") {
    const admins = db[message.guild.id] || [];

    if (admins.length === 0)
      return message.reply("❌ لا يوجد أدمنز");

    const list = await Promise.all(
      admins.map(async (id) => {
        try {
          const u = await client.users.fetch(id);
          return `👤 ${u.tag}`;
        } catch {
          return `👤 Unknown (${id})`;
        }
      })
    );

    const embed = new EmbedBuilder()
      .setTitle("📋 Admin List")
      .setColor(0x2b2d31)
      .setDescription(list.join("\n"))
      .setFooter({ text: `Total: ${admins.length}` });

    return message.channel.send({ embeds: [embed] });
  }

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
