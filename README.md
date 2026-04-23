# Proof. — AI-Powered Misinformation Detection Extension

A Chrome browser extension that analyzes social media posts in real time to detect 
fake news, misleading content, and AI-generated imagery. Built as a capstone project 
for the University of North Texas College of Visual Arts & Design.

If you want to read the whole case study, you can view it at [natashasturdevant.com/proof](https://natashasturdevant.com/proof)

---

## ⚠️ Requirements

This extension requires your own **Anthropic API key** to function.  
You can get one at [console.anthropic.com](https://console.anthropic.com).  
API usage is billed to your account — casual use is typically very low cost.

---

## How It Works

When you open a post on Facebook or Instagram, Proof. automatically appears as a 
side panel. Click "Scan" to analyze the content. Within seconds, it returns:

- A credibility score (Factual / Misleading / Fake)
- Verified sources supporting or contradicting the post
- A step-by-step breakdown of how the post was evaluated
- An assessment of whether the image may be AI-generated

**Current accuracy: ~66%** — this is an early-stage prototype. Results should be 
used as a starting point for your own judgment, not a definitive verdict.

<img width="1498" height="975" alt="Screenshot 2026-04-02 at 9 36 57 AM" src="https://github.com/user-attachments/assets/ecf86227-4e3e-49be-bd02-42e27a422070" />
<img width="1499" height="992" alt="Screenshot 2026-04-02 at 10 11 16 AM" src="https://github.com/user-attachments/assets/5b75d130-5c2a-4e07-b5d6-4e96b0bf96b9" />

---

## Setup

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer Mode** (toggle in the top right)
4. Click **Load unpacked** and select the project folder
5. Click the Proof. extension icon and enter your Anthropic API key when prompted

---

## Tech Stack

- Vanilla JavaScript / Chrome Extensions API (Manifest V3)
- Anthropic Claude API (claude-opus-4-6) for content analysis
- Designed in Figma with a custom component library

---

## About

Designed and built by [Natasha Sturdevant](https://natashasturdevant.com) · 2026  
Product Design + Development · UNT Integrative Capstone

---

## License

MIT
