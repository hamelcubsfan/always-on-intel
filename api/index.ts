import express from "express";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const app = express();
app.use(express.json());

function assertSupabaseConfigured(res: any) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    const msg = `Supabase is not configured. Missing env var(s): ${missing.join(', ')}`;
    console.error(msg);
    res.status(500).json({ error: msg });
    return false;
  }
  return true;
}

const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// 1. Scrape URL (Fetch + Cheerio only)
app.post("/api/scrape", async (req, res) => {
  const { url: originalUrl } = req.body;
  if (!originalUrl) return res.status(400).json({ error: "URL is required" });

  let url = originalUrl;
  if (url.includes("reddit.com") && !url.endsWith(".rss")) {
    url = url.endsWith('/') ? `${url}.rss` : `${url}/.rss`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    $('script, style, noscript, iframe, svg, nav, footer, header').remove();
    const content = $('body').text().replace(/\s+/g, " ").trim();

    if (!content || content.length < 50) {
      return res.status(400).json({ error: "Could not extract meaningful content. Site might be empty or protected." });
    }

    res.json({ content, method: "Fetch (Serverless)" });

  } catch (fetchError: any) {
    console.error("Scrape failed:", fetchError);
    return res.status(500).json({
      error: "Failed to scrape URL. The site might be blocking bots. Please paste the text manually."
    });
  }
});

// 2. Get Insights (Supabase)
app.get("/api/insights", async (req, res) => {
  if (!assertSupabaseConfigured(res)) return;

  try {
    const { data, error } = await supabase!
      .from('insights')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase /api/insights error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (e: any) {
    console.error("Unhandled /api/insights exception:", e);
    res.status(500).json({ error: e?.message || "Unknown server error" });
  }
});

// 3. Save Insight (Supabase)
app.post("/api/insights", async (req, res) => {
  if (!assertSupabaseConfigured(res)) return;

  try {
    const { url, company, summary, impact, action, date } = req.body;

    const { data, error } = await supabase!
      .from('insights')
      .insert([{ url, company, summary, impact, action, date }])
      .select();

    if (error) {
      console.error("Supabase POST /api/insights error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data?.[0] || null);
  } catch (e: any) {
    console.error("Unhandled POST /api/insights exception:", e);
    res.status(500).json({ error: e?.message || "Unknown server error" });
  }
});

// 4. Delete Insight (Supabase)
app.delete("/api/insights/:id", async (req, res) => {
  if (!assertSupabaseConfigured(res)) return;

  try {
    const { id } = req.params;

    const { error } = await supabase!
      .from('insights')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Supabase DELETE /api/insights/:id error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (e: any) {
    console.error("Unhandled DELETE /api/insights/:id exception:", e);
    res.status(500).json({ error: e?.message || "Unknown server error" });
  }
});

// 5. Webhook Proxy
app.post("/api/webhook", async (req, res) => {
  try {
    const { url, data } = req.body;
    if (!url) return res.status(400).json({ error: "Webhook URL is required" });

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    });

    if (!googleResponse.ok) {
      const text = await googleResponse.text();
      throw new Error(`Google Apps Script returned ${googleResponse.status}: ${text}`);
    }

    const result = await googleResponse.text();
    res.json({ success: true, result });

  } catch (error: any) {
    console.error("Webhook Proxy Error:", error);
    res.status(500).json({ error: error.message || "Failed to send data to webhook" });
  }
});

export default app;

// Local Development Support
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
