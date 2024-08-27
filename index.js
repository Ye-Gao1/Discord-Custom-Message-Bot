const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const axios = require("axios");
const schedule = require("node-schedule");

const TOKEN = process.env["DISCORD_TOKEN"];
const GIPHY_API_KEY = process.env["GIPHY_API_KEY"];
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.msgs = require("./msgs.json");
client.userStats = {};
const prefix = "!";

client.once("ready", () => {
  console.log("Ready!");

  schedule.scheduleJob("* * * * *", async () => {
    try {
      const response = await axios.get("http://numbersapi.com/random/trivia");
      const fact = response.data;
      const channel = client.channels.cache.get("1275201082024263740");
      if (channel) {
        channel.send(`🌟 Daily Fun Fact: ${fact}`);
      }
    } catch (error) {
      console.error("Error fetching daily fact:", error);
    }
  });
});

client.on("messageCreate", async (message) => {
  if (message.content.startsWith(`${prefix}write `)) {
    var tempSplits = message.content.split(" ", 2);
    var keyVal = tempSplits[1];
    var messageVal = message.content.slice(
      tempSplits[0].length + tempSplits[1].length + 2,
    );

    if (!client.msgs[message.author.id]) {
      client.msgs[message.author.id] = {};
    }
    client.msgs[message.author.id][keyVal] = messageVal;

    fs.writeFile("./msgs.json", JSON.stringify(client.msgs, null, 4), (err) => {
      if (err) throw err;
      message.channel.send("Message written.");
    });
  }

  if (message.content.startsWith(`${prefix}delete `)) {
    let getMessage = message.content.slice(8);

    delete client.msgs[message.author.id][getMessage];

    fs.writeFileSync("./msgs.json", JSON.stringify(client.msgs));

    message.channel.send(getMessage + " has been deleted.");
  }

  if (message.content === `${prefix}list`) {
    var messageList = "";

    for (var key in client.msgs[message.author.id]) {
      messageList += key + ", ";
    }

    message.channel.send(messageList || "No messages found.");
  }

  if (message.content.startsWith(`${prefix}getMeme `)) {
    const memeName = message.content.split(" ")[1];
    const memeUrl = client.msgs[message.author.id][memeName];

    if (!memeUrl) {
      return message.channel.send("Meme not found!");
    }

    message.channel.send(memeUrl);
  }

  if (message.content === `${prefix}listMemes`) {
    const memes = client.msgs[message.author.id] || {};
    const memeNames = Object.keys(memes).join(", ");

    message.channel.send(`Your memes: ${memeNames}` || "No memes found.");
  }

  if (message.content === `${prefix}randomMeme`) {
    const memes = client.msgs[message.author.id] || {};
    const memeNames = Object.keys(memes);

    if (memeNames.length === 0) {
      return message.channel.send("You have no saved memes!");
    }

    const randomMeme = memeNames[Math.floor(Math.random() * memeNames.length)];
    message.channel.send(memes[randomMeme]);
  }

  if (message.content.startsWith(`${prefix}remindMe `)) {
    const args = message.content.split(" ");
    const time = parseInt(args[1], 10);
    const reminder = args.slice(2).join(" ");

    if (isNaN(time)) {
      return message.channel.send("Please specify a valid number of seconds!");
    }

    message.channel.send(`I'll remind you in ${time} seconds.`);

    setTimeout(() => {
      message.author.send(`Reminder: ${reminder}`);
    }, time * 1000);
  }

  if (message.content.startsWith(`${prefix}memeSearch `)) {
    const keyword = message.content.split(" ").slice(1).join(" ");
    const apiUrl = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(keyword)}&limit=1`;

    try {
      const response = await axios.get(apiUrl);
      const memeUrl = response.data.data[0].images.original.url;
      message.channel.send(memeUrl);
    } catch (error) {
      console.error(error);
      message.channel.send(
        "Sorry, I couldn't find any memes for that keyword.",
      );
    }
  }

  if (message.content === `${prefix}help`) {
    message.channel.send(
      "Commands:\n" +
        "!write {messageKey} {message} - Save a message\n" +
        "!get {messageKey} - Retrieve a message\n" +
        "!delete {messageKey} - Delete a message\n" +
        "!list - List all saved messages\n" +
        "!saveMeme {memeName} [URL] - Save a meme (attach an image or provide a URL)\n" +
        "!getMeme {memeName} - Retrieve a saved meme\n" +
        "!listMemes - List all saved memes\n" +
        "!randomMeme - Retrieve a random saved meme\n" +
        "!memeSearch {key word} - Retrieve a random meme based on key word\n" +
        "!remindMe {seconds} {reminder} - Set a reminder",
    );
  }
});

client.login(TOKEN);
