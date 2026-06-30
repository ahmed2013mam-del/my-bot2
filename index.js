if (cmd === "ramoff") {

  // 🔒 حماية
  if (!isControl)
    return message.reply("❌ هذا الأمر فقط في سيرفر التحكم");

  if (message.author.id !== OWNER_ID)
    return message.reply("❌ هذا الأمر مخصص لمالك البوت فقط");

  // 🔊 "تأثير صوتي" منطقي (تسجيل لوق داخل الكونسل)
  console.log("🔊 NexusCore Shutdown sequence initiated...");

  const embed = new EmbedBuilder()
    .setTitle("🔴 NEXUS CORE SYSTEM SHUTDOWN")
    .setColor(0xff0000)
    .setDescription(
      "📢 **إعلان رسمي**\n\n" +
      "تم إنهاء سلسلة Nexus Series بشكل نهائي.\n" +
      "تم إيقاف البوت من جميع الأنظمة والسيرفرات.\n\n" +
      "🙏 شكراً لكل من استخدم NexusCore"
    )
    .addFields(
      { name: "📦 Version", value: "Nexus Series v1.0 FINAL", inline: true },
      { name: "🧾 Status", value: "SHUTDOWN", inline: true }
    )
    .setFooter({ text: "Row Studio • NexusCore Official Shutdown" })
    .setTimestamp();

  let sentServers = 0;

  // ⏳ تأخير إرسال (فخامة + شكل بث احترافي)
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
    }, sentServers * 1500); // تأخير 1.5 ثانية لكل سيرفر

    sentServers++;
  }

  // ⛔ إيقاف البوت بعد الإرسال
  setTimeout(() => {
    botState = "off";
    console.log("⛔ Bot shutdown completed");
  }, sentServers * 1600);

  return message.reply(
    `🔴 تم بدء الإغلاق الرسمي\n📡 تم إرسال الإعلان إلى ${sentServers} سيرفر`
  );
}
