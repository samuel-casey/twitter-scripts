// PACKAGES
const _ = require('lodash');
const axios = require('axios');
const fs = require('fs');
const Twit = require('twit');
require('dotenv').config();

// USER-SPECIFIC GLOBALS
const KEYWORDS = ['lexfridman'];
const START_DATE = new Date('1/17/21').getTime();
const END_DATE = Date.now();
// STANDARD GLOBALS
const { ACCESS_TOKEN, ACCESS_TOKEN_SECRET, API_KEY, API_KEY_SECRET, BEARER_TOKEN } = process.env;
const TWITTER_API_BASE_URL = 'https://api.twitter.com/2';
const ONE_DAY_MS = 1000 * 3600 * 24;

// INSTANTIATE TWITTER API CONVENIENCE PACKAGE FOR DELETING TWEETS
const T = new Twit({
  consumer_key: API_KEY,
  consumer_secret: API_KEY_SECRET,
  access_token: ACCESS_TOKEN,
  access_token_secret: ACCESS_TOKEN_SECRET,
  timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL: true,     // optional - requires SSL certificates to be valid.
})

// AUTH HEADER FOR USING TWITTER API + AXIOS DIRECTLY (READ-ONLY)
const AUTH_BEARER_HEADER = {
  headers: {
    Authorization: `Bearer ${BEARER_TOKEN}`
  }
}

//// UTILS
const getUserId = async (username) => {
  const queryString = `${TWITTER_API_BASE_URL}/users/by/username/${username}`;
  const res = await axios.get(queryString, AUTH_BEARER_HEADER);
  return res.data.data.id;
};

// returns an array of tweets containing specific keywords
const filterTweetsByKeywords = (tweets, keywords) => {
  const filteredTweets = [];
  // push a flattened array of unique tweets that include at least one keyword from keywords
  keywords.forEach((keyword) => {
    filteredTweets.push(tweets.filter((tweet) => _.includes(tweet.text, keyword) && !_.includes(_.flatten(filteredTweets), tweet)));
  });
  return _.flatten(filteredTweets);
};

// get tweets by User ID for a given period of time 
const getTweetsByUser = async (startTime, endTime, userId) => {
  // calculate number of queries to make assuming n day periods between queries
  const timeDifference = endTime - startTime;
  const daysDifference = Math.ceil(timeDifference / ONE_DAY_MS);
  const queryPeriod = 3;
  const numQueries = Math.ceil(daysDifference / queryPeriod);

  // create an array of queries to fetch all at once
  const queries = [];
  for (i = 0; i < numQueries; i++) {
    const startTimeStr = new Date(startTime + queryPeriod * ONE_DAY_MS * i).toISOString().replace('.000', '');

    // add 3 days to startTimeStr
    const startTimePlus3Days = startTime + (queryPeriod * ONE_DAY_MS * (i + 1));
    let endTimeStr = new Date(startTimePlus3Days).toISOString().replace('.000', '');

    // set endTimeStr to now if endTimeStr > current time (don't try to query into future)
    if (new Date(endTimeStr) > Date.now()) {
      endTimeStr = new Date(Date.now()).toISOString().replace('.000', '');
    }

    // add queries to queries array
    const queryStringTemplate = `${TWITTER_API_BASE_URL}/users/${userId}/tweets?max_results=100&start_time=${startTimeStr}&end_time=${endTimeStr}`;
    queries.push(axios.get(queryStringTemplate, AUTH_BEARER_HEADER));
  }

  const data = await axios.all(queries).then((responses) => responses.map((response) => response.data.data));
  return _.without(_.flatten(data), undefined);
};

// delete all tweets passed to function by ID
const deleteTweets = async (tweets) => {
  tweets.forEach((tweet) => {
    T.post('statuses/destroy/:id', { id: tweet.id }, (err, data, response) => {
      err ? console.log(err) : console.log(data);
    });
  });
};

//// CAPTURE SPECIFIC TWEETS AND DELETE THEM
try {
  (async () => {
    // get userId for a username
    const username = '_samcasey';
    const userId = await getUserId(username);

    // get all tweets for a userId
    const tweets = await getTweetsByUser(START_DATE, END_DATE, userId);
    // filter tweets of user containing specific keywords
    const filteredTweets = filterTweetsByKeywords(tweets, KEYWORDS);
    const tweetsString = JSON.stringify(filteredTweets);
    // output tweets and ids to text file
    fs.writeFile('./tweets-to-delete.json', tweetsString, (err) => err ? console.log(err) : console.log('saved tweets as JSON'));

    // await deleteTweets(filteredTweets);
  })();
} catch (err) {
  console.log(err);
}; 