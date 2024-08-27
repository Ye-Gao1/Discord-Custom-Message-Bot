const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const schedule = require("node-schedule");

const TOKEN = process.env["DISCORD_TOKEN"];
const GIPHY_API_KEY = process.env["GIPHY_API_KEY"];
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.msgs = require("./msgs.json");
client.userStats = {};
const prefix = "!";

const MEME_CHANNEL_ID = "1244006956222644288";
let REACTION_ROLES_MESSAGE_ID;
const reactionRoles = {
  "🔴": "Red",
  "🔵": "Blue",
  "🟢": "Green",
};

const configPath = path.join(__dirname, "config.json");

function loadConfig() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    REACTION_ROLES_MESSAGE_ID = config.reactionRolesMessageId;
  } catch (error) {
    console.error("Error loading config:", error);
  }
}

function saveConfig(messageId) {
  const config = { reactionRolesMessageId: messageId };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

client.once("ready", () => {
  console.log("Ready!");
  schedule.scheduleJob("* * * * *", sendDailyFact);
  schedule.scheduleJob("* * * * *", sendAutoMeme);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  updateUserStats(message.author.id);
  checkCustomEmojiReactions(message);

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (command) {
    case "write":
      handleWrite(message, args);
      break;
    case "delete":
      handleDelete(message, args);
      break;
    case "list":
      handleList(message);
      break;
    case "getmeme":
      handleGetMeme(message, args);
      break;
    case "listmemes":
      handleListMemes(message);
      break;
    case "randommeme":
      handleRandomMeme(message);
      break;
    case "remindme":
      handleRemindMe(message, args);
      break;
    case "memesearch":
      handleMemeSearch(message, args);
      break;
    case "userinfo":
      handleUserInfo(message);
      break;
    case "help":
      handleHelp(message);
      break;
    case "setupreactionroles":
      handleSetupReactionRoles(message);
      break;
  }
});

client.on("messageReactionAdd", (reaction, user) => {
  handleReactionRoles(reaction, user, true);
});

client.on("messageReactionRemove", (reaction, user) => {
  handleReactionRoles(reaction, user, false);
});

async function sendDailyFact() {
  try {
    const response = await axios.get("http://numbersapi.com/random/trivia");
    const fact = response.data;
    const channel = client.channels.cache.get("1244006956222644288");
    if (channel) {
      channel.send(`🌟 Daily Fun Fact: ${fact}`);
    }
  } catch (error) {
    console.error("Error fetching daily fact:", error);
  }
}

async function sendAutoMeme() {
  try {
    const response = await axios.get(
      `https://api.giphy.com/v1/gifs/random?api_key=${GIPHY_API_KEY}&tag=meme&rating=g`,
    );
    const memeUrl = response.data.data.images.original.url;
    const channel = client.channels.cache.get(MEME_CHANNEL_ID);
    if (channel) {
      channel.send(`Here's your hourly meme dose!\n${memeUrl}`);
    }
  } catch (error) {
    console.error("Error fetching auto-meme:", error);
  }
}

function updateUserStats(userId) {
  if (!client.userStats[userId]) {
    client.userStats[userId] = { messages: 0, xp: 0, level: 1 };
  }
  client.userStats[userId].messages++;
  client.userStats[userId].xp += 10;

  const currentLevel = Math.floor(0.1 * Math.sqrt(client.userStats[userId].xp));
  if (currentLevel > client.userStats[userId].level) {
    client.userStats[userId].level = currentLevel;
  }
}

function checkCustomEmojiReactions(message) {
  const keywordReactions = {
    pizza: "🍕",
    awesome: "😎",
    wow: "🤩",
  };

  for (const [keyword, emoji] of Object.entries(keywordReactions)) {
    if (message.content.toLowerCase().includes(keyword)) {
      message.react(emoji);
    }
  }
}

function handleWrite(message, args) {
  const keyVal = args[0];
  const messageVal = args.slice(1).join(" ");

  if (!client.msgs[message.author.id]) {
    client.msgs[message.author.id] = {};
  }
  client.msgs[message.author.id][keyVal] = messageVal;

  fs.writeFile("./msgs.json", JSON.stringify(client.msgs, null, 4), (err) => {
    if (err) throw err;
    message.channel.send("Message written.");
  });
}

function handleDelete(message, args) {
  const getMessage = args.join(" ");

  delete client.msgs[message.author.id][getMessage];

  fs.writeFileSync("./msgs.json", JSON.stringify(client.msgs));

  message.channel.send(getMessage + " has been deleted.");
}

function handleList(message) {
  const messageList = Object.keys(client.msgs[message.author.id] || {}).join(
    ", ",
  );
  message.channel.send(messageList || "No messages found.");
}

function handleGetMeme(message, args) {
  const memeName = args[0];
  const memeUrl = client.msgs[message.author.id]?.[memeName];

  if (!memeUrl) {
    return message.channel.send("Meme not found!");
  }

  message.channel.send(memeUrl);
}

function handleListMemes(message) {
  const memes = client.msgs[message.author.id] || {};
  const memeNames = Object.keys(memes).join(", ");

  message.channel.send(`Your memes: ${memeNames}` || "No memes found.");
}

function handleRandomMeme(message) {
  const memes = client.msgs[message.author.id] || {};
  const memeNames = Object.keys(memes);

  if (memeNames.length === 0) {
    return message.channel.send("You have no saved memes!");
  }

  const randomMeme = memeNames[Math.floor(Math.random() * memeNames.length)];
  message.channel.send(memes[randomMeme]);
}

function handleRemindMe(message, args) {
  const time = parseInt(args[0], 10);
  const reminder = args.slice(1).join(" ");

  if (isNaN(time)) {
    return message.channel.send("Please specify a valid number of seconds!");
  }

  message.channel.send(`I'll remind you in ${time} seconds.`);

  setTimeout(() => {
    message.author.send(`Reminder: ${reminder}`);
  }, time * 1000);
}

async function handleMemeSearch(message, args) {
  const keyword = args.join(" ");
  const apiUrl = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(keyword)}&limit=1`;

  try {
    const response = await axios.get(apiUrl);
    const memeUrl = response.data.data[0].images.original.url;
    message.channel.send(memeUrl);
  } catch (error) {
    console.error(error);
    message.channel.send("Sorry, I couldn't find any memes for that keyword.");
  }
}

function handleUserInfo(message) {
  const user = message.mentions.users.first() || message.author;
  const userInfo = client.userStats[user.id] || {
    messages: 0,
    xp: 0,
    level: 1,
  };

  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle(`User Info for ${user.username}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      {
        name: "Messages Sent",
        value: userInfo.messages.toString(),
        inline: true,
      },
      { name: "XP", value: userInfo.xp.toString(), inline: true },
      { name: "Level", value: userInfo.level.toString(), inline: true },
    )
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
}

function handleHelp(message) {
  const helpEmbed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("Bot Commands")
    .setDescription("Here are the available commands:")
    .addFields(
      { name: "!write {messageKey} {message}", value: "Save a message" },
      { name: "!delete {messageKey}", value: "Delete a message" },
      { name: "!list", value: "List all saved messages" },
      { name: "!getmeme {memeName}", value: "Retrieve a saved meme" },
      { name: "!listmemes", value: "List all saved memes" },
      { name: "!randommeme", value: "Retrieve a random saved meme" },
      { name: "!remindme {seconds} {reminder}", value: "Set a reminder" },
      { name: "!memesearch {keyword}", value: "Search for a meme" },
      { name: "!userinfo [@user]", value: "Get user stats" },
      {
        name: "!setupreactionroles",
        value: "Setup reaction roles (Admin only)",
      },
    )
    .setTimestamp();

  message.channel.send({ embeds: [helpEmbed] });
}

function handleSetupReactionRoles(message) {
  if (
    !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    return message.reply(
      "You need to be an administrator to set up reaction roles.",
    );
  }

  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("Choose Your Team!")
    .setDescription("React to this message to join a team:")
    .addFields(
      { name: "🔴", value: "Red Team", inline: true },
      { name: "🔵", value: "Blue Team", inline: true },
      { name: "🟢", value: "Green Team", inline: true },
    );

  message.channel
    .send({ embeds: [embed] })
    .then((sentMessage) => {
      const reactPromises = Object.keys(reactionRoles).map((emoji) =>
        sentMessage.react(emoji),
      );

      Promise.all(reactPromises)
        .then(() => {
          REACTION_ROLES_MESSAGE_ID = sentMessage.id;
          saveConfig(REACTION_ROLES_MESSAGE_ID);

          message.channel.send(
            `Reaction roles have been set up. Message ID: ${REACTION_ROLES_MESSAGE_ID}`,
          );
        })
        .catch((error) => {
          console.error("Error adding reactions:", error);
          message.channel.send(
            "There was an error setting up reaction roles. Please check the bot's permissions and try again.",
          );
        });
    })
    .catch((error) => {
      console.error("Error sending reaction roles message:", error);
      message.channel.send(
        "There was an error setting up reaction roles. Please check the bot's permissions and try again.",
      );
    });
}

async function handleReactionRoles(reaction, user, add) {
  if (reaction.message.id !== REACTION_ROLES_MESSAGE_ID) return;
  if (user.bot) return;

  const emoji = reaction.emoji.name;
  const roleName = reactionRoles[emoji];
  if (!roleName) return;

  const guild = reaction.message.guild;
  const member = await guild.members.fetch(user.id);
  const role = guild.roles.cache.find((r) => r.name === roleName);

  if (!role) return;

  if (add) {
    member.roles.add(role).catch(console.error);
  } else {
    member.roles.remove(role).catch(console.error);
  }
}

client.login(TOKEN);
