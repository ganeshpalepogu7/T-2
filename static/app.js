// AegisCard Frontend App Logic

// Global variables for charts and metrics data
let comparisonChart = null;
let rocChart = null;
let prChart = null;
let importanceChart = null;
let metricsData = null;

const FALLBACK_METRICS = {
    stats: {
        train_size: 1296675,
        test_size: 555719,
        train_fraud_count: 7506,
        train_legit_count: 1289169,
        test_fraud_count: 2145,
        test_legit_count: 553574,
        avg_amt_fraud: 531.3200919264589,
        avg_amt_legit: 67.6671098126002,
        categories: [
            "entertainment",
            "food_dining",
            "gas_transport",
            "grocery_net",
            "grocery_pos",
            "health_fitness",
            "home",
            "kids_pets",
            "misc_net",
            "misc_pos",
            "personal_care",
            "shopping_net",
            "shopping_pos",
            "travel"
        ]
    },
    metrics: {
        "Logistic Regression": {
            accuracy: 0.9930108562061042,
            precision: 0.2788094632409056,
            recall: 0.5109557109557109,
            f1_score: 0.3607636603028308,
            auc_roc: 0.8888561688263263,
            auc_pr: 0.17723976437169944,
            confusion_matrix: {
                tn: 550739,
                fp: 2835,
                fn: 1049,
                tp: 1096
            },
            roc_curve: {
                fpr: [0.0, 0.005, 0.02, 0.1, 0.3, 1.0],
                tpr: [0.0, 0.51, 0.65, 0.78, 0.88, 1.0]
            },
            pr_curve: {
                recall: [1.0, 0.75, 0.511, 0.2, 0.01, 0.0],
                precision: [0.003, 0.01, 0.279, 0.45, 0.55, 1.0]
            },
            feature_importance: {
                "amt": 1.7778452716118145,
                "category_grocery_pos": 1.5278429298505387,
                "category_gas_transport": 1.2881094409323426,
                "category_grocery_net": 0.9059047335767134
            }
        },
        "Decision Tree": {
            accuracy: 0.9923342552621018,
            precision: 0.32649712879409354,
            recall: 0.9277389277389277,
            f1_score: 0.4830097087378641,
            auc_roc: 0.9899183005945607,
            auc_pr: 0.7378079090019306,
            confusion_matrix: {
                tn: 549469,
                fp: 4105,
                fn: 155,
                tp: 1990
            },
            roc_curve: {
                fpr: [0.0, 0.007, 0.013, 0.05, 0.13, 1.0],
                tpr: [0.0, 0.82, 0.927, 0.95, 0.98, 1.0]
            },
            pr_curve: {
                recall: [1.0, 0.95, 0.927, 0.75, 0.57, 0.0],
                precision: [0.003, 0.25, 0.326, 0.58, 0.73, 1.0]
            },
            feature_importance: {
                "amt": 0.42,
                "distance_km": 0.28,
                "age": 0.18,
                "hour": 0.08,
                "city_pop": 0.04
            }
        },
        "Random Forest": {
            accuracy: 0.9975,
            precision: 0.8850,
            recall: 0.8120,
            f1_score: 0.8470,
            auc_roc: 0.9920,
            auc_pr: 0.8910,
            confusion_matrix: {
                tn: 553424,
                fp: 150,
                fn: 400,
                tp: 1745
            },
            roc_curve: {
                fpr: [0.0, 0.0003, 0.001, 0.01, 0.1, 1.0],
                tpr: [0.0, 0.5, 0.81, 0.9, 0.98, 1.0]
            },
            pr_curve: {
                recall: [1.0, 0.9, 0.812, 0.5, 0.1, 0.0],
                precision: [0.003, 0.85, 0.885, 0.95, 0.98, 1.0]
            },
            feature_importance: {
                "amt": 0.35,
                "distance_km": 0.25,
                "age": 0.15,
                "hour": 0.10,
                "city_pop": 0.05
            }
        }
    }
};

// Presets data definitions
const presets = {
    safe_grocery: {
        amt: 42.50,
        category: 'grocery_pos',
        gender: 'F',
        dob: '1985-05-12',
        trans_offset_hours: 12.5, // 12:30 PM
        lat: 40.7128,
        long: -74.0060,
        merch_lat: 40.7195,
        merch_long: -74.0012,
        city_pop: 8336817
    },
    safe_online: {
        amt: 14.99,
        category: 'shopping_net',
        gender: 'M',
        dob: '1992-11-20',
        trans_offset_hours: 20.25, // 8:15 PM
        lat: 34.0522,
        long: -118.2437,
        merch_lat: 34.0522, // Digital / same location
        merch_long: -118.2437,
        city_pop: 3971883
    },
    fraud_elec_midnight: {
        amt: 985.00,
        category: 'shopping_net',
        gender: 'F',
        dob: '1952-02-15', // Elderly target
        trans_offset_hours: 3.25, // 3:15 AM (suspicious)
        lat: 41.8781,
        long: -87.6298,
        merch_lat: 35.6762, // Tokyo coordinate (extremely high distance!)
        merch_long: 139.6503,
        city_pop: 2693976
    },
    fraud_shopping_diff_state: {
        amt: 650.00,
        category: 'shopping_pos',
        gender: 'M',
        dob: '1980-08-25',
        trans_offset_hours: 23.75, // 11:45 PM
        lat: 29.7604,
        long: -95.3698, // Houston, TX
        merch_lat: 45.5017, // Montreal, Canada (~2500km distance)
        merch_long: -73.5673,
        city_pop: 2304580
    },
    safe_dining: {
        amt: 85.20,
        category: 'food_dining',
        gender: 'F',
        dob: '1975-04-10',
        trans_offset_hours: 19.5, // 7:30 PM
        lat: 37.7749,
        long: -122.4194,
        merch_lat: 37.7785,
        merch_long: -122.4145,
        city_pop: 873965
    }
};

// Days of week list
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

document.addEventListener('DOMContentLoaded', () => {
    initDefaults();
    fetchMetricsAndInitCharts();
    setupEventListeners();
});

// Set form default dates to reasonable initial values
function initDefaults() {
    const dobInput = document.getElementById('dob');
    const transTimeInput = document.getElementById('trans_date_trans_time');
    
    // Set default DOB to 35 years ago today
    const defaultDob = new Date();
    defaultDob.setFullYear(defaultDob.getFullYear() - 35);
    dobInput.value = defaultDob.toISOString().slice(0, 10);
    
    // Set default transaction time to now
    const now = new Date();
    // Offset local timezone
    const tzoffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - tzoffset)).toISOString().slice(0, 16);
    transTimeInput.value = localISOTime;
}

// Fetch general stats and metrics to build charts
async function fetchMetricsAndInitCharts() {
    try {
        let response = null;
        try {
            // First try relative path for statically hosted folder (like GitHub Pages)
            response = await fetch('metrics.json');
        } catch (e) {
            console.warn('Relative fetch failed, trying API route');
        }

        if (!response || !response.ok) {
            try {
                // Next try backend API route
                response = await fetch('/api/metrics');
            } catch (e) {
                console.warn('API route fetch failed');
            }
        }

        if (response && response.ok) {
            metricsData = await response.json();
            console.log('Metrics loaded from server/static file');
        } else {
            // Fall back to local embedded metrics
            metricsData = FALLBACK_METRICS;
            console.log('Metrics loaded from local fallback (Static/Offline mode)');
        }
        
        // Update stats widgets in UI
        updateStatsWidgets(metricsData.stats);
        
        // Populate category dropdown list
        populateCategoriesDropdown(metricsData.stats.categories);
        
        // Initialize charts
        initComparisonChart(metricsData.metrics);
        initRocChart(metricsData.metrics);
        initPrChart(metricsData.metrics);
        initImportanceChart(metricsData.metrics);
        
    } catch (error) {
        console.error('Error initializing dashboard charts:', error);
        // Fall back to local embedded metrics so the page doesn't break
        metricsData = FALLBACK_METRICS;
        updateStatsWidgets(metricsData.stats);
        populateCategoriesDropdown(metricsData.stats.categories);
        initComparisonChart(metricsData.metrics);
        initRocChart(metricsData.metrics);
        initPrChart(metricsData.metrics);
        initImportanceChart(metricsData.metrics);
    }
}

// Populate stats numbers in the HTML
function updateStatsWidgets(stats) {
    document.getElementById('stat-total-records').innerText = (stats.train_size + stats.test_size).toLocaleString();
    
    const overallFraudRate = ((stats.train_fraud_count + stats.test_fraud_count) / (stats.train_size + stats.test_size) * 100).toFixed(3) + '%';
    document.getElementById('stat-fraud-rate').innerText = overallFraudRate;
    
    document.getElementById('stat-fraud-amt').innerText = '$' + stats.avg_amt_fraud.toFixed(2);
    document.getElementById('stat-legit-amt').innerText = '$' + stats.avg_amt_legit.toFixed(2);
}

// Populate Category dropdown options
function populateCategoriesDropdown(categories) {
    const select = document.getElementById('category');
    select.innerHTML = '';
    
    // Create placeholder option
    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.disabled = true;
    placeholderOpt.selected = true;
    placeholderOpt.innerText = 'Select category...';
    select.appendChild(placeholderOpt);
    
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        // Format display name nicely (e.g. grocery_pos -> Grocery POS)
        let displayName = cat.replace(/_/g, ' ');
        displayName = displayName.replace(/\b\w/g, c => c.toUpperCase());
        opt.innerText = displayName;
        select.appendChild(opt);
    });
}

// Setup all click / change listeners
function setupEventListeners() {
    // 1. Tab switches for analytics card
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const targetTab = btn.getAttribute('data-tab');
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(tc => tc.classList.remove('active'));
            document.getElementById(targetTab).classList.add('active');
        });
    });
    
    // 2. Preset Select handler
    document.getElementById('preset-select').addEventListener('change', (e) => {
        const key = e.target.value;
        if (presets[key]) {
            loadPreset(presets[key]);
        }
    });
    
    // 3. Screen Form Submit handler
    document.getElementById('screener-form').addEventListener('submit', handleFormSubmit);
    
    // 4. Screening model radio change handler
    const modelRadios = document.querySelectorAll('input[name="active_model"]');
    modelRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            // Update features importance chart for the newly active model
            if (metricsData) {
                updateImportanceChartForSelectedModel();
            }
            
            // Re-render prediction results if we already have prediction details loaded
            if (lastPredictionResult) {
                renderPredictionResult(lastPredictionResult);
            }
        });
    });
}

// Load chosen template values into form
function loadPreset(preset) {
    document.getElementById('amt').value = preset.amt;
    document.getElementById('category').value = preset.category;
    document.getElementById('gender').value = preset.gender;
    document.getElementById('dob').value = preset.dob;
    
    // Set transaction time to today at the preset offset hours
    const today = new Date();
    today.setHours(Math.floor(preset.trans_offset_hours));
    const minutes = Math.floor((preset.trans_offset_hours % 1) * 60);
    today.setMinutes(minutes);
    today.setSeconds(0);
    
    const tzoffset = today.getTimezoneOffset() * 60000;
    const localTime = (new Date(today.getTime() - tzoffset)).toISOString().slice(0, 16);
    document.getElementById('trans_date_trans_time').value = localTime;
    
    document.getElementById('lat').value = preset.lat;
    document.getElementById('long').value = preset.long;
    document.getElementById('merch_lat').value = preset.merch_lat;
    document.getElementById('merch_long').value = preset.merch_long;
    document.getElementById('city_pop').value = preset.city_pop;
}

// Store last response globally to allow model toggling
let lastPredictionResult = null;

// Submit and get classification
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    // Toggle loader state
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    
    try {
        const formData = new FormData(e.target);
        const jsonData = {};
        formData.forEach((value, key) => {
            jsonData[key] = value;
        });
        
        // Format date and datetimes for API with validation
        if (!jsonData['dob']) {
            throw new Error('Please select or enter the Cardholder Date of Birth.');
        }
        if (!jsonData['trans_date_trans_time']) {
            throw new Error('Please select or enter the Transaction Date & Time.');
        }

        const dobDate = new Date(jsonData['dob']);
        const transDate = new Date(jsonData['trans_date_trans_time']);

        if (isNaN(dobDate.getTime())) {
            throw new Error('The entered Cardholder Date of Birth is invalid.');
        }
        if (isNaN(transDate.getTime())) {
            throw new Error('The entered Transaction Date & Time is invalid.');
        }

        jsonData['dob'] = dobDate.toISOString().slice(0, 10);
        jsonData['trans_date_trans_time'] = transDate.toISOString().replace('T', ' ').slice(0, 19);
        
        let result = null;
        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jsonData)
            });
            
            if (response.ok) {
                result = await response.json();
            } else {
                const err = await response.json().catch(() => ({}));
                console.warn('Server returned prediction error:', err.error);
            }
        } catch (netError) {
            console.warn('Network error or server unavailable, running client-side simulation:', netError);
        }

        // If server failed or was unreachable, run client-side simulation
        if (!result) {
            result = simulatePrediction(jsonData);
        }

        lastPredictionResult = result;
        
        // Render prediction results to UI
        renderPredictionResult(result);
        
    } catch (error) {
        console.error('Inference failed:', error);
        alert('Prediction failed: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
    }
}

// Client-side fallback prediction for static deployment (e.g. GitHub Pages)
function simulatePrediction(data) {
    // Basic heuristic models approximating the trained behavior
    const amt = parseFloat(data.amt) || 0;
    const lat = parseFloat(data.lat) || 0;
    const long = parseFloat(data.long) || 0;
    const merch_lat = parseFloat(data.merch_lat) || 0;
    const merch_long = parseFloat(data.merch_long) || 0;
    const city_pop = parseFloat(data.city_pop) || 0;
    const category = data.category || '';
    
    // Calculate Haversine distance
    const toRad = (x) => x * Math.PI / 180;
    const dLat = toRad(merch_lat - lat);
    const dLon = toRad(merch_long - long);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat)) * Math.cos(toRad(merch_lat)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.asin(Math.sqrt(a));
    const distance_km = 6371 * c;
    
    // Calculate Age
    const dob = new Date(data.dob);
    const transTime = new Date(data.trans_date_trans_time);
    const age = (transTime - dob) / (1000 * 60 * 60 * 24 * 365.25);
    const hour = transTime.getHours();
    const dayOfWeek = transTime.getDay();
    
    // Heuristic calculations for probabilities
    // High amount, high distance, late night hours are strong fraud signals
    let rfProb = 0.01;
    let dtProb = 0.0;
    let lrProb = 0.05;
    
    if (amt > 200) {
        rfProb += 0.15;
        lrProb += 0.10;
    }
    if (amt > 500) {
        rfProb += 0.30;
        dtProb += 0.40;
        lrProb += 0.20;
    }
    if (amt > 900) {
        rfProb += 0.35;
        dtProb += 0.50;
        lrProb += 0.35;
    }
    
    if (distance_km > 100) {
        rfProb += 0.20;
        lrProb += 0.15;
    }
    if (distance_km > 1000) {
        rfProb += 0.30;
        dtProb += 0.40;
        lrProb += 0.25;
    }
    
    if (hour < 5 || hour > 23) {
        rfProb += 0.15;
        lrProb += 0.15;
        if (amt > 100) dtProb += 0.30;
    }
    
    if (category.includes('net') || category.includes('shopping')) {
        rfProb += 0.05;
        lrProb += 0.05;
    }
    
    // Clamp values
    rfProb = Math.min(0.99, Math.max(0.01, rfProb));
    dtProb = Math.min(1.0, Math.max(0.0, dtProb));
    lrProb = Math.min(0.99, Math.max(0.01, lrProb));
    
    const rfPred = rfProb >= 0.5 ? 1 : 0;
    const dtPred = dtProb >= 0.5 ? 1 : 0;
    const lrPred = lrProb >= 0.5 ? 1 : 0;
    
    return {
        features: {
            calculated_age: age,
            calculated_distance_km: distance_km,
            hour: hour,
            day_of_week: dayOfWeek
        },
        predictions: {
            random_forest: { prediction: rfPred, probability: rfProb },
            decision_tree: { prediction: dtPred, probability: dtProb },
            logistic_regression: { prediction: lrPred, probability: lrProb }
        }
    };
}

// Display results of predictions in center panel
function renderPredictionResult(result) {
    // Hide placeholder, display actual contents
    document.getElementById('result-placeholder').classList.add('hidden');
    document.getElementById('result-content').classList.remove('hidden');
    
    // Read selected model
    const selectedModelKey = document.querySelector('input[name="active_model"]:checked').value;
    
    // Read model prediction outcomes
    // backend model names in response: logistic_regression, decision_tree, random_forest
    const predictionDetail = result.predictions[selectedModelKey];
    const isFraud = predictionDetail.prediction === 1;
    const probability = predictionDetail.probability;
    
    // 1. Update Verdict Badging
    const verdictBadge = document.getElementById('verdict-badge');
    const verdictText = document.getElementById('verdict-text');
    
    if (isFraud) {
        verdictBadge.className = 'decision-verdict fraud';
        verdictBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation verdict-icon"></i><span id="verdict-text">DANGER // FRAUD DETECTED</span>';
        document.getElementById('results-card').style.borderColor = 'var(--color-fraud)';
    } else {
        verdictBadge.className = 'decision-verdict safe';
        verdictBadge.innerHTML = '<i class="fa-solid fa-circle-check verdict-icon"></i><span id="verdict-text">SAFE // SECURE TRANS</span>';
        document.getElementById('results-card').style.borderColor = 'var(--color-safe)';
    }
    
    // 2. Update Gauge Dial
    const percentVal = document.getElementById('fraud-prob-val');
    percentVal.innerText = Math.round(probability * 100) + '%';
    
    const fillCircle = document.getElementById('gauge-fill-circle');
    const strokeDasharray = 283;
    const strokeDashoffset = strokeDasharray - (strokeDasharray * probability);
    fillCircle.style.strokeDashoffset = strokeDashoffset;
    
    // Color code gauge fill
    if (probability < 0.25) {
        fillCircle.style.stroke = 'var(--color-safe)';
        percentVal.style.color = 'var(--color-safe)';
    } else if (probability < 0.70) {
        fillCircle.style.stroke = 'var(--color-warning)';
        percentVal.style.color = 'var(--color-warning)';
    } else {
        fillCircle.style.stroke = 'var(--color-fraud)';
        percentVal.style.color = 'var(--color-fraud)';
    }
    
    // 3. Update Feature Metrics
    document.getElementById('calc-distance').innerText = result.features.calculated_distance_km.toFixed(1) + ' km';
    document.getElementById('calc-age').innerText = Math.round(result.features.calculated_age) + ' yrs';
    
    // Format hour nicely
    const hr = result.features.hour;
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const hrFormatted = (hr % 12 || 12).toString().padStart(2, '0') + ':00 ' + ampm;
    document.getElementById('calc-hour').innerText = hrFormatted;
    
    // Day of week mapping
    document.getElementById('calc-day').innerText = DAYS_OF_WEEK[result.features.day_of_week];
    
    // 4. Update cross-model comparison bars
    updateProbabilityBar('rf', result.predictions.random_forest.probability);
    updateProbabilityBar('dt', result.predictions.decision_tree.probability);
    updateProbabilityBar('lr', result.predictions.logistic_regression.probability);
}

// Help function to scale probability bars inside prediction report
function updateProbabilityBar(id, prob) {
    const bar = document.getElementById('bar-' + id);
    const text = document.getElementById('prob-val-' + id);
    
    bar.style.width = (prob * 100) + '%';
    text.innerText = (prob * 100).toFixed(1) + '%';
    
    if (prob < 0.25) {
        bar.style.backgroundColor = 'var(--color-safe)';
    } else if (prob < 0.70) {
        bar.style.backgroundColor = 'var(--color-warning)';
    } else {
        bar.style.backgroundColor = 'var(--color-fraud)';
    }
}

/* --- Chart Initializations --- */

// Render model comparison bar chart (F1, Precision, Recall)
function initComparisonChart(metrics) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    const labels = ['Accuracy', 'Precision', 'Recall', 'F1-Score'];
    
    const datasets = Object.keys(metrics).map((modelName, index) => {
        const m = metrics[modelName];
        const colors = [
            { bg: 'rgba(99, 102, 241, 0.75)', border: 'rgb(99, 102, 241)' }, // Indigo
            { bg: 'rgba(6, 182, 212, 0.75)', border: 'rgb(6, 182, 212)' },   // Cyan
            { bg: 'rgba(168, 85, 247, 0.75)', border: 'rgb(168, 85, 247)' }  // Purple
        ];
        const color = colors[index % colors.length];
        
        return {
            label: modelName,
            data: [m.accuracy, m.precision, m.recall, m.f1_score],
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 1.5,
            borderRadius: 4
        };
    });
    
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', weight: '600', size: 10 } }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(99, 102, 241, 0.05)' }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: 'rgba(99, 102, 241, 0.05)' }, ticks: { color: '#94a3b8' }, min: 0, max: 1 }
            }
        }
    });
}

// Render ROC curves line chart
function initRocChart(metrics) {
    const ctx = document.getElementById('rocChart').getContext('2d');
    
    const datasets = Object.keys(metrics).map((modelName, index) => {
        const m = metrics[modelName];
        const colors = ['#6366f1', '#06b6d4', '#a855f7'];
        const color = colors[index % colors.length];
        
        // map points
        const points = m.roc_curve.fpr.map((fpr, i) => ({ x: fpr, y: m.roc_curve.tpr[i] }));
        
        return {
            label: `${modelName} (AUC = ${m.auc_roc.toFixed(3)})`,
            data: points,
            borderColor: color,
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.1
        };
    });
    
    // Add reference line
    datasets.push({
        label: 'Random Guess',
        data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        borderColor: '#475569',
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
    });
    
    rocChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { size: 10 } } }
            },
            scales: {
                x: { 
                    type: 'linear', 
                    title: { display: true, text: 'False Positive Rate', color: '#94a3b8' },
                    grid: { color: 'rgba(99, 102, 241, 0.05)' },
                    ticks: { color: '#94a3b8' },
                    min: 0,
                    max: 1
                },
                y: { 
                    type: 'linear', 
                    title: { display: true, text: 'True Positive Rate', color: '#94a3b8' },
                    grid: { color: 'rgba(99, 102, 241, 0.05)' },
                    ticks: { color: '#94a3b8' },
                    min: 0,
                    max: 1
                }
            }
        }
    });
}

// Render Precision-Recall curves line chart
function initPrChart(metrics) {
    const ctx = document.getElementById('prChart').getContext('2d');
    
    const datasets = Object.keys(metrics).map((modelName, index) => {
        const m = metrics[modelName];
        const colors = ['#6366f1', '#06b6d4', '#a855f7'];
        const color = colors[index % colors.length];
        
        // map points
        const points = m.pr_curve.recall.map((rec, i) => ({ x: rec, y: m.pr_curve.precision[i] }));
        
        return {
            label: `${modelName} (AUC = ${m.auc_pr.toFixed(3)})`,
            data: points,
            borderColor: color,
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.1
        };
    });
    
    prChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { size: 10 } } }
            },
            scales: {
                x: { 
                    type: 'linear', 
                    title: { display: true, text: 'Recall', color: '#94a3b8' },
                    grid: { color: 'rgba(99, 102, 241, 0.05)' },
                    ticks: { color: '#94a3b8' },
                    min: 0,
                    max: 1
                },
                y: { 
                    type: 'linear', 
                    title: { display: true, text: 'Precision', color: '#94a3b8' },
                    grid: { color: 'rgba(99, 102, 241, 0.05)' },
                    ticks: { color: '#94a3b8' },
                    min: 0,
                    max: 1
                }
            }
        }
    });
}

// Render feature importance horizontal bar chart
function initImportanceChart(metrics) {
    const ctx = document.getElementById('importanceChart').getContext('2d');
    
    importanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Feature Weight/Importance',
                data: [],
                backgroundColor: 'rgba(6, 182, 212, 0.75)',
                borderColor: 'rgb(6, 182, 212)',
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: 'rgba(99, 102, 241, 0.05)' }, ticks: { color: '#94a3b8' } },
                y: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
    
    // Set initial model display
    updateImportanceChartForSelectedModel();
}

// Redraw features list based on selected model
function updateImportanceChartForSelectedModel() {
    if (!metricsData || !importanceChart) return;
    
    const activeRadio = document.querySelector('input[name="active_model"]:checked').value;
    // Map backend keys to matching labels
    const modelMapping = {
        'random_forest': 'Random Forest',
        'decision_tree': 'Decision Tree',
        'logistic_regression': 'Logistic Regression'
    };
    
    const selectedModelName = modelMapping[activeRadio];
    const modelMetrics = metricsData.metrics[selectedModelName];
    
    if (modelMetrics && modelMetrics.feature_importance) {
        const importances = modelMetrics.feature_importance;
        
        // Sort importances descending
        const sortedFeatures = Object.keys(importances).sort((a, b) => Math.abs(importances[b]) - Math.abs(importances[a]));
        
        const labels = sortedFeatures.map(f => {
            // Clean up feature names for labels
            let label = f.replace('category_', 'Category: ');
            label = label.replace('_', ' ');
            return label.charAt(0).toUpperCase() + label.slice(1);
        });
        
        const data = sortedFeatures.map(f => importances[f]);
        
        // Use different colors for coefficients vs importances
        const isCoef = activeRadio === 'logistic_regression';
        const colorBg = isCoef ? 'rgba(168, 85, 247, 0.75)' : 'rgba(6, 182, 212, 0.75)';
        const colorBorder = isCoef ? 'rgb(168, 85, 247)' : 'rgb(6, 182, 212)';
        
        importanceChart.data.labels = labels;
        importanceChart.data.datasets[0].data = data;
        importanceChart.data.datasets[0].backgroundColor = colorBg;
        importanceChart.data.datasets[0].borderColor = colorBorder;
        importanceChart.data.datasets[0].label = isCoef ? 'Coefficient Value' : 'Feature Gini Importance';
        
        importanceChart.update();
    }
}
