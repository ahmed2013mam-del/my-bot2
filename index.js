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

// ================= DATABASE =================
const FILE = "./admins.json";

let db = fs.existsSync(FILE)
  ? JSON.parse(fs.readFileSync(FILE))
  : {};

function saveDB() {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

// ================= HELPERS =================
function isOwner(msg) {
  return msg.author.id === OWNER_ID;
}

function isAdmin(msg) {
  return (db[msg.guild.id] || []).includes(msg.author.id);
}

function canUse(msg) {
  return isOwner(msg) || isAdmin(msg);
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

  // ================= PERMISSION CHECK =================
  if (!canUse(message) && !["addadmin", "listad"].includes(cmd)) {
    return message.reply("❌ لا تملك صلاحية");
  }

  // ================= ADD ADMIN =================
  if (cmd === "addadmin") {
    if (message.author.id !== OWNER_ID)
      return message.reply("❌ هذا الأمر لمالك البوت فقط");

    const user = message.mentions.users.first();
    if (!user) return message.reply("منشن شخص");

    const guildId = message.guild.id;

    if (!db[guildId]) db[guildId] = [];

    if (!db[guildId].includes(user.id)) {
      db[guildId].push(user.id);
      saveDB();
    }

    return message.reply(`✅ تم إضافة ${user.tag} أدمن في هذا السيرفر`);
  }

  // ================= LIST ADMINS =================
  if (cmd === "listad") {
    const guildId = message.guild.id;

    const admins = db[guildId] || [];

    if (admins.length === 0) {
      return message.reply("❌ لا يوجد أدمنز في هذا السيرفر");
    }

    const list = await Promise.all(
      admins.map(async (id) => {
        try {
          const user = await client.users.fetch(id);
          return `👤 ${user.tag} (${user.id})`;
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

  // ================= CREATE CAT + CHANNEL =================
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
