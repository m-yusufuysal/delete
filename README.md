# 🔍 TRACE — Digital Footprint Intelligence & Erasure Platform

**Palantir-Style Personal Open Source Intelligence (OSINT) & Data Privacy Erasure System**

TRACE is a personal OSINT and privacy platform designed to scan, map, and erase online digital footprints (social media accounts, developer profiles, leaked credentials, web/news indexing, reverse image recognition, WHOIS metadata, and data broker listings). It provides automated risk scoring, step-by-step account deletion guides, direct opt-out URLs, and AI-generated GDPR / CCPA erasure demand letters.

---

## 🌟 Key Features

- 🌐 **60+ Global Platforms Scan:** GitHub, GitLab, Bitbucket, StackOverflow, Twitter/X, Instagram, Facebook, LinkedIn, Reddit, YouTube, Twitch, TikTok, Medium, Substack, Spotify, Steam, Discord, Roblox, Kaggle, DockerHub, Dev.to, Replit, ProductHunt, Behance, Dribbble, Unsplash, Telegram, Keybase, and more.
- 🗑️ **Step-by-Step Account Deletion Guides:** Direct account deletion links and step-by-step deletion guides for discovered accounts.
- 🧠 **AI Footprint Assessment & Legal Notice Generator:** Automated threat calculation (0-100 risk score), privacy vulnerability audit, and one-click GDPR Article 17 "Right to Erasure" & CCPA legal request notice generator.
- 🛡️ **Credential Leak & Breach Lookup:** Direct links to Have I Been Pwned, DeHashed, Intelligence X, LeakCheck, and BreachDirectory.
- 🖼️ **Reverse Image Search & Facial Recognition:** Automated lens query links for Google Lens, Yandex Images, TinEye, and Bing Visual Search.
- 📇 **Data Brokers & Opt-Out Directory:** Direct opt-out portals for Spokeo, Whitepages, Radaris, BeenVerified, FastPeopleSearch, DeleteMe, and Incogni.
- ⚖️ **Search Engine Removal Tools:** Google Personal Data & Outdated Content Removal, Bing Content Removal, KVKK (Turkey), GDPR (EU), and CCPA (US) legal portals.
- 🌐 **Domain WHOIS Intelligence:** Automatic WHOIS query for custom business/domain email addresses.
- 📊 **Report Exporting:** Download complete intelligence findings in **JSON** or **CSV** formats.
- 🎨 **Palantir Aesthetic UI:** Glassmorphism dashboard, animated background grids, real-time step progress indicator, glowing badges, and modal dialogs.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ and npm

### Installation & Run

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Open your browser and navigate to **`http://localhost:3000`**.

---

## 🏗️ Project Architecture

```
delete/
├── server.js            # Express backend & 60+ OSINT modules + AI Engine
├── public/
│   ├── index.html       # Palantir-style English HTML5 UI
│   ├── styles.css       # Design tokens, glassmorphism, glowing accents
│   └── app.js           # Frontend reactive state & UI handlers
├── uploads/             # Temporary image upload directory
└── package.json         # Node dependencies & start scripts
```

---

## 📜 License & Legal Disclaimer

This tool is designed strictly for personal privacy auditing, self-doxxing awareness, and open-source intelligence analysis on public data. Users are responsible for complying with local regulations and terms of service.
