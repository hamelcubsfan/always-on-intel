import express from "express";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import { join } from "path";

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
app.use(express.json());

// API Routes

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
    const { data, error } = await supabase
        .from('insights')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 3. Save Insight (Supabase)
app.post("/api/insights", async (req, res) => {
    const { url, company, summary, impact, action, date } = req.body;

    const { data, error } = await supabase
        .from('insights')
        .insert([
            { url, company, summary, impact, action, date }
        ])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 4. Delete Insight (Supabase)
app.delete("/api/insights/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('insights')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
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

// Export for Vercel
export default app;

// Local Development Support
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
