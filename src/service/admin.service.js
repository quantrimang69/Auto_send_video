require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const { parse } = require("csv-parse");
const moment = require('moment');
const helperFn = require('../utils/helperFn');
const {RESPONSE} = require('../constants/constants');
const {
  crawPageViet69, crawPageSexDiary
} = require('../utils/crawlPage');
const VideoModel = require('../models/video');

const today = moment().toDate();

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
      }, websiteURL, today);
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
      }, websiteURL, today);
    },
  },
];

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



async function writeNewVideo(clipLinks) {

  for (const clipLink of clipLinks) {
    const video = new VideoModel({
      source: clipLink.source,
      href: clipLink.href,
      title: clipLink.title,
      date: clipLink.date,
    });

    await video.save();
  }

  console.log('Data has been written to the CSV file');
}


async function readExistingData() {
  try {
    const videos = await VideoModel.find({}).exec();
    // console.log('All videos:', videos);
    return videos;
  } catch (err) {
    console.error('Error reading videos:', err);
    throw err; // Re-throw the error to be caught by the calling code
  }
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


async function deleteOldVideos() {
  try {
    const fiveDaysAgo = moment().subtract(5, 'days').toDate();
    const result = await VideoModel.deleteMany({ date: { $lt: fiveDaysAgo } }).exec();

    return result;
  } catch (error) {
    console.error('Error deleting old videos:', error);
    throw error;
  }
}


const updateNewVideo = async (req) => {
  try {
    const newData = await crawlVideos(websitesToCrawl);
    const existingData = await readExistingData()
    const difference = findDifferences(newData, existingData)
    // If there are differences, send an email and write the new data to the CSV file
    if (difference.length > 0) {
      helperFn.sendEmail(difference);
      writeNewVideo(difference);
      deleteOldVideos();
      return RESPONSE.SEND_EMAIL_SUCCESSFULLY;
    }else {
      helperFn.sendEmail('No new video');
      deleteOldVideos();
      return RESPONSE.SEND_EMAIL_SUCCESSFULLY;
    }
  } catch (error) {
    console.error('Error:', error);
  }
};


module.exports = {
  updateNewVideo
}