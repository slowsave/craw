const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// ════════════════════════════════════════
//   You can add more stuff here
// ════════════════════════════════════════
const TOKEN           = process.env.TOKEN;
const WELCOME_CHANNEL = 'welcome-and-intros';   // your welcome channel
const NOTIFY_CHANNEL  = 'youtube';   // channel where youtube uploads get posted

// ── YouTube channels to watch ────────────
// To get a channel ID: go to https://commentpicker.com/youtube-channel-id.php
const YOUTUBE_CHANNELS = [
  { name: 'Slow Save', id: 'UCXPUlP_HkFfVy1Vj8iUwZuA' },
// add more like this:
// { name: 'Channel Name', id: 'PASTE_ID_HERE' },
];
// ─────────────────────────────────────────

const CHECK_INTERVAL_MINUTES = 5; // how often Craw checks for new videos

// ════════════════════════════════════════these are greetings here

const GREETINGS = [
  (u) => `${u} just joined .`,
  (u) => `oh, ${u} actually showed up.`,
  (u) => `welcome ${u}. make yourself at home or whatever.`,
  (u) => `${u} is here. say hi.`,
  (u) => `${u} joined. about time.`,
  (u) => `yo ${u}, welcome.`,
  (u) => `${u} pulled up.`,
  (u) => `welcome in ${u}.`,
  (u) => `${u} found us. nice.`,
  (u) => `didn't expect to see ${u} here. welcome though.`,
  (u) => `${u} just walked in.`,
  (u) => `${u} joined the server. respect.`,
  (u) => `new one: ${u}. welcome.`,
  (u) => `${u}'s here now.`,
  (u) => `welcome ${u}, grab a seat.`,
];
// ════════════════════════════════════════these are youtube updates 
const YOUTUBE_INTROS = [
  (name) => `${name} just posted.`,
  (name) => `new video from ${name}.`,
  (name) => `${name} uploaded. go watch.`,
  (name) => `${name} dropped something.`,
  (name) => `heads up — ${name} posted a new one.`,
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── YouTube ───────────────────────────────

const lastVideoIds = {};

async function getLatestVideo(channelId) {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  const xml = await res.text();

  const idMatch    = xml.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
  const titles     = xml.match(/<title>(.*?)<\/title>/g);
  const thumbMatch = xml.match(/<media:thumbnail url="(.*?)"/);

  if (!idMatch) return null;

  return {
    id        : idMatch[1],
    title     : titles?.[1]?.replace(/<\/?title>/g, '') ?? 'New Video',
    url       : `https://www.youtube.com/watch?v=${idMatch[1]}`,
    thumbnail : thumbMatch?.[1] ?? null,
  };
}

async function checkYouTube(client) {
  for (const ch of YOUTUBE_CHANNELS) {
    try {
      const video = await getLatestVideo(ch.id);
      if (!video) continue;

      if (!lastVideoIds[ch.id]) {
        lastVideoIds[ch.id] = video.id;
        console.log(`craw: tracking ${ch.name} — latest: ${video.title}`);
        continue;
      }

      if (video.id !== lastVideoIds[ch.id]) {
        lastVideoIds[ch.id] = video.id;

        const guild   = client.guilds.cache.first();
        const channel = guild?.channels.cache.find((c) => c.name === NOTIFY_CHANNEL);
        if (!channel) { console.log(`craw: can't find channel: ${NOTIFY_CHANNEL}`); continue; }

        const embed = new EmbedBuilder()
        .setColor('#1c1c1c')
        .setTitle(video.title)
        .setURL(video.url)
        .setDescription(`${pick(YOUTUBE_INTROS)(ch.name)}\n${video.url}`)
        .setTimestamp();

        if (video.thumbnail) embed.setImage(video.thumbnail);

        channel.send({ embeds: [embed] });
        console.log(`craw: new video from ${ch.name}: ${video.title}`);
      }
    } catch (err) {
      console.log(`craw: youtube check failed for ${ch.name}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', () => {
  console.log(`craw is online as ${client.user.tag}`);

  checkYouTube(client);
  setInterval(() => checkYouTube(client), CHECK_INTERVAL_MINUTES * 60 * 1000);
});

client.on('guildMemberAdd', async (member) => {
  const channel = member.guild.channels.cache.find(
    (c) => c.name === WELCOME_CHANNEL
  );
  if (!channel) return console.log(`craw: can't find channel: ${WELCOME_CHANNEL}`);

  const embed = new EmbedBuilder()
  .setColor('#1c1c1c')
  .setDescription(pick(GREETINGS)(member.toString()))
  .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
  .setFooter({ text: `member #${member.guild.memberCount}` })
  .setTimestamp();

  channel.send({ embeds: [embed] });
});

client.login(TOKEN);
