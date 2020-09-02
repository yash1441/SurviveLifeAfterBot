const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('Locked & Loaded!'));

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));

// ================= START BOT CODE ===================
const Discord = require('discord.js');
const bot = new Discord.Client();
const fs = require('fs');
const readline = require('readline');
const Fuse = require('fuse.js')
const { google } = require('googleapis');
const { createCanvas, loadImage } = require("canvas");
const { registerFont } = require('canvas');
registerFont('fonts/Roboto-Regular.ttf', { family: 'Roboto' });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';

const token = process.env.DISCORD_TOKEN;

const PREFIX = '!';

const version = '2.0.0';

fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), listRecipes);
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
    console.log("Servers:")
    bot.guilds.cache.forEach((guild) => {
        console.log(guild.name);
    });
})

bot.on('message', async message => {
    if (message.content === "HELLO") {
        message.reply('HELLO FRIEND!');
    }

    else if (message.content === "!reloadlist") {
        message.reply('Reloading!');
        console.log('Reloading.');
        fs.readFile('credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err);
            authorize(JSON.parse(content), listRecipes);
        });
        recipes = [];
    }

    else if (message.content === "!help") {
        message.channel.send("**Commands**" + "\n" + "• !recipe <recipe name>" + "\n" + "*Example: !recipe beef ox tripe*");
    }

    var i = message.content.substring(PREFIX.length).indexOf(' ');
    var args = [message.content.substring(PREFIX.length).slice(0, i), message.content.substring(PREFIX.length).slice(i + 1)];

    switch (args[0]) {
        case 'recipe':
            if (!args[1]) return message.reply('Error please define a second argument.');

            var finalRecipe =  returnRecipe(args[1]);

            if (finalRecipe === "No such recipe found.") {
                message.channel.send(finalRecipe);
                break;
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

            message.channel.send("", attachment);

            break;
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

function listRecipes(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.get({
        spreadsheetId: '19Y1tZdekS7OOAr6Bii3K_E8wskNudagu1H3wmQ_CzjI',
        range: 'Recipe List!B3:D302',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            //console.log('Dish, Recipe, Stats:');
            rows.map((row) => {
                recipes.push(`${row[0]}; ${row[1]}; ${row[2]}`);
            });
        } else {
            console.log('No data found.');
        }
        //console.log(recipes);
        //console.log('--------------------');

        console.log("Recipes: " + recipes.length);
    });
}

function returnRecipe(name) {
    var i;
    for (i = 0; i < recipes.length; i++) {
        let dish = recipes[i].split("; ");
        if (dish[0].toUpperCase() === name.toUpperCase())
            //return "**__" + dish[0] + "__**" + "\n\n" + "**Recipe**" + "\n" + dish[1] + "\n\n" + "**Stats**" + "\n" + dish[2];
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
    const finalDish = Object.values(result[0])
    //console.log(dish[finalDish[1]]);
    return [dish[finalDish[1]][0], dish[finalDish[1]][1], dish[finalDish[1]][2]];
}

bot.login(token);