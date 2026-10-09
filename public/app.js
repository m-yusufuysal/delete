/* ═══════════════════════════════════════════════════════════════
   TRACE — ALL-SEEING OSINT INTELLIGENCE ENGINE (APP LOGIC)
   Interactive Canvas Topology, EXIF GPS Inspector, DNS Audit,
   Live Search Filtering, Removal Tracker & PDF Printing
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
  const printReportBtn = document.getElementById('printReportBtn');
  const newScanBtn = document.getElementById('newScanBtn');
  const accountSearchFilter = document.getElementById('accountSearchFilter');
  const accountCategoryFilter = document.getElementById('accountCategoryFilter');

  // ── State ──
  let currentResults = null;
  let selectedFile = null;
  let removedAccountIds = new Set(JSON.parse(localStorage.getItem('trace_removed_accounts') || '[]'));

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
    if (file.size > 25 * 1024 * 1024) {
      showToast('Image file size must be under 25MB.', 'error');
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
      showToast('Please provide at least a target name or email address.', 'error');
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

      showToast(`Scan complete! Discovered ${data.socialAccounts.length} profiles & ${data.webResults.length} web hits.`, 'success');

    } catch (err) {
      console.error('Scan execution error:', err);
      showToast(`Scan failed: ${err.message}`, 'error');
      endScanUI();
    }
  });

  function startScanUI() {
    scanBtn.disabled = true;
    scanBtn.classList.add('scanning');
    scanBtnText.textContent = 'Scanning Radar...';
    scanBtnIcon.className = 'fas fa-spinner fa-spin';
    scanProgress.classList.add('active');
    resultsSection.classList.remove('active');
    
    document.querySelectorAll('.progress-step').forEach(step => {
      step.classList.remove('active', 'done');
      step.querySelector('i').className = 'far fa-circle';
    });

    const firstStep = document.getElementById('step-exif');
    firstStep.classList.add('active');
    firstStep.querySelector('i').className = 'fas fa-circle-notch fa-spin';
  }

  function simulateProgress() {
    let progress = 0;
    const steps = ['exif', 'social', 'web', 'dns', 'breach', 'ai'];
    let currentStepIdx = 0;

    return setInterval(() => {
      progress += Math.random() * 6 + 2;
      if (progress > 90) progress = 90;

      progressBar.style.width = progress + '%';
      progressPercent.textContent = Math.round(progress) + '%';

      const newStepIdx = Math.min(Math.floor(progress / 15), steps.length - 1);
      if (newStepIdx > currentStepIdx) {
        for (let i = currentStepIdx; i < newStepIdx; i++) {
          const stepEl = document.getElementById(`step-${steps[i]}`);
          if (stepEl) {
            stepEl.classList.remove('active');
            stepEl.classList.add('done');
            stepEl.querySelector('i').className = 'fas fa-check-circle';
          }
        }
        const nextStep = document.getElementById(`step-${steps[newStepIdx]}`);
        if (nextStep) {
          nextStep.classList.add('active');
          nextStep.querySelector('i').className = 'fas fa-circle-notch fa-spin';
        }
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
      }, 600);
    });
  }

  function endScanUI() {
    scanBtn.disabled = false;
    scanBtn.classList.remove('scanning');
    scanBtnText.textContent = 'Activate All-Seeing Radar';
    scanBtnIcon.className = 'fas fa-crosshairs';
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

    // Draw Topology Canvas Graph
    drawTopologyGraph(data);

    renderAccounts(data.socialAccounts);
    renderAIAnalysis(data.aiAnalysis);
    renderEXIF(data.exifInfo);
    renderDNS(data.dnsAudit);
    renderWebResults(data.webResults);
    renderBreachLinks(data.breachLinks);
    renderDataBrokers(data.dataBrokerLinks);
    renderRemovalLinks(data.removalLinks);
    renderImageSearch(data);
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

  // ═══════════════════════════════════════════════════════════════
  // INTERACTIVE CANVAS NODE GRAPH TOPOLOGY
  // ═══════════════════════════════════════════════════════════════

  function drawTopologyGraph(data) {
    const canvas = document.getElementById('cyberGraphCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 1200;
    const height = canvas.height = 340;

    const nodes = [];
    const links = [];

    // Target Node
    const centerNode = { id: 'target', label: data.input.name || data.input.email || 'Target', x: width / 2, y: height / 2, radius: 26, color: '#3b82f6', isCenter: true };
    nodes.push(centerNode);

    // Platform Nodes
    data.socialAccounts.slice(0, 14).forEach((acc, i) => {
      const angle = (i / Math.min(14, data.socialAccounts.length)) * Math.PI * 2;
      const dist = 130 + Math.random() * 30;
      const node = {
        id: `acc_${i}`,
        label: acc.platform,
        x: width / 2 + Math.cos(angle) * dist,
        y: height / 2 + Math.sin(angle) * dist,
        radius: 14,
        color: '#10b981'
      };
      nodes.push(node);
      links.push({ from: centerNode, to: node });
    });

    // Web / Leak Nodes
    if (data.webResults.length > 0) {
      const webNode = { id: 'web_cluster', label: `${data.webResults.length} Web Hits`, x: width / 2 - 240, y: height / 2 - 80, radius: 18, color: '#06b6d4' };
      nodes.push(webNode);
      links.push({ from: centerNode, to: webNode });
    }

    if (data.exifInfo && data.exifInfo.gps) {
      const gpsNode = { id: 'gps_node', label: 'GPS Geotag', x: width / 2 + 240, y: height / 2 - 80, radius: 18, color: '#ef4444' };
      nodes.push(gpsNode);
      links.push({ from: centerNode, to: gpsNode });
    }

    let animFrame;
    let tick = 0;

    function renderGraph() {
      ctx.clearRect(0, 0, width, height);
      tick += 0.02;

      // Draw Links
      links.forEach(link => {
        ctx.beginPath();
        ctx.moveTo(link.from.x, link.from.y);
        ctx.lineTo(link.to.x, link.to.y);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pulsing signals
        const pulseRatio = (Math.sin(tick + link.to.x) + 1) / 2;
        const pulseX = link.from.x + (link.to.x - link.from.x) * pulseRatio;
        const pulseY = link.from.y + (link.to.y - link.from.y) * pulseRatio;
        
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#60a5fa';
        ctx.fill();
      });

      // Draw Nodes
      nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#f8fafc';
        ctx.font = node.isCenter ? 'bold 13px Inter' : '11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.radius + 14);
      });

      animFrame = requestAnimationFrame(renderGraph);
    }

    renderGraph();
  }

  // ── Render Accounts Grid & Filter Handler ──
  function renderAccounts(accounts) {
    const grid = document.getElementById('accountsGrid');
    const searchVal = accountSearchFilter.value.toLowerCase().trim();
    const catVal = accountCategoryFilter.value;

    let filtered = accounts || [];

    if (searchVal) {
      filtered = filtered.filter(a => a.platform.toLowerCase().includes(searchVal) || a.username.toLowerCase().includes(searchVal));
    }

    if (catVal !== 'all') {
      filtered = filtered.filter(a => (a.category || '').toLowerCase() === catVal);
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-user-slash" style="font-size: 40px; margin-bottom: 12px; display: block;"></i>
          <h3>No Profiles Matching Filter</h3>
          <p>Try clearing your search query or choosing another category.</p>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(account => {
      const accId = `${account.platform}_${account.username}`;
      const isRemoved = removedAccountIds.has(accId);

      return `
        <div class="account-card" id="card_${accId}" style="${isRemoved ? 'opacity: 0.55; border-color: var(--accent-green);' : ''}">
          <div class="account-icon">
            <i class="${account.icon || 'fas fa-globe'}"></i>
          </div>
          <div class="account-info">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span class="account-platform">${escapeHtml(account.platform)}</span>
              <span class="category-tag category-${account.category || 'other'}">${account.category || 'other'}</span>
            </div>
            <div class="account-username">@${escapeHtml(account.username)}</div>
            <a href="${escapeHtml(account.url)}" target="_blank" rel="noopener" class="account-url">${escapeHtml(account.url)}</a>
            <div class="account-actions">
              <a href="${escapeHtml(account.url)}" target="_blank" rel="noopener" class="btn-action btn-visit">
                <i class="fas fa-external-link-alt"></i> Visit
              </a>
              ${account.deleteUrl ? `
                <button class="btn-action btn-delete" onclick="showDeleteModal('${escapeHtml(account.platform)}', '${escapeHtml(account.deleteUrl)}', '${escapeHtml(account.deleteInstructions || '')}')">
                  <i class="fas fa-trash"></i> Delete Guide
                </button>
              ` : ''}
              <button class="btn-action btn-track-removed ${isRemoved ? 'is-removed' : ''}" onclick="toggleTrackRemoved('${accId}')">
                <i class="fas ${isRemoved ? 'fa-check-circle' : 'fa-circle-notch'}"></i> ${isRemoved ? 'Erased' : 'Mark Erased'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  accountSearchFilter.addEventListener('input', () => {
    if (currentResults) renderAccounts(currentResults.socialAccounts);
  });

  accountCategoryFilter.addEventListener('change', () => {
    if (currentResults) renderAccounts(currentResults.socialAccounts);
  });

  window.toggleTrackRemoved = function (accId) {
    if (removedAccountIds.has(accId)) {
      removedAccountIds.delete(accId);
      showToast('Marked account as pending.', 'info');
    } else {
      removedAccountIds.add(accId);
      showToast('Account marked as Erased!', 'success');
    }
    localStorage.setItem('trace_removed_accounts', JSON.stringify([...removedAccountIds]));
    if (currentResults) renderAccounts(currentResults.socialAccounts);
  };

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
              <i class="fas fa-brain" style="color: var(--accent-purple);"></i> AI Footprint Assessment
            </h3>
            <p style="font-size: 14px; color: var(--text-secondary);">Automated threat calculation and privacy vulnerability audit</p>
          </div>
          <div class="ai-grade-badge" style="background: ${ai.threatColor}20; color: ${ai.threatColor}; border: 1px solid ${ai.threatColor}50;">
            ${escapeHtml(ai.threatGrade)}
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <h4 style="font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 12px;">
            <i class="fas fa-shield-halved" style="color: var(--accent-blue);"></i> Security Recommendations
          </h4>
          <ul style="display: flex; flex-direction: column; gap: 8px; list-style: none;">
            ${ai.recommendations.map(rec => `
              <li style="font-size: 14px; color: var(--text-primary); display: flex; align-items: flex-start; gap: 10px; background: rgba(59,130,246,0.05); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-primary);">
                <i class="fas fa-shield" style="color: var(--accent-cyan); margin-top: 3px;"></i>
                <span>${escapeHtml(rec)}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <div>
          <div style="display: flex; gap: 10px; margin-bottom: 12px;">
            <button class="btn-export active" id="noticeGdprBtn"><i class="fas fa-gavel"></i> GDPR Notice</button>
            <button class="btn-export" id="noticeCcpaBtn"><i class="fas fa-balance-scale"></i> CCPA Notice</button>
            <button class="btn-export" id="noticeDmcaBtn"><i class="fas fa-copyright"></i> DMCA Notice</button>
          </div>
          <div class="ai-legal-box" id="legalNoticeBox">
            <button class="btn-copy-legal" id="copyLegalBtn">
              <i class="fas fa-copy"></i> Copy Notice
            </button>
            <pre id="legalNoticeText" style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(ai.legalNotices.gdpr)}</pre>
          </div>
        </div>
      </div>
    `;

    const noticeText = document.getElementById('legalNoticeText');
    document.getElementById('noticeGdprBtn').addEventListener('click', (e) => {
      noticeText.textContent = ai.legalNotices.gdpr;
      showToast('Switched to GDPR Article 17 Notice.', 'info');
    });
    document.getElementById('noticeCcpaBtn').addEventListener('click', (e) => {
      noticeText.textContent = ai.legalNotices.ccpa;
      showToast('Switched to CCPA Opt-Out Notice.', 'info');
    });
    document.getElementById('noticeDmcaBtn').addEventListener('click', (e) => {
      noticeText.textContent = ai.legalNotices.dmca;
      showToast('Switched to DMCA Takedown Notice.', 'info');
    });

    document.getElementById('copyLegalBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(noticeText.textContent);
      showToast('Legal Notice copied to clipboard!', 'success');
    });
  }

  // ── Render Photo EXIF & GPS ──
  function renderEXIF(exif) {
    const container = document.getElementById('exifContent');

    if (!exif || !exif.hasExif) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-camera-retro" style="font-size: 40px; margin-bottom: 12px; display: block;"></i>
          <h3>No Photo EXIF Metadata Found</h3>
          <p>Either no photo was uploaded or the uploaded photo has stripped metadata.</p>
        </div>`;
      return;
    }

    let html = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 16px; padding: 24px;">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; color: var(--accent-cyan);">
          <i class="fas fa-camera"></i> Camera EXIF Tag Extraction
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tbody>
            ${exif.cameraMake ? `<tr><th style="padding: 8px; text-align: left; color: var(--text-muted);">Camera Make</th><td style="padding: 8px;">${escapeHtml(exif.cameraMake)}</td></tr>` : ''}
            ${exif.cameraModel ? `<tr><th style="padding: 8px; text-align: left; color: var(--text-muted);">Camera Model</th><td style="padding: 8px;">${escapeHtml(exif.cameraModel)}</td></tr>` : ''}
            ${exif.createDate ? `<tr><th style="padding: 8px; text-align: left; color: var(--text-muted);">Original Date</th><td style="padding: 8px;">${escapeHtml(exif.createDate)}</td></tr>` : ''}
            ${exif.software ? `<tr><th style="padding: 8px; text-align: left; color: var(--text-muted);">Software</th><td style="padding: 8px;">${escapeHtml(exif.software)}</td></tr>` : ''}
            ${exif.imageWidth ? `<tr><th style="padding: 8px; text-align: left; color: var(--text-muted);">Resolution</th><td style="padding: 8px;">${exif.imageWidth} x ${exif.imageHeight} px</td></tr>` : ''}
          </tbody>
        </table>`;

    if (exif.gps) {
      html += `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 20px;">
          <h4 style="color: var(--accent-red); font-size: 16px; font-weight: 700; margin-bottom: 8px;">
            <i class="fas fa-location-dot"></i> Embedded GPS Location Metadata Found!
          </h4>
          <p style="font-size: 14px; margin-bottom: 12px;">Latitude: ${exif.gps.latitude}, Longitude: ${exif.gps.longitude}</p>
          <a href="${escapeHtml(exif.gps.mapsUrl)}" target="_blank" rel="noopener" class="link-card-action breach-link">
            <i class="fas fa-map-location-dot"></i> Open Location in Google Maps
          </a>
        </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  // ── Render DNS Audit ──
  function renderDNS(dns) {
    const container = document.getElementById('dnsContent');

    if (!dns || dns.error) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-shield-halved" style="font-size: 40px; margin-bottom: 12px; display: block;"></i>
          <h3>No Custom Email Domain Audit</h3>
          <p>DNS security audit is run on custom email domains (e.g. company.com).</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 16px; padding: 24px;">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; color: var(--accent-blue);">
          <i class="fas fa-server"></i> Domain DNS & Email Authentication Audit
        </h3>
        <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">Target Domain: <strong>${escapeHtml(dns.domain)}</strong></p>
        <div style="margin-bottom: 16px;">
          <strong>Security Rating:</strong> <span style="color: ${dns.hasSpf && dns.hasDmarc ? 'var(--accent-green)' : 'var(--accent-orange)'}">${escapeHtml(dns.securityRating)}</span>
        </div>
        <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 12px; font-family: 'JetBrains Mono', monospace; font-size: 13px;">
          <div><strong>MX Servers:</strong> ${escapeHtml((dns.mxRecords || []).join(', ') || 'None')}</div>
          <div style="margin-top: 8px;"><strong>SPF Record:</strong> ${escapeHtml(dns.spfRecord || 'Missing')}</div>
          <div style="margin-top: 8px;"><strong>DMARC Record:</strong> ${escapeHtml(dns.dmarcRecord || 'Missing')}</div>
        </div>
      </div>`;
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
          <i class="fas fa-database" style="font-size: 40px; margin-bottom: 12px; display: block;"></i>
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
    if (!links) return;

    grid.innerHTML = links.map(link => `
      <div class="link-card">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(245, 158, 11, 0.15); color: var(--accent-orange); display: flex; align-items: center; justify-content: center; font-size: 18px;">
            <i class="${link.icon}"></i>
          </div>
          <span style="font-weight: 700; font-size: 15px;">${escapeHtml(link.name)}</span>
        </div>
        <p style="font-size: 13px; color: var(--text-secondary); flex: 1;">${escapeHtml(link.description)}</p>
        <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" class="link-card-action" style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); color: var(--accent-orange);">
          <i class="fas fa-user-slash"></i> Opt-Out Page
        </a>
      </div>
    `).join('');
  }

  // ── Render Search Removal ──
  function renderRemovalLinks(links) {
    const grid = document.getElementById('removalGrid');
    if (!links) return;

    grid.innerHTML = links.map(link => `
      <div class="link-card">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(16, 185, 129, 0.15); color: var(--accent-green); display: flex; align-items: center; justify-content: center; font-size: 18px;">
            <i class="${link.icon}"></i>
          </div>
          <span style="font-weight: 700; font-size: 15px;">${escapeHtml(link.name)}</span>
        </div>
        <p style="font-size: 13px; color: var(--text-secondary); flex: 1;">${escapeHtml(link.description)}</p>
        <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" class="link-card-action" style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: var(--accent-green);">
          <i class="fas fa-external-link-alt"></i> Removal Form
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
            <i class="fas fa-search"></i> Lens Match
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

  // ═══════════════════════════════════════════════════════════════
  // TABS & MODAL LOGIC
  // ═══════════════════════════════════════════════════════════════

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const targetContent = document.getElementById(`content-${tab}`);
      if (targetContent) targetContent.classList.add('active');
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
  // PRINT PDF & EXPORT REPORTS
  // ═══════════════════════════════════════════════════════════════

  printReportBtn.addEventListener('click', () => {
    window.print();
  });

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

    toast.innerHTML = `
      <i class="toast-icon fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}" style="color: ${type === 'success' ? 'var(--accent-green)' : type === 'error' ? 'var(--accent-red)' : 'var(--accent-blue)'}"></i>
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
