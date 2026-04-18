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

  // API Route to generate an image on demand
  app.post("/api/generate-image", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    try {
      const encodedPrompt = encodeURIComponent(prompt);
      // Use 1280x720 (16:9) to match standard video aspect ratios and avoid distortion
      // Adding a random seed ensures we get a fresh image every time
      const seed = Math.floor(Math.random() * 1000000);
      const aiImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${seed}&model=flux`;
      res.json({ url: aiImageUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate image" });
    }
  });

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

      // 1. Handle Featured Image (Manual URL or AI Prompt)
      let imageUrl = draft.featured_image;
      
      // If no manual image, but there's a prompt, generate one
      // We use a seed to ensure it's not a cached version if it's the first time
      if (!imageUrl && draft.image_prompt) {
        const seed = Math.floor(Math.random() * 1000000);
        const enhancedPrompt = `${draft.image_prompt}, high quality, professional, 8k resolution`;
        imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1280&height=720&nologo=true&seed=${seed}&model=flux`;
      }

      if (imageUrl) {
        try {
          console.log("Fetching image for WP upload:", imageUrl);
          const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(imageResponse.data, 'binary');
          
          const mediaResponse = await axios.post(`${site.url}/wp-json/wp/v2/media`, imageBuffer, {
            headers: {
              ...headers,
              'Content-Type': 'image/jpeg',
              'Content-Disposition': `attachment; filename="featured-${Date.now()}.jpg"`
            }
          });
          featuredMediaId = mediaResponse.data.id;
        } catch (imageError) {
          console.error("Error uploading image to WP:", imageError);
        }
      }

      // 2. Create Post with Yoast SEO Meta
      // Note: WordPress REST API blocks meta keys starting with _ by default.
      // We send them as standard meta. If they don't save, the user needs to register them in functions.php
      const postResponse = await axios.post(`${site.url}/wp-json/wp/v2/posts`, {
        title: draft.title,
        content: draft.content,
        status: 'publish',
        featured_media: featuredMediaId,
        excerpt: draft.meta_description,
        meta: {
          // Standard Yoast Meta Keys
          _yoast_wpseo_focuskw: draft.primary_keyword,
          _yoast_wpseo_title: draft.seo_title,
          _yoast_wpseo_metadesc: draft.meta_description,
          // Fallback keys (some REST API extensions use these)
          yoast_wpseo_focuskw: draft.primary_keyword,
          yoast_wpseo_title: draft.seo_title,
          yoast_wpseo_metadesc: draft.meta_description
        }
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
