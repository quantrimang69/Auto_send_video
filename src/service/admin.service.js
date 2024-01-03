const puppeteer = require('puppeteer');
const fs = require('fs');
const { parse } = require("csv-parse");
require('dotenv').config();
const helperFn = require('../utils/helperFn');
const {RESPONSE} = require('../constants/constants');
const {
  crawPageViet69, crawPageSexDiary
} = require('../utils/crawlPage');

const csvFilePath = 'video_data.csv';
async function crawlVideos(websites) {
  const results = [];

  for (const { websiteURL, crawlMethod } of websites) {
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: "new",
      });
      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(90000);
      await page.goto(websiteURL);

      const clipLinks = await crawlMethod(page, websiteURL);

      results.push(...clipLinks);
    } catch (error) {
      console.error(`Error during crawling ${websiteURL}:`, error);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  return results;
}

const websitesToCrawl = [
  {
    websiteURL: crawPageViet69.websiteURL,
    crawlMethod: async (page, websiteURL) => {
      // Custom logic for crawling website1
      return page.$$eval(crawPageViet69.tagToCrawl, (links, websiteURL, today) => {
        return links.map(link => ({
          source: websiteURL,
          href: link.getAttribute('href'),
          title: link.getAttribute('title'),
          date: today,
        }));
      }, websiteURL, new Date().toLocaleDateString('en-GB'));
    },
  },
  {
    websiteURL: crawPageSexDiary.websiteURL,
    crawlMethod: async (page, websiteURL) => {
      // Custom logic for crawling website1
      return page.$$eval(crawPageSexDiary.tagToCrawl, (links, websiteURL, today) => {
        return links.map(link => ({
          source: websiteURL,
          href: link.getAttribute('href'),
          title: link.getAttribute('title'),
          date: today,
        }));
      }, websiteURL, new Date().toLocaleDateString('en-GB'));
    },
  },
];

function writeDataToCSV(newData) {
  // Ensure the CSV file has the header row
  const headerRow = "source,href,title,date\n";

  // Create the CSV content
  const csvContent = '\ufeff' + headerRow + newData.map(record => `${record.source},${record.href},${record.title},${record.date}`).join('\n');

  // Write the CSV content to the file
  fs.writeFileSync(csvFilePath, csvContent, 'utf8');

  console.log('Data has been written to the CSV file');
}


async function readExistingData(csvFilePath) {
  return new Promise((resolve, reject) => {
    let data = [];

    fs.createReadStream(csvFilePath)
      .pipe(
        parse({
          delimiter: ",",
          columns: true,
          ltrim: true,
        })
      )
      .on("data", function (row) {
        data.push(row);
      })
      .on("error", function (error) {
        console.log('Error reading existing data:', error.message);
        reject(error);
      })
      .on("end", function () {
        resolve(data);
      });
  });
}


function findDifferences(newData, existingData) {
  const differences = [];

   // Iterate through new records
   for (const newRecord of newData) {
    
    // Check if there is a record with the same href in existing records
    const existingRecord = existingData.find(
      (record) => {
        return record.href === newRecord.href
      }
    );

    // If not found, add it to the differences
    if (!existingRecord) {
      differences.push(newRecord);
    }
  }
  
  return differences;
}



const updateNewVideo = async (req) => {
  const csvFilePath = 'video_data.csv';
  try {
    const newData = await crawlVideos(websitesToCrawl);
    const existingData = await readExistingData(csvFilePath)
    const difference = findDifferences(newData, existingData)
    // If there are differences, send an email and write the new data to the CSV file
    if (difference.length > 0) {
      helperFn.sendEmail(difference);
      writeDataToCSV(newData);
      return RESPONSE.SEND_EMAIL_SUCCESSFULLY;
    }else if(difference.length === 0) {
      helperFn.sendEmail('No new video');
      return RESPONSE.SEND_EMAIL_SUCCESSFULLY;
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

module.exports = {
  updateNewVideo
}