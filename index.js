const { Client, GatewayIntentBits } = require('discord.js');
const fs = require("fs");

const TOKEN = process.env['DISCORD_TOKEN'];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.msgs = require("./msgs.json");
const prefix = "!";

client.once('ready', () => {
    console.log('Ready!');
});

client.on('messageCreate', (message) => {
  if (message.content.startsWith(`${prefix}write `)) {
      var tempSplits = message.content.split(" ", 2);
      var keyVal = tempSplits[1];
      var messageVal = message.content.slice(tempSplits[0].length + tempSplits[1].length + 2);

      if (!client.msgs[message.author.id]) {
          client.msgs[message.author.id] = {};
      }
      client.msgs[message.author.id][keyVal] = messageVal;

      fs.writeFile("./msgs.json", JSON.stringify(client.msgs, null, 4), err => {
          if (err) throw err;
          message.channel.send("Message written.");
      });
  }

  if (message.content.startsWith(`${prefix}get `)) {
      let getMessage = message.content.slice(5);
      let _msg = client.msgs[message.author.id][getMessage];
      message.channel.send(_msg || 'Message not found.');
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
          messageList += (key + ", ");
      }

      message.channel.send(messageList || 'No messages found.');
  }

  if (message.content.startsWith(`${prefix}saveMeme `)) {
      const args = message.content.split(' ');
      const memeName = args[1];
      const memeUrl = args[2] || (message.attachments.first() ? message.attachments.first().url : null);

      if (!memeUrl) {
          return message.channel.send('Please attach a meme or provide a URL to save!');
      }

      if (!client.msgs[message.author.id]) {
          client.msgs[message.author.id] = {};
      }

      client.msgs[message.author.id][memeName] = memeUrl;

      fs.writeFile("./msgs.json", JSON.stringify(client.msgs, null, 4), err => {
          if (err) throw err;
          message.channel.send('Meme saved successfully!');
      });
  }

  if (message.content.startsWith(`${prefix}getMeme `)) {
      const memeName = message.content.split(' ')[1];
      const memeUrl = client.msgs[message.author.id][memeName];

      if (!memeUrl) {
          return message.channel.send('Meme not found!');
      }

      message.channel.send(memeUrl);
  }

  if (message.content === `${prefix}listMemes`) {
      const memes = client.msgs[message.author.id] || {};
      const memeNames = Object.keys(memes).join(', ');

      message.channel.send(`Your memes: ${memeNames}` || 'No memes found.');
  }

  if (message.content === `${prefix}randomMeme`) {
      const memes = client.msgs[message.author.id] || {};
      const memeNames = Object.keys(memes);

      if (memeNames.length === 0) {
          return message.channel.send('You have no saved memes!');
      }

      const randomMeme = memeNames[Math.floor(Math.random() * memeNames.length)];
      message.channel.send(memes[randomMeme]);
  }

  if (message.content.startsWith(`${prefix}remindMe `)) {
      const args = message.content.split(' ');
      const time = parseInt(args[1], 10);
      const reminder = args.slice(2).join(' ');

      if (isNaN(time)) {
          return message.channel.send('Please specify a valid number of seconds!');
      }

      message.channel.send(`I'll remind you in ${time} seconds.`);

      setTimeout(() => {
          message.author.send(`Reminder: ${reminder}`);
      }, time * 1000);
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
          "!remindMe {seconds} {reminder} - Set a reminder"
      );
  }
});

client.login(TOKEN);
