const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// Multer storage for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE PLATFORM DATABASE (60+ PLATFORMS)
// ═══════════════════════════════════════════════════════════════

const SOCIAL_PLATFORMS = [
  // Developer & Tech
  { name: 'GitHub', url: 'https://github.com/{username}', icon: 'fab fa-github', category: 'developer', deleteUrl: 'https://github.com/settings/admin', deleteInstructions: 'Navigate to Settings > Account > Delete your account. Re-enter your username to confirm.' },
  { name: 'GitLab', url: 'https://gitlab.com/{username}', icon: 'fab fa-gitlab', category: 'developer', deleteUrl: 'https://gitlab.com/-/profile/account', deleteInstructions: 'Go to Profile Settings > Account > Delete Account.' },
  { name: 'Bitbucket', url: 'https://bitbucket.org/{username}/', icon: 'fab fa-bitbucket', category: 'developer', deleteUrl: 'https://bitbucket.org/account/settings/', deleteInstructions: 'Go to Account Settings > Delete Account at the bottom.' },
  { name: 'StackOverflow', url: 'https://stackoverflow.com/users/{username}', icon: 'fab fa-stack-overflow', category: 'developer', deleteUrl: 'https://stackoverflow.com/users/delete/current', deleteInstructions: 'Open Edit Profile > Delete Profile > Check agreement and confirm.' },
  { name: 'HackerNews', url: 'https://news.ycombinator.com/user?id={username}', icon: 'fab fa-hacker-news', category: 'developer', deleteUrl: 'https://news.ycombinator.com/newsguidelines.html', deleteInstructions: 'Email hn@ycombinator.com from your registered email requesting profile anonymization.' },
  { name: 'CodePen', url: 'https://codepen.io/{username}', icon: 'fab fa-codepen', category: 'developer', deleteUrl: 'https://codepen.io/settings/account', deleteInstructions: 'Settings > Account > Delete Account.' },
  { name: 'Replit', url: 'https://replit.com/@{username}', icon: 'fas fa-code', category: 'developer', deleteUrl: 'https://replit.com/account', deleteInstructions: 'Account Settings > Scroll to bottom > Delete Account.' },
  { name: 'Dev.to', url: 'https://dev.to/{username}', icon: 'fab fa-dev', category: 'developer', deleteUrl: 'https://dev.to/settings/account', deleteInstructions: 'Settings > Account > Danger Zone > Delete Account.' },
  { name: 'DockerHub', url: 'https://hub.docker.com/u/{username}', icon: 'fab fa-docker', category: 'developer', deleteUrl: 'https://hub.docker.com/settings/account', deleteInstructions: 'Account Settings > Deactivate Account.' },
  { name: 'Kaggle', url: 'https://www.kaggle.com/{username}', icon: 'fas fa-brain', category: 'developer', deleteUrl: 'https://www.kaggle.com/me/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'ProductHunt', url: 'https://www.producthunt.com/@{username}', icon: 'fab fa-product-hunt', category: 'developer', deleteUrl: 'https://www.producthunt.com/settings/edit', deleteInstructions: 'Settings > Delete Account.' },
  
  // Social Networks
  { name: 'Twitter / X', url: 'https://x.com/{username}', icon: 'fab fa-x-twitter', category: 'social', deleteUrl: 'https://twitter.com/settings/deactivate', deleteInstructions: 'Settings and privacy > Your account > Deactivate your account > Confirm.' },
  { name: 'Instagram', url: 'https://www.instagram.com/{username}/', icon: 'fab fa-instagram', category: 'social', deleteUrl: 'https://www.instagram.com/accounts/remove/request/permanent/', deleteInstructions: 'Visit Instagram Account Deletion page, choose a reason, enter password and confirm.' },
  { name: 'Facebook', url: 'https://www.facebook.com/{username}', icon: 'fab fa-facebook', category: 'social', deleteUrl: 'https://www.facebook.com/deactivate_delete_account', deleteInstructions: 'Settings & Privacy > Settings > Personal Details > Account Ownership > Deactivation and Deletion.' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/{username}', icon: 'fab fa-linkedin', category: 'professional', deleteUrl: 'https://www.linkedin.com/psettings/member-delete', deleteInstructions: 'Settings & Privacy > Account Preferences > Account Management > Close Account.' },
  { name: 'Reddit', url: 'https://www.reddit.com/user/{username}', icon: 'fab fa-reddit', category: 'social', deleteUrl: 'https://www.reddit.com/settings/', deleteInstructions: 'User Settings > Account tab > Scroll down > Delete Account.' },
  { name: 'Pinterest', url: 'https://www.pinterest.com/{username}/', icon: 'fab fa-pinterest', category: 'social', deleteUrl: 'https://www.pinterest.com/settings/account-management/', deleteInstructions: 'Settings > Account Management > Delete Account.' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@{username}', icon: 'fab fa-tiktok', category: 'social', deleteUrl: 'https://www.tiktok.com/setting', deleteInstructions: 'Settings and privacy > Account > Deactivate or delete account.' },
  { name: 'Snapchat', url: 'https://www.snapchat.com/add/{username}', icon: 'fab fa-snapchat', category: 'social', deleteUrl: 'https://accounts.snapchat.com/accounts/delete_account', deleteInstructions: 'Log into Snapchat Accounts Portal, enter credentials, and confirm deletion.' },
  { name: 'Quora', url: 'https://www.quora.com/profile/{username}', icon: 'fab fa-quora', category: 'social', deleteUrl: 'https://www.quora.com/settings', deleteInstructions: 'Settings > Privacy > Delete Account.' },
  { name: 'Mastodon', url: 'https://mastodon.social/@{username}', icon: 'fab fa-mastodon', category: 'social', deleteUrl: 'https://mastodon.social/settings/delete', deleteInstructions: 'Preferences > Account > Delete Account.' },
  { name: 'Threads', url: 'https://www.threads.net/@{username}', icon: 'fas fa-at', category: 'social', deleteUrl: 'https://www.instagram.com/accounts/remove/request/permanent/', deleteInstructions: 'Profile > Settings > Account > Delete or Deactivate Profile.' },
  { name: 'Bluesky', url: 'https://bsky.app/profile/{username}', icon: 'fas fa-cloud', category: 'social', deleteUrl: 'https://bsky.app/settings', deleteInstructions: 'Settings > Account > Delete Account.' },
  { name: 'Tumblr', url: 'https://{username}.tumblr.com', icon: 'fab fa-tumblr', category: 'blog', deleteUrl: 'https://www.tumblr.com/settings/account', deleteInstructions: 'Account Settings > Delete Account button at bottom.' },
  { name: 'VK', url: 'https://vk.com/{username}', icon: 'fab fa-vk', category: 'social', deleteUrl: 'https://vk.com/settings', deleteInstructions: 'Settings > General > You can delete your account here.' },

  // Gaming
  { name: 'Steam', url: 'https://steamcommunity.com/id/{username}', icon: 'fab fa-steam', category: 'gaming', deleteUrl: 'https://help.steampowered.com/en/wizard/HelpWithAccountData', deleteInstructions: 'Submit a Steam Support request to permanently delete your account.' },
  { name: 'Twitch', url: 'https://www.twitch.tv/{username}', icon: 'fab fa-twitch', category: 'media', deleteUrl: 'https://www.twitch.tv/user/delete-account', deleteInstructions: 'Settings > Profile > Disable / Delete Account page.' },
  { name: 'Discord', url: 'https://discord.com/users/{username}', icon: 'fab fa-discord', category: 'messaging', deleteUrl: 'https://support.discord.com/hc/en-us/articles/212500837', deleteInstructions: 'User Settings > My Account > Delete Account.' },
  { name: 'Roblox', url: 'https://www.roblox.com/user.aspx?username={username}', icon: 'fas fa-cube', category: 'gaming', deleteUrl: 'https://www.roblox.com/support', deleteInstructions: 'Submit a Privacy Rights request via Roblox Support form.' },
  { name: 'Chess.com', url: 'https://www.chess.com/member/{username}', icon: 'fas fa-chess', category: 'gaming', deleteUrl: 'https://www.chess.com/home/account', deleteInstructions: 'Settings > Account > Close Account.' },
  { name: 'Lichess', url: 'https://lichess.org/@/{username}', icon: 'fas fa-chess-knight', category: 'gaming', deleteUrl: 'https://lichess.org/account/close', deleteInstructions: 'Account Settings > Close Account.' },

  // Media, Design & Music
  { name: 'YouTube', url: 'https://www.youtube.com/@{username}', icon: 'fab fa-youtube', category: 'media', deleteUrl: 'https://myaccount.google.com/deleteaccount', deleteInstructions: 'Go to Google Account Settings > Data & Privacy > Delete a Google Service > YouTube.' },
  { name: 'Spotify', url: 'https://open.spotify.com/user/{username}', icon: 'fab fa-spotify', category: 'media', deleteUrl: 'https://support.spotify.com/article/close-account/', deleteInstructions: 'Account page > Support > Account Help > Close Account.' },
  { name: 'SoundCloud', url: 'https://soundcloud.com/{username}', icon: 'fab fa-soundcloud', category: 'media', deleteUrl: 'https://soundcloud.com/settings/account', deleteInstructions: 'Account Settings > Delete Account button.' },
  { name: 'Bandcamp', url: 'https://bandcamp.com/{username}', icon: 'fas fa-music', category: 'media', deleteUrl: 'https://bandcamp.com/settings', deleteInstructions: 'Settings > Fan/Artist Account > Delete Account.' },
  { name: 'Vimeo', url: 'https://vimeo.com/{username}', icon: 'fab fa-vimeo', category: 'media', deleteUrl: 'https://vimeo.com/settings/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Flickr', url: 'https://www.flickr.com/people/{username}/', icon: 'fab fa-flickr', category: 'media', deleteUrl: 'https://identity.flickr.com/account/delete', deleteInstructions: 'Account Settings > Delete Flickr Account.' },
  { name: 'Dribbble', url: 'https://dribbble.com/{username}', icon: 'fab fa-dribbble', category: 'design', deleteUrl: 'https://dribbble.com/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Behance', url: 'https://www.behance.net/{username}', icon: 'fab fa-behance', category: 'design', deleteUrl: 'https://account.adobe.com/privacy', deleteInstructions: 'Adobe Privacy Center > Delete Adobe Account.' },
  { name: 'DeviantArt', url: 'https://www.deviantart.com/{username}', icon: 'fab fa-deviantart', category: 'media', deleteUrl: 'https://www.deviantart.com/settings/general', deleteInstructions: 'Account Settings > Deactivate Account.' },
  { name: '500px', url: 'https://500px.com/p/{username}', icon: 'fas fa-camera-retro', category: 'media', deleteUrl: 'https://500px.com/settings/account', deleteInstructions: 'Settings > Account > Delete Account.' },
  { name: 'Unsplash', url: 'https://unsplash.com/@{username}', icon: 'fas fa-camera', category: 'media', deleteUrl: 'https://unsplash.com/account/delete', deleteInstructions: 'Account Settings > Delete Account.' },

  // Content & Blogging
  { name: 'Medium', url: 'https://medium.com/@{username}', icon: 'fab fa-medium', category: 'blog', deleteUrl: 'https://medium.com/me/settings/security', deleteInstructions: 'Settings > Security & Privacy > Delete Account.' },
  { name: 'Substack', url: 'https://substack.com/@{username}', icon: 'fas fa-newspaper', category: 'blog', deleteUrl: 'https://substack.com/settings', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'WordPress', url: 'https://{username}.wordpress.com', icon: 'fab fa-wordpress', category: 'blog', deleteUrl: 'https://wordpress.com/me/account', deleteInstructions: 'Profile > Account Settings > Close your account permanently.' },
  { name: 'Patreon', url: 'https://www.patreon.com/{username}', icon: 'fab fa-patreon', category: 'blog', deleteUrl: 'https://www.patreon.com/settings/account', deleteInstructions: 'Settings > Account > Delete Account.' },
  { name: 'Wattpad', url: 'https://www.wattpad.com/user/{username}', icon: 'fas fa-book', category: 'blog', deleteUrl: 'https://www.wattpad.com/settings', deleteInstructions: 'Settings > Close Account.' },

  // Messaging & Security
  { name: 'Telegram', url: 'https://t.me/{username}', icon: 'fab fa-telegram', category: 'messaging', deleteUrl: 'https://my.telegram.org/auth/deactivate', deleteInstructions: 'Log into Telegram Web Deactivation page with your phone number and confirm.' },
  { name: 'Keybase', url: 'https://keybase.io/{username}', icon: 'fab fa-keybase', category: 'security', deleteUrl: 'https://keybase.io/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Gravatar', url: 'https://gravatar.com/{username}', icon: 'fas fa-user-circle', category: 'other', deleteUrl: 'https://gravatar.com/profiles/edit', deleteInstructions: 'Edit Profile > Hide or Remove Gravatar Profile.' },

  // Paste & Code Dump Sites
  { name: 'Pastebin', url: 'https://pastebin.com/u/{username}', icon: 'fas fa-paste', category: 'developer', deleteUrl: 'https://pastebin.com/doc_privacy_statement', deleteInstructions: 'Submit a removal request or delete individual pastes from your user dashboard.' },

  // Crypto & Finance
  { name: 'TradingView', url: 'https://www.tradingview.com/u/{username}/', icon: 'fas fa-chart-line', category: 'other', deleteUrl: 'https://www.tradingview.com/user-settings/', deleteInstructions: 'Profile Settings > Account > Delete Account.' },
  { name: 'OpenSea', url: 'https://opensea.io/{username}', icon: 'fas fa-store', category: 'other', deleteUrl: 'https://opensea.io/account', deleteInstructions: 'Disconnect Web3 wallet and clear public profile details.' },
];

// Helper functions
function extractUsernameFromEmail(email) {
  if (!email || !email.includes('@')) return null;
  return email.split('@')[0];
}

function generateUsernames(name) {
  if (!name) return [];
  const parts = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/);
  if (parts.length === 0) return [];
  
  const usernames = new Set();
  const first = parts[0];
  const last = parts[parts.length - 1];
  
  usernames.add(first);
  usernames.add(last);
  usernames.add(`${first}${last}`);
  usernames.add(`${first}.${last}`);
  usernames.add(`${first}_${last}`);
  usernames.add(`${first}-${last}`);
  usernames.add(`${last}${first}`);
  usernames.add(`${first}${last[0]}`);
  usernames.add(`${first[0]}${last}`);
  
  return [...usernames];
}

function md5(str) {
  return crypto.createHash('md5').update(str.toLowerCase().trim()).digest('hex');
}

// Check individual social account existence
async function checkSocialAccount(platform, username) {
  const url = platform.url.replace('{username}', username);
  try {
    const response = await axios.get(url, {
      timeout: 7000,
      maxRedirects: 3,
      validateStatus: (status) => status < 500,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (response.status === 200) {
      return {
        found: true,
        platform: platform.name,
        url,
        icon: platform.icon,
        category: platform.category,
        deleteUrl: platform.deleteUrl,
        deleteInstructions: platform.deleteInstructions,
        username,
        statusCode: response.status
      };
    }
    return { found: false, platform: platform.name, url, username };
  } catch (err) {
    return { found: false, platform: platform.name, url, username, error: err.message };
  }
}

// Check Gravatar
async function checkGravatar(email) {
  const hash = md5(email);
  try {
    const response = await axios.get(`https://www.gravatar.com/avatar/${hash}?d=404`, {
      timeout: 5000,
      validateStatus: () => true
    });
    return {
      found: response.status === 200,
      service: 'Gravatar',
      profileUrl: `https://gravatar.com/${hash}`,
      avatarUrl: `https://www.gravatar.com/avatar/${hash}?s=200`
    };
  } catch {
    return { found: false, service: 'Gravatar' };
  }
}

// Search web via DuckDuckGo
async function searchWeb(query, type = 'general') {
  const results = [];
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      }
    });
    
    const $ = cheerio.load(response.data);
    $('.result').each((i, elem) => {
      if (i >= 15) return false;
      const titleElem = $(elem).find('.result__title a');
      const snippetElem = $(elem).find('.result__snippet');
      
      const title = titleElem.text().trim();
      const snippet = snippetElem.text().trim();
      let url = titleElem.attr('href') || '';
      
      if (url.includes('uddg=')) {
        try {
          url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
        } catch {}
      }
      
      if (title && url && !url.includes('duckduckgo.com')) {
        results.push({ title, snippet, url, source: 'DuckDuckGo Engine', type });
      }
    });
  } catch (err) {
    console.error('Web search error:', err.message);
  }
  return results;
}

// WHOIS lookup
async function whoisLookup(domain) {
  try {
    const whois = require('whois-json');
    const result = await whois(domain);
    return { found: true, data: result };
  } catch (err) {
    return { found: false, error: err.message };
  }
}

// Reverse Image Search Links Generator
function generateReverseImageLinks(imageUrl) {
  return [
    { name: 'Google Lens & Images', url: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`, icon: 'fab fa-google', description: 'Analyze facial features and match exact web image occurrences worldwide.' },
    { name: 'Yandex Reverse Visual Search', url: `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`, icon: 'fas fa-search', description: 'Industry-leading facial matching and image source locator.' },
    { name: 'TinEye Reverse Image Engine', url: `https://tineye.com/search?url=${encodeURIComponent(imageUrl)}`, icon: 'fas fa-eye', description: 'Find original high-res photos and modified variations.' },
    { name: 'Bing Visual Intelligence', url: `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(imageUrl)}`, icon: 'fab fa-microsoft', description: 'Microsoft visual recognition and index matching.' },
  ];
}

// Data Breach Inspection Links
function generateBreachCheckLinks(email) {
  return [
    { name: 'Have I Been Pwned', url: `https://haveibeenpwned.com/account/${encodeURIComponent(email)}`, icon: 'fas fa-shield-alt', description: 'Search 13+ billion breached account credentials and plain-text leaks.' },
    { name: 'DeHashed Database Search', url: `https://www.dehashed.com/search?query=${encodeURIComponent(email)}`, icon: 'fas fa-database', description: 'Deep index search across compromised database dumps and pastebin files.' },
    { name: 'Intelligence X (IntelX)', url: `https://intelx.io/?s=${encodeURIComponent(email)}`, icon: 'fas fa-search-plus', description: 'Darknet, paste sites, and historical internet archive breach lookup.' },
    { name: 'LeakCheck Intelligence', url: `https://leakcheck.io/check/${encodeURIComponent(email)}`, icon: 'fas fa-lock-open', description: 'Check exposed password hashes and leaked personal information.' },
    { name: 'BreachDirectory Global Index', url: `https://breachdirectory.org/search/${encodeURIComponent(email)}`, icon: 'fas fa-exclamation-triangle', description: 'Query public security incident databases.' },
  ];
}

// Official Data Brokers & Removal Portals
function generateRemovalLinks(name) {
  return [
    { name: 'Google Personal Data Removal Request', url: 'https://support.google.com/websearch/troubleshooter/9685456', icon: 'fab fa-google', description: 'Official form to remove personally identifiable information (PII), phone numbers, or emails from Google Search.' },
    { name: 'Google Outdated Content Removal Tool', url: 'https://www.google.com/webmasters/tools/removals', icon: 'fab fa-google', description: 'Request immediate removal of deleted web pages or cached snippets.' },
    { name: 'Bing Content Removal Request', url: 'https://www.bing.com/webmasters/contentremoval', icon: 'fab fa-microsoft', description: 'Submit page removal requests to Microsoft Bing web index.' },
    { name: 'GDPR Right to Be Forgotten (EU Portal)', url: 'https://gdpr.eu/right-to-be-forgotten/', icon: 'fas fa-user-shield', description: 'Enforce legal data deletion mandates under Article 17 of GDPR.' },
    { name: 'CCPA Consumer Privacy Rights (US Portal)', url: 'https://oag.ca.gov/privacy/ccpa', icon: 'fas fa-gavel', description: 'Submit "Do Not Sell / Delete My Personal Data" legal requests under CCPA.' },
    { name: 'KVKK Personal Data Protection Authority', url: 'https://www.kvkk.gov.tr/Icerik/5382/Veri-Sorumlusuna-Basvuru', icon: 'fas fa-balance-scale', description: 'Official data deletion application for Turkish citizens.' },
    { name: 'JustDeleteMe Account Directory', url: 'https://justdeleteme.xyz/', icon: 'fas fa-trash-alt', description: 'Direct links and difficulty ratings for closing accounts on 500+ web services.' },
    { name: 'AccountKiller Guide', url: 'https://www.accountkiller.com/en', icon: 'fas fa-user-times', description: 'Step-by-step guides for erasing hidden or stubborn profiles.' },
  ];
}

// Data Brokers & People Search Directory
function generateDataBrokerLinks(name, email) {
  return [
    { name: 'Whitepages Opt-Out', url: 'https://www.whitepages.com/suppression-requests', icon: 'fas fa-address-book', description: 'Remove full name, age, landline/mobile numbers, and home addresses.' },
    { name: 'Spokeo Opt-Out Portal', url: 'https://www.spokeo.com/optout', icon: 'fas fa-search-location', description: 'Request profile removal from major US people search database.' },
    { name: 'Radaris Profile Removal', url: 'https://radaris.com/control/privacy', icon: 'fas fa-id-card', description: 'Opt-out of public records aggregation and background check profiles.' },
    { name: 'BeenVerified Privacy Opt-Out', url: 'https://www.beenverified.com/f/optout/search', icon: 'fas fa-user-check', description: 'Remove background check and contact records.' },
    { name: 'FastPeopleSearch Removal', url: 'https://www.fastpeoplesearch.com/removal', icon: 'fas fa-users-cog', description: 'Instant removal form for US directory listings.' },
    { name: 'DeleteMe Automated Clean service', url: 'https://joindeleteme.com/', icon: 'fas fa-shield-virus', description: 'Automated removal service across 100+ data brokers.' },
    { name: 'Incogni Privacy Service', url: 'https://incogni.com/', icon: 'fas fa-user-ninja', description: 'Automated legal erasure requests sent to data brokers on your behalf.' }
  ];
}

// ═══════════════════════════════════════════════════════════════
// AI DIGITAL FOOTPRINT ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════

function generateAIFootprintAnalysis(data) {
  const accountsFound = data.socialAccounts.length;
  const webFound = data.webResults.length;
  const categoriesFound = [...new Set(data.socialAccounts.map(a => a.category))];
  
  let riskScore = Math.min(100, (accountsFound * 4) + (webFound * 2) + (data.emailServices.length * 10));
  let threatGrade = 'A+ (Minimal Exposure)';
  let threatColor = '#10b981';
  
  if (riskScore >= 70) {
    threatGrade = 'F (Severe Exposure & Doxxing Risk)';
    threatColor = '#ef4444';
  } else if (riskScore >= 45) {
    threatGrade = 'C (High Digital Footprint)';
    threatColor = '#f59e0b';
  } else if (riskScore >= 20) {
    threatGrade = 'B (Moderate Exposure)';
    threatColor = '#06b6d4';
  }

  const recommendations = [];
  if (accountsFound > 0) {
    recommendations.push(`Found ${accountsFound} active public profiles. Review and close dormant profiles (e.g. ${data.socialAccounts.slice(0, 3).map(a => a.platform).join(', ')}).`);
  }
  if (categoriesFound.includes('developer')) {
    recommendations.push('Developer platforms detected (GitHub/GitLab/StackOverflow). Ensure no API keys, SSH keys, or private emails are committed in public repos.');
  }
  if (categoriesFound.includes('social')) {
    recommendations.push('Social media exposure detected. Switch profiles to Private and delete historical geotagged posts.');
  }
  if (data.input.email) {
    recommendations.push('Regularly query Have I Been Pwned and use unique passwords with 2FA/MFA on all discovered services.');
  }
  if (data.input.hasImage) {
    recommendations.push('Reverse image matches could link anonymous aliases to your real identity. Request image removal via Google & Yandex Lens tools.');
  }

  // Generate GDPR / CCPA Legal Email Removal Draft
  const legalDraftGDPR = `SUBJECT: GDPR Article 17 "Right to Erasure" Request - ${data.input.name || 'Data Subject'}

To the Data Protection Officer / Legal Privacy Team,

Under Article 17 of the General Data Protection Regulation (GDPR), I hereby request the immediate erasure of all personal data concerning me held by your organization.

Data Subject Information:
- Full Name: ${data.input.name || '[YOUR FULL NAME]'}
- Email Address: ${data.input.email || '[YOUR EMAIL ADDRESS]'}

This request includes the complete removal of:
1. All public user profiles, accounts, and associated metadata.
2. All cached or stored personal identifiable information (PII), contact details, and activity logs.
3. Indexing references in your public directory or search engines.

Please confirm receipt of this notice and confirm full execution of this erasure within 30 days as mandated by Article 12(3) of GDPR.

Sincerely,
${data.input.name || '[YOUR FULL NAME]'}`;

  return {
    riskScore,
    threatGrade,
    threatColor,
    totalAccounts: accountsFound,
    totalWebHits: webFound,
    categoriesExposed: categoriesFound,
    recommendations,
    legalDraftGDPR
  };
}

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

app.post('/api/scan', upload.single('image'), async (req, res) => {
  try {
    const { name, email, customUsernames } = req.body;
    const imageFile = req.file;
    
    if (!name && !email) {
      return res.status(400).json({ error: 'At least one full name or email address is required.' });
    }
    
    const scanId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const results = {
      scanId,
      timestamp: new Date().toISOString(),
      input: { name: name || '', email: email || '', hasImage: !!imageFile },
      socialAccounts: [],
      webResults: [],
      breachLinks: [],
      removalLinks: [],
      dataBrokerLinks: [],
      reverseImageLinks: [],
      emailServices: [],
      whoisData: null,
      aiAnalysis: null,
      statistics: {}
    };
    
    // Generate username combinations
    let usernames = [];
    if (name) usernames = generateUsernames(name);
    if (email) {
      const emailUsername = extractUsernameFromEmail(email);
      if (emailUsername) usernames.push(emailUsername);
    }
    if (customUsernames) {
      const custom = customUsernames.split(',').map(u => u.trim()).filter(Boolean);
      usernames.push(...custom);
    }
    usernames = [...new Set(usernames)];
    
    // 1. Parallel Social Media Scan (Batch execution)
    const socialPromises = [];
    for (const username of usernames) {
      for (const platform of SOCIAL_PLATFORMS) {
        socialPromises.push(checkSocialAccount(platform, username));
      }
    }
    
    const batchSize = 20;
    for (let i = 0; i < socialPromises.length; i += batchSize) {
      const batch = socialPromises.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch);
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value.found) {
          const existing = results.socialAccounts.find(
            a => a.platform === result.value.platform && a.username === result.value.username
          );
          if (!existing) {
            results.socialAccounts.push(result.value);
          }
        }
      }
    }
    
    // 2. Web Search Engine Queries
    const searchQueries = [];
    if (name) {
      searchQueries.push(searchWeb(`"${name}"`, 'Name Search'));
      searchQueries.push(searchWeb(`"${name}" site:linkedin.com OR site:facebook.com OR site:github.com`, 'Social Index'));
    }
    if (email) {
      searchQueries.push(searchWeb(`"${email}"`, 'Email Search'));
    }
    
    const webSearchResults = await Promise.allSettled(searchQueries);
    for (const result of webSearchResults) {
      if (result.status === 'fulfilled') {
        results.webResults.push(...result.value);
      }
    }
    
    // 3. Gravatar Check
    if (email) {
      const gravatarResult = await checkGravatar(email);
      if (gravatarResult.found) {
        results.emailServices.push(gravatarResult);
      }
    }
    
    // 4. Breach Check Links
    if (email) {
      results.breachLinks = generateBreachCheckLinks(email);
    }
    
    // 5. Official Removal Links
    results.removalLinks = generateRemovalLinks(name || '');
    
    // 6. Data Brokers & People Search
    results.dataBrokerLinks = generateDataBrokerLinks(name || '', email || '');
    
    // 7. Reverse Image Search Links
    if (imageFile) {
      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${imageFile.filename}`;
      results.reverseImageLinks = generateReverseImageLinks(imageUrl);
      results.uploadedImagePath = `/uploads/${imageFile.filename}`;
    }
    
    // 8. WHOIS Lookup for custom domain emails
    if (email) {
      const domain = email.split('@')[1];
      if (domain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'protonmail.com', 'me.com'].includes(domain)) {
        results.whoisData = await whoisLookup(domain);
      }
    }
    
    // 9. AI Footprint Analysis
    results.aiAnalysis = generateAIFootprintAnalysis(results);
    
    // Statistics Summary
    results.statistics = {
      totalPlatformsChecked: SOCIAL_PLATFORMS.length * usernames.length,
      accountsFound: results.socialAccounts.length,
      webResultsFound: results.webResults.length,
      usernamesChecked: usernames,
    };
    
    res.json(results);
  } catch (err) {
    console.error('Scan execution error:', err);
    res.status(500).json({ error: 'An error occurred during scan execution.', details: err.message });
  }
});

// Direct platform list endpoint
app.get('/api/platforms', (req, res) => {
  res.json(SOCIAL_PLATFORMS.map(p => ({ name: p.name, icon: p.icon, category: p.category, deleteUrl: p.deleteUrl })));
});

// Custom web search API
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter q is required.' });
  const results = await searchWeb(q);
  res.json({ query: q, results });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🔍 TRACE — DIGITAL FOOTPRINT ANALYSIS SYSTEM            ║
║   ─────────────────────────────────────────────          ║
║   Server Running: http://localhost:${PORT}                 ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});
