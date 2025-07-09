const readline = require('node:readline');
const fs = require('fs');
const fsPromises = require('fs').promises;
const chalk = require('chalk');
const JSONbig = require('json-bigint');
const process = require('node:process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function ask(question){
    rl.resume();
    return new Promise((resolve,reject)=>{
        rl.question(question, (answer) => {
            rl.pause();
            resolve(answer);
        });
    });
};


async function parseChannel(channel) {
    let messages = [];
    let messagesjson;
    try{
        messagesjson = await fsPromises.readFile(`./messages/${channel}/messages.json`);
    }catch(err){
        return null;
    };
    
    for(const msg of JSONbig.parse(messagesjson)){
        let messageId = msg["ID"].toString();
        if(messageId !== undefined){
            messages.push(messageId);
        };
    };
    return messages;
};

async function parseCSV(allMessages) {
    let resultCSV = `channelid,messageid\n`;
    for(const key of Object.keys(allMessages)){
        let content = allMessages[key];
        for(const idcik of content){
            resultCSV+=`${key},${idcik}\n`;
        };
    };
    return resultCSV;
};

async function  wait(ms) {
    return new Promise((resolve,reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
};

async function dumpChannelIds() {
    let channelsList = null;
    do{
        const channelsListFN = await ask(chalk.white("Enter the file that contains the list of channel ids.\n> "));

        let exists = fs.existsSync(`./${channelsListFN}`);

        if(!exists){
            console.log("The filename you provied doesn't exist.");
            continue;
        };

        try{
            channelsList = await fsPromises.readFile(`./${channelsListFN}`,'utf-8');
        }catch(err){
            console.log(`Error occured while getting the channels list: ${err}`);
            await wait(2000);
            process.exit();
        };
    }while(channelsList===null);
    let channels = channelsList.replaceAll(`\r`,``).split(`\n`);

    if(!fs.existsSync(`./messages`)){
        console.log(`Messages folder is not found. Make sure your messages folder is named "messages".`);
        await wait(2000);
        process.exit();
    };

    let channelFolders = await fsPromises.readdir(`./messages`);

    let allMessages = {};

    for(const channel of channelFolders){
        let channelId = String(channel).replace(`c`,``);

        if(channels.includes(channelId)){
            let parsedData = await parseChannel(channel);
            if(parsedData !== null){
                allMessages[channelId] = parsedData;
            };
        };

    };
    console.log(chalk.green(`Dump complete!`));
    const csvData = await parseCSV(allMessages);
    try{
        await fsPromises.writeFile(`./messages.csv`,csvData);
    }catch(err){
        console.log(chalk.red(`An error occured: ${err}`));
        await wait(3000);
        process.exit(1);
    };
};

async function dumpAll(){
    if(!fs.existsSync(`./messages`)){
        console.log(`Messages folder is not found. Make sure your messages folder is named "messages".`);
        await wait(3000);
        process.exit();
    };

    let channelFolders = await fsPromises.readdir(`./messages`);

    let allMessages = {};

    for(const channelFolder of channelFolders){
        let channelId = String(channelFolder).replace("c","");
        let parsedData = await parseChannel(channelFolder);
        if(parsedData !== null){
            allMessages[channelId] = parsedData;
        };
    };

    const csvData = await parseCSV(allMessages);
    try{
        await fsPromises.writeFile(`./messages.csv`,csvData);
    }catch(err){
        console.log(chalk.red(`An error occured: ${err}`));
        await wait(3000);
        process.exit(1);
    };
    console.log(chalk.green(`Dump complete!`))
    await wait(1000);

};
(async () => {
    let option = null;

    do{
        const optionans = await ask(chalk.white("Please enter the action you want to do.\n1: Dump All Messages\n2: Dump from Channel Ids\n> "));

        switch(Number(optionans)){
            case 1:
                option = optionans;
                dumpAll();
                break;
            case 2:
                option = optionans;
                dumpChannelIds();
                break;
            default:
                option = null;
                console.log("Please enter a valid option.");
                break;
        }
    }while(option===null);
})();