const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ChannelType
} = require("discord.js");

const express = require("express");
const fs = require("fs");

const app = express();
app.get("/", (req, res) => res.send("Bot Online"));
app.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const PREFIXES = ["!", "?"];
const OWNER_ID = "1087144363219484683";
const CONTROL_GUILD = "1521376881746907177";

// ================= DB =================
const FILE = "./admins.json";

let db = fs.existsSync(FILE)
  ? JSON.parse(fs.readFileSync(FILE))
  : {};

function saveDB() {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

// ================= GREET SYSTEM =================
const greetCooldown = new Map();

// ================= PERMISSIONS =================
function isControlGuild(message) {
  return message.guild.id === CONTROL_GUILD;
}

function isServerOwner(message) {
  return message.guild.ownerId === message.author.id;
}

function isAdmin(message) {
  return (db[message.guild.id] || []).includes(message.author.id);
}

function canUse(message) {
  // سيرفر التحكم = أنت فقط
  if (isControlGuild(message) && message.author.id === OWNER_ID) return true;

  // باقي السيرفرات = Owner + Admin
  return isServerOwner(message) || isAdmin(message);
}

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

  const userId = message.author.id;
  const now = Date.now();

  // ================= GREETING =================
  if (message.content.trim() === "السلام عليكم") {
    const last = greetCooldown.get(userId) || 0;
    if (now - last < 5 * 60 * 1000) return;

    greetCooldown.set(userId, now);

    return message.reply("وعــلــيـكم الــســلــام نــورت/ي الــســيــرفــر❤");
  }

  const prefix = PREFIXES.find(p => message.content.startsWith(p));
  if (!prefix) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ================= PERMISSION =================
  if (!canUse(message) && cmd !== "help") {
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
        { name: "🎨 Server Tools", value: "`chname` `chphoto`" },
        { name: "👤 Admin System", value: "`addadmin` `rmvadmin` `listad`" }
      );

    if (isControlGuild(message)) {
      embed.addFields({
        name: "⚙️ CONTROL SERVER",
        value: "`offbot` `hardware` `ramoff`"
      });
    }

    return message.channel.send({ embeds: [embed] });
  }

  // ================= ADMIN SYSTEM =================
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

    return message.reply(`✅ تم إضافة ${user.tag}`);
  }

  if (cmd === "rmvadmin") {
    if (!isServerOwner(message)) return noPerm(message);

    const user = message.mentions.users.first();
    if (!user) return message.reply("منشن شخص");

    db[message.guild.id] =
      (db[message.guild.id] || []).filter(id => id !== user.id);

    saveDB();

    return message.reply("❌ تم الحذف");
  }

  if (cmd === "listad") {
    const list = db[message.guild.id] || [];
    if (!list.length) return message.reply("❌ لا يوجد أدمنز");

    const users = await Promise.all(
      list.map(async (id) => {
        try {
          const u = await client.users.fetch(id);
          return `👤 ${u.tag}`;
        } catch {
          return `👤 Unknown`;
        }
      })
    );

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📋 Admin List")
          .setDescription(users.join("\n"))
          .setColor(0x2b2d31)
      ]
    });
  }

  // ================= MODERATION =================
  if (cmd === "ban") {
    const m = message.mentions.members.first();
    if (!m) return message.reply("منشن شخص");
    if (!m.bannable) return message.reply("❌ لا يمكن الحظر");

    await m.ban();
    return message.reply("🔨 تم الحظر");
  }

  if (cmd === "kick") {
    const m = message.mentions.members.first();
    if (!m) return message.reply("منشن شخص");
    if (!m.kickable) return message.reply("❌ لا يمكن الطرد");

    await m.kick();
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

  // ================= CREATE =================
  if (cmd === "cch") {
    const name = args.join("-");
    if (!name) return message.reply("اكتب اسم");

    await message.guild.channels.create({
      name,
      type: ChannelType.GuildText
    });

    return message.reply("✅ تم إنشاء روم");
  }

  if (cmd === "cct") {
    const name = args.join(" ");
    if (!name) return message.reply("اكتب اسم");

    await message.guild.channels.create({
      name,
      type: ChannelType.GuildCategory
    });

    return message.reply("📁 تم إنشاء كاتاجوري");
  }

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

  // ================= SERVER TOOLS (رجعت زي ما طلبت) =================
  if (cmd === "chname") {
    const name = args.join(" ");
    if (!name) return message.reply("اكتب اسم");

    await message.guild.setName(name);
    return message.reply("✅ تم تغيير الاسم");
  }

  if (cmd === "chphoto") {
    const url = args[0];
    if (!url) return message.reply("حط رابط صورة");

    await message.guild.setIcon(url);
    return message.reply("✅ تم تغيير الصورة");
  }

  // ================= CONTROL COMMANDS =================
  if (cmd === "offbot" && isControlGuild(message)) {
    process.exit();
  }

  if (cmd === "hardware" && isControlGuild(message)) {
    return message.reply("🛠️ Maintenance");
  }

  if (cmd === "ramoff" && isControlGuild(message)) {
    return message.reply("⛔ Shutdown Mode");
  }
});

client.login(process.env.TOKEN);
