const express = require('express');
const app = express();
const port = 3000;

// ================= START BOT CODE =================== //
const Discord = require('discord.js');

let bot = new Discord.Client();

const fs = require('fs');
const readline = require('readline');
const Fuse = require('fuse.js')
const { google } = require('googleapis');
const { createCanvas, loadImage } = require("canvas");
const { registerFont } = require('canvas');
const { prefix } = require('./config.json');
const request = require('request');
const Database = require("@replit/database");

const db = new Database();

const helpEmbed = new Discord.MessageEmbed()
	.setColor('#EEFF00')
	.setTitle('Help Menu')
	.setAuthor('Scientia', 'https://cdn.discordapp.com/avatars/668573457147101195/7cdde3430684d449a80e6c441eee0492.png', 'https://discord.com/oauth2/authorize?client_id=668573457147101195&scope=bot&permissions=8')
	.setDescription('List of Commands:')
	.setThumbnail('https://cdn.discordapp.com/avatars/668573457147101195/7cdde3430684d449a80e6c441eee0492.png')
	.addFields(
		{ name: '\u200B', value: '\u200B' },
		{ name: '!recipe [Recipe Name]', value: 'Example: !recipe beef ox tripe' },
		{ name: '!nano [Item Name]', value: 'Example: !nano wood core' },
		{ name: '!reloadlist', value: 'Reloads the data from <https://bit.ly/LAguides>' },
		{ name: '!setid [Game ID]', value: 'Example: !setid 12166043' },
		{ name: '!myid', value: 'Returns your Game ID after you have used !setid once before.' },
		{ name: '!invite', value: 'Returns the Invite link for this bot in your PM.' },
		{ name: '!channel [#channel-name]', value: 'Set a channel to receive bot announcements.' },
		{ name: '\u200B', value: '\u200B' },
	)
	.setTimestamp()
	.setFooter('Contact Simon#0988 for suggestions, feedbacks & questions about the bot', 'https://cdn.discordapp.com/avatars/668573457147101195/7cdde3430684d449a80e6c441eee0492.png');

registerFont('fonts/Roboto-Regular.ttf', { family: 'Roboto' });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';

//const token2 = process.env.DISCORD_TOKEN;

const token2 = process.env['DISCORD_TOKEN'];

const version = '2.3.1';
app.get('/', (req, res) => res.send(version));
app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));

fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), listRecipes);
	authorize(JSON.parse(content), listNano);
});

function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

bot.on('ready', () => {
    console.log('This bot is online!');
    bot.user.setActivity('Simon#0988', { type: 'LISTENING'});
})

bot.on('message', async message => {
	if (message.author.bot)
        return;
	
	const argu = message.content.slice(prefix.length).trim().split(/ +/g);
	argu.shift().toLowerCase();

    if (message.content.startsWith(`${prefix}servers`) && message.author.id === process.env.SIMON_ID) {
		message.reply('Sent in PM!');
		bot.guilds.cache.forEach((guild) => {
        	message.author.send(guild.name);
    	});
		return;
    }

	else if (message.content.startsWith(`${prefix}probability`)) {
		return message.channel.send("https://docs.google.com/spreadsheets/d/1PPzNGzTL70ytrQNEHnGeHpY9hTYB2J_yiYuEBPqgg_A/edit?usp=sharing");
	}

	else if (message.content.startsWith(`${prefix}setid`)) {
		let setGameID = argu.join(" ");
		if (!setGameID) return message.reply("Error: No game ID specified.");
		await db.set(message.author.id, setGameID).then(() => {
			message.reply("Successfully set your Game ID to **" + setGameID + "**");
		});
		return;
	}

	else if (message.content.startsWith(`${prefix}myid`)) {
		db.get(message.author.id).then(value => {
			if (value == null) message.reply("Please use !setid *<your game id>* to set your Game ID first.");
			else message.reply("Your Game ID is **" + value + "**");
		});
		return;
	}

		/*for (var i = 10000000; i < 15000000; i++) {
				let urlApi = "https://game.lifeafterpay.com/api/v1/user_info?roleId=" + i.toString() + "&serverId=500002";
				request({url: urlApi, json: true }, function(err, res, json) {
					if (err) {
						throw err;
					}
					if(json.data.rolename == "Foxyy") console.log(i);
				});*/

	else if (message.content.startsWith(`${prefix}channel`) && message.member.hasPermission('ADMINISTRATOR')) {
		var channelID = argu.join(" ");

		if (channelID.startsWith('<#') && channelID.endsWith('>')) {
			channelID = channelID.slice(2, -1);
		}

		if (!channelID) {
			db.get(message.guild.id).then(value => {
				if (value == null) message.reply("Please use !channel *#channel-name-here* to set the bot announcement channel first.");
				else message.reply("Your current bot announcement channel is **<#" + value + ">**");
			});
			return;
		}

		let channel = message.guild.channels.cache.find(channel => channel.id == channelID)
		
		if (!channel) return message.reply("Error: Couldn't find the channel.");

		await db.set(message.guild.id, channelID).then(() => {
			message.reply("Successfully set bot announcement to **<#" + channelID + ">**");
		});

		return;
	}

	else if (message.content.startsWith(`${prefix}say`) && message.author.id === process.env.SIMON_ID) {
		var sayMessage = argu.join(" ");

		if (!sayMessage) return message.reply("Error: No message specified.");

		bot.guilds.cache.forEach(guild => {
            try {
				db.get(guild.id).then(value => {
					if (value == null) { return;
						console.log(guild.name + " has not set a channel yet.");

						let channel = guild.channels.cache.find(channel => channel.name === 'general') || guild.channels.cache.first();
						if (channel) {
							channel.send(sayMessage);
						} else {
							console.log('The server ' + guild.name + ' has no channels.');
						}
					}
					else {
						let channel = value;
						bot.channels.cache.get(channel).send(sayMessage);
					} 
				});
            } catch (err) {
                console.log('Could not send message to ' + guild.name + '.');
            }
        });
		return;
	}

    else if (message.content.startsWith(`${prefix}reloadlist`)) {
        fs.readFile('credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err);
            authorize(JSON.parse(content), listRecipes);
			authorize(JSON.parse(content), listNano);
        });
        recipes = [];
		nanos = [];
		return message.reply('Reloading!');
    }

	else if (message.content.startsWith(`${prefix}invite`)) {
		message.reply('Sent in PM!');
		return message.author.send("**Survive LifeAfter Bot Invite Link**\n<https://discord.com/oauth2/authorize?client_id=668573457147101195&scope=bot&permissions=8>");
	}

    else if (message.content.startsWith(`${prefix}help`)) {
        return message.channel.send(helpEmbed);
    }

	else if (message.content.startsWith(`${prefix}nano`)) {
		var args = argu.join(" ");

		if (!args) return message.channel.send("<http://bit.ly/LAnanoplastic>");

		var finalNano =  returnNano(args);

		if (finalNano === "No such item found.") {
			return message.channel.send(finalNano);
		}

		var itemName = finalNano[0];
		var itemMinNano1 = finalNano[1];
		var itemMaxNano1 = finalNano[2];
		var itemMinNano2 = finalNano[3];
		var itemMaxNano2 = finalNano[4];
		var itemMinNano3 = finalNano[5];
		var itemMaxNano3 = finalNano[6];

		return message.channel.send("**Item**: " + itemName + "\n\n**Nanoplastic 1**: " + itemMinNano1 + " - " + itemMaxNano1 + "\n**Nanoplastic 2**: " + itemMinNano2 + " - " + itemMaxNano2 + "\n**Nanoplastic 3**: " + itemMinNano3 + " - " + itemMaxNano3);
	}

	else if (message.content.startsWith(`${prefix}recipe`)) {
		var args = argu.join(" ");

		if (!args) return message.channel.send("<http://bit.ly/LArecipe>");

		var finalRecipe =  returnRecipe(args);

		if (finalRecipe === "No such recipe found.") {
			return message.channel.send(finalRecipe);
		}

		var recipeName = finalRecipe[0];
		var recipeIngredients = finalRecipe[1];
		var recipeStats = finalRecipe[2];

		const canvas = createCanvas(700, 250);
		const ctx = canvas.getContext('2d');

		const background = await loadImage('./wallpaper.png');
		ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

		ctx.textAlign = 'center';
		ctx.font = '42px Roboto';
		ctx.fillStyle = '#73260D';
		ctx.fillText(recipeName, canvas.width / 2, canvas.height / 2 - 50);
		ctx.font = '24px Roboto';
		ctx.fillStyle = '#61210B';
		ctx.fillText(recipeIngredients, canvas.width / 2, canvas.height / 2 + 15);

		var recipeStatsFormatted = getLines(ctx, recipeStats, canvas.width);

		if (recipeStatsFormatted.length == 1) {
			ctx.font = '20px Roboto';
			ctx.fillStyle = '#B33B14';
			ctx.fillText(recipeStats, canvas.width / 2, canvas.height / 2 + 60);
		}
					
		else {
			ctx.font = '20px Roboto';
			ctx.fillStyle = '#B33B14';
			ctx.fillText(recipeStatsFormatted[0], canvas.width / 2, canvas.height / 2 + 60);
			ctx.fillText(recipeStatsFormatted[1], canvas.width / 2, canvas.height / 2 + 80);
		}

		const attachment = new Discord.MessageAttachment(canvas.toBuffer(), "recipe.png");

		return message.channel.send("", attachment);
	}
})

function getLines(ctx, text, maxWidth) {
    var words = text.split(" ");
    var lines = [];
    var currentLine = words[0];

    for (var i = 1; i < words.length; i++) {
        var word = words[i];
        var width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

let recipes = [];
let nanos = [];

function listNano(auth) {
	const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.get({
        spreadsheetId: '19Y1tZdekS7OOAr6Bii3K_E8wskNudagu1H3wmQ_CzjI',
        range: 'Nanoplastic Conversion!B3:I125',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            rows.map((row) => {
                nanos.push(`${row[0]}; ${row[2]}; ${row[3]}; ${row[4]}; ${row[5]}; ${row[6]}; ${row[7]}`);
            });
        } else {
            console.log('No data found.');
        }
        console.log("Items: " + nanos.length);
    });
}

function returnNano(name) {
    var i;
    for (i = 0; i < nanos.length; i++) {
        let item = nanos[i].split("; ");
        if (item[0].toUpperCase() === name.toUpperCase())
            return [item[0], item[1], item[2], item[3], item[4], item[5], item[6]];
    }
    var item = new Array(nanos.length);
    var item2 = new Array(nanos.length);
    for (i = 0; i < nanos.length; i++) {
        item[i] = nanos[i].split("; ");
        item2[i] = item[i][0];
    }
    const options = {
        includeScore: true
    }
    const fuse = new Fuse(item2, options);
    const result = fuse.search(name);
    const finalItem = Object.values(result[0]);
    return [item[finalItem[1]][0], item[finalItem[1]][1], item[finalItem[1]][2], item[finalItem[1]][3], item[finalItem[1]][4], item[finalItem[1]][5], item[finalItem[1]][6]];
}

function listRecipes(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.get({
        spreadsheetId: '19Y1tZdekS7OOAr6Bii3K_E8wskNudagu1H3wmQ_CzjI',
        range: 'Recipe List!B3:D387',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            rows.map((row) => {
                recipes.push(`${row[0]}; ${row[1]}; ${row[2]}`);
            });
        } else {
            console.log('No data found.');
        }
        console.log("Recipes: " + recipes.length);
    });
}

function returnRecipe(name) {
	if (name === 'random') {
		let randomDish = recipes[Math.floor(Math.random() * (recipes.length - 1))].split("; ");
		return [randomDish[0], randomDish[1], randomDish[2]];
	}
    var i;
    for (i = 0; i < recipes.length; i++) {
        let dish = recipes[i].split("; ");
        if (dish[0].toUpperCase() === name.toUpperCase())
            return [dish[0], dish[1], dish[2]];
    }
    var dish = new Array(recipes.length);
    var dish2 = new Array(recipes.length);
    for (i = 0; i < recipes.length; i++) {
        dish[i] = recipes[i].split("; ");
        dish2[i] = dish[i][0];
    }
    const options = {
        includeScore: true
    }
    const fuse = new Fuse(dish2, options);
    const result = fuse.search(name);
    const finalDish = Object.values(result[0]);
    return [dish[finalDish[1]][0], dish[finalDish[1]][1], dish[finalDish[1]][2]];
}

const getDefaultChannel = (guild) => {
	// get "original" default channel
	if(guild.channels.cache.has(guild.id))
	return guild.channels.cache.get(guild.id)

	// Check for a "general" channel, which is often default chat
	const generalChannel = guild.channels.cache.find(channel => channel.name === "general");
	if (generalChannel) return generalChannel;

	// Now we get into the heavy stuff: first channel in order where the bot can speak
	// hold on to your hats!
	return guild.channels.cache
	.filter(c => c.type === "text" &&
		c.permissionsFor(guild.client.user).has("SEND_MESSAGES"))
	.sort((a, b) => a.position - b.position ||
		Long.fromString(a.id).sub(Long.fromString(b.id)).toNumber())
	.first();
}

bot.login(token2);
