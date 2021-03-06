const puppeteer = require('puppeteer');
const { Telegraf } = require('telegraf')
var dotenv = require('dotenv');

dotenv.config();

let lastTest = {};
let finito = false;
let toWait = 10;
const bot = new Telegraf(process.env.BOT_TOKEN)

async function doUrl(url) {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })



    const page = await browser.newPage();

    while (true) {

        if (finito) {
            browser.close()
            sendMessage("CLOSING");
            return;
        }

        try {
            await page.goto(url);

            //LOGIN
            if (page.url().indexOf("idp.unitn.it/idp/profile/SAML2") >= 0) {
                let iid = Math.random()
                sendMessage("LOGGANDO " + iid);
                console.log(process.env.EMAIL);

                await sleep(1000);
                page.type("input#clid.form-control", process.env.EMAIL);
                await sleep(500);
                page.type("input#inputPassword", process.env.PASSWORD);
                await sleep(500);
                page.click("#btnAccedi")
                await sleep(2000);
                sendMessage("LOGGATO " + iid);
            }

            let tent = 0;
            while (page.url().indexOf("esse3.unitn.it/auth/studente/Appelli") < 0) {
                tent++;
                if (tent > 20)
                    throw Error("Not logged");
                await sleep(500);
            }
            await sleep(4000);

            //CLICCA
            page.click("#btnSalva");
            tent = 0;
            while (page.url().indexOf("esse3.unitn.it/auth/studente/Appelli/EffettuaPrenotazioneAppello") < 0) {
                tent++;
                if (tent > 20)
                    throw Error("Not logged");
                await sleep(500);
            }
            await sleep(4000);

            const element = await page.$("#app-text_esito_pren_msg");
            const text = await page.evaluate(element => element.textContent, element);
            if (text.indexOf("Prenotazione già effettuata") >= 0) {
                sendMessage("FATTO");
                finito = true;
            }
            lastTest[url] = new Date();
            console.log("TENTATIVO FATTO");

        } catch (err) {
            sendMessage("An error");
        }
        await sleep(toWait * 1000);
    }

};


function sleep(d) {
    return new Promise(r => setTimeout(r, d));
}

function sendMessage(text) {
    console.log(text);
    try {
        bot.telegram.sendMessage(process.env.CHAT_ID, text);
    } catch (err) {
        console.log(err);
    }
}

bot.command('set', (ctx) => {
    if (ctx.message.text <= 5)
    {
        ctx.reply("Format not valid");
        return;
    }
    
    let int = +ctx.message.text.substring(4)
    if (int && int > 1)
    {
        toWait = Math.floor(int);
        ctx.reply("OK " + int);
    }
    else
    {
        ctx.reply("Number not valid");
    }
});

bot.on("message", (ctx) => ctx.reply("Last test:\n" + Object.keys(lastTest).map(k => lastTest[k]).join("\n")))
bot.launch();

(async () => {
    let esami = process.env.ESAMI_URLS.split(",");
    for (let i = 0; i < esami.length; i++) {
        doUrl(esami[i]);
        await sleep(5000);
    }
})();