const express = require('express');
const router = express.Router();
const axios = require('axios');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

router.get('/search', async (req, res) => {
  try {
    const { q, maxResults = 15, type = 'video' } = req.query;

    const response = await axios.get(YOUTUBE_API_URL, {
      params: {
        part: 'snippet',
        q: q,
        maxResults: maxResults,
        type: type,
        key: YOUTUBE_API_KEY,
        videoCategoryId: '27', // Education category
        relevanceLanguage: 'en',
        safeSearch: 'strict'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('YouTube API Error:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

module.exports = router; 