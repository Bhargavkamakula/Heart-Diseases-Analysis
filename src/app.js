/**
 * Rising Above Heart Disease — Main Application Logic
 * Dashboard rendering, charts, interactivity, and risk calculator.
 * Uses data from Heart_new2.csv loaded via data.js.
 */

(function () {
  'use strict';

  // ── Chart.js Global Config ────────────────────────────────────────────────
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(13, 17, 41, 0.95)';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(124, 58, 237, 0.3)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.titleFont = { family: "'Outfit', sans-serif", weight: '600', size: 13 };
  Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
  Chart.defaults.elements.bar.borderRadius = 6;
  Chart.defaults.elements.point.radius = 3;
  Chart.defaults.elements.point.hoverRadius = 6;
  Chart.defaults.animation.duration = 1200;
  Chart.defaults.animation.easing = 'easeOutQuart';

  // ── Colors ────────────────────────────────────────────────────────────────
  const C = {
    violet: '#7c3aed', violetLight: 'rgba(124,58,237,0.2)',
    cyan: '#06b6d4', cyanLight: 'rgba(6,182,212,0.2)',
    coral: '#f43f5e', coralLight: 'rgba(244,63,94,0.2)',
    emerald: '#10b981', emeraldLight: 'rgba(16,185,129,0.2)',
    amber: '#f59e0b', amberLight: 'rgba(245,158,11,0.2)',
    blue: '#3b82f6', blueLight: 'rgba(59,130,246,0.2)',
    pink: '#ec4899', pinkLight: 'rgba(236,72,153,0.2)',
    indigo: '#6366f1',
  };

  const charts = {};

  // ── Particles ─────────────────────────────────────────────────────────────
  function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 100;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedY = -(Math.random() * 0.6 + 0.15);
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.4 + 0.1;
        this.hue = Math.random() > 0.5 ? 260 : 190;
      }
      update() {
        this.y += this.speedY; this.x += this.speedX; this.opacity -= 0.0005;
        if (this.y < -10 || this.opacity <= 0) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue},80%,65%,${this.opacity})`;
        ctx.fill();
      }
    }
    for (let i = 0; i < 60; i++) { const p = new Particle(); p.y = Math.random() * canvas.height; particles.push(p); }
    (function animate() { ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { p.update(); p.draw(); }); requestAnimationFrame(animate); })();
  }

  // ── Animated Counter ──────────────────────────────────────────────────────
  function animateCounter(el, target, suffix = '', duration = 1200) {
    if (!el) return;
    const isFloat = String(target).includes('.');
    const startTime = performance.now();
    (function tick(now) {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (isFloat ? (target * eased).toFixed(1) : Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const panels = document.querySelectorAll('.dashboard-panel');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('mobile-menu-btn');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const panelId = item.dataset.panel;
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        panels.forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`panel-${panelId}`);
        if (target) { target.classList.add('active'); target.style.animation = 'none'; target.offsetHeight; target.style.animation = ''; }
        sidebar.classList.remove('open'); overlay.classList.remove('active');
        renderPanelCharts(panelId);
      });
    });
    menuBtn.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('active'); });
    overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); });
  }

  // ── Lazy Panel Rendering ──────────────────────────────────────────────────
  const rendered = new Set();
  function renderPanelCharts(id) {
    if (rendered.has(id)) return;
    rendered.add(id);
    const D = window.AntiGravityData;
    switch (id) {
      case 'overview': renderOverview(D); break;
      case 'demographics': renderDemographics(D); break;
      case 'conditions': renderConditions(D); break;
      case 'lifestyle': renderLifestyle(D); break;
      case 'calculator': renderCalculator(D); break;
    }
  }

  // ── Helper: binary condition chart ────────────────────────────────────────
  function binaryConditionChart(canvasId, patients, field, labelTrue, labelFalse) {
    const tD = patients.filter(p => p[field] && p.heartDisease).length;
    const tH = patients.filter(p => p[field] && !p.heartDisease).length;
    const fD = patients.filter(p => !p[field] && p.heartDisease).length;
    const fH = patients.filter(p => !p[field] && !p.heartDisease).length;
    return new Chart(document.getElementById(canvasId), {
      type: 'bar',
      data: {
        labels: [labelTrue, labelFalse],
        datasets: [
          { label: 'Heart Disease', data: [tD, fD], backgroundColor: C.coral, borderWidth: 0 },
          { label: 'No Heart Disease', data: [tH, fH], backgroundColor: C.emerald, borderWidth: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } } },
        plugins: { legend: { position: 'top' } }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  function renderOverview(D) {
    const { patients, aggregates, AGE_CATEGORIES_ORDER, GEN_HEALTH_ORDER } = D;

    // KPIs
    animateCounter(document.getElementById('kpi-total'), aggregates.total);
    animateCounter(document.getElementById('kpi-diseased'), aggregates.diseased);
    animateCounter(document.getElementById('kpi-healthy'), aggregates.healthy);
    animateCounter(document.getElementById('kpi-prevalence'), parseFloat(aggregates.prevalence), '%');
    animateCounter(document.getElementById('kpi-avg-bmi'), parseFloat(aggregates.avgBMI));
    document.getElementById('header-count').textContent = aggregates.total.toLocaleString() + ' Respondents';
    document.getElementById('header-prevalence').textContent = aggregates.prevalence + '% Prevalence';

    // Age Distribution
    const ageBins = {};
    AGE_CATEGORIES_ORDER.forEach(a => ageBins[a] = { d: 0, h: 0 });
    patients.forEach(p => { if (ageBins[p.ageCategory]) { if (p.heartDisease) ageBins[p.ageCategory].d++; else ageBins[p.ageCategory].h++; } });
    charts.ageDist = new Chart(document.getElementById('ageDistributionChart'), {
      type: 'bar',
      data: {
        labels: AGE_CATEGORIES_ORDER,
        datasets: [
          { label: 'Heart Disease', data: AGE_CATEGORIES_ORDER.map(a => ageBins[a].d), backgroundColor: C.coral, borderWidth: 0 },
          { label: 'Healthy', data: AGE_CATEGORIES_ORDER.map(a => ageBins[a].h), backgroundColor: C.emerald, borderWidth: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } } },
        plugins: { legend: { position: 'top' } }
      }
    });

    // Diagnosis Donut
    charts.diagDonut = new Chart(document.getElementById('diagnosisDonut'), {
      type: 'doughnut',
      data: {
        labels: ['Heart Disease', 'Healthy'],
        datasets: [{ data: [aggregates.diseased, aggregates.healthy], backgroundColor: [C.coral, C.emerald], borderColor: 'transparent', hoverOffset: 12 }]
      },
      options: { responsive: true, maintainAspectRatio: true, cutout: '68%', plugins: { legend: { position: 'bottom' } } }
    });

    // General Health vs Heart Disease
    const ghBins = {};
    GEN_HEALTH_ORDER.forEach(g => ghBins[g] = { d: 0, h: 0 });
    patients.forEach(p => { if (ghBins[p.genHealth]) { if (p.heartDisease) ghBins[p.genHealth].d++; else ghBins[p.genHealth].h++; } });
    charts.genHealth = new Chart(document.getElementById('genHealthChart'), {
      type: 'bar',
      data: {
        labels: GEN_HEALTH_ORDER,
        datasets: [
          { label: 'Heart Disease', data: GEN_HEALTH_ORDER.map(g => ghBins[g].d), backgroundColor: C.coral, borderWidth: 0 },
          { label: 'Healthy', data: GEN_HEALTH_ORDER.map(g => ghBins[g].h), backgroundColor: C.emerald, borderWidth: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } } },
        plugins: { legend: { position: 'top' } }
      }
    });

    // Gender vs Disease
    const gd = { Male: { d: 0, h: 0 }, Female: { d: 0, h: 0 } };
    patients.forEach(p => { if (gd[p.sex]) { if (p.heartDisease) gd[p.sex].d++; else gd[p.sex].h++; } });
    charts.genderDisease = new Chart(document.getElementById('genderDiseaseChart'), {
      type: 'bar',
      data: {
        labels: ['Male', 'Female'],
        datasets: [
          { label: 'Heart Disease', data: [gd.Male.d, gd.Female.d], backgroundColor: C.coral, borderWidth: 0 },
          { label: 'Healthy', data: [gd.Male.h, gd.Female.h], backgroundColor: C.emerald, borderWidth: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } } },
        plugins: { legend: { position: 'top' } }
      }
    });

    // Insights
    const malePrev = gd.Male.d + gd.Male.h > 0 ? ((gd.Male.d / (gd.Male.d + gd.Male.h)) * 100).toFixed(1) : 0;
    const femalePrev = gd.Female.d + gd.Female.h > 0 ? ((gd.Female.d / (gd.Female.d + gd.Female.h)) * 100).toFixed(1) : 0;
    const peakAge = AGE_CATEGORIES_ORDER.reduce((best, a) => ageBins[a].d > ageBins[best].d ? a : best, AGE_CATEGORIES_ORDER[0]);
    document.getElementById('insight-1').textContent = `Males show ${malePrev}% heart disease prevalence vs ${femalePrev}% in females. The age group ${peakAge} has the highest disease count.`;

    const smokerD = patients.filter(p => p.smoking && p.heartDisease).length;
    const smokerT = patients.filter(p => p.smoking).length;
    const smokerPrev = smokerT > 0 ? ((smokerD / smokerT) * 100).toFixed(1) : 0;
    document.getElementById('insight-2').textContent = `Among smokers, ${smokerPrev}% have heart disease. Average BMI is ${aggregates.avgBMI} and average sleep time is ${aggregates.avgSleep} hours.`;

    const activePrev = (() => { const a = patients.filter(p => p.physicalActivity); const d = a.filter(p => p.heartDisease).length; return a.length > 0 ? ((d / a.length) * 100).toFixed(1) : 0; })();
    const inactivePrev = (() => { const a = patients.filter(p => !p.physicalActivity); const d = a.filter(p => p.heartDisease).length; return a.length > 0 ? ((d / a.length) * 100).toFixed(1) : 0; })();
    document.getElementById('insight-3').textContent = `Physically active respondents show ${activePrev}% heart disease vs ${inactivePrev}% for inactive. Regular exercise significantly reduces risk.`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DEMOGRAPHICS
  // ═══════════════════════════════════════════════════════════════════════════
  function renderDemographics(D) {
    const { patients, aggregates, AGE_CATEGORIES_ORDER } = D;

    animateCounter(document.getElementById('kpi-male'), aggregates.maleCount);
    animateCounter(document.getElementById('kpi-female'), aggregates.femaleCount);
    animateCounter(document.getElementById('kpi-avg-sleep'), parseFloat(aggregates.avgSleep));
    animateCounter(document.getElementById('kpi-races'), aggregates.racesPresent.length);

    // Age-Gender Pyramid
    const pyramid = {};
    AGE_CATEGORIES_ORDER.forEach(a => pyramid[a] = { m: 0, f: 0 });
    patients.forEach(p => { if (pyramid[p.ageCategory]) { if (p.sex === 'Male') pyramid[p.ageCategory].m++; else pyramid[p.ageCategory].f++; } });
    charts.pyramid = new Chart(document.getElementById('ageGenderPyramid'), {
      type: 'bar',
      data: {
        labels: AGE_CATEGORIES_ORDER,
        datasets: [
          { label: 'Male', data: AGE_CATEGORIES_ORDER.map(a => pyramid[a].m), backgroundColor: C.violet, borderWidth: 0 },
          { label: 'Female', data: AGE_CATEGORIES_ORDER.map(a => -pyramid[a].f), backgroundColor: C.pink, borderWidth: 0 }
        ]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: true,
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => Math.abs(v) } },
          y: { grid: { display: false } }
        },
        plugins: { tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Math.abs(ctx.raw)}` } } }
      }
    });

    // Race Distribution
    const raceCounts = {};
    const raceDisease = {};
    patients.forEach(p => { raceCounts[p.race] = (raceCounts[p.race] || 0) + 1; if (p.heartDisease) raceDisease[p.race] = (raceDisease[p.race] || 0) + 1; });
    const sortedRaces = Object.keys(raceCounts).sort((a, b) => raceCounts[b] - raceCounts[a]);
    charts.race = new Chart(document.getElementById('raceChart'), {
      type: 'bar',
      data: {
        labels: sortedRaces,
        datasets: [
          { label: 'Total', data: sortedRaces.map(r => raceCounts[r]), backgroundColor: C.cyanLight, borderColor: C.cyan, borderWidth: 1 },
          { label: 'Heart Disease', data: sortedRaces.map(r => raceDisease[r] || 0), backgroundColor: C.coralLight, borderColor: C.coral, borderWidth: 1 }
        ]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: true,
        scales: { x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { grid: { display: false } } }
      }
    });

    // Age & Disease Rate
    const ageCounts = {}; const ageDisease = {};
    AGE_CATEGORIES_ORDER.forEach(a => { ageCounts[a] = 0; ageDisease[a] = 0; });
    patients.forEach(p => { ageCounts[p.ageCategory]++; if (p.heartDisease) ageDisease[p.ageCategory]++; });
    charts.ageRate = new Chart(document.getElementById('ageDiseaseRateChart'), {
      type: 'bar',
      data: {
        labels: AGE_CATEGORIES_ORDER,
        datasets: [
          { label: 'Count', data: AGE_CATEGORIES_ORDER.map(a => ageCounts[a]), backgroundColor: C.violetLight, borderColor: C.violet, borderWidth: 1, yAxisID: 'y' },
          { label: 'Disease Rate %', data: AGE_CATEGORIES_ORDER.map(a => ageCounts[a] > 0 ? ((ageDisease[a] / ageCounts[a]) * 100).toFixed(1) : 0), type: 'line', borderColor: C.coral, backgroundColor: C.coralLight, borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: C.coral, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, position: 'left', grid: { color: 'rgba(255,255,255,0.04)' } },
          y1: { beginAtZero: true, position: 'right', max: 100, grid: { display: false }, ticks: { callback: v => v + '%' } }
        }
      }
    });

    // Gender Donut
    charts.genderDonut = new Chart(document.getElementById('genderDonut'), {
      type: 'doughnut',
      data: {
        labels: ['Male', 'Female'],
        datasets: [{ data: [aggregates.maleCount, aggregates.femaleCount], backgroundColor: [C.violet, C.pink], borderColor: 'transparent', hoverOffset: 12 }]
      },
      options: { responsive: true, maintainAspectRatio: true, cutout: '65%', plugins: { legend: { position: 'bottom' } } }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  HEALTH CONDITIONS
  // ═══════════════════════════════════════════════════════════════════════════
  function renderConditions(D) {
    const { patients, aggregates, DIABETIC_LABELS } = D;

    animateCounter(document.getElementById('kpi-diabetic'), parseFloat(((aggregates.diabeticCount / aggregates.total) * 100).toFixed(1)), '%');
    animateCounter(document.getElementById('kpi-stroke'), parseFloat(((aggregates.strokeCount / aggregates.total) * 100).toFixed(1)), '%');
    animateCounter(document.getElementById('kpi-kidney'), parseFloat(((aggregates.kidneyCount / aggregates.total) * 100).toFixed(1)), '%');
    animateCounter(document.getElementById('kpi-asthma'), parseFloat(((aggregates.asthmaCount / aggregates.total) * 100).toFixed(1)), '%');

    // Diabetic (multi-category)
    const diabBins = {};
    DIABETIC_LABELS.forEach(l => diabBins[l] = { d: 0, h: 0 });
    patients.forEach(p => { const key = DIABETIC_LABELS.includes(p.diabetic) ? p.diabetic : 'No'; if (diabBins[key]) { if (p.heartDisease) diabBins[key].d++; else diabBins[key].h++; } });
    charts.diabetic = new Chart(document.getElementById('diabeticChart'), {
      type: 'bar',
      data: {
        labels: DIABETIC_LABELS.map(l => l.length > 18 ? l.slice(0, 16) + '…' : l),
        datasets: [
          { label: 'Heart Disease', data: DIABETIC_LABELS.map(l => diabBins[l].d), backgroundColor: C.coral, borderWidth: 0 },
          { label: 'No Heart Disease', data: DIABETIC_LABELS.map(l => diabBins[l].h), backgroundColor: C.emerald, borderWidth: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } } },
        plugins: { legend: { position: 'top' } }
      }
    });

    // Binary condition charts
    charts.stroke = binaryConditionChart('strokeChart', patients, 'stroke', 'Stroke', 'No Stroke');
    charts.kidney = binaryConditionChart('kidneyChart', patients, 'kidneyDisease', 'Kidney Disease', 'No');
    charts.asthma = binaryConditionChart('asthmaChart', patients, 'asthma', 'Asthma', 'No');
    charts.skinCancer = binaryConditionChart('skinCancerChart', patients, 'skinCancer', 'Skin Cancer', 'No');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LIFESTYLE & RISK
  // ═══════════════════════════════════════════════════════════════════════════
  function renderLifestyle(D) {
    const { patients, aggregates } = D;

    animateCounter(document.getElementById('kpi-smokers'), aggregates.smokerCount);
    animateCounter(document.getElementById('kpi-avg-bmi-2'), parseFloat(aggregates.avgBMI));
    document.getElementById('kpi-alcohol').textContent = ((aggregates.alcoholCount / aggregates.total) * 100).toFixed(1) + '%';
    document.getElementById('kpi-active').textContent = ((aggregates.activeCount / aggregates.total) * 100).toFixed(1) + '%';

    // Smoking
    charts.smoking = binaryConditionChart('smokingChart', patients, 'smoking', 'Smoker', 'Non-Smoker');

    // BMI Distribution
    const bmiBins = ['<18.5', '18.5-24.9', '25-29.9', '30-34.9', '35-39.9', '40+'];
    function getBmiBin(b) { if (b < 18.5) return 0; if (b < 25) return 1; if (b < 30) return 2; if (b < 35) return 3; if (b < 40) return 4; return 5; }
    const bmiD = new Array(6).fill(0); const bmiH = new Array(6).fill(0);
    patients.forEach(p => { const bin = getBmiBin(p.bmi); if (p.heartDisease) bmiD[bin]++; else bmiH[bin]++; });
    charts.bmi = new Chart(document.getElementById('bmiDistChart'), {
      type: 'bar',
      data: {
        labels: bmiBins,
        datasets: [
          { label: 'Heart Disease', data: bmiD, backgroundColor: C.coral, borderWidth: 0 },
          { label: 'Healthy', data: bmiH, backgroundColor: C.emerald, borderWidth: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } } },
        plugins: { legend: { position: 'top' } }
      }
    });

    // Physical Activity
    charts.activity = binaryConditionChart('activityChart', patients, 'physicalActivity', 'Active', 'Inactive');

    // Sleep Time
    const sleepBins = ['≤4', '5', '6', '7', '8', '9', '10+'];
    function getSleepBin(s) { if (s <= 4) return 0; if (s <= 5) return 1; if (s <= 6) return 2; if (s <= 7) return 3; if (s <= 8) return 4; if (s <= 9) return 5; return 6; }
    const sleepD = new Array(7).fill(0); const sleepH = new Array(7).fill(0);
    patients.forEach(p => { const bin = getSleepBin(p.sleepTime); if (p.heartDisease) sleepD[bin]++; else sleepH[bin]++; });
    charts.sleep = new Chart(document.getElementById('sleepChart'), {
      type: 'bar',
      data: {
        labels: sleepBins,
        datasets: [
          { label: 'Heart Disease', data: sleepD, backgroundColor: C.coral, borderWidth: 0 },
          { label: 'Healthy', data: sleepH, backgroundColor: C.emerald, borderWidth: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } } },
        plugins: { legend: { position: 'top' } }
      }
    });

    // Difficulty Walking
    charts.diffWalk = binaryConditionChart('diffWalkChart', patients, 'diffWalking', 'Difficulty', 'No Difficulty');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RISK CALCULATOR
  // ═══════════════════════════════════════════════════════════════════════════
  function renderCalculator(D) {
    const { computeRiskScore, getRiskLevel, ageMidpoint } = D;
    drawGauge(0);

    document.getElementById('calculateRisk').addEventListener('click', () => {
      const params = {
        ageCategory: document.getElementById('calc-age').value,
        ageMid: ageMidpoint(document.getElementById('calc-age').value),
        sex: document.getElementById('calc-sex').value,
        bmi: parseFloat(document.getElementById('calc-bmi').value) || 28,
        sleepTime: parseFloat(document.getElementById('calc-sleep').value) || 7,
        smoking: document.getElementById('calc-smoking').value === 'Yes',
        alcoholDrinking: document.getElementById('calc-alcohol').value === 'Yes',
        isDiabetic: document.getElementById('calc-diabetic').value === 'Yes',
        stroke: document.getElementById('calc-stroke').value === 'Yes',
        physicalActivity: document.getElementById('calc-activity').value === 'Yes',
        genHealth: document.getElementById('calc-health').value,
        diffWalking: document.getElementById('calc-diffwalk').value === 'Yes',
        kidneyDisease: document.getElementById('calc-kidney').value === 'Yes',
        physicalHealth: 0,
      };

      const score = computeRiskScore(params);
      const riskInfo = getRiskLevel(score);

      animateCounter(document.getElementById('gauge-score'), score, '', 1000);
      drawGauge(score);

      const badge = document.getElementById('risk-level-badge');
      badge.textContent = `${riskInfo.level} Risk`;
      badge.style.background = `${riskInfo.color}25`;
      badge.style.color = riskInfo.color;

      const factors = [];
      if (params.ageMid >= 60) factors.push({ text: `Age group ${params.ageCategory} (elevated risk)`, color: C.coral });
      if (params.sex === 'Male') factors.push({ text: 'Male sex (higher baseline risk)', color: C.amber });
      if (params.bmi >= 30) factors.push({ text: `BMI ${params.bmi} (obese range)`, color: C.coral });
      else if (params.bmi >= 25) factors.push({ text: `BMI ${params.bmi} (overweight)`, color: C.amber });
      if (params.smoking) factors.push({ text: 'Smoker', color: C.coral });
      if (params.stroke) factors.push({ text: 'History of stroke', color: C.coral });
      if (params.isDiabetic) factors.push({ text: 'Diabetic', color: C.coral });
      if (!params.physicalActivity) factors.push({ text: 'Physically inactive', color: C.amber });
      if (params.diffWalking) factors.push({ text: 'Difficulty walking', color: C.amber });
      if (params.kidneyDisease) factors.push({ text: 'Kidney disease', color: C.coral });
      if (params.genHealth === 'Poor' || params.genHealth === 'Fair') factors.push({ text: `General health: ${params.genHealth}`, color: C.amber });
      if (Math.abs(params.sleepTime - 7) >= 3) factors.push({ text: `Sleep: ${params.sleepTime} hrs (extreme)`, color: C.amber });
      if (factors.length === 0) factors.push({ text: 'No major risk factors detected!', color: C.emerald });

      document.getElementById('risk-factors-list').innerHTML = `<h4>📋 Risk Factors Detected (${factors.length})</h4>` +
        factors.map(f => `<div class="risk-factor-item"><div class="risk-factor-dot" style="background:${f.color}"></div><span>${f.text}</span></div>`).join('');
    });
  }

  function drawGauge(score) {
    const canvas = document.getElementById('riskGaugeCanvas');
    const ctx = canvas.getContext('2d');
    const size = 260;
    canvas.width = size * 2; canvas.height = size * 2;
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    ctx.scale(2, 2);
    const cx = size / 2, cy = size / 2, radius = size / 2 - 20, lw = 14;
    const sA = Math.PI * 0.75, eA = Math.PI * 2.25, tA = eA - sA;

    ctx.clearRect(0, 0, size, size);
    ctx.beginPath(); ctx.arc(cx, cy, radius, sA, eA);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();

    if (score > 0) {
      const vA = sA + (score / 100) * tA;
      const g = ctx.createConicGradient(sA, cx, cy);
      g.addColorStop(0, '#10b981'); g.addColorStop(0.3, '#f59e0b'); g.addColorStop(0.6, '#f97316'); g.addColorStop(0.85, '#ef4444'); g.addColorStop(1, '#dc2626');
      ctx.beginPath(); ctx.arc(cx, cy, radius, sA, vA);
      ctx.strokeStyle = g; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, radius, sA, vA);
      ctx.strokeStyle = g; ctx.lineWidth = lw + 6; ctx.globalAlpha = 0.2; ctx.filter = 'blur(6px)'; ctx.stroke();
      ctx.globalAlpha = 1; ctx.filter = 'none';
    }

    for (let i = 0; i <= 10; i++) {
      const angle = sA + (i / 10) * tA;
      const iR = radius - lw / 2 - 8, oR = radius - lw / 2 - (i % 5 === 0 ? 16 : 12);
      ctx.beginPath();
      ctx.moveTo(cx + iR * Math.cos(angle), cy + iR * Math.sin(angle));
      ctx.lineTo(cx + oR * Math.cos(angle), cy + oR * Math.sin(angle));
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = i % 5 === 0 ? 2 : 1; ctx.stroke();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initNavigation();

    // Wait for CSV data to load
    window.AntiGravityDataReady.then(() => {
      renderPanelCharts('overview');
    });
  });

})();
