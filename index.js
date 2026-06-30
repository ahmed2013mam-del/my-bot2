const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ChannelType
} = require("discord.js");

const express = require("express");
const fs = require("fs");

// ================= EXPRESS =================
const app = express();
app.get("/", (req, res) => res.send("Bot Online"));
app.listen(process.env.PORT || 3000);

// ================= BOT =================
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

// ================= DATABASE =================
const FILE = "./admins.json";

let db = fs.existsSync(FILE)
  ? JSON.parse(fs.readFileSync(FILE))
  : {};

function saveDB() {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

// ================= PERMISSIONS =================

// سيرفر اونر
function isServerOwner(message) {
  return message.guild.ownerId === message.author.id;
}

// ادمن من نظام البوت (خاص بكل سيرفر)
function isAdmin(message) {
  return (db[message.guild.id] || []).includes(message.author.id);
}

// صلاحيات كاملة داخل السيرفر
function canUse(message) {
  return isServerOwner(message) || isAdmin(message);
}

// رسالة موحدة
function noPerm(message) {
  return message.reply("❌ ليس لديك الصلاحية");
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

  // ================= GLOBAL PERMISSION =================
  if (!canUse(message) && !["help"].includes(cmd)) {
    return noPerm(message);
  }

  // ================= HELP =================
  if (cmd === "help") {
    const embed = new EmbedBuilder()
      .setTitle("📖 Control Panel")
      .setColor(0x2b2d31)
      .addFields(
        { name: "🛡 Moderation", value: "`ban` `kick`" },
        { name: "📢 Tools", value: "`bc`" },
        { name: "🏗 Create", value: "`cch` `cct` `cct-ch`" },
        { name: "👤 Admin System", value: "`addadmin` `rmvadmin` `listad`" }
      );

    return message.channel.send({ embeds: [embed] });
  }

  // ================= ADD ADMIN =================
  if (cmd === "addadmin") {
    if (!isServerOwner(message)) return noPerm(message);

    const user = message.mentions.users.first();
    if (!user) return message.reply("منشن شخص");

    const gid = message.guild.id;

    if (!db[gid]) db[gid] = [];

    if (!db[gid].includes(user.id)) {
      db[gid].push(user.id);
      saveDB();
    }

    return message.reply(`✅ تم إضافة ${user.tag} Admin`);
  }

  // ================= REMOVE ADMIN =================
  if (cmd === "rmvadmin") {
    if (!isServerOwner(message)) return noPerm(message);

    const user = message.mentions.users.first();
    if (!user) return message.reply("منشن شخص");

    const gid = message.guild.id;

    db[gid] = (db[gid] || []).filter(id => id !== user.id);
    saveDB();

    return message.reply(`❌ تم حذف ${user.tag}`);
  }

  // ================= LIST ADMINS =================
  if (cmd === "listad") {
    const list = db[message.guild.id] || [];

    if (list.length === 0)
      return message.reply("❌ لا يوجد ادمنز");

    const users = await Promise.all(
      list.map(async (id) => {
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
      .setDescription(users.join("\n"))
      .setFooter({ text: `Total: ${list.length}` });

    return message.channel.send({ embeds: [embed] });
  }

  // ================= BAN =================
  if (cmd === "ban") {
    const member = message.mentions.members.first();
    if (!member) return message.reply("منشن شخص");

    if (!member.bannable)
      return message.reply("❌ البوت لا يستطيع الحظر");

    await member.ban();
    return message.reply("🔨 تم الحظر");
  }

  // ================= KICK =================
  if (cmd === "kick") {
    const member = message.mentions.members.first();
    if (!member) return message.reply("منشن شخص");

    if (!member.kickable)
      return message.reply("❌ البوت لا يستطيع الطرد");

    await member.kick();
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
      
