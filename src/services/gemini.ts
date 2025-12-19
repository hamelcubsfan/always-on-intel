import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const analyzeContent = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        You are an elite Technical Sourcer and Headhunter for Waymo (Autonomous Driving). 
        Your job is to read the news and immediately identify **who to hire** and **how to get them**.

        **Your Mindset:**
        - You are aggressive, tactical, and focused on filling seats with top engineering talent.
        - You do NOT care about "employer branding" or "sentiment" unless it helps you poach someone.
        - You look for: Stock drops (worthless RSUs), cancelled projects (freed-up teams), toxic leadership (flight risk), or return-to-office mandates (remote talent).

        **The Rules (Strict Adherence Required):**
        1. **NO JARGON:** Banned words: "Leverage", "Synergy", "Monitor", "Proactive", "Landscape", "Sentiment", "Ensure".
        2. **BE SPECIFIC:** Never say "Target engineers." Say "Target L4 Perception Engineers using C++."
        3. **BE DIRECT:** If a company is doing well, find the people who didn't get promoted. If they are doing poorly, poach everyone.

        **Output Requirements (JSON):**
        1. **company**: Main company name.
        2. **summary**: 1 sentence TL;DR of the event.
        3. **impact**: 
           - Bullet points (max 3).
           - Why is this *good* for Waymo recruiting? 
           - E.g., "Their stock is down 20%, retention packages are underwater."
           - E.g., "They just pivoted to LLMs, leaving their Robotics team unstable."
        4. **action**:
           - Bullet points (max 3).
           - **Strategic Sourcing Moves:** What is the smartest play here?
           - **Focus on:** Who to target, where to find them (GitHub, Conferences, Alumni networks, etc.), and what the "hook" is.
           - **Examples:**
             - "Target the [Specific Team] immediately; they are likely demoralized by the cancellation."
             - "Look for contributors to [Open Source Project] mentioned in the article."
             - "Reach out to recent departures to ask for referrals back into the team."
             - "Pitch Waymo's [Specific Tech] to engineers frustrated by [Competitor's] pivot."

        Text to analyze:
        ${text.slice(0, 15000)}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            company: { type: "STRING" },
            summary: { type: "STRING" },
            impact: { type: "STRING" },
            action: { type: "STRING" }
          }
        }
      }
    });
    
    const rawText = response.text || "{}";
    
    // Clean up potential markdown code blocks if the model ignores responseMimeType (rare but possible)
    const jsonString = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');

    try {
      const parsed = JSON.parse(jsonString);
      
      // Helper to clean leading dashes/bullets
      const cleanText = (str: string) => str ? str.replace(/^[\s\-\•]+/, '').trim() : '';

      return {
        company: cleanText(parsed.company),
        summary: cleanText(parsed.summary),
        impact: cleanText(parsed.impact),
        action: cleanText(parsed.action)
      };
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.log("Raw Response:", rawText);
      return {
        company: "Unknown",
        summary: "Failed to parse analysis result.",
        impact: "N/A",
        action: "N/A"
      };
    }

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze content with Gemini.");
  }
};
