/* ═══════════════════════════════════════════════════════════════
   TRACE — DIGITAL FOOTPRINT INTELLIGENCE & ERASURE SYSTEM
   Frontend Application Logic (English Localization)
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── DOM References ──
  const scanForm = document.getElementById('scanForm');
  const nameInput = document.getElementById('nameInput');
  const emailInput = document.getElementById('emailInput');
  const usernamesInput = document.getElementById('usernamesInput');
  const imageInput = document.getElementById('imageInput');
  const imageDropZone = document.getElementById('imageDropZone');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const imageFileName = document.getElementById('imageFileName');
  const imageFileSize = document.getElementById('imageFileSize');
  const removeImageBtn = document.getElementById('removeImageBtn');
  const scanBtn = document.getElementById('scanBtn');
  const scanBtnText = document.getElementById('scanBtnText');
  const scanBtnIcon = document.getElementById('scanBtnIcon');
  const clearBtn = document.getElementById('clearBtn');
  const scanProgress = document.getElementById('scanProgress');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const resultsSection = document.getElementById('resultsSection');
  const deleteModal = document.getElementById('deleteModal');
  const modalClose = document.getElementById('modalClose');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalTitle = document.getElementById('modalTitle');
  const modalPlatform = document.getElementById('modalPlatform');
  const modalInstructions = document.getElementById('modalInstructions');
  const modalDeleteLink = document.getElementById('modalDeleteLink');
  const toastContainer = document.getElementById('toastContainer');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const newScanBtn = document.getElementById('newScanBtn');

  // ── State ──
  let currentResults = null;
  let selectedFile = null;

  // ═══════════════════════════════════════════════════════════════
  // FILE UPLOAD MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  imageDropZone.addEventListener('click', () => imageInput.click());

  imageDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageDropZone.classList.add('dragover');
  });

  imageDropZone.addEventListener('dragleave', () => {
    imageDropZone.classList.remove('dragover');
  });

  imageDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    imageDropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageSelect(files[0]);
    }
  });

  imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageSelect(e.target.files[0]);
    }
  });

  removeImageBtn.addEventListener('click', () => {
    selectedFile = null;
    imageInput.value = '';
    imageDropZone.style.display = 'block';
    imagePreviewContainer.classList.remove('active');
  });

  function handleImageSelect(file) {
    if (file.size > 15 * 1024 * 1024) {
      showToast('Image file size must be under 15MB.', 'error');
      return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imageFileName.textContent = file.name;
      imageFileSize.textContent = formatFileSize(file.size);
      imageDropZone.style.display = 'none';
      imagePreviewContainer.classList.add('active');
    };
    reader.readAsDataURL(file);
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ═══════════════════════════════════════════════════════════════
  // SCAN SUBMISSION & ANIMATION
  // ═══════════════════════════════════════════════════════════════

  scanForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const customUsernames = usernamesInput.value.trim();

    if (!name && !email) {
      showToast('Please provide at least a full name or email address.', 'error');
      return;
    }

    startScanUI();

    try {
      const formData = new FormData();
      if (name) formData.append('name', name);
      if (email) formData.append('email', email);
      if (customUsernames) formData.append('customUsernames', customUsernames);
      if (selectedFile) formData.append('image', selectedFile);

      const progressInterval = simulateProgress();

      const response = await fetch('/api/scan', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      currentResults = data;

      await completeProgress();
      renderResults(data);

      showToast(`Scan complete! ${data.socialAccounts.length} accounts & ${data.webResults.length} web hits discovered.`, 'success');

    } catch (err) {
      console.error('Scan execution error:', err);
      showToast(`Scan failed: ${err.message}`, 'error');
      endScanUI();
    }
  });

  function startScanUI() {
    scanBtn.disabled = true;
    scanBtn.classList.add('scanning');
    scanBtnText.textContent = 'Scanning Intelligence...';
    scanBtnIcon.className = 'fas fa-spinner fa-spin';
    scanProgress.classList.add('active');
    resultsSection.classList.remove('active');
    
    document.querySelectorAll('.progress-step').forEach(step => {
      step.classList.remove('active', 'done');
      step.querySelector('i').className = 'far fa-circle';
    });

    const firstStep = document.getElementById('step-social');
    firstStep.classList.add('active');
    firstStep.querySelector('i').className = 'fas fa-circle-notch fa-spin';
  }

  function simulateProgress() {
    let progress = 0;
    const steps = ['social', 'web', 'email', 'breach', 'ai'];
    let currentStepIdx = 0;

    return setInterval(() => {
      progress += Math.random() * 7 + 3;
      if (progress > 88) progress = 88;

      progressBar.style.width = progress + '%';
      progressPercent.textContent = Math.round(progress) + '%';

      const newStepIdx = Math.min(Math.floor(progress / 18), steps.length - 1);
      if (newStepIdx > currentStepIdx) {
        for (let i = currentStepIdx; i < newStepIdx; i++) {
          const stepEl = document.getElementById(`step-${steps[i]}`);
          stepEl.classList.remove('active');
          stepEl.classList.add('done');
          stepEl.querySelector('i').className = 'fas fa-check-circle';
        }
        const nextStep = document.getElementById(`step-${steps[newStepIdx]}`);
        nextStep.classList.add('active');
        nextStep.querySelector('i').className = 'fas fa-circle-notch fa-spin';
        currentStepIdx = newStepIdx;
      }
    }, 300);
  }

  function completeProgress() {
    return new Promise((resolve) => {
      document.querySelectorAll('.progress-step').forEach(step => {
        step.classList.remove('active');
        step.classList.add('done');
        step.querySelector('i').className = 'fas fa-check-circle';
      });

      progressBar.style.width = '100%';
      progressPercent.textContent = '100%';

      setTimeout(() => {
        scanProgress.classList.remove('active');
        endScanUI();
        resolve();
      }, 700);
    });
  }

  function endScanUI() {
    scanBtn.disabled = false;
    scanBtn.classList.remove('scanning');
    scanBtnText.textContent = 'Execute Deep Scan';
    scanBtnIcon.className = 'fas fa-radar';
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER RESULTS DASHBOARD
  // ═══════════════════════════════════════════════════════════════

  function renderResults(data) {
    resultsSection.classList.add('active');

    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    const accountsCount = data.socialAccounts.length;
    const webCount = data.webResults.length;
    const platformsCount = data.statistics.totalPlatformsChecked;

    animateNumber('statAccounts', accountsCount);
    animateNumber('statWebResults', webCount);
    animateNumber('statPlatforms', platformsCount);

    if (data.aiAnalysis) {
      document.getElementById('statRisk').textContent = data.aiAnalysis.riskScore + '/100';
      document.getElementById('statRisk').style.color = data.aiAnalysis.threatColor;
    }

    document.getElementById('badgeAccounts').textContent = accountsCount;
    document.getElementById('badgeWeb').textContent = webCount;

    renderAccounts(data.socialAccounts);
    renderAIAnalysis(data.aiAnalysis);
    renderWebResults(data.webResults);
    renderBreachLinks(data.breachLinks);
    renderDataBrokers(data.dataBrokerLinks);
    renderRemovalLinks(data.removalLinks);
    renderImageSearch(data);
    renderWhois(data.whoisData);
  }

  function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    const duration = 1000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  // ── Render Accounts Grid ──
  function renderAccounts(accounts) {
    const grid = document.getElementById('accountsGrid');

    if (!accounts || accounts.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-user-slash" style="font-size: 40px; margin-bottom: 12px; display: block;"></i>
          <h3>No Public Accounts Detected</h3>
          <p>No active public profiles matching the queried aliases were discovered.</p>
        </div>`;
      return;
    }

    grid.innerHTML = accounts.map(account => `
      <div class="account-card">
        <div class="account-icon">
          <i class="${account.icon || 'fas fa-globe'}"></i>
        </div>
        <div class="account-info">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span class="account-platform">${escapeHtml(account.platform)}</span>
            <span class="category-tag category-${account.category || 'other'}">${account.category || 'other'}</span>
          </div>
          <div class="account-username">@${escapeHtml(account.username)}</div>
          <a href="${escapeHtml(account.url)}" target="_blank" rel="noopener" class="account-url">
            ${escapeHtml(account.url)}
          </a>
          <div class="account-actions">
            <a href="${escapeHtml(account.url)}" target="_blank" rel="noopener" class="btn-action btn-visit">
              <i class="fas fa-external-link-alt"></i> Visit Profile
            </a>
            ${account.deleteUrl ? `
              <button class="btn-action btn-delete" onclick="showDeleteModal('${escapeHtml(account.platform)}', '${escapeHtml(account.deleteUrl)}', '${escapeHtml(account.deleteInstructions || '')}')">
                <i class="fas fa-trash"></i> Delete Guide
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  // ── Render AI Analysis ──
  function renderAIAnalysis(ai) {
    const container = document.getElementById('aiAnalysisContent');

    if (!ai) {
      container.innerHTML = `<div class="empty-state">No AI analysis generated.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="ai-card">
        <div class="ai-header">
          <div>
            <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">
              <i class="fas fa-brain" style="color: var(--accent-purple);"></i> AI Footprint Risk Profile
            </h3>
            <p style="font-size: 14px; color: var(--text-secondary);">Automated threat calculation and privacy recommendations</p>
          </div>
          <div class="ai-grade-badge" style="background: ${ai.threatColor}20; color: ${ai.threatColor}; border: 1px solid ${ai.threatColor}50;">
            ${escapeHtml(ai.threatGrade)}
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <h4 style="font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 12px;">
            <i class="fas fa-list-check" style="color: var(--accent-blue);"></i> Security Recommendations
          </h4>
          <ul style="display: flex; flex-direction: column; gap: 8px; list-style: none;">
            ${ai.recommendations.map(rec => `
              <li style="font-size: 14px; color: var(--text-primary); display: flex; align-items: flex-start; gap: 10px; background: rgba(59,130,246,0.05); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-primary);">
                <i class="fas fa-shield-halved" style="color: var(--accent-cyan); margin-top: 3px;"></i>
                <span>${escapeHtml(rec)}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <h4 style="font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">
              <i class="fas fa-gavel" style="color: var(--accent-green);"></i> AI-Generated GDPR Article 17 Erasure Notice
            </h4>
          </div>
          <div class="ai-legal-box" id="legalNoticeBox">
            <button class="btn-copy-legal" id="copyLegalBtn">
              <i class="fas fa-copy"></i> Copy Notice
            </button>
            ${escapeHtml(ai.legalDraftGDPR)}
          </div>
        </div>
      </div>
    `;

    document.getElementById('copyLegalBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(ai.legalDraftGDPR);
      showToast('GDPR Legal Request copied to clipboard!', 'success');
    });
  }

  // ── Render Web Search Results ──
  function renderWebResults(results) {
    const list = document.getElementById('webResultsList');

    if (!results || results.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-search" style="font-size: 40px; margin-bottom: 12px; display: block;"></i>
          <h3>No Web Mentions Discovered</h3>
          <p>No search engine hits were found for the provided query.</p>
        </div>`;
      return;
    }

    const seen = new Set();
    const unique = results.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    list.innerHTML = unique.map(result => `
      <div class="web-result-card">
        <div class="web-result-title">
          <a href="${escapeHtml(result.url)}" target="_blank" rel="noopener">${escapeHtml(result.title)}</a>
        </div>
        <div class="web-result-url">${escapeHtml(result.url)}</div>
        ${result.snippet ? `<div style="font-size: 14px; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(result.snippet)}</div>` : ''}
      </div>
    `).join('');
  }

  // ── Render Data Breach Links ──
  function renderBreachLinks(links) {
    const grid = document.getElementById('breachesGrid');

    if (!links || links.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-shield-alt" style="font-size: 40px; margin-bottom: 12px; display: block;"></i>
          <h3>Email Address Required</h3>
          <p>Please enter an email address to query global breach databases.</p>
        </div>`;
      return;
    }

    grid.innerHTML = links.map(link => `
      <div class="link-card">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(239, 68, 68, 0.15); color: var(--accent-red); display: flex; align-items: center; justify-content: center; font-size: 18px;">
            <i class="${link.icon}"></i>
          </div>
          <span style="font-weight: 700; font-size: 15px;">${escapeHtml(link.name)}</span>
        </div>
        <p style="font-size: 13px; color: var(--text-secondary); flex: 1;">${escapeHtml(link.description)}</p>
        <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" class="link-card-action breach-link">
          <i class="fas fa-external-link-alt"></i> Query Leak Database
        </a>
      </div>
    `).join('');
  }

  // ── Render Data Brokers ──
  function renderDataBrokers(links) {
    const grid = document.getElementById('dataBrokersGrid');

    if (!links || links.length === 0) {
      grid.innerHTML = `<div class="empty-state">No data broker links generated.</div>`;
      return;
    }

    grid.innerHTML = links.map(link => `
      <div class="link-card">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(245, 158, 11, 0.15); color: var(--accent-orange); display: flex; align-items: center; justify-content: center; font-size: 18px;">
            <i class="${link.icon}"></i>
          </div>
          <span style="font-weight: 700; font-size: 15px;">${escapeHtml(link.name)}</span>
        </div>
        <p style="font-size: 13px; color: var(--text-secondary); flex: 1;">${escapeHtml(link.description)}</p>
        <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" class="link-card-action broker-link">
          <i class="fas fa-user-slash"></i> Opt-Out Page
        </a>
      </div>
    `).join('');
  }

  // ── Render Search Removal ──
  function renderRemovalLinks(links) {
    const grid = document.getElementById('removalGrid');

    if (!links || links.length === 0) {
      grid.innerHTML = `<div class="empty-state">No removal links generated.</div>`;
      return;
    }

    grid.innerHTML = links.map(link => `
      <div class="link-card">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(16, 185, 129, 0.15); color: var(--accent-green); display: flex; align-items: center; justify-content: center; font-size: 18px;">
            <i class="${link.icon}"></i>
          </div>
          <span style="font-weight: 700; font-size: 15px;">${escapeHtml(link.name)}</span>
        </div>
        <p style="font-size: 13px; color: var(--text-secondary); flex: 1;">${escapeHtml(link.description)}</p>
        <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" class="link-card-action removal-link">
          <i class="fas fa-external-link-alt"></i> Official Removal Form
        </a>
      </div>
    `).join('');
  }

  // ── Render Visual Lens ──
  function renderImageSearch(data) {
    const container = document.getElementById('imageSearchContent');

    if (data.reverseImageLinks && data.reverseImageLinks.length > 0) {
      let html = '';
      if (data.uploadedImagePath) {
        html += `
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${escapeHtml(data.uploadedImagePath)}" 
                 style="max-width: 200px; max-height: 200px; border-radius: 12px; border: 2px solid var(--border-hover); object-fit: cover;"
                 alt="Target photo">
            <p style="margin-top: 12px; color: var(--text-muted); font-size: 13px;">
              Query visual search engines with your uploaded target image
            </p>
          </div>`;
      }

      html += `<div class="links-grid">`;
      html += data.reverseImageLinks.map(link => `
        <div class="link-card">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(139, 92, 246, 0.15); color: var(--accent-purple); display: flex; align-items: center; justify-content: center; font-size: 18px;">
              <i class="${link.icon}"></i>
            </div>
            <span style="font-weight: 700; font-size: 15px;">${escapeHtml(link.name)}</span>
          </div>
          <p style="font-size: 13px; color: var(--text-secondary); flex: 1;">${escapeHtml(link.description)}</p>
          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" class="link-card-action" style="background: rgba(139, 92, 246, 0.12); border: 1px solid rgba(139, 92, 246, 0.3); color: var(--accent-purple);">
            <i class="fas fa-search"></i> Execute Lens Match
          </a>
        </div>
      `).join('');
      html += `</div>`;

      container.innerHTML = html;
    } else {
      container.innerHTML = `
        <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-camera" style="font-size: 40px; margin-bottom: 12px; display: block;"></i>
          <h3>No Target Image Uploaded</h3>
          <p>Upload a target photograph in the scan form to generate automated reverse visual search links.</p>
        </div>`;
    }
  }

  // ── Render WHOIS ──
  function renderWhois(whoisData) {
    const container = document.getElementById('whoisContent');

    if (!whoisData || !whoisData.found) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-server" style="font-size: 40px; margin-bottom: 12px; display: block;"></i>
          <h3>No Custom Domain WHOIS Available</h3>
          <p>WHOIS information is displayed when scanning custom domain email addresses (e.g., target@company.com).</p>
        </div>`;
      return;
    }

    const data = whoisData.data;
    const fields = [
      ['Domain Name', data.domainName],
      ['Registrar', data.registrar],
      ['Creation Date', data.creationDate],
      ['Updated Date', data.updatedDate],
      ['Expiration Date', data.registrarRegistrationExpirationDate || data.expiryDate],
      ['Name Servers', Array.isArray(data.nameServer) ? data.nameServer.join(', ') : data.nameServer],
      ['Registrant Country', data.registrantCountry],
    ].filter(([, val]) => val);

    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 16px; padding: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            ${fields.map(([key, val]) => `
              <tr>
                <th style="padding: 10px 16px; text-align: left; border-bottom: 1px solid var(--border-primary); font-size: 11px; text-transform: uppercase; color: var(--text-muted); width: 180px;">${escapeHtml(key)}</th>
                <td style="padding: 10px 16px; border-bottom: 1px solid var(--border-primary); font-family: 'JetBrains Mono', monospace; font-size: 13px;">${escapeHtml(String(val))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // TABS & MODAL LOGIC
  // ═══════════════════════════════════════════════════════════════

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`content-${tab}`).classList.add('active');
    });
  });

  window.showDeleteModal = function (platform, deleteUrl, instructions) {
    modalTitle.textContent = `${platform} — Account Deletion Guide`;
    modalPlatform.textContent = platform;
    modalInstructions.textContent = instructions || 'Follow platform account settings to request permanent profile closure.';
    modalDeleteLink.href = deleteUrl || '#';
    deleteModal.classList.add('active');
  };

  modalClose.addEventListener('click', () => deleteModal.classList.remove('active'));
  modalCloseBtn.addEventListener('click', () => deleteModal.classList.remove('active'));
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) deleteModal.classList.remove('active');
  });

  // ═══════════════════════════════════════════════════════════════
  // EXPORT REPORTS
  // ═══════════════════════════════════════════════════════════════

  exportJsonBtn.addEventListener('click', () => {
    if (!currentResults) {
      showToast('No scan data available to export.', 'error');
      return;
    }
    downloadJSON(currentResults, `trace-footprint-report-${Date.now()}.json`);
    showToast('JSON report downloaded successfully.', 'success');
  });

  exportCsvBtn.addEventListener('click', () => {
    if (!currentResults) {
      showToast('No scan data available to export.', 'error');
      return;
    }
    downloadCSV(currentResults, `trace-footprint-report-${Date.now()}.csv`);
    showToast('CSV report downloaded successfully.', 'success');
  });

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename);
  }

  function downloadCSV(data, filename) {
    let csv = 'Platform,Username,URL,Category,Deletion Link\n';
    if (data.socialAccounts) {
      data.socialAccounts.forEach(acc => {
        csv += `"${acc.platform}","${acc.username}","${acc.url}","${acc.category}","${acc.deleteUrl || ''}"\n`;
      });
    }

    csv += '\nWeb Result Title,URL,Source\n';
    if (data.webResults) {
      data.webResults.forEach(res => {
        csv += `"${(res.title || '').replace(/"/g, '""')}","${res.url}","${res.source || ''}"\n`;
      });
    }

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearBtn.addEventListener('click', () => {
    nameInput.value = '';
    emailInput.value = '';
    usernamesInput.value = '';
    imageInput.value = '';
    selectedFile = null;
    imageDropZone.style.display = 'block';
    imagePreviewContainer.classList.remove('active');
    showToast('Form inputs cleared.', 'info');
  });

  newScanBtn.addEventListener('click', () => {
    resultsSection.classList.remove('active');
    currentResults = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Ready for new scan.', 'info');
  });

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      info: 'fas fa-info-circle'
    };

    toast.innerHTML = `
      <i class="toast-icon ${icons[type] || icons.info}" style="color: ${type === 'success' ? 'var(--accent-green)' : type === 'error' ? 'var(--accent-red)' : 'var(--accent-blue)'}"></i>
      <span style="font-size: 14px; flex: 1;">${escapeHtml(message)}</span>
      <button style="background: none; border: none; color: var(--text-muted); cursor: pointer;" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

})();
