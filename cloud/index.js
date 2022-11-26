require('dotenv').config({
  allowEmptyValues: true
});

const puppeteer = require('puppeteer');
const https = require('https');
const { Client, GatewayIntentBits, AttachmentBuilder, EmbedBuilder, Events } = require('discord.js');
const Parse = require('parse/node');

Parse.initialize(process.env.BACKAPPID, process.env.BACKAPPJS);
Parse.serverURL = 'https://parseapi.back4app.com/';




var browser;
var page;
var all_cars = [];

const puppetInit = async () => {
  browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  page = await browser.newPage();
}
try {
  puppetInit();
} catch (error) {
  console.log(error)
}


let premiumUsers = [
  "-TiagoXavi-479266700462653440-"
]
let allowedDiscordUsers = premiumUsers.map(x => {
  return x.split("-").filter(x => x !== "").pop();
})

// get database cars
var url = 'https://raw.githubusercontent.com/TiagoXavi/topdrives-records/main/src/database/cars_final.json';
try {
  https.get(url, function(res){
    var body = '';

    res.on('data', function(chunk){
      body += chunk;
    });

    res.on('end', function(){
      if (res.statusCode === 200) {
        var fbResponse = JSON.parse(body);
        all_cars = fbResponse.map((x, ix) => {
          return {
            name: `RQ${x.rq} ${x.name}`,
            rid: x.rid,
            index: ix
          };
        })
        // all_cars;
        // console.log("Got a response: ", fbResponse.picture);
      } else {
        console.log('Status:', res.statusCode);
      }
    });
  }).on('error', function(e){
      console.log("Got an error: ", e);
  });
} catch (error) {
  console.log(error)
}


const discord_token = process.env.DISCORD_TOKEN;
const dclient = new Client({ intents: [GatewayIntentBits.Guilds] });
dclient.once('ready', () => {
	console.log('Discord ready!');
});


dclient.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
  if (process.env.NODE_ENV !== 'production') return;

  try {
    // console.log(JSON.stringify(interaction));
  
    if (interaction.commandName === 'tune') {
      if (!allowedDiscordUsers.includes(interaction.user.id)) {
        await interaction.reply({ content: "Sorry, this command isn't available for you", ephemeral: true });
        return;
      }

      // await interaction.reply({ content: 'Loading...', ephemeral: false });
      let param = Number(interaction.options._hoistedOptions[0].value);


      let buf = await puppet(all_cars[param].rid);
      // console.log(buf);
      const file = new AttachmentBuilder(buf, 'img.png');
      const exampleEmbed = new EmbedBuilder().setImage(`attachment://img.png`);

      await interaction.editReply({ content: `**${all_cars[param].name}**\nGenerated using TDR bot 💛`, ephemeral: false, components: [], files: [file] });
      // await interaction.followUp({ content: `${selected}`, components: [], files: [file] });
      // await interaction.reply({ content: 'Select the car', ephemeral: true });
      // const row = new ActionRowBuilder()
      //   .addComponents(
      //     new SelectMenuBuilder()
      //       .setCustomId('select')
      //       .setPlaceholder('Nothing selected')
      //       .addOptions(
      //         {
      //           label: 'Select me',
      //           description: 'This is a description',
      //           value: 'first_option',
      //         },
      //         {
      //           label: 'You can select me too',
      //           description: 'This is also a description',
      //           value: 'second_option',
      //         },
      //       ),
      //   );
      // await interaction.editReply({ content: 'Select the car', ephemeral: true, components: [row] });
    }
    if (interaction.commandName === 'user') {
      await interaction.reply(`-${interaction.user.username}-${interaction.user.id}-`);
    }
  } catch (error) {
    console.log(error);
  }
});


// dclient.on(Events.InteractionCreate, async interaction => {
// 	if (!interaction.isSelectMenu()) return;

//   try {
//     // console.log(JSON.stringify(interaction));
  
//     if (interaction.customId === 'select') {
//       const selected = interaction.values[0];
//       await interaction.deferUpdate();
//       await interaction.editReply({ content: 'Loading...', ephemeral: true, components: [] });
//       // await new Promise(r => setTimeout(r, 4000));
//       let buf = await puppet();
//       // console.log(buf);
//       const file = new AttachmentBuilder(buf, 'img.png');
//       const exampleEmbed = new EmbedBuilder().setImage(`attachment://img.png`);
  
//       await interaction.editReply({ content: 'Generated using TDR bot 💛', ephemeral: true, components: [] });
//       await interaction.followUp({ content: `${selected}`, components: [], files: [file] });
//     }
//   } catch (error) {
//     console.log(error);
//   }
// });

dclient.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isAutocomplete()) return;
  // if (process.env.NODE_ENV !== 'production') return;


  try {
    if (interaction.commandName === 'tune') {
      let searchStr = interaction.options._hoistedOptions[0].value;
      searchStr = searchStr.trim().toLowerCase().replace(/  +/g, ' ').normalize('NFD').replace(/\p{Diacritic}/gu, "");
      console.log(searchStr);

      let result = [];

      all_cars.map((x, ix) => {
        if (result.length < 200) {

          let shouldPush = false;
          let prePush;
          if (searchStr && searchStr !== "") {
            strIndex = x.name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, "").indexOf(searchStr);
          } else {
            strIndex = -2;
          }
          if (strIndex > -1) {
            shouldPush = true;
          }

          if (shouldPush) {
            prePush = JSON.parse(JSON.stringify(x));
            prePush.locatedIndex = strIndex;
            if (x.name[strIndex - 1] === ' ') {
              prePush.locatedPlus = true;
            }

            result.push(prePush);
          }

        }
      })

      result.sort(function(a, b) {
        if (a.locatedPlus && !b.locatedPlus) return -1;
        if (b.locatedPlus && !a.locatedPlus) return 1;
        return a.locatedIndex - b.locatedIndex;
      });

      result = result.filter((x, ix) => ix < 5);
      result = result.map(x => ({ name: x.name, value: `${x.index}` }))

      await interaction.respond(result);

    }
  } catch (error) {
    console.error(error);
  }
});


try {
  dclient.login(discord_token);
} catch (error) {
  console.log(error);
}



const puppet = async (rid) => {

  await page.goto(`https://www.topdrivesrecords.com?share=~KcarPark_a00~KgForce_a00~Khairpin_a00~KindoorKart_a00~Kkart_a00~Kslalom_a00~KtCircuit_a00~KtRoad_a00~Kfast_a00~C${rid}~T323~C${rid}~T233`);
  await page.waitForSelector(".Car_Header:not(.Car_Loading):not(.Car_AddHeader)");
  await page.evaluate(() => {
    document.querySelector(".Main_Body").classList.add("Main_BodyPrint");
  });

  let imageBuffer = await page.screenshot({
    type: 'png',
    clip: {
      x: 0,
      y: 0,
      width: 660,
      height: 511,
    },
    omitBackground: true,
  });

  // await page.click(".Main_CornerMid > button:nth-child(2)");
  // await page.waitForSelector(".Main_ShareDownloadBox");
  // await page.click(".Main_ShareDownloadBox");

  // Type into search box.
  // await page.type('.devsite-search-field', 'Headless Chrome');

  // // Wait for suggest overlay to appear and click "show all results".
  // const allResultsSelector = '.devsite-suggest-all-results';

  // // Wait for the results page to load and display the results.
  // const resultsSelector = '.gsc-results .gs-title';
  // await page.waitForSelector(resultsSelector);

  // // Extract the results from the page.
  // const links = await page.evaluate(resultsSelector => {
  //   return [...document.querySelectorAll(resultsSelector)].map(anchor => {
  //     const title = anchor.textContent.split('|')[0].trim();
  //     return `${title} - ${anchor.href}`;
  //   });
  // }, resultsSelector);

  // // Print all the files.
  // console.log(links.join('\n'));

  // await browser.close();

  // fs.writeFile("test.png", imageBuffer, "binary", function(err) {
  //     if(err) {
  //       console.log(err);
  //     } else {
  //       console.log("The file was saved!");
  //     }
  // });


  return imageBuffer;
}