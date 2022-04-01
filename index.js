require('dotenv').config();
const _ = require('lodash');
const axios = require('axios');

const { API_KEY, API_KEY_SECRET, BEARER_TOKEN } = process.env;

const AUTH_HEADER = {
  headers: {
    Authorization: `Bearer ${BEARER_TOKEN}`
  }
};

const KEYWORDS = ['tax', 'taxes'];

const TWITTER_API_BASE_URL = 'https://api.twitter.com/2';

const getRequest = async (queryString, header) => await axios.get(queryString, header);

const getUserId = async (username) => {
  const queryString = `${TWITTER_API_BASE_URL}/users/by/username/${username}`;
  const res = await axios.get(queryString, AUTH_HEADER);
  return res.data.data.id;
};

const filterTweetsByKeywords = (tweets, keywords) => {
  const filteredTweets = [];
  keywords.forEach((keyword) => {
    filteredTweets.push(tweets.filter((tweet) => _.includes(tweet.text, keyword) && !_.includes(_.flatten(filteredTweets), tweet)));
  });
  return _.flatten(filteredTweets);
};

const getTweetsByUser = async (userId) => {
  // to be moved to params
  const startTime = new Date('3/17/22').toISOString();
  const endTime = new Date('3/22/22').toISOString();

  const queryString = `${TWITTER_API_BASE_URL}/users/${userId}/tweets?max_results=100&start_time=${startTime}end_time=${endTime}`;
  console.log({ queryString });

  const res = await axios.get(queryString, AUTH_HEADER);
  return res.data.data;
};

try {
  (async () => {

    // get userId for a username
    const username = '_samcasey';
    const userId = await getUserId(username);
    // console.log(userId);

    // get all tweets for a userId
    const tweets = await getTweetsByUser(userId);
    const filteredTweets = filterTweetsByKeywords(tweets, KEYWORDS);
    console.log(filteredTweets);

    // filter tweets of user containing word from array

    // output tweets and ids to text file

  })();
} catch (err) {
  console.log(err);
};