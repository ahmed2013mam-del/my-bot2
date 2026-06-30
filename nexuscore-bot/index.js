const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started"));

app.use('/ping', (req, res) => {
  res.send(new Date());
});

const Discord = require("discord.js");
const client = new Discord.Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
  ws: {
    intents: [
      "GUILDS",
      "GUILD_MESSAGES",
      "GUILD_MEMBERS",
      "GUILD_PRESENCES",
      "DIRECT_MESSAGES",
      32768
    ]
  }
});

const prefix = "!";
const guildAdmins = new Map();

const statuses = [`!bc`, `!ban`, `!kick`, `!help`, `NexusCore BOT`];

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setStatus("dnd");
  setInterval(() => {
    const pick = statuses[Math.floor(Math.random() * statuses.length)];
    client.user.setActivity(pick, { type: "WATCHING" });
  }, 50000);
});

function isAuthorized(message) {
  if (!message.guild) return false;
  if (message.guild.ownerID === message.author.id) return true;
  const admins = guildAdmins.get(message.guild.id);
  return admins ? admins.has(message.author.id) : false;
}

client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ─── !help ─────────────────────────────────────────────────────────────────
  if (cmd === "help") {
    const embed = new Discord.MessageEmbed()
      .setTitle(`📖 قائمة الأوامر`)
      .setColor("#7289da")
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .addField(`📢 البث`,
`> \`!bc [رسالة]\` — يرسل رسالة لكل القنوات
> \`!abc [رسالة]\` — يرسل إعلان (embed) لكل القنوات`)
      .addField(`🛡️ الإدارة`,
`> \`!ban @يوزر [سبب]\` — باند
> \`!kick @يوزر [سبب]\` — كيك
> \`!addadmin @يوزر\` — يعطي صلاحية الأوامر (الأونر فقط)
> \`!removeadmin @يوزر\` — يشيل الصلاحية (الأونر فقط)`)
      .addField(`🏗️ إنشاء القنوات`,
`> \`!cch [اسم]\` — قناة نصية
> \`!cct [اسم]\` — كاتاجوري
> \`!cvs [اسم]\` — قناة صوتية
> \`!cct-ch [كاتاجوري | قناة]\` — كاتاجوري + قناة بداخلها`)
      .setFooter(`Created by Row studios`, client.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();
    return message.channel.send(embed);
  }

  if (!isAuthorized(message)) return;

  // ─── !addadmin ─────────────────────────────────────────────────────────────
  if (cmd === "addadmin") {
    if (message.guild.ownerID !== message.author.id)
      return message.channel.send(`❌ هذا الأمر للأونر فقط`);
    const target = message.mentions.members.first();
    if (!target) return message.channel.send(`❌ استخدام: \`!addadmin @يوزر\``);
    if (!guildAdmins.has(message.guild.id)) guildAdmins.set(message.guild.id, new Set());
    guildAdmins.get(message.guild.id).add(target.id);
    const embed = new Discord.MessageEmbed()
      .setDescription(`✅ تم إعطاء **${target.user.tag}** صلاحية استخدام الأوامر`)
      .setColor("#2ecc71")
      .setTimestamp()
      .setFooter(`Created by Row studios`, client.user.displayAvatarURL({ dynamic: true }));
    return message.channel.send(embed);
  }

  // ─── !removeadmin ──────────────────────────────────────────────────────────
  else if (cmd === "removeadmin") {
    if (message.guild.ownerID !== message.author.id)
      return message.channel.send(`❌ هذا الأمر للأونر فقط`);
    const target = message.mentions.members.first();
    if (!target) return message.channel.send(`❌ استخدام: \`!removeadmin @يوزر\``);
    guildAdmins.get(message.guild.id)?.delete(target.id);
    const embed = new Discord.MessageEmbed()
      .setDescription(`✅ تم سحب صلاحية **${target.user.tag}**`)
      .setColor("#e74c3c")
      .setTimestamp()
      .setFooter(`Created by Row studios`, client.user.displayAvatarURL({ dynamic: true }));
    return message.channel.send(embed);
  }

  // ─── !bc ───────────────────────────────────────────────────────────────────
  else if (cmd === "bc") {
    const text = args.join(" ");
    if (!text) return message.channel.send(`❌ استخدام: \`!bc [الرسالة]\``);
    message.delete().catch(() => null);
    const channels = message.guild.channels.cache.filter(c => c.type === "text");
    let sent = 0;
    for (const [, ch] of channels) {
      await ch.send(text).then(() => sent++).catch(() => null);
    }
    message.author.send(`✅ تم الإرسال لـ ${sent} قناة`).catch(() => null);
  }

  // ─── !abc ──────────────────────────────────────────────────────────────────
  else if (cmd === "abc") {
    const text = args.join(" ");
    if (!text) return message.channel.send(`❌ استخدام: \`!abc [الرسالة]\``);
    message.delete().catch(() => null);
    const embed = new Discord.MessageEmbed()
      .setDescription(text)
      .setColor("#e74c3c")
      .setTimestamp()
      .setFooter(`إعلان | ${message.guild.name}`, message.guild.iconURL({ dynamic: true }));
    const channels = message.guild.channels.cache.filter(c => c.type === "text");
    let sent = 0;
    for (const [, ch] of channels) {
      await ch.send(embed).then(() => sent++).catch(() => null);
    }
    message.author.send(`✅ تم إرسال الإعلان لـ ${sent} قناة`).catch(() => null);
  }

  // ─── !ban ──────────────────────────────────────────────────────────────────
  else if (cmd === "ban") {
    const target = message.mentions.members.first();
    if (!target) return message.channel.send(`❌ استخدام: \`!ban @يوزر [السبب]\``);
    const reason = args.slice(1).join(" ") || "بدون سبب";
    if (!target.bannable) return message.channel.send(`❌ ما أقدر أبان هذا الشخص`);
    await target.ban({ reason });
    const embed = new Discord.MessageEmbed()
      .setTitle(`🔨 تم الباند`)
      .addField(`المستخدم`, `${target.user.tag}`, true)
      .addField(`السبب`, reason, true)
      .setColor("#e74c3c")
      .setTimestamp()
      .setFooter(`Created by Row studios`, client.user.displayAvatarURL({ dynamic: true }));
    message.channel.send(embed);
  }

  // ─── !kick ─────────────────────────────────────────────────────────────────
  else if (cmd === "kick") {
    const target = message.mentions.members.first();
    if (!target) return message.channel.send(`❌ استخدام: \`!kick @يوزر [السبب]\``);
    const reason = args.slice(1).join(" ") || "بدون سبب";
    if (!target.kickable) return message.channel.send(`❌ ما أقدر أكيك هذا الشخص`);
    await target.kick(reason);
    const embed = new Discord.MessageEmbed()
      .setTitle(`👢 تم الكيك`)
      .addField(`المستخدم`, `${target.user.tag}`, true)
      .addField(`السبب`, reason, true)
      .setColor("#e67e22")
      .setTimestamp()
      .setFooter(`Created by Row studios`, client.user.displayAvatarURL({ dynamic: true }));
    message.channel.send(embed);
  }

  // ─── !cch ──────────────────────────────────────────────────────────────────
  else if (cmd === "cch") {
    const name = args.join("-").toLowerCase() || "new-channel";
    const ch = await message.guild.channels.create(name, { type: "text" }).catch(e => {
      message.channel.send(`❌ ما قدرت أصنع القناة: ${e.message}`);
      return null;
    });
    if (!ch) return;
    const embed = new Discord.MessageEmbed()
      .setDescription(`✅ تم صنع قناة نصية: <#${ch.id}>`)
      .setColor("#2ecc71")
      .setTimestamp()
      .setFooter(`Created by Row studios`, client.user.displayAvatarURL({ dynamic: true }));
    message.channel.send(embed);
  }

  // ─── !cct ──────────────────────────────────────────────────────────────────
  else if (cmd === "cct") {
    const name = args.join(" ") || "New Category";
    const cat = await message.guild.channels.create(name, { type: "category" }).catch(e => {
      message.channel.send(`❌ ما قدرت أصنع الكاتاجوري: ${e.message}`);
      return null;
    });
    if (!cat) return;
    const embed = new Discord.MessageEmbed()
      .setDescription(`✅ تم صنع كاتاجوري: **${cat.name}**`)
      .setColor("#2ecc71")
      .setTimestamp()
      .setFooter(`Created by Row studios`, client.user.displayAvatarURL({ dynamic: true }));
    message.channel.send(embed);
  }

  // ─── !cvs ──────────────────────────────────────────────────────────────────
  else if (cmd === "cvs") {
    const name = args.join("-").toLowerCase() || "new-voice";
    const ch = await message.guild.channels.create(name, { type: "voice" }).catch(e => {
      message.channel.send(`❌ ما قدرت أصنع الفويس: ${e.message}`);
      return null;
    });
    if (!ch) return;
    const embed = new Discord.MessageEmbed()
      .setDescription(`✅ تم صنع قناة صوتية: **${ch.name}**`)
      .setColor("#2ecc71")
      .setTimestamp()
      .setFooter(`Created by Row studios`, client.user.displayAvatarURL({ dynamic: true }));
    message.channel.send(embed);
  }

  // ─── !cct-ch ───────────────────────────────────────────────────────────────
  else if (cmd === "cct-ch") {
    const input = args.join(" ");
    const parts = input.split("|").map(s => s.trim());
    const catName = parts[0] || "New Category";
    const chName = (parts[1] || "general").toLowerCase().replace(/ /g, "-");

    const cat = await message.guild.channels.create(catName, { type: "category" }).catch(e => {
      message.channel.send(`❌ ما قدرت أصنع الكاتاجوري: ${e.message}`);
      return null;
    });
    if (!cat) return;

    const ch = await message.guild.channels.create(chName, {
      type: "text",
      parent: cat.id
    }).catch(e => {
      message.channel.send(`❌ تم صنع الكاتاجوري بس ما قدرت أصنع القناة: ${e.message}`);
      return null;
    });

    const embed = new Discord.MessageEmbed()
      .setTitle(`✅ تم الإنشاء`)
      .addField(`📁 الكاتاجوري`, catName, true)
      .addField(`💬 القناة`, ch ? `<#${ch.id}>` : `فشل`, true)
      .setColor("#2ecc71")
      .setTimestamp()
      .setFooter(`Created by Row studios`, client.user.displayAvatarURL({ dynamic: true }));
    message.channel.send(embed);
  }
});

client.login(process.env.token);
