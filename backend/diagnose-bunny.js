#!/usr/bin/env node
/**
 * Bunny.net Integration Diagnostic Tool
 * This script checks if your Bunny.net credentials are valid and properly configured
 */

require('dotenv').config();
const axios = require('axios');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  error: (msg) => console.log(`${colors.red}❌ ERROR: ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ SUCCESS: ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  WARNING: ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  INFO: ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n${colors.bold}${msg}${colors.reset}\n${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
};

async function diagnose() {
  log.header('BUNNY.NET INTEGRATION DIAGNOSTIC');

  // 1. Check environment variables
  log.header('1. Environment Variables Check');

  const envVars = {
    BUNNY_API_KEY: process.env.BUNNY_API_KEY,
    BUNNY_STORAGE_API_KEY: process.env.BUNNY_STORAGE_API_KEY,
    BUNNY_VIDEO_LIBRARY_ID: process.env.BUNNY_VIDEO_LIBRARY_ID,
    BUNNY_STORAGE_ZONE_NAME: process.env.BUNNY_STORAGE_ZONE_NAME,
    BUNNY_STORAGE_DOMAIN: process.env.BUNNY_STORAGE_DOMAIN
  };

  let allVarsSet = true;
  for (const [key, value] of Object.entries(envVars)) {
    if (!value) {
      log.error(`${key} is NOT set`);
      allVarsSet = false;
    } else {
      const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
      log.success(`${key} = ${displayValue}`);
    }
  }

  if (!allVarsSet) {
    log.error('Missing environment variables. Update your .env file.');
    return;
  }

  // 2. Validate credential format
  log.header('2. Credential Format Validation');

  const apiKey = process.env.BUNNY_API_KEY || process.env.BUNNY_STORAGE_API_KEY;
  
  if (!apiKey) {
    log.error('No API key found in BUNNY_API_KEY or BUNNY_STORAGE_API_KEY');
    return;
  }

  // Bunny API keys are typically longer and have UUID format or alphanumeric
  if (apiKey.length < 20) {
    log.warning(`API key seems too short (${apiKey.length} chars). Bunny keys are typically 32+ characters.`);
  } else {
    log.success(`API key length looks valid (${apiKey.length} chars)`);
  }

  const libraryId = process.env.BUNNY_VIDEO_LIBRARY_ID;
  if (!libraryId || isNaN(libraryId)) {
    log.error(`BUNNY_VIDEO_LIBRARY_ID is invalid: "${libraryId}". Should be numeric.`);
  } else {
    log.success(`BUNNY_VIDEO_LIBRARY_ID is numeric: ${libraryId}`);
  }

  const storageZone = process.env.BUNNY_STORAGE_ZONE_NAME;
  if (!storageZone || !/^[a-zA-Z0-9-]+$/.test(storageZone)) {
    log.error(`BUNNY_STORAGE_ZONE_NAME format invalid: "${storageZone}"`);
  } else {
    log.success(`BUNNY_STORAGE_ZONE_NAME format looks valid: ${storageZone}`);
  }

  // 3. Test Video API Connection
  log.header('3. Testing Bunny Stream Video API');

  try {
    const response = await axios.get(
      `https://video.bunnycdn.com/library/${libraryId}`,
      {
        headers: { AccessKey: apiKey },
        timeout: 10000
      }
    );

    if (response.status === 200) {
      log.success('✅ Successfully connected to Bunny Stream Video API');
      log.info(`Library details: ${JSON.stringify(response.data, null, 2)}`);
    }
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.Message || error.message;
    
    if (status === 401 || status === 403) {
      log.error(`Authentication failed (${status}). Your API key or Library ID is invalid.`);
      log.info(`Response: ${JSON.stringify(error.response?.data)}`);
    } else if (status === 404) {
      log.error(`Library not found (404). Check your BUNNY_VIDEO_LIBRARY_ID: ${libraryId}`);
    } else {
      log.error(`API request failed: ${status} - ${message}`);
    }
  }

  // 4. Test Storage API Connection
  log.header('4. Testing Bunny Storage API');

  try {
    const storageZone = process.env.BUNNY_STORAGE_ZONE_NAME;
    const response = await axios.get(
      `https://storage.bunnycdn.com/${storageZone}`,
      {
        headers: { AccessKey: apiKey },
        timeout: 10000
      }
    );

    log.success('✅ Successfully connected to Bunny Storage API');
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.Message || error.message;
    
    if (status === 401 || status === 403) {
      log.error(`Authentication failed (${status}). Storage API key is invalid.`);
      log.info(`Check if BUNNY_STORAGE_API_KEY is the same as BUNNY_API_KEY`);
    } else if (status === 404) {
      log.error(`Storage zone not found (404). Check BUNNY_STORAGE_ZONE_NAME: ${storageZone}`);
    } else {
      log.error(`Storage API request failed: ${status} - ${message}`);
    }
  }

  // 5. Create test video
  log.header('5. Testing Video Creation');

  try {
    const response = await axios.post(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      { title: 'emare-diagnostic-test-video' },
      {
        headers: {
          AccessKey: apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const videoId = response.data?.guid || response.data?.videoId;
    if (videoId) {
      log.success(`✅ Successfully created test video: ${videoId}`);
      log.info(`You can view it at: https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`);
    } else {
      log.warning('Video created but no ID returned. Response: ' + JSON.stringify(response.data));
    }
  } catch (error) {
    log.error(`Failed to create test video: ${error.message}`);
    if (error.response?.data) {
      log.info(`Error details: ${JSON.stringify(error.response.data)}`);
    }
  }

  log.header('✅ DIAGNOSTIC COMPLETE');
  console.log('\n' + colors.bold + 'Summary:' + colors.reset);
  console.log('If all tests passed, your Bunny integration is working correctly.');
  console.log('If any test failed, check the error messages above and update your credentials.\n');
}

diagnose().catch(err => {
  log.error('Diagnostic failed: ' + err.message);
  process.exit(1);
});
