// Proof - Background Service Worker
// Handles API calls to Anthropic Claude and storage management

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-6';

const SYSTEM_PROMPT = `You are a fact-checking and AI image detection assistant. Analyze the provided social media post and return a JSON response.

Respond ONLY with valid JSON in this exact format:
{
  "thinking": "<your step-by-step reasoning BEFORE scoring: (1) list each factual claim made, (2) state what evidence or sources support or contradict each claim, (3) describe every image artifact you checked, (4) state your conclusion and why>",
  "score": <number 0-100>,
  "type": "fake" | "ai" | "factual" | "human_art",
  "title": <short verdict string>,
  "sources": [<array of 2-4 source names like "PBS News", "Reuters", "Congress.gov">],
  "rationale": <2-3 sentence conversational explanation>,
  "claims": [
    {"label": <claim label>, "verdict": "wrong" | "misleading" | "true", "explanation": <short explanation>}
  ],
  "image_analysis": {
    "has_image": <true | false>,
    "is_ai_generated": <true | false | null>,
    "confidence": "high" | "medium" | "low" | null,
    "indicators": [<specific visual anomalies observed, e.g. "extra finger on left hand", "garbled background text", "inconsistent lighting">]
  }
}

IMPORTANT: Always complete the "thinking" field fully before assigning a score or type. Your score must follow logically from your reasoning.

--- SCORING GUIDE ---
Use these categories in strict order of priority:

- 0-32 → type: "fake"
  The post makes specific, verifiable claims that are directly contradicted by credible evidence (scientific consensus, official records, established news sources). The falseness must be demonstrable, not just unproven.

- 33-66 → type: "ai"
  Use ONLY if: (a) the image shows clear AI-generation artifacts (2+ indicators from the checklist below), OR (b) the post uses manipulated/out-of-context media to deceive. Do NOT assign "ai" simply because a post lacks sources or is unverified — that belongs in "fake" or "factual" depending on the claims.

- 67-89 → type: "factual"
  The post's core claims are supported by at least one credible named source, or the claims are plausible, verifiable, and not contradicted by available evidence. Assign this even if some minor details are unverified.

- 90-100 → type: "human_art"
  The post is clearly original human-created art, satire, or creative content with no misinformation. Must have zero false claims.

--- IMAGE ANALYSIS CHECKLIST ---
Work through ALL 7 categories in order before deciding is_ai_generated:

1. FINGERS & HANDS — Count every finger on every visible hand. More or fewer than 5 fingers = strong AI indicator.
2. TEXT IN IMAGE — Is any text within the image garbled, misspelled, nonsensical, or morphing? = strong AI indicator.
3. BACKGROUND COHERENCE — Are background edges sharp and realistic? Is architecture physically possible? Blurred or impossible backgrounds = AI indicator.
4. SKIN & SURFACE TEXTURE — Does skin look waxy, over-smoothed, or plastic? Overly airbrushed appearance = AI indicator.
5. LIGHTING CONSISTENCY — Does the light direction match between the subject and background? Mismatched shadows or reflections = AI indicator.
6. FACIAL FEATURES — Are facial features unnaturally symmetrical, merged, or asymmetric in an uncanny way? = AI indicator.
7. CONTEXT & MANIPULATION — Does metadata, reverse-image evidence, or post context suggest this is a real photo used out of context, or that faces/objects have been digitally inserted?

Verdict rules:
- 3+ indicators present → is_ai_generated: true, confidence: "high"
- 1-2 indicators present → is_ai_generated: true, confidence: "low"
- 0 indicators → is_ai_generated: false, confidence: "high"
- Cannot determine (e.g. image is too low quality) → is_ai_generated: null, confidence: null

If no image is present: has_image: false, is_ai_generated: null, confidence: null, indicators: []

--- LINKED DOMAIN SIGNAL ---
If a shared link domain is provided, treat known low-credibility domains (e.g. infowars.com, naturalnews.com, beforeitsnews.com) as a strong signal toward "fake". Treat high-credibility domains (reuters.com, apnews.com, bbc.com, .gov, .edu) as a signal toward "factual".

--- FEW-SHOT EXAMPLES ---

EXAMPLE 1 — Fake post:
Post: "BREAKING: Scientists confirm 5G towers cause cancer — governments are suppressing the cure!"
Expected output:
{
  "thinking": "Claim: 5G causes cancer. Evidence: WHO, CDC, NIH, and peer-reviewed literature all confirm no established link between 5G radio frequencies and cancer. The 'suppressed cure' framing is a conspiracy trope with no credible sourcing. 0 credible sources support the claim. Conclusion: verifiably false.",
  "score": 10, "type": "fake",
  "sources": ["WHO", "CDC", "NIH"],
  "rationale": "No credible scientific body supports a link between 5G and cancer. This claim has been repeatedly debunked by health authorities worldwide.",
  "claims": [{"label": "5G causes cancer", "verdict": "wrong", "explanation": "Contradicted by WHO, CDC, and peer-reviewed research."}],
  "image_analysis": {"has_image": false, "is_ai_generated": null, "confidence": null, "indicators": []}
}

EXAMPLE 2 — AI-generated image post:
Post: [image of politician in shocking situation] "Look what they just caught him doing!"
Expected output:
{
  "thinking": "Image check — Fingers: right hand has 7 fingers (strong indicator). Text: campaign sign text in background is garbled ('VOOTE 2OO4'). Background: edges between subject and crowd are smeared. Skin: unnaturally smooth. 3 strong AI indicators found. The claim is also unverified with no sources. Conclusion: AI-generated image used to deceive.",
  "score": 42, "type": "ai",
  "sources": [],
  "rationale": "The image shows multiple signs of AI generation including malformed fingers and garbled text. No credible source corroborates the implied claim.",
  "claims": [{"label": "Shocking politician behavior", "verdict": "misleading", "explanation": "Image appears AI-generated; claim is unsubstantiated."}],
  "image_analysis": {"has_image": true, "is_ai_generated": true, "confidence": "high", "indicators": ["right hand has 7 fingers", "background sign text is garbled", "subject-background edge artifacts"]}
}

EXAMPLE 3 — Factual post:
Post: "NASA confirms the James Webb telescope captured the deepest infrared image of the universe ever taken."
Expected output:
{
  "thinking": "Claim: Webb captured deepest infrared image. Evidence: NASA officially announced this in July 2022, covered by Reuters, BBC, AP, and NASA.gov directly. Claim is verifiable, sourced, and not contradicted. No image attached.",
  "score": 85, "type": "factual",
  "sources": ["NASA", "Reuters", "BBC"],
  "rationale": "NASA officially confirmed the James Webb Space Telescope released the deepest infrared image of the universe in July 2022, widely reported by credible outlets.",
  "claims": [{"label": "Webb captured deepest infrared image", "verdict": "true", "explanation": "Confirmed by NASA and multiple credible news organizations."}],
  "image_analysis": {"has_image": false, "is_ai_generated": null, "confidence": null, "indicators": []}
}`;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'factcheck') {
    handleFactCheck(message.content, sendResponse);
    return true; // Keep message channel open for async response
  }

  if (message.type === 'saveApiKey') {
    chrome.storage.local.set({ apiKey: message.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'getApiKey') {
    chrome.storage.local.get(['apiKey'], (result) => {
      sendResponse({ apiKey: result.apiKey || null });
    });
    return true;
  }
});

async function handleFactCheck(content, sendResponse) {
  try {
    // Get API key from storage
    const result = await chrome.storage.local.get(['apiKey']);
    const apiKey = result.apiKey;

    if (!apiKey) {
      sendResponse({
        error: true,
        errorType: 'no_api_key',
        message: 'No API key found. Please enter your Anthropic API key in the extension settings.'
      });
      return;
    }

    const postText = buildPostDescription(content);

    // Build message content: text + images (for vision)
    const messageContent = [];

    // Only send images as base64 (fetched by content script which has page cookies).
    // Never pass Facebook CDN URLs directly — they are blocked by robots.txt and
    // the Anthropic API will return a 400 error. If base64 fetch failed, we fall
    // back to the rich alt-text description that Facebook generates automatically.
    if (content.imageData && content.imageData.length > 0) {
      for (const img of content.imageData) {
        messageContent.push({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.data }
        });
      }
    }

    // Add the text description
    const hasImages = (content.imageData && content.imageData.length > 0) ||
                      (content.imageUrls && content.imageUrls.length > 0);
    const prompt = hasImages
      ? `Please fact-check this social media post. The image(s) above are the primary content — read all text visible in the image, identify any claims being made, and verify them. Treat this exactly as if someone handed you the image directly.\n\n${postText}`
      : `Please fact-check this social media post.\n\n${postText}`;

    messageContent.push({
      type: 'text',
      text: prompt
    });

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: `${SYSTEM_PROMPT}\n\nToday's date is ${new Date().toISOString().split('T')[0]}.`,
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        sendResponse({
          error: true,
          errorType: 'invalid_api_key',
          message: 'Invalid API key. Please check your Anthropic API key in settings.'
        });
        return;
      }

      if (response.status === 429) {
        sendResponse({
          error: true,
          errorType: 'rate_limit',
          message: 'Rate limit reached. Please wait a moment before scanning again.'
        });
        return;
      }

      const errMsg = errorData?.error?.message || 'Unknown API error';
      sendResponse({
        error: true,
        errorType: 'api_error',
        message: `API error (${response.status}): ${errMsg}`
      });
      return;
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';

    // Parse JSON from the response
    let parsed;
    try {
      // Try to extract JSON from the response (sometimes Claude wraps it in markdown)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseErr) {
      sendResponse({
        error: true,
        errorType: 'parse_error',
        message: 'Could not parse the analysis result. Please try again.'
      });
      return;
    }

    // Validate and normalize the response
    const normalized = normalizeResult(parsed);
    sendResponse({ success: true, result: normalized });

  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      sendResponse({
        error: true,
        errorType: 'network_error',
        message: 'Network error. Check your internet connection and API key.'
      });
    } else {
      sendResponse({
        error: true,
        errorType: 'unknown',
        message: 'An unexpected error occurred. Please try again.'
      });
    }
  }
}

function buildPostDescription(content) {
  const parts = [];

  if (content.author) {
    parts.push(`Posted by: ${content.author}`);
  }

  if (content.timestamp) {
    parts.push(`Post date: ${content.timestamp}`);
  }

  if (content.text) {
    parts.push(`Post text / description:\n${content.text}`);
  }

  if (content.imageAlt) {
    parts.push(`Image alt text / captions: ${content.imageAlt}`);
  }

  if (content.linkTitle) {
    parts.push(`Shared article headline: ${content.linkTitle}`);
  }

  if (content.linkUrl) {
    parts.push(`Shared link: ${content.linkUrl}`);
    // Extract and surface the domain explicitly as a credibility signal
    try {
      const domain = new URL(content.linkUrl).hostname.replace(/^www\./, '');
      parts.push(`Shared link domain: ${domain}`);
    } catch (_) {}
  }

  if (content.imageUrls && content.imageUrls.length > 0) {
    parts.push(`[${content.imageUrls.length} image(s) attached above for visual analysis]`);
  }

  return parts.join('\n\n') || 'No post content found.';
}

function normalizeResult(parsed) {
  // "thinking" is internal chain-of-thought — strip it from the result sent to the UI
  // Ensure score is in valid range
  const score = Math.max(0, Math.min(100, parseInt(parsed.score) || 0));

  // Determine type from score if not valid
  let type = parsed.type;
  if (!['fake', 'ai', 'factual', 'human_art'].includes(type)) {
    if (score < 33) type = 'fake';
    else if (score < 67) type = 'ai';
    else if (score < 90) type = 'factual';
    else type = 'human_art';
  }

  // Normalize image_analysis field
  const rawImg = parsed.image_analysis || {};
  const imageAnalysis = {
    has_image: rawImg.has_image === true,
    is_ai_generated: rawImg.is_ai_generated ?? null,
    confidence: ['high', 'medium', 'low'].includes(rawImg.confidence) ? rawImg.confidence : null,
    indicators: Array.isArray(rawImg.indicators) ? rawImg.indicators.slice(0, 6) : []
  };

  return {
    score,
    type,
    title: parsed.title || getDefaultTitle(type),
    sources: Array.isArray(parsed.sources) ? parsed.sources.slice(0, 4) : [],
    rationale: parsed.rationale || 'No explanation provided.',
    claims: Array.isArray(parsed.claims) ? parsed.claims.slice(0, 5) : [],
    image_analysis: imageAnalysis
  };
}

function getDefaultTitle(type) {
  switch (type) {
    case 'fake': return 'THIS POST COULD NOT BE VERIFIED';
    case 'ai': return 'THIS POST CONTAINS AI CONTENT';
    case 'factual': return 'THIS CONTENT IS VERIFIED AS FACTUAL';
    case 'human_art': return 'THIS POST IS PURELY HUMAN';
    default: return 'ANALYSIS COMPLETE';
  }
}
