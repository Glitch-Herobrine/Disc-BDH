//const readline = require('node:readline');
const fs = require('fs');
const fsPromises = require('fs').promises;
const chalk = require('chalk');
const JSONbig = require('json-bigint');
const process = require('node:process');
const inquirer = require('inquirer');
const { json } = require('node:stream/consumers');
const cliVersion = require('./package.json').version;

const prompt = inquirer.createPromptModule();
const defaultSettings = {
    messagesFolder:"messages",
    defaultChannelsTxtEnabled:false,
    defaultChannelsTxt:''
}

let settings;

function extractChannelId(chanStr){
    return chanStr.startsWith("c")?chanStr.slice(1):chanStr;
}

async function parseChannel(channel) {
    let messages = [];
    let messagesjson;
    try{
        messagesjson = await fsPromises.readFile(`./${settings["messagesFolder"]}/${channel}/messages.json`);
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
    let channelsListFN;
    if(settings["defaultChannelsTxtEnabled"]===false){
        const channelsListPrompt = await prompt([
            {
                type: 'list',
                name: "filename",
                message:chalk.white("Select the .txt file that contains the list of channel IDs."),
                choices:txtFiles
            }
        ]);
        channelsListFN = channelsListPrompt.filename;
    }else{
        channelsListFN = settings["defaultChannelsTxt"];
    }

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

    if(!fs.existsSync(`./${settings["messagesFolder"]}`)){
        console.log(`Messages folder is not found. Make sure your messages folder is named "${settings["messagesFolder"]||"messages"}".`);
        await wait(2000);
        process.exit();
    }

    let channelFolders = await fsPromises.readdir(`./${settings["messagesFolder"]}`);

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
        process.exit(0);
    }catch(err){
        console.log(chalk.red(`An error occurred: ${err}`));
        await wait(3000);
        process.exit(1);
    }
};

async function dumpAll(){
    if(!fs.existsSync(settings["messagesFolder"])){
        console.log(`Messages folder is not found. Make sure your messages folder is named "${settings["messagesFolder"]}".`);
        await wait(3000);
        process.exit();
    }

    let channelFolders = await fsPromises.readdir(`./${settings["messagesFolder"]}`);

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
        console.log(chalk.red(`An error occurred: ${err}`));
        await wait(3000);
        process.exit(1);
    }
    console.log(chalk.green(`Dump complete!`));
    await wait(1000);
    process.exit(0);
};

async function ctSettingsMenu() {
    const {ctSetting} = await prompt(
    [
        {
            type:'list',
            name:"ctSetting",
            message:chalk.white(`Channels Text File Settings`),
            choices:[
                {
                    name:`[*] Default Channels Text Filename Enabled: ${settings["defaultChannelsTxtEnabled"]?"Yes":"No"}`,
                    value:1,
                },
                {
                    name:`[*] Default Channels Text File Name: "${settings['defaultChannelsTxt']}"`,
                    value:2,
                },
                                            {
                    name:`[*] Go Back`,
                    value:3,
                }
            ]
        }
    ]
);

switch (ctSetting){
    case 1:
        const {dctEnabled} = await prompt(
            [
                {
                    name: "dctEnabled",
                    type: "confirm",
                    message: chalk.white(`Default Channels Filename Enabled?\n${chalk.cyan(`>`)}`)
                }
            ]
        );

        settings["defaultChannelsTxtEnabled"] = dctEnabled;

        await ctSettingsMenu();

        break;
    case 2:
        const {dctName} = await prompt(
            [
                {
                    name: "dctName",
                    type: "input",
                    message: chalk.white(`Default Channels Text File Name:\n${chalk.cyan(`>`)}`)
                }
            ]
        );

        settings['defaultChannelsTxt'] = dctName;

        await ctSettingsMenu();

        break;
    case 3:
        await settingsMenu();

        break;
}
}
async function settingsMenu(){

    const {setting} = await prompt([
        {
            type:"list",
            name:"setting",
            message:chalk.white("Settings:"),
            choices:[
                {
                    name:`[*] Save Settings`,
                    value:3
                },
                {
                    name:`[*] Messages Folder Name: "${settings.messagesFolder}"`,
                    value:1
                },
                {
                    name:`[*] Default Channels Text Filename Settings`,
                    value:2
                },
                {
                    name:`[*] Factory Reset Settings`,
                    value:5,
                },
                {
                    name:`[*] Exit Settings Menu`,
                    value:4,
                },
            ]
        }
    ]);
    
    switch(setting){
        case 1:
            const {newName} = await prompt(
                [
                    {
                        type:"input",
                        name:"newName",
                        message:chalk.white(`Please enter the new name of the messages folder.\n${chalk.cyan(`>`)}`)
                    }
                ]
            );

            settings["messagesFolder"] = newName;

            await settingsMenu();

            break;
        case 2:
            await ctSettingsMenu();
            break;
        case 3:
            await saveSettings("settingsMenu");
            await settingsMenu();
            break;
        case 4:
            await startupMenu();
            break;
        case 5:
            const {confirmation} = await prompt([
                {
                    type:"confirm",
                    message:`${chalk.red(`Are you sure?`)}\n${chalk.cyan(`>`)}`,
                    default:false,
                    name:"confirmation"
                }
            ]);

            if(confirmation === true){
                settings = defaultSettings;
                console.log(chalk.green("Success!"));
                await saveSettings();
                await settingsMenu();
            }
            break;
        default:
            console.log("Please pick a valid option.");
            await settingsMenu();
            break;
    }
}

async function startupMenu() {
    console.log(chalk.blue(`Disc-BDH v${cliVersion}`));
    const optionans = await prompt([
        {
            type:"list",
            name:"action",
            message:chalk.white("Please enter the action you want to do."),
            choices:[
                {name: "[1]: Dump All Messages", value: 1},
                {name: "[2]: Dump from Channel Ids", value: 2},
                {name: "[3]: Settings", value: 3},
            ]
        }
    ]);

    const option = optionans.action;

    switch(option){
        case 1:
            await dumpAll();
            break;
        case 2:
            await dumpChannelIds();
            break;
        case 3:
            await settingsMenu();
            break;
        default:
            console.log("Invalid option.");
            await startupMenu();
            break;
    }
}

function saveSettings(context){
    return new Promise((resolve,reject) => {
        try{
            fs.writeFileSync("./settings.json",JSON.stringify(settings,null,2),{encoding:"utf-8"});
            if(context==="settingsMenu"){
                console.log(chalk.green("✅ Settings saved successfully."));
            }
            resolve();
        }catch(err){
            console.log(`Error occurred: ${err}`);
            reject();
        }
    })
}
process.on("exit", saveSettings);

process.on("SIGINT", saveSettings);

(async () => {
    try{
        let Readensettings = await fsPromises.readFile("./settings.json",'utf-8');
        Readensettings = JSON.parse(Readensettings);
        settings = Readensettings;
    }catch(err){
        settings = defaultSettings;
    }
    await startupMenu();
})();

module.exports = {
    dumpAll,
    dumpChannelIds
};