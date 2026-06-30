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

// ================= ADMINS DB =================
const FILE = "./admins.json";
let db = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE)) : {};

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

  // ================= HELP =================
  if (cmd === "help") {
    const embed = new EmbedBuilder()
      .setTitle("📖 Bot Help")
      .setColor(0x2b2d31)
      .addFields(
        { name: "Moderation", value: "`ban` `kick`" },
        { name: "Tools", value: "`bc` `cch` `cct` `cct-ch`" },
        { name: "Roles", value: "`crl` `crlmulti`" },
        { name: "Server", value: "`chname` `chphoto`" },
        { name: "Admin", value: "`addadmin` `rmvadmin`" }
      );

    if (isOwner(message)) {
      embed.addFields({
        name: "⚙️ Owner Only",
        value: "`offbot` `hardware` `ramoff` `lvserver`"
      });
    }

    return message.channel.send({ embeds: [embed] });
  }

  // ================= ADMIN SYSTEM =================
  if (cmd === "addadmin") {
    if (!isOwner(message))
      return message.reply("❌ فقط المالك");

    const user = message.mentions.users.first();
    if (!user) return message.reply("منشن شخص");

    if (!db[message.guild.id]) db[message.guild.id] = [];

    if (!db[message.guild.id].includes(user.id))
      db[message.guild.id].push(user.id);

    saveDB();
    return message.reply(`✅ Admin Added: ${user.tag}`);
  }

  if (cmd === "rmvadmin") {
    if (!isOwner(message))
      return message.reply("❌ فقط المالك");

    const user = message.mentions.users.first();
    if (!user) return message.reply("منشن شخص");

    db[message.guild.id] =
      (db[message.guild.id] || []).filter(id => id !== user.id);

    saveDB();
    return message.reply(`❌ Admin Removed: ${user.tag}`);
  }

  // ================= PERMISSION =================
  if (!canUse(message))
    return message.reply("❌ لا تملك صلاحية");

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

  // ================= CREATE ROLE =================
  if (cmd === "crl") {
    const color = args[0];
    const name = args.slice(1).join(" ");

    if (!color || !name)
      return message.reply("!crl red owner");

    const role = await message.guild.roles.create({
      name,
      color: color.toUpperCase()
    });

    return message.reply(`✅ Role Created: ${role.name}`);
  }

  // ================= MULTI ROLES =================
  if (cmd === "crlmulti") {
    const count = parseInt(args[0]);
    const name = args.slice(1).join(" ");

    if (!count || !name)
      return message.reply("!crlmulti 5 staff");

    for (let i = 1; i <= count; i++) {
      await message.guild.roles.create({
        name: `${name} ${i}`
      });
    }

    return message.reply("✅ Done");
  }

  // ================= SERVER NAME =================
  if (cmd === "chname") {
    const name = args.join(" ");
    if (!name) return message.reply("اكتب اسم");

    await message.guild.setName(name);
    return message.reply("✅ Changed");
  }

  // ================= SERVER ICON =================
  if (cmd === "chphoto") {
    const url = args[0];
    if (!url) return message.reply("حط رابط");

    await message.guild.setIcon(url);
    return message.reply("✅ Changed Icon");
  }

  // ================= OWNER COMMANDS =================
  if (cmd === "offbot") {
    if (!isOwner(message)) return;
    process.exit();
  }

  if (cmd === "hardware") {
    if (!isOwner(message)) return;
    return message.reply("🛠️ Maintenance Mode");
  }

  if (cmd === "ramoff") {
    if (!isOwner(message)) return;
    return message.reply("⛔ Shutdown Mode");
  }

  if (cmd === "lvserver") {
    if (!isOwner(message)) return;

    const id = args[0];
    const guild = client.guilds.cache.get(id);
    if (!guild) return message.reply("Not Found");

    await guild.leave();
    return message.reply("🚪 Left Server");
  }
});

client.login(process.env.TOKEN);
