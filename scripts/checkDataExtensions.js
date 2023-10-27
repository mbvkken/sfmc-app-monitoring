const axios = require('axios');

const SERVER_BASE_URL = process.env.VERCEL_SERVER_BASE_URL || 'http://localhost:3000'; // Adjust this to the address where your server runs
const DATA_EXTENSION_KEYS = process.env.MC_DE_KEYS ? process.env.MC_DE_KEYS.split(',') : [];

async function notifySlack(message, dataExtensionName) {
  try {
    await axios.post(`${SERVER_BASE_URL}/api/sendToSlack`, {
      text: message,
      dataExtensionName: dataExtensionName, // Include dataExtensionName in the payload
    });
    console.log('Slack notification sent:', message);
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

function isValidURL(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

async function checkDataExtension(dataExtensionKey) {
  try {
    const response = await axios.get(`${SERVER_BASE_URL}/api/data-extensions?id=${dataExtensionKey}`);
    const fetchedData = response.data;
    console.log(response.data);

    // Check the total number of records
    if (fetchedData.items.length < 100) {
      const adminPanelURL = "https://mc.s50.exacttarget.com/cloud/#app/Automation%20Studio/AutomationStudioFuel3/";
      const vercelURL = 'https://sfmc-app-monitoring.vercel.app/';
      const message = `Check status <${vercelURL}|here>: On the latest import, the Data Extension "${fetchedData.name}" has ${fetchedData.items.length} records which is less than the expected 100 records. This could be correct, but maybe worth checking out? Head over to <${adminPanelURL}|Automation Studio>`;
      notifySlack(message, fetchedData.name); // Pass dataExtensionName to notifySlack function
    }

    // Check if survey_url is valid for each item
    let invalidURLs = 0;
    for (const item of fetchedData.items) {
      if (!isValidURL(item.values.survey_url)) {
        invalidURLs++;
      }
    }
    if (invalidURLs > 0) {
      const vercelURL = 'https://sfmc-app-monitoring.vercel.app/';
      const message = `Check status <${vercelURL}|here>: ${invalidURLs} or more invalid URLs detected in "${fetchedData.name}"`;
      notifySlack(message, fetchedData.name); // Pass dataExtensionName to notifySlack function
    }

  } catch (err) {
    console.error(`Error occurred while processing Data Extension ${dataExtensionKey}:`, err.message);
  }
}

// Loop through the array of DATA_EXTENSION_KEYS and check each data extension
async function checkDataExtensions(dataExtensionKeys) {
  for (const deKey of dataExtensionKeys) {
    await checkDataExtension(deKey);
  }
}

// Invoke the function to check the data extensions
checkDataExtensions(DATA_EXTENSION_KEYS);
