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
app.use(express.static(__dirname));
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

  // Gaming
  { name: 'Steam', url: 'https://steamcommunity.com/id/{username}', icon: 'fab fa-steam', category: 'gaming', deleteUrl: 'https://help.steampowered.com/en/wizard/HelpWithAccountData', deleteInstructions: 'Steam Support > Permanently Delete My Account.' },
  { name: 'Twitch', url: 'https://www.twitch.tv/{username}', icon: 'fab fa-twitch', category: 'media', deleteUrl: 'https://www.twitch.tv/user/delete-account', deleteInstructions: 'Settings > Profile > Delete Account.' },
  { name: 'Discord', url: 'https://discord.com/users/{username}', icon: 'fab fa-discord', category: 'messaging', deleteUrl: 'https://support.discord.com/hc/en-us/articles/212500837', deleteInstructions: 'User Settings > My Account > Delete Account.' },
  { name: 'Roblox', url: 'https://www.roblox.com/user.aspx?username={username}', icon: 'fas fa-cube', category: 'gaming', deleteUrl: 'https://www.roblox.com/support', deleteInstructions: 'Support Form > Privacy Request.' },

  // Media & Design
  { name: 'YouTube', url: 'https://www.youtube.com/@{username}', icon: 'fab fa-youtube', category: 'media', deleteUrl: 'https://myaccount.google.com/deleteaccount', deleteInstructions: 'Google Settings > Delete YouTube Channel.' },
  { name: 'Spotify', url: 'https://open.spotify.com/user/{username}', icon: 'fab fa-spotify', category: 'media', deleteUrl: 'https://support.spotify.com/article/close-account/', deleteInstructions: 'Support > Close Account.' },
  { name: 'SoundCloud', url: 'https://soundcloud.com/{username}', icon: 'fab fa-soundcloud', category: 'media', deleteUrl: 'https://soundcloud.com/settings/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Vimeo', url: 'https://vimeo.com/{username}', icon: 'fab fa-vimeo', category: 'media', deleteUrl: 'https://vimeo.com/settings/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Dribbble', url: 'https://dribbble.com/{username}', icon: 'fab fa-dribbble', category: 'design', deleteUrl: 'https://dribbble.com/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Behance', url: 'https://www.behance.net/{username}', icon: 'fab fa-behance', category: 'design', deleteUrl: 'https://account.adobe.com/privacy', deleteInstructions: 'Adobe Privacy Center > Delete Account.' },

  // Content & Publishing
  { name: 'Medium', url: 'https://medium.com/@{username}', icon: 'fab fa-medium', category: 'blog', deleteUrl: 'https://medium.com/me/settings/security', deleteInstructions: 'Settings > Security > Delete Account.' },
  { name: 'Substack', url: 'https://substack.com/@{username}', icon: 'fas fa-newspaper', category: 'blog', deleteUrl: 'https://substack.com/settings', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'WordPress', url: 'https://{username}.wordpress.com', icon: 'fab fa-wordpress', category: 'blog', deleteUrl: 'https://wordpress.com/me/account', deleteInstructions: 'Profile > Account Settings > Close account.' },

  // Messaging & Security
  { name: 'Telegram', url: 'https://t.me/{username}', icon: 'fab fa-telegram', category: 'messaging', deleteUrl: 'https://my.telegram.org/auth/deactivate', deleteInstructions: 'Telegram Deactivation Portal > Confirm phone number.' },
  { name: 'Keybase', url: 'https://keybase.io/{username}', icon: 'fab fa-keybase', category: 'security', deleteUrl: 'https://keybase.io/account', deleteInstructions: 'Account Settings > Delete Account.' },
  { name: 'Gravatar', url: 'https://gravatar.com/{username}', icon: 'fas fa-user-circle', category: 'other', deleteUrl: 'https://gravatar.com/profiles/edit', deleteInstructions: 'Edit Profile > Hide Gravatar Profile.' }
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

// ═══════════════════════════════════════════════════════════════
// PHONE NUMBER RECONNAISSANCE & CARRIER MODULE
// ═══════════════════════════════════════════════════════════════

function analyzePhoneNumber(phone) {
  if (!phone) return null;
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  
  let country = 'Unknown / International';
  let countryCode = '';
  
  if (cleanPhone.startsWith('+1') || cleanPhone.startsWith('1')) { country = 'United States / Canada (+1)'; countryCode = 'US'; }
  else if (cleanPhone.startsWith('+90') || cleanPhone.startsWith('90') || (cleanPhone.length === 10 && cleanPhone.startsWith('5'))) { country = 'Turkey (+90)'; countryCode = 'TR'; }
  else if (cleanPhone.startsWith('+44')) { country = 'United Kingdom (+44)'; countryCode = 'GB'; }
  else if (cleanPhone.startsWith('+49')) { country = 'Germany (+49)'; countryCode = 'DE'; }
  else if (cleanPhone.startsWith('+33')) { country = 'France (+33)'; countryCode = 'FR'; }
  else if (cleanPhone.startsWith('+34')) { country = 'Spain (+34)'; countryCode = 'ES'; }

  return {
    rawInput: phone,
    cleanPhone,
    country,
    countryCode,
    reverseLookupLinks: [
      { name: 'Truecaller Directory', url: `https://www.truecaller.com/search/${countryCode.toLowerCase()}/${encodeURIComponent(cleanPhone)}`, icon: 'fas fa-phone-volume', description: 'Caller ID and spam database search.' },
      { name: 'Sync.me Caller ID', url: `https://sync.me/search/?number=${encodeURIComponent(cleanPhone)}`, icon: 'fas fa-address-book', description: 'Social media contacts and phone book match.' },
      { name: 'Whitepages Reverse Phone', url: `https://www.whitepages.com/phone/${encodeURIComponent(cleanPhone)}`, icon: 'fas fa-search', description: 'US landline and mobile reverse lookup.' },
      { name: 'NumLookup Free Lookup', url: `https://www.numlookup.com/phone-number/${encodeURIComponent(cleanPhone)}`, icon: 'fas fa-mobile-alt', description: 'Carrier info, line type, and owner identification.' },
      { name: 'WhatsApp Web Direct Chat', url: `https://wa.me/${encodeURIComponent(cleanPhone.replace('+', ''))}`, icon: 'fab fa-whatsapp', description: 'Direct WhatsApp profile verification link.' },
      { name: 'Telegram Phone Direct Link', url: `https://t.me/+${encodeURIComponent(cleanPhone.replace('+', ''))}`, icon: 'fab fa-telegram', description: 'Check registered Telegram account on phone number.' }
    ]
  };
}

// ═══════════════════════════════════════════════════════════════
// RELATIVES & FAMILY CONNECTIONS OSINT MODULE
// ═══════════════════════════════════════════════════════════════

function generateRelativesOSINT(name, phone) {
  if (!name) return [];
  const cleanName = name.trim();

  return [
    { name: 'FamilyTreeNow Kinship Network', url: `https://www.familytreenow.com/search/genealogy/results?first=${encodeURIComponent(cleanName.split(' ')[0])}&last=${encodeURIComponent(cleanName.split(' ').slice(1).join(' '))}`, icon: 'fas fa-users-between-lines', description: 'Deep family tree records, relatives, and historical address associations.' },
    { name: 'FastPeopleSearch Relatives Map', url: `https://www.fastpeoplesearch.com/name/${encodeURIComponent(cleanName.replace(/\s+/g, '-'))}`, icon: 'fas fa-sitemap', description: 'Discovers associated family members, spouse, and known co-habitants.' },
    { name: 'Spokeo Household & Relatives', url: `https://www.spokeo.com/${encodeURIComponent(cleanName.replace(/\s+/g, '-'))}`, icon: 'fas fa-people-roof', description: 'Identifies immediate relatives, siblings, and shared address records.' },
    { name: 'Radaris Family & Associates', url: `https://radaris.com/p/${encodeURIComponent(cleanName.replace(/\s+/g, '/'))}`, icon: 'fas fa-network-wired', description: 'Deep public records aggregation for family connections.' },
    { name: 'Ancestry.com Public Family Trees', url: `https://www.ancestry.com/search/?name=${encodeURIComponent(cleanName)}`, icon: 'fas fa-dna', description: 'Genealogy database and public family tree archives.' },
    { name: 'MyHeritage Historical Index', url: `https://www.myheritage.com/research?formId=master&formMode=1&action=query&exactSearch=0&qname=Name+fn.${encodeURIComponent(cleanName.split(' ')[0])}+ln.${encodeURIComponent(cleanName.split(' ').slice(1).join(' '))}`, icon: 'fas fa-tree', description: 'Global family trees and relative records.' }
  ];
}

// Check social account
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

// EXIF extraction
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

// Domain DNS Audit
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

// Web search
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

function generateReverseImageLinks(imageUrl) {
  return [
    { name: 'Google Lens Visual AI', url: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`, icon: 'fab fa-google', description: 'Visual neural search engine.' },
    { name: 'Yandex Facial Recon', url: `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`, icon: 'fas fa-search', description: 'Face and image source tracker.' },
    { name: 'TinEye Image Matcher', url: `https://tineye.com/search?url=${encodeURIComponent(imageUrl)}`, icon: 'fas fa-eye', description: 'Locates exact high-res occurrences.' },
    { name: 'Bing Visual Search', url: `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(imageUrl)}`, icon: 'fab fa-microsoft', description: 'Microsoft object and face recognition.' },
  ];
}

function generateBreachCheckLinks(email) {
  return [
    { name: 'Have I Been Pwned', url: `https://haveibeenpwned.com/account/${encodeURIComponent(email)}`, icon: 'fas fa-shield-alt', description: 'Search 13+ billion compromised credentials.' },
    { name: 'DeHashed Database Search', url: `https://www.dehashed.com/search?query=${encodeURIComponent(email)}`, icon: 'fas fa-database', description: 'Deep index search across cracked passwords.' },
    { name: 'Intelligence X (IntelX)', url: `https://intelx.io/?s=${encodeURIComponent(email)}`, icon: 'fas fa-search-plus', description: 'Darknet, pastebin, and historic leaks.' },
    { name: 'LeakCheck Intelligence', url: `https://leakcheck.io/check/${encodeURIComponent(email)}`, icon: 'fas fa-lock-open', description: 'Exposed password hashes search.' },
  ];
}

function generateRemovalLinks(name) {
  return [
    { name: 'Google Personal Data Removal Request', url: 'https://support.google.com/websearch/troubleshooter/9685456', icon: 'fab fa-google', description: 'Request removal of PII, phone numbers, or emails from Google.' },
    { name: 'Google Outdated Content Tool', url: 'https://www.google.com/webmasters/tools/removals', icon: 'fab fa-google', description: 'Request immediate removal of deleted cached pages.' },
    { name: 'Bing Content Removal Request', url: 'https://www.bing.com/webmasters/contentremoval', icon: 'fab fa-microsoft', description: 'Submit page removal requests to Bing.' },
    { name: 'GDPR Right to Be Forgotten (EU Portal)', url: 'https://gdpr.eu/right-to-be-forgotten/', icon: 'fas fa-user-shield', description: 'Enforce legal data deletion under Article 17 of GDPR.' },
    { name: 'CCPA Consumer Privacy Rights (US Portal)', url: 'https://oag.ca.gov/privacy/ccpa', icon: 'fas fa-gavel', description: 'Submit "Do Not Sell / Delete My Data" under CCPA.' },
    { name: 'JustDeleteMe Directory', url: 'https://justdeleteme.xyz/', icon: 'fas fa-trash-alt', description: 'Direct links for closing 500+ accounts.' },
  ];
}

function generateDataBrokerLinks(name) {
  return [
    { name: 'Whitepages Opt-Out', url: 'https://www.whitepages.com/suppression-requests', icon: 'fas fa-address-book', description: 'Remove full name, phone numbers, and home addresses.' },
    { name: 'Spokeo Opt-Out Portal', url: 'https://www.spokeo.com/optout', icon: 'fas fa-search-location', description: 'Request profile removal from US people search database.' },
    { name: 'Radaris Profile Removal', url: 'https://radaris.com/control/privacy', icon: 'fas fa-id-card', description: 'Opt-out of public records aggregation.' },
    { name: 'BeenVerified Privacy Opt-Out', url: 'https://www.beenverified.com/f/optout/search', icon: 'fas fa-user-check', description: 'Remove background check records.' },
    { name: 'FastPeopleSearch Removal', url: 'https://www.fastpeoplesearch.com/removal', icon: 'fas fa-users-cog', description: 'Instant removal form for US directory listings.' },
  ];
}

// AI Footprint & Risk Assessment Engine
function generateAIFootprintAnalysis(data) {
  const accountsFound = data.socialAccounts.length;
  const webFound = data.webResults.length;
  const categoriesFound = [...new Set(data.socialAccounts.map(a => a.category))];
  
  let riskScore = Math.min(100, (accountsFound * 3.5) + (webFound * 2) + (data.emailServices.length * 10) + (data.exifInfo && data.exifInfo.gps ? 25 : 0) + (data.phoneAudit ? 15 : 0));
  let threatGrade = 'A+ (Minimal Exposure)';
  let threatColor = '#10b981';
  
  if (riskScore >= 70) {
    threatGrade = 'F (Severe Doxxing & Network Exposure)';
    threatColor = '#ef4444';
  } else if (riskScore >= 45) {
    threatGrade = 'C (High Footprint Risk)';
    threatColor = '#f59e0b';
  } else if (riskScore >= 20) {
    threatGrade = 'B (Moderate Exposure)';
    threatColor = '#06b6d4';
  }

  const recommendations = [];
  if (data.phoneAudit) {
    recommendations.push(`Target phone number (${data.phoneAudit.cleanPhone}) submitted. Query Truecaller, Sync.me, and Whitepages to scrub associated caller ID records.`);
  }
  if (data.relativesOSINT && data.relativesOSINT.length > 0) {
    recommendations.push('Family & Relatives Network OSINT links generated. Opt-out of FamilyTreeNow & Spokeo to sever public relative connections.');
  }
  if (data.exifInfo && data.exifInfo.gps) {
    recommendations.push('CRITICAL: Uploaded photo contains embedded GPS location metadata. Strip EXIF data before sharing images online.');
  }
  if (accountsFound > 0) {
    recommendations.push(`Discovered ${accountsFound} public profiles across categories: [${categoriesFound.join(', ')}]. Close dormant accounts immediately.`);
  }

  const legalNotices = {
    gdpr: `SUBJECT: GDPR Article 17 "Right to Erasure" Request - ${data.input.name || 'Data Subject'}

To the Data Protection Officer / Legal Department,

Under Article 17 of the General Data Protection Regulation (GDPR), I hereby demand the immediate erasure of all personal data concerning me held by your organization.

Data Subject:
- Full Name: ${data.input.name || '[YOUR NAME]'}
- Email: ${data.input.email || '[YOUR EMAIL]'}
- Phone: ${data.input.phone || '[YOUR PHONE]'}

Requested Actions:
1. Complete removal of all public user profiles, phone listings, and metadata.
2. Erasure of cached personal data, contact information, and family associations.

Kindly confirm execution within 30 days pursuant to GDPR Article 12(3).

Sincerely,
${data.input.name || '[YOUR NAME]'}`,

    ccpa: `SUBJECT: CCPA Privacy Right to Opt-Out & Erasure Request

To Privacy Compliance Team,

Pursuant to the California Consumer Privacy Act (CCPA), I am requesting the immediate deletion of all personal information collected about me, including contact records, phone numbers, and associated relatives info.

Consumer Name: ${data.input.name || '[YOUR NAME]'}
Email: ${data.input.email || '[YOUR EMAIL]'}
Phone: ${data.input.phone || '[YOUR PHONE]'}

Please delete all associated records from your primary servers and backups.

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
// MAIN SCAN API ROUTE
// ═══════════════════════════════════════════════════════════════

app.post('/api/scan', upload.single('image'), async (req, res) => {
  try {
    const { name, email, phone, customUsernames } = req.body;
    const imageFile = req.file;
    
    if (!name && !email && !phone) {
      return res.status(400).json({ error: 'At least one name, email, or phone number is required.' });
    }
    
    const scanId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const results = {
      scanId,
      timestamp: new Date().toISOString(),
      input: { name: name || '', email: email || '', phone: phone || '', hasImage: !!imageFile },
      socialAccounts: [],
      webResults: [],
      breachLinks: [],
      removalLinks: [],
      dataBrokerLinks: [],
      reverseImageLinks: [],
      emailServices: [],
      phoneAudit: null,
      relativesOSINT: [],
      dnsAudit: null,
      exifInfo: null,
      aiAnalysis: null,
      statistics: {}
    };

    // 1. Phone Audit & Reverse Lookup
    if (phone) {
      results.phoneAudit = analyzePhoneNumber(phone);
      results.webResults.push(...await searchWeb(`"${phone}"`, 'Phone Number Search'));
    }

    // 2. Relatives & Kinship OSINT Links
    if (name) {
      results.relativesOSINT = generateRelativesOSINT(name, phone);
      results.webResults.push(...await searchWeb(`"${name}" relatives OR family`, 'Relatives Search'));
    }

    // 3. Photo EXIF Extraction
    if (imageFile) {
      results.exifInfo = extractImageExif(imageFile.path);
      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${imageFile.filename}`;
      results.reverseImageLinks = generateReverseImageLinks(imageUrl);
      results.uploadedImagePath = `/uploads/${imageFile.filename}`;
    }
    
    // 4. Username Generation
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
    
    // 5. Social Account Scan
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
    
    // 6. Web Search Queries
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
    
    // 7. Gravatar & Domain DNS Audit
    if (email) {
      const gravatarResult = await checkGravatar(email);
      if (gravatarResult.found) results.emailServices.push(gravatarResult);
      const domain = email.split('@')[1];
      results.dnsAudit = await auditEmailDomain(domain);
      results.breachLinks = generateBreachCheckLinks(email);
    }

    results.removalLinks = generateRemovalLinks(name || '');
    results.dataBrokerLinks = generateDataBrokerLinks(name || '');
    results.aiAnalysis = generateAIFootprintAnalysis(results);
    
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

app.get('/api/platforms', (req, res) => {
  res.json(SOCIAL_PLATFORMS.map(p => ({ name: p.name, icon: p.icon, category: p.category, deleteUrl: p.deleteUrl })));
});

app.get('/', (req, res) => {
  const rootIndex = path.join(__dirname, 'index.html');
  if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🔍 TRACE — ALL-SEEING OSINT & RELATIVES ENGINE         ║
║   ─────────────────────────────────────────────          ║
║   Server Running: http://localhost:${PORT}                 ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});
