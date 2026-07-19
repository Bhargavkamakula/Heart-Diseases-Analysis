/**
 * Rising Above Heart Disease — Data Loader
 * Loads and parses the Heart_new2.csv file with BRFSS heart disease data.
 * Columns: HeartDisease, BMI, Smoking, AlcoholDrinking, Stroke, PhysicalHealth,
 *          MentalHealth, DiffWalking, Sex, AgeCategory, Race, Diabetic,
 *          PhysicalActivity, GenHealth, SleepTime, Asthma, KidneyDisease, SkinCancer
 */

(function () {
  'use strict';

  // ── CSV Parser (handles quoted fields) ────────────────────────────────────
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else if (ch !== '\r') {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = parseCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = parseCSVLine(lines[i]);
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
      rows.push(obj);
    }
    return rows;
  }

  // ── Constants ─────────────────────────────────────────────────────────────
  const AGE_CATEGORIES_ORDER = [
    '18-24', '25-29', '30-34', '35-39', '40-44', '45-49',
    '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80 or older'
  ];

  const GEN_HEALTH_ORDER = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

  const RACE_LIST = ['White', 'Black', 'Asian', 'Hispanic', 'American Indian/Alaskan Native', 'Other'];

  const DIABETIC_LABELS = ['No', 'Yes', 'No, borderline diabetes', 'Yes (during pregnancy)'];

  // ── Midpoint for Age Categories ───────────────────────────────────────────
  function ageMidpoint(cat) {
    const map = {
      '18-24': 21, '25-29': 27, '30-34': 32, '35-39': 37,
      '40-44': 42, '45-49': 47, '50-54': 52, '55-59': 57,
      '60-64': 62, '65-69': 67, '70-74': 72, '75-79': 77, '80 or older': 83
    };
    return map[cat] || 55;
  }

  // ── Risk Level Helper ────────────────────────────────────────────────────
  function getRiskLevel(score) {
    if (score < 25) return { level: 'Low', color: '#10b981' };
    if (score < 50) return { level: 'Moderate', color: '#f59e0b' };
    if (score < 75) return { level: 'High', color: '#f97316' };
    return { level: 'Critical', color: '#ef4444' };
  }

  // ── Process Raw Data ─────────────────────────────────────────────────────
  function processData(raw) {
    return raw.map((r, i) => ({
      id: i + 1,
      heartDisease: r.HeartDisease === 'Yes',
      bmi: parseFloat(r.BMI) || 0,
      smoking: r.Smoking === 'Yes',
      alcoholDrinking: r.AlcoholDrinking === 'Yes',
      stroke: r.Stroke === 'Yes',
      physicalHealth: parseFloat(r.PhysicalHealth) || 0,
      mentalHealth: parseFloat(r.MentalHealth) || 0,
      diffWalking: r.DiffWalking === 'Yes',
      sex: r.Sex,
      ageCategory: r.AgeCategory,
      ageMid: ageMidpoint(r.AgeCategory),
      race: r.Race,
      diabetic: r.Diabetic,
      isDiabetic: r.Diabetic === 'Yes' || r.Diabetic === 'Yes (during pregnancy)',
      physicalActivity: r.PhysicalActivity === 'Yes',
      genHealth: r.GenHealth,
      sleepTime: parseFloat(r.SleepTime) || 7,
      asthma: r.Asthma === 'Yes',
      kidneyDisease: r.KidneyDisease === 'Yes',
      skinCancer: r.SkinCancer === 'Yes',
    }));
  }

  // ── Compute Aggregates ───────────────────────────────────────────────────
  function computeAggregates(patients) {
    const total = patients.length;
    const diseased = patients.filter(p => p.heartDisease).length;
    const healthy = total - diseased;
    const maleCount = patients.filter(p => p.sex === 'Male').length;
    const femaleCount = patients.filter(p => p.sex === 'Female').length;
    const smokerCount = patients.filter(p => p.smoking).length;
    const alcoholCount = patients.filter(p => p.alcoholDrinking).length;
    const activeCount = patients.filter(p => p.physicalActivity).length;
    const diabeticCount = patients.filter(p => p.isDiabetic).length;
    const strokeCount = patients.filter(p => p.stroke).length;
    const kidneyCount = patients.filter(p => p.kidneyDisease).length;
    const asthmaCount = patients.filter(p => p.asthma).length;

    const avgBMI = (patients.reduce((s, p) => s + p.bmi, 0) / total).toFixed(1);
    const avgSleep = (patients.reduce((s, p) => s + p.sleepTime, 0) / total).toFixed(1);
    const avgPhysicalHealth = (patients.reduce((s, p) => s + p.physicalHealth, 0) / total).toFixed(1);
    const avgMentalHealth = (patients.reduce((s, p) => s + p.mentalHealth, 0) / total).toFixed(1);
    const prevalence = ((diseased / total) * 100).toFixed(1);

    // Unique races present
    const racesPresent = [...new Set(patients.map(p => p.race))];

    return {
      total, diseased, healthy, prevalence,
      maleCount, femaleCount,
      smokerCount, alcoholCount, activeCount,
      diabeticCount, strokeCount, kidneyCount, asthmaCount,
      avgBMI, avgSleep, avgPhysicalHealth, avgMentalHealth,
      racesPresent,
    };
  }

  // ── Risk Score Calculator ────────────────────────────────────────────────
  function computeRiskScore(params) {
    let logit = -3.0;
    // Age
    logit += (params.ageMid - 40) * 0.04;
    // Sex
    logit += params.sex === 'Male' ? 0.3 : 0;
    // BMI
    logit += (params.bmi - 25) * 0.03;
    // Smoking
    logit += params.smoking ? 0.5 : 0;
    // Stroke
    logit += params.stroke ? 1.5 : 0;
    // Diabetic
    logit += params.isDiabetic ? 0.7 : 0;
    // Physical Activity (protective)
    logit += params.physicalActivity ? -0.4 : 0;
    // Difficulty Walking
    logit += params.diffWalking ? 0.8 : 0;
    // General Health
    const healthMap = { 'Poor': 1.2, 'Fair': 0.6, 'Good': 0, 'Very good': -0.3, 'Excellent': -0.5 };
    logit += healthMap[params.genHealth] || 0;
    // Kidney Disease
    logit += params.kidneyDisease ? 1.0 : 0;
    // Alcohol
    logit += params.alcoholDrinking ? 0.1 : 0;
    // Physical Health (bad days)
    logit += params.physicalHealth * 0.015;
    // Sleep (extreme values risky)
    const sleepDev = Math.abs(params.sleepTime - 7);
    logit += sleepDev * 0.08;

    const prob = 1 / (1 + Math.exp(-logit));
    return Math.round(prob * 100);
  }

  // ── Main Load Function ───────────────────────────────────────────────────
  window.AntiGravityDataReady = fetch('./Heart_new2.csv')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load CSV');
      return res.text();
    })
    .then(text => {
      const raw = parseCSV(text);
      const patients = processData(raw);
      const aggregates = computeAggregates(patients);

      window.AntiGravityData = {
        patients,
        aggregates,
        AGE_CATEGORIES_ORDER,
        GEN_HEALTH_ORDER,
        RACE_LIST,
        DIABETIC_LABELS,
        getRiskLevel,
        computeRiskScore,
        ageMidpoint,
      };

      return window.AntiGravityData;
    })
    .catch(err => {
      console.error('Data load error:', err);
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;
          font-family:Inter,sans-serif;color:#f1f5f9;background:#060918;text-align:center;padding:40px;">
          <div>
            <h1 style="font-size:2rem;margin-bottom:16px;">⚠️ Could not load data</h1>
            <p style="color:#94a3b8;max-width:500px;line-height:1.8;">
              The CSV file could not be loaded. Please ensure you are running this via a local server
              (e.g. <strong>Live Server</strong> in VS Code, or <code>python -m http.server</code>).<br><br>
              Opening <code>index.html</code> directly via <code>file://</code> does not support <code>fetch()</code>.
            </p>
          </div>
        </div>`;
    });

})();
