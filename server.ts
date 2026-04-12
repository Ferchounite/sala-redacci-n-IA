import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Parser from "rss-parser";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

const parser = new Parser();
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to publish to WordPress with AI Generated Image
  app.post("/api/publish", async (req, res) => {
    const { site, draft } = req.body;
    
    try {
      const authString = Buffer.from(`${site.username}:${site.applicationPassword}`).toString('base64');
      const headers = {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      };

      let featuredMediaId = null;

      // 1. Generate Image with Imagen 3 if prompt exists
      if (draft.image_prompt) {
        try {
          console.log("Generating AI image with Imagen 3...");
          const result = await genAI.models.generateContent({
            model: "imagen-3",
            contents: draft.image_prompt
          });
          const response = result;
          
          // Assuming the model returns the image as a base64 or similar in the response
          // Note: In some SDK versions, you might need to handle the specific image output format
          const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          
          if (imagePart?.inlineData) {
            const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
            
            console.log("Uploading AI image to WP...");
            const mediaResponse = await axios.post(`${site.url}/wp-json/wp/v2/media`, imageBuffer, {
              headers: {
                ...headers,
                'Content-Type': 'image/jpeg',
                'Content-Disposition': `attachment; filename="ai-featured-${Date.now()}.jpg"`
              }
            });
            featuredMediaId = mediaResponse.data.id;
          }
        } catch (imageError) {
          console.error("Error generating/uploading AI image:", imageError);
          // Fallback to stock if AI fails
        }
      }

      // 2. Create Post
      const postResponse = await axios.post(`${site.url}/wp-json/wp/v2/posts`, {
        title: draft.title,
        content: draft.content,
        status: 'publish',
        featured_media: featuredMediaId,
        excerpt: draft.meta_description
      }, { headers });

      res.json({ link: postResponse.data.link });
    } catch (error: any) {
      console.error("Failed to publish to WP:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data?.message || "Failed to publish" });
    }
  });

  // API Route for real news discovery via RSS
  app.get("/api/news", async (req, res) => {
    try {
      const customFeeds = req.query.feeds ? (req.query.feeds as string).split(',') : [];
      
      const defaultFeeds = [
        "https://techcrunch.com/feed/",
        "https://www.theverge.com/rss/index.xml"
      ];

      const feedsToFetch = customFeeds.length > 0 ? customFeeds : defaultFeeds;

      const allItems = [];
      for (const feedUrl of feedsToFetch) {
        try {
          const feed = await parser.parseURL(feedUrl);
          const items = feed.items.slice(0, 8).map(item => ({
            title: item.title,
            summary: item.contentSnippet || item.content || "",
            source: feed.title || "Tech News",
            url: item.link,
            publishedAt: item.pubDate || new Date().toISOString()
          }));
          allItems.push(...items);
        } catch (e) {
          console.error(`Error parsing feed ${feedUrl}:`, e);
        }
      }

      // Sort by date and return
      const sorted = allItems.sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      ).slice(0, 20);

      res.json(sorted);
    } catch (error) {
      console.error("Failed to fetch news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
