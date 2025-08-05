const readline = require('node:readline');
const fs = require('fs');
const fsPromises = require('fs').promises;
const chalk = require('chalk');
const JSONbig = require('json-bigint');
const process = require('node:process');
const inquirer = require('inquirer');
const prompt = inquirer.createPromptModule();

function extractChannelId(chanStr){
    return chanStr.startsWith("c")?chanStr.slice(1):chanStr;
}

async function parseChannel(channel) {
    let messages = [];
    let messagesjson;
    try{
        messagesjson = await fsPromises.readFile(`./messages/${channel}/messages.json`);
    }catch(err){
        return null;
    }
    
    for(const msg of JSONbig.parse(messagesjson)){
        if(msg["ID"] != null){
            messages.push(msg["ID"].toString());
        }
    }
    return messages;
}

async function parseCSV(allMessages) {
    let resultCSV = `channelid,messageid\n`;
    for(const key of Object.keys(allMessages)){
        let content = allMessages[key];
        for(const idcik of content){
            resultCSV+=`${key},${idcik}\n`;
        }
    }
    return resultCSV;
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(() => {resolve();}, ms));
}

async function dumpChannelIds() {
    const allFilesInDir = await fsPromises.readdir('./');
    const txtFiles = allFilesInDir.filter((val) => val.endsWith(".txt"));
    const channelsListPrompt = await prompt([
        {
            type: 'list',
            name: "filename",
            message:chalk.white("Enter the file that contains the list of channel ids."),
            choices:txtFiles
        }
    ])

    const channelsListFN = channelsListPrompt.filename;

    let exists = fs.existsSync(`./${channelsListFN}`);

    if(!exists){
        console.log("The filename you provided doesn't exist.");
        await wait(2000);
        process.exit();
    }

    let channelsList;

    try{
        channelsList = await fsPromises.readFile(`./${channelsListFN}`,'utf-8');
    }catch(err){
        console.log(`Error occurred while getting the channels list: ${err}`);
        await wait(2000);
        process.exit();
    }

    let channels = channelsList.split(/\r?\n/).filter(line => line.trim() !== "");

    if(!fs.existsSync(`./messages`)){
        console.log(`Messages folder is not found. Make sure your messages folder is named "messages".`);
        await wait(2000);
        process.exit();
    }

    let channelFolders = await fsPromises.readdir(`./messages`);

    let allMessages = {};

    for(const channel of channelFolders){
        let chanStr = String(channel);
        let channelId = extractChannelId(chanStr);

        if(channels.includes(channelId)){
            let parsedData = await parseChannel(channel);
            if(parsedData !== null){
                allMessages[channelId] = parsedData;
            }
        }

    }
    console.log(chalk.green(`Dump complete!`));
    const csvData = await parseCSV(allMessages);

    try{
        await fsPromises.writeFile(`./messages.csv`,csvData);
    }catch(err){
        console.log(chalk.red(`An error occurred: ${err}`));
        await wait(3000);
        process.exit(1);
    }
};

async function dumpAll(){
    if(!fs.existsSync(`./messages`)){
        console.log(`Messages folder is not found. Make sure your messages folder is named "messages".`);
        await wait(3000);
        process.exit();
    }

    let channelFolders = await fsPromises.readdir(`./messages`);

    let allMessages = {};
    
    for(const channelFolder of channelFolders){
        let chanStr = String(channelFolder);
        let channelId = extractChannelId(chanStr);
        let parsedData = await parseChannel(channelFolder);
        if(parsedData !== null){
            allMessages[channelId] = parsedData;
        }
    }

    const csvData = await parseCSV(allMessages);
    try{
        await fsPromises.writeFile(`./messages.csv`,csvData);
    }catch(err){
        console.log(chalk.red(`An error occured: ${err}`));
        await wait(3000);
        process.exit(1);
    }
    console.log(chalk.green(`Dump complete!`));
    await wait(1000);
};

(async () => {
    let option = null;

    do{
        const optionans = await prompt([
            {
                type:"list",
                name:"action",
                message:chalk.white("Please enter the action you want to do."),
                choices:[
                    {name: "1: Dump All Messages", value: 1},
                    {name: "2: Dump from Channel Ids", value: 2},
                ]
            }
        ]);

        option = optionans.action;

        switch(option){
            case 1:
                await dumpAll();
                break;
            case 2:
                await dumpChannelIds();
                break;
            default:
                option = null;
                console.log("Invalid option.");
                break;
        }
    }while(option===null);
})();

module.exports = {
    dumpAll,
    dumpChannelIds
};