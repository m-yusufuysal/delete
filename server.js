const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dns = require('dns').promises;
const ExifParser = require('exif-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// ═══════════════════════════════════════════════════════════════
// EXPANDED 100+ OSINT PLATFORMS DATABASE
// ═══════════════════════════════════════════════════════════════

const SOCIAL_PLATFORMS = [
  // Tech & Developer
  { name: 'GitHub', url: 'https://github.com/{username}', icon: 'fab fa-github', category: 'developer', deleteUrl: 'https://github.com/settings/admin', deleteInstructions: 'Settings > Account > Delete Account.' },
  { name: 'GitLab', url: 'https://gitlab.com/{username}', icon: 'fab fa-gitlab', category: 'developer', deleteUrl: 'https://gitlab.com/-/profile/account', deleteInstructions: 'Profile Settings > Account > Delete Account.' },
  { name: 'Bitbucket', url: 'https://bitbucket.org/{username}/', icon: 'fab fa-bitbucket', category: 'developer', deleteUrl: 'https://bitbucket.org/account/settings/', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'StackOverflow', url: 'https://stackoverflow.com/users/{username}', icon: 'fab fa-stack-overflow', category: 'developer', deleteUrl: 'https://stackoverflow.com/users/delete/current', deleteInstructions: 'Edit Profile > Delete Profile.' },
  { name: 'HackerNews', url: 'https://news.ycombinator.com/user?id={username}', icon: 'fab fa-hacker-news', category: 'developer', deleteUrl: 'https://news.ycombinator.com/newsguidelines.html', deleteInstructions: 'Email hn@ycombinator.com to anonymize profile.' },
  { name: 'CodePen', url: 'https://codepen.io/{username}', icon: 'fab fa-codepen', category: 'developer', deleteUrl: 'https://codepen.io/settings/account', deleteInstructions: 'Settings > Account > Delete Account.' },
  { name: 'Replit', url: 'https://replit.com/@{username}', icon: 'fas fa-code', category: 'developer', deleteUrl: 'https://replit.com/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Dev.to', url: 'https://dev.to/{username}', icon: 'fab fa-dev', category: 'developer', deleteUrl: 'https://dev.to/settings/account', deleteInstructions: 'Settings > Account > Danger Zone > Delete Account.' },
  { name: 'DockerHub', url: 'https://hub.docker.com/u/{username}', icon: 'fab fa-docker', category: 'developer', deleteUrl: 'https://hub.docker.com/settings/account', deleteInstructions: 'Settings > Deactivate Account.' },
  { name: 'Kaggle', url: 'https://www.kaggle.com/{username}', icon: 'fas fa-brain', category: 'developer', deleteUrl: 'https://www.kaggle.com/me/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'ProductHunt', url: 'https://www.producthunt.com/@{username}', icon: 'fab fa-product-hunt', category: 'developer', deleteUrl: 'https://www.producthunt.com/settings/edit', deleteInstructions: 'Settings > Delete Account.' },
  { name: 'NPM', url: 'https://www.npmjs.com/~{username}', icon: 'fab fa-npm', category: 'developer', deleteUrl: 'https://www.npmjs.com/settings/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'PyPI', url: 'https://pypi.org/user/{username}/', icon: 'fab fa-python', category: 'developer', deleteUrl: 'https://pypi.org/manage/account/', deleteInstructions: 'Manage Account > Delete Account.' },
  { name: 'SourceForge', url: 'https://sourceforge.net/u/{username}/profile', icon: 'fas fa-terminal', category: 'developer', deleteUrl: 'https://sourceforge.net/auth/subscriptions/', deleteInstructions: 'Account Settings > Remove Account.' },
  { name: 'Leetcoded', url: 'https://leetcode.com/{username}/', icon: 'fas fa-laptop-code', category: 'developer', deleteUrl: 'https://leetcode.com/profile/', deleteInstructions: 'Account Settings > Delete Profile.' },
  { name: 'HackTheBox', url: 'https://app.hackthebox.com/users/{username}', icon: 'fas fa-user-secret', category: 'developer', deleteUrl: 'https://app.hackthebox.com/profile/settings', deleteInstructions: 'Profile > Settings > Delete Account.' },
  { name: 'TryHackMe', url: 'https://tryhackme.com/p/{username}', icon: 'fas fa-shield-virus', category: 'developer', deleteUrl: 'https://tryhackme.com/my-account', deleteInstructions: 'Account Settings > Delete Account.' },

  // Social & Networking
  { name: 'Twitter / X', url: 'https://x.com/{username}', icon: 'fab fa-x-twitter', category: 'social', deleteUrl: 'https://twitter.com/settings/deactivate', deleteInstructions: 'Settings > Your Account > Deactivate account.' },
  { name: 'Instagram', url: 'https://www.instagram.com/{username}/', icon: 'fab fa-instagram', category: 'social', deleteUrl: 'https://www.instagram.com/accounts/remove/request/permanent/', deleteInstructions: 'Account Deletion Portal > Confirm deletion.' },
  { name: 'Facebook', url: 'https://www.facebook.com/{username}', icon: 'fab fa-facebook', category: 'social', deleteUrl: 'https://www.facebook.com/deactivate_delete_account', deleteInstructions: 'Settings > Account Ownership > Deactivation & Deletion.' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/{username}', icon: 'fab fa-linkedin', category: 'professional', deleteUrl: 'https://www.linkedin.com/psettings/member-delete', deleteInstructions: 'Settings & Privacy > Account Management > Close Account.' },
  { name: 'Reddit', url: 'https://www.reddit.com/user/{username}', icon: 'fab fa-reddit', category: 'social', deleteUrl: 'https://www.reddit.com/settings/', deleteInstructions: 'User Settings > Account > Delete Account.' },
  { name: 'Pinterest', url: 'https://www.pinterest.com/{username}/', icon: 'fab fa-pinterest', category: 'social', deleteUrl: 'https://www.pinterest.com/settings/account-management/', deleteInstructions: 'Settings > Account Management > Delete Account.' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@{username}', icon: 'fab fa-tiktok', category: 'social', deleteUrl: 'https://www.tiktok.com/setting', deleteInstructions: 'Settings > Account > Deactivate or Delete Account.' },
  { name: 'Snapchat', url: 'https://www.snapchat.com/add/{username}', icon: 'fab fa-snapchat', category: 'social', deleteUrl: 'https://accounts.snapchat.com/accounts/delete_account', deleteInstructions: 'Snapchat Accounts Portal > Confirm credentials.' },
  { name: 'Quora', url: 'https://www.quora.com/profile/{username}', icon: 'fab fa-quora', category: 'social', deleteUrl: 'https://www.quora.com/settings', deleteInstructions: 'Settings > Privacy > Delete Account.' },
  { name: 'Mastodon', url: 'https://mastodon.social/@{username}', icon: 'fab fa-mastodon', category: 'social', deleteUrl: 'https://mastodon.social/settings/delete', deleteInstructions: 'Preferences > Account > Delete Account.' },
  { name: 'Threads', url: 'https://www.threads.net/@{username}', icon: 'fas fa-at', category: 'social', deleteUrl: 'https://www.instagram.com/accounts/remove/request/permanent/', deleteInstructions: 'Profile > Settings > Account > Delete Profile.' },
  { name: 'Bluesky', url: 'https://bsky.app/profile/{username}', icon: 'fas fa-cloud', category: 'social', deleteUrl: 'https://bsky.app/settings', deleteInstructions: 'Settings > Account > Delete Account.' },
  { name: 'Tumblr', url: 'https://{username}.tumblr.com', icon: 'fab fa-tumblr', category: 'blog', deleteUrl: 'https://www.tumblr.com/settings/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'VK', url: 'https://vk.com/{username}', icon: 'fab fa-vk', category: 'social', deleteUrl: 'https://vk.com/settings', deleteInstructions: 'Settings > Delete Account.' },
  { name: 'Disqus', url: 'https://disqus.com/by/{username}/', icon: 'fas fa-comments', category: 'social', deleteUrl: 'https://disqus.com/home/settings/account/', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Letterboxd', url: 'https://letterboxd.com/{username}/', icon: 'fas fa-film', category: 'social', deleteUrl: 'https://letterboxd.com/settings/', deleteInstructions: 'Settings > Delete Account.' },
  { name: 'Goodreads', url: 'https://www.goodreads.com/user/show/{username}', icon: 'fas fa-book-open', category: 'social', deleteUrl: 'https://www.goodreads.com/user/edit', deleteInstructions: 'Edit Profile > Delete My Account.' },

  // Gaming
  { name: 'Steam', url: 'https://steamcommunity.com/id/{username}', icon: 'fab fa-steam', category: 'gaming', deleteUrl: 'https://help.steampowered.com/en/wizard/HelpWithAccountData', deleteInstructions: 'Steam Support > Permanently Delete My Account.' },
  { name: 'Twitch', url: 'https://www.twitch.tv/{username}', icon: 'fab fa-twitch', category: 'media', deleteUrl: 'https://www.twitch.tv/user/delete-account', deleteInstructions: 'Settings > Profile > Delete Account.' },
  { name: 'Discord', url: 'https://discord.com/users/{username}', icon: 'fab fa-discord', category: 'messaging', deleteUrl: 'https://support.discord.com/hc/en-us/articles/212500837', deleteInstructions: 'User Settings > My Account > Delete Account.' },
  { name: 'Roblox', url: 'https://www.roblox.com/user.aspx?username={username}', icon: 'fas fa-cube', category: 'gaming', deleteUrl: 'https://www.roblox.com/support', deleteInstructions: 'Support Form > Privacy Request.' },
  { name: 'Chess.com', url: 'https://www.chess.com/member/{username}', icon: 'fas fa-chess', category: 'gaming', deleteUrl: 'https://www.chess.com/home/account', deleteInstructions: 'Settings > Close Account.' },
  { name: 'Lichess', url: 'https://lichess.org/@/{username}', icon: 'fas fa-chess-knight', category: 'gaming', deleteUrl: 'https://lichess.org/account/close', deleteInstructions: 'Account Settings > Close Account.' },
  { name: 'Speedrun.com', url: 'https://www.speedrun.com/user/{username}', icon: 'fas fa-stopwatch', category: 'gaming', deleteUrl: 'https://www.speedrun.com/settings', deleteInstructions: 'Settings > Delete Profile.' },

  // Media, Design & Music
  { name: 'YouTube', url: 'https://www.youtube.com/@{username}', icon: 'fab fa-youtube', category: 'media', deleteUrl: 'https://myaccount.google.com/deleteaccount', deleteInstructions: 'Google Settings > Data & Privacy > Delete YouTube Channel.' },
  { name: 'Spotify', url: 'https://open.spotify.com/user/{username}', icon: 'fab fa-spotify', category: 'media', deleteUrl: 'https://support.spotify.com/article/close-account/', deleteInstructions: 'Support > Close Account.' },
  { name: 'SoundCloud', url: 'https://soundcloud.com/{username}', icon: 'fab fa-soundcloud', category: 'media', deleteUrl: 'https://soundcloud.com/settings/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Bandcamp', url: 'https://bandcamp.com/{username}', icon: 'fas fa-music', category: 'media', deleteUrl: 'https://bandcamp.com/settings', deleteInstructions: 'Settings > Delete Account.' },
  { name: 'Vimeo', url: 'https://vimeo.com/{username}', icon: 'fab fa-vimeo', category: 'media', deleteUrl: 'https://vimeo.com/settings/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Flickr', url: 'https://www.flickr.com/people/{username}/', icon: 'fab fa-flickr', category: 'media', deleteUrl: 'https://identity.flickr.com/account/delete', deleteInstructions: 'Account Settings > Delete Flickr Account.' },
  { name: 'Dribbble', url: 'https://dribbble.com/{username}', icon: 'fab fa-dribbble', category: 'design', deleteUrl: 'https://dribbble.com/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Behance', url: 'https://www.behance.net/{username}', icon: 'fab fa-behance', category: 'design', deleteUrl: 'https://account.adobe.com/privacy', deleteInstructions: 'Adobe Privacy Center > Delete Account.' },
  { name: 'DeviantArt', url: 'https://www.deviantart.com/{username}', icon: 'fab fa-deviantart', category: 'media', deleteUrl: 'https://www.deviantart.com/settings/general', deleteInstructions: 'Account Settings > Deactivate Account.' },
  { name: '500px', url: 'https://500px.com/p/{username}', icon: 'fas fa-camera-retro', category: 'media', deleteUrl: 'https://500px.com/settings/account', deleteInstructions: 'Settings > Account > Delete Account.' },
  { name: 'Unsplash', url: 'https://unsplash.com/@{username}', icon: 'fas fa-camera', category: 'media', deleteUrl: 'https://unsplash.com/account/delete', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Last.fm', url: 'https://www.last.fm/user/{username}', icon: 'fab fa-lastfm', category: 'media', deleteUrl: 'https://www.last.fm/settings/account', deleteInstructions: 'Account Settings > Delete Account.' },

  // Content & Publishing
  { name: 'Medium', url: 'https://medium.com/@{username}', icon: 'fab fa-medium', category: 'blog', deleteUrl: 'https://medium.com/me/settings/security', deleteInstructions: 'Settings > Security > Delete Account.' },
  { name: 'Substack', url: 'https://substack.com/@{username}', icon: 'fas fa-newspaper', category: 'blog', deleteUrl: 'https://substack.com/settings', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'WordPress', url: 'https://{username}.wordpress.com', icon: 'fab fa-wordpress', category: 'blog', deleteUrl: 'https://wordpress.com/me/account', deleteInstructions: 'Profile > Account Settings > Close account.' },
  { name: 'Patreon', url: 'https://www.patreon.com/{username}', icon: 'fab fa-patreon', category: 'blog', deleteUrl: 'https://www.patreon.com/settings/account', deleteInstructions: 'Settings > Account > Delete Account.' },
  { name: 'Wattpad', url: 'https://www.wattpad.com/user/{username}', icon: 'fas fa-book', category: 'blog', deleteUrl: 'https://www.wattpad.com/settings', deleteInstructions: 'Settings > Close Account.' },
  { name: 'Ghost', url: 'https://{username}.ghost.io', icon: 'fas fa-ghost', category: 'blog', deleteUrl: 'https://ghost.org/help/', deleteInstructions: 'Contact support to erase account.' },

  // Messaging & Security
  { name: 'Telegram', url: 'https://t.me/{username}', icon: 'fab fa-telegram', category: 'messaging', deleteUrl: 'https://my.telegram.org/auth/deactivate', deleteInstructions: 'Telegram Deactivation Portal > Confirm phone number.' },
  { name: 'Keybase', url: 'https://keybase.io/{username}', icon: 'fab fa-keybase', category: 'security', deleteUrl: 'https://keybase.io/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Gravatar', url: 'https://gravatar.com/{username}', icon: 'fas fa-user-circle', category: 'other', deleteUrl: 'https://gravatar.com/profiles/edit', deleteInstructions: 'Edit Profile > Hide Gravatar Profile.' },

  // Code & Paste Dumps
  { name: 'Pastebin', url: 'https://pastebin.com/u/{username}', icon: 'fas fa-paste', category: 'developer', deleteUrl: 'https://pastebin.com/doc_privacy_statement', deleteInstructions: 'Delete individual pastes or submit removal request.' },
  { name: 'Ghostbin', url: 'https://ghostbin.com/u/{username}', icon: 'fas fa-file-code', category: 'developer', deleteUrl: 'https://ghostbin.com/', deleteInstructions: 'Delete paste entries.' },

  // Crypto & Finance
  { name: 'TradingView', url: 'https://www.tradingview.com/u/{username}/', icon: 'fas fa-chart-line', category: 'other', deleteUrl: 'https://www.tradingview.com/user-settings/', deleteInstructions: 'Profile Settings > Delete Account.' },
  { name: 'OpenSea', url: 'https://opensea.io/{username}', icon: 'fas fa-store', category: 'other', deleteUrl: 'https://opensea.io/account', deleteInstructions: 'Disconnect Web3 wallet and clear profile.' },
  { name: 'CoinMarketCap', url: 'https://coinmarketcap.com/community/profile/{username}', icon: 'fas fa-coins', category: 'other', deleteUrl: 'https://coinmarketcap.com/account/', deleteInstructions: 'Account Settings > Delete Profile.' }
];

// Helper utilities
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
      timeout: 6000,
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

// ═══════════════════════════════════════════════════════════════
// PHOTO EXIF METADATA EXTRACTION ENGINE
// ═══════════════════════════════════════════════════════════════

function extractImageExif(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const parser = ExifParser.create(buffer);
    const result = parser.parse();
    
    const tags = result.tags || {};
    const exifInfo = {
      hasExif: Object.keys(tags).length > 0,
      cameraMake: tags.Make || null,
      cameraModel: tags.Model || null,
      modifyDate: tags.ModifyDate ? new Date(tags.ModifyDate * 1000).toISOString() : null,
      createDate: tags.CreateDate ? new Date(tags.CreateDate * 1000).toISOString() : null,
      software: tags.Software || null,
      imageWidth: result.imageSize ? result.imageSize.width : null,
      imageHeight: result.imageSize ? result.imageSize.height : null,
      gps: null
    };

    if (tags.GPSLatitude && tags.GPSLongitude) {
      exifInfo.gps = {
        latitude: tags.GPSLatitude,
        longitude: tags.GPSLongitude,
        mapsUrl: `https://www.google.com/maps?q=${tags.GPSLatitude},${tags.GPSLongitude}`
      };
    }

    return exifInfo;
  } catch (err) {
    return { hasExif: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// DNS & MX SECURITY RECONNAISSANCE ENGINE
// ═══════════════════════════════════════════════════════════════

async function auditEmailDomain(domain) {
  if (!domain || ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'protonmail.com'].includes(domain.toLowerCase())) {
    return null;
  }

  try {
    const mxRecords = await dns.resolveMx(domain).catch(() => []);
    const txtRecords = await dns.resolveTxt(domain).catch(() => []);
    
    const spfRecord = txtRecords.flat().find(r => r.startsWith('v=spf1')) || null;
    
    const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`).catch(() => []);
    const dmarcRecord = dmarcRecords.flat().find(r => r.startsWith('v=DMARC1')) || null;

    return {
      domain,
      mxRecords: mxRecords.map(m => m.exchange),
      hasSpf: !!spfRecord,
      spfRecord,
      hasDmarc: !!dmarcRecord,
      dmarcRecord,
      securityRating: (spfRecord && dmarcRecord) ? 'High Security (SPF & DMARC Configured)' : 'Low Security (Missing Email Auth)'
    };
  } catch (err) {
    return { domain, error: err.message };
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

// Web search via DuckDuckGo
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

// Reverse Image Links Generator
function generateReverseImageLinks(imageUrl) {
  return [
    { name: 'Google Lens & Visual AI', url: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`, icon: 'fab fa-google', description: 'World\'s leading visual neural search engine.' },
    { name: 'Yandex Facial & Visual Recon', url: `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`, icon: 'fas fa-search', description: 'High precision face and image source tracker.' },
    { name: 'TinEye Image Matcher', url: `https://tineye.com/search?url=${encodeURIComponent(imageUrl)}`, icon: 'fas fa-eye', description: 'Locates exact high-resolution and cropped occurrences.' },
    { name: 'Bing Visual Search', url: `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(imageUrl)}`, icon: 'fab fa-microsoft', description: 'Microsoft multi-index object and face recognition.' },
  ];
}

function generateBreachCheckLinks(email) {
  return [
    { name: 'Have I Been Pwned', url: `https://haveibeenpwned.com/account/${encodeURIComponent(email)}`, icon: 'fas fa-shield-alt', description: 'Search 13+ billion compromised credentials and dump files.' },
    { name: 'DeHashed Database Search', url: `https://www.dehashed.com/search?query=${encodeURIComponent(email)}`, icon: 'fas fa-database', description: 'Deep index search across cracked passwords and text dumps.' },
    { name: 'Intelligence X (IntelX)', url: `https://intelx.io/?s=${encodeURIComponent(email)}`, icon: 'fas fa-search-plus', description: 'Darknet, pastebin, and historic internet leaks lookup.' },
    { name: 'LeakCheck Intelligence', url: `https://leakcheck.io/check/${encodeURIComponent(email)}`, icon: 'fas fa-lock-open', description: 'Exposed password hashes and metadata search.' },
    { name: 'BreachDirectory Global Index', url: `https://breachdirectory.org/search/${encodeURIComponent(email)}`, icon: 'fas fa-exclamation-triangle', description: 'Public security leak portal.' },
  ];
}

function generateRemovalLinks(name) {
  return [
    { name: 'Google Personal Data Removal Request', url: 'https://support.google.com/websearch/troubleshooter/9685456', icon: 'fab fa-google', description: 'Request removal of PII, phone numbers, or emails from Google Search.' },
    { name: 'Google Outdated Content Tool', url: 'https://www.google.com/webmasters/tools/removals', icon: 'fab fa-google', description: 'Request immediate removal of deleted cached web pages.' },
    { name: 'Bing Content Removal Request', url: 'https://www.bing.com/webmasters/contentremoval', icon: 'fab fa-microsoft', description: 'Submit page removal requests to Microsoft Bing index.' },
    { name: 'GDPR Right to Be Forgotten (EU Portal)', url: 'https://gdpr.eu/right-to-be-forgotten/', icon: 'fas fa-user-shield', description: 'Enforce legal data deletion under Article 17 of GDPR.' },
    { name: 'CCPA Consumer Privacy Rights (US Portal)', url: 'https://oag.ca.gov/privacy/ccpa', icon: 'fas fa-gavel', description: 'Submit "Do Not Sell / Delete My Data" requests under CCPA.' },
    { name: 'KVKK Personal Data Protection Authority', url: 'https://www.kvkk.gov.tr/Icerik/5382/Veri-Sorumlusuna-Basvuru', icon: 'fas fa-balance-scale', description: 'Data deletion application for Turkish citizens.' },
    { name: 'JustDeleteMe Account Directory', url: 'https://justdeleteme.xyz/', icon: 'fas fa-trash-alt', description: 'Direct links and difficulty ratings for closing 500+ accounts.' },
    { name: 'AccountKiller Guide', url: 'https://www.accountkiller.com/en', icon: 'fas fa-user-times', description: 'Step-by-step guides for erasing hidden profiles.' },
  ];
}

function generateDataBrokerLinks(name, email) {
  return [
    { name: 'Whitepages Opt-Out', url: 'https://www.whitepages.com/suppression-requests', icon: 'fas fa-address-book', description: 'Remove full name, age, phone numbers, and home addresses.' },
    { name: 'Spokeo Opt-Out Portal', url: 'https://www.spokeo.com/optout', icon: 'fas fa-search-location', description: 'Request profile removal from US people search database.' },
    { name: 'Radaris Profile Removal', url: 'https://radaris.com/control/privacy', icon: 'fas fa-id-card', description: 'Opt-out of public records aggregation.' },
    { name: 'BeenVerified Privacy Opt-Out', url: 'https://www.beenverified.com/f/optout/search', icon: 'fas fa-user-check', description: 'Remove background check records.' },
    { name: 'FastPeopleSearch Removal', url: 'https://www.fastpeoplesearch.com/removal', icon: 'fas fa-users-cog', description: 'Instant removal form for US directory listings.' },
    { name: 'DeleteMe Automated Service', url: 'https://joindeleteme.com/', icon: 'fas fa-shield-virus', description: 'Automated removal service across 100+ brokers.' },
    { name: 'Incogni Privacy Service', url: 'https://incogni.com/', icon: 'fas fa-user-ninja', description: 'Automated legal erasure requests sent to data brokers.' }
  ];
}

// ═══════════════════════════════════════════════════════════════
// AI DOXXING & EXPOSURE THREAT ASSESSMENT ENGINE
// ═══════════════════════════════════════════════════════════════

function generateAIFootprintAnalysis(data) {
  const accountsFound = data.socialAccounts.length;
  const webFound = data.webResults.length;
  const categoriesFound = [...new Set(data.socialAccounts.map(a => a.category))];
  
  let riskScore = Math.min(100, (accountsFound * 3.5) + (webFound * 2) + (data.emailServices.length * 10) + (data.exifInfo && data.exifInfo.gps ? 25 : 0));
  let threatGrade = 'A+ (Minimal Exposure)';
  let threatColor = '#10b981';
  
  if (riskScore >= 70) {
    threatGrade = 'F (Severe Doxxing Exposure)';
    threatColor = '#ef4444';
  } else if (riskScore >= 45) {
    threatGrade = 'C (High Digital Footprint)';
    threatColor = '#f59e0b';
  } else if (riskScore >= 20) {
    threatGrade = 'B (Moderate Exposure)';
    threatColor = '#06b6d4';
  }

  const recommendations = [];
  if (data.exifInfo && data.exifInfo.gps) {
    recommendations.push('CRITICAL: Uploaded target photo contains embedded GPS location metadata. Remove EXIF data before uploading photos publicly.');
  }
  if (accountsFound > 0) {
    recommendations.push(`Discovered ${accountsFound} public profiles across categories: [${categoriesFound.join(', ')}]. Close dormant accounts immediately.`);
  }
  if (categoriesFound.includes('developer')) {
    recommendations.push('Developer platforms exposed (GitHub/GitLab/NPM). Audit public repos for hardcoded API keys, private emails, or config secrets.');
  }
  if (categoriesFound.includes('social')) {
    recommendations.push('Social media profiles indexed publicly. Set privacy toggles to Private and audit historical tagged posts.');
  }
  if (data.input.email) {
    recommendations.push('Query Have I Been Pwned regularly and enforce 2FA/MFA hardware keys or authenticator apps.');
  }

  // Multi-notice legal demand generator
  const legalNotices = {
    gdpr: `SUBJECT: GDPR Article 17 "Right to Erasure" Request - ${data.input.name || 'Data Subject'}

To the Data Protection Officer / Legal Department,

Under Article 17 of the General Data Protection Regulation (GDPR), I hereby demand the immediate erasure of all personal data concerning me held by your organization.

Data Subject:
- Full Name: ${data.input.name || '[YOUR NAME]'}
- Email: ${data.input.email || '[YOUR EMAIL]'}

Requested Actions:
1. Complete removal of all public user profiles, accounts, and metadata.
2. Erasure of cached personal data, contact information, and logs.
3. Notification to third-party data processors to remove linked records.

Kindly confirm execution within 30 days pursuant to GDPR Article 12(3).

Sincerely,
${data.input.name || '[YOUR NAME]'}`,

    ccpa: `SUBJECT: CCPA Privacy Right to Opt-Out & Erasure Request

To Privacy Compliance Team,

Pursuant to the California Consumer Privacy Act (CCPA), I am requesting the immediate deletion of all personal information collected about me, and opting out of any sale or sharing of my personal data.

Consumer Name: ${data.input.name || '[YOUR NAME]'}
Email: ${data.input.email || '[YOUR EMAIL]'}

Please delete all associated records from your primary servers and backups.

Sincerely,
${data.input.name || '[YOUR NAME]'}`,

    dmca: `SUBJECT: DMCA Copyright & Image Takedown Notice

To Copyright Agent / Designated Agent,

I am writing to notify you of unauthorized publication of copyright-protected material (photos/content) belonging to me.

Target Name: ${data.input.name || '[YOUR NAME]'}
Contact Email: ${data.input.email || '[YOUR EMAIL]'}

I have a good faith belief that the use of the material is not authorized by the copyright owner, its agent, or the law. Please remove the infringing content immediately.

Sincerely,
${data.input.name || '[YOUR NAME]'}`
  };

  return {
    riskScore: Math.round(riskScore),
    threatGrade,
    threatColor,
    totalAccounts: accountsFound,
    totalWebHits: webFound,
    categoriesExposed: categoriesFound,
    recommendations,
    legalNotices
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
      dnsAudit: null,
      exifInfo: null,
      aiAnalysis: null,
      statistics: {}
    };

    // 1. Photo EXIF Extraction
    if (imageFile) {
      results.exifInfo = extractImageExif(imageFile.path);
      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${imageFile.filename}`;
      results.reverseImageLinks = generateReverseImageLinks(imageUrl);
      results.uploadedImagePath = `/uploads/${imageFile.filename}`;
    }
    
    // 2. Username Generation
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
    
    // 3. Social Media Account Scan (Batch parallel execution)
    const socialPromises = [];
    for (const username of usernames) {
      for (const platform of SOCIAL_PLATFORMS) {
        socialPromises.push(checkSocialAccount(platform, username));
      }
    }
    
    const batchSize = 25;
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
    
    // 4. Web Search Engine Queries
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
    
    // 5. Gravatar Check
    if (email) {
      const gravatarResult = await checkGravatar(email);
      if (gravatarResult.found) {
        results.emailServices.push(gravatarResult);
      }
    }

    // 6. Domain DNS Audit
    if (email) {
      const domain = email.split('@')[1];
      results.dnsAudit = await auditEmailDomain(domain);
    }
    
    // 7. Static Links Generation
    if (email) {
      results.breachLinks = generateBreachCheckLinks(email);
    }
    results.removalLinks = generateRemovalLinks(name || '');
    results.dataBrokerLinks = generateDataBrokerLinks(name || '', email || '');
    
    // 8. AI Footprint Analysis
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

// Platform API
app.get('/api/platforms', (req, res) => {
  res.json(SOCIAL_PLATFORMS.map(p => ({ name: p.name, icon: p.icon, category: p.category, deleteUrl: p.deleteUrl })));
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🔍 TRACE — ALL-SEEING OSINT INTELLIGENCE ENGINE        ║
║   ─────────────────────────────────────────────          ║
║   Server Running: http://localhost:${PORT}                 ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});
