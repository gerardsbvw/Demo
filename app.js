// app.js
// HINWEIS: 'formatter' kommt aus der supabase-client.js - keine doppelte Deklaration mehr!

let dbObjekte = [];
let dbKunden = [];

// --- AKTUELLER SZENARIO STATE ---
let aktuellesObjekt = null;
let aktuellerKunde = null;

// Dynamische Darlehensliste
let darlehenList = [
    { id: 'haupt', type: 'Hauptdarlehen', amount: 0, isKfw: false, zins: 3.9, tilg: 1.5, anschluss: 1.5, bindung: 10, zuschuss: 0 }
];

// --- NAVIGATION & TABS ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Zwang: Keine Tabs klicken, wenn Pflichtfeld leer ist
        if (btn.dataset.tab === 'tab-kunde' && !aktuellesObjekt) return alert("Bitte wähle zuerst ein Objekt im ersten Schritt.");
        if (btn.dataset.tab === 'tab-finanzierung' && (!aktuellesObjekt || !aktuellerKunde)) return alert("Bitte wähle zuerst Objekt und Kunde aus.");

        document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
        if (btn.dataset.tab === 'tab-finanzierung') berechneFinanzierung();
    });
});

// --- DATENBANK LADEN ---
async function ladeStammdaten() {
    const resObj = await supabaseClient.from('admin_objektstammdaten').select('*').order('einheit_name');
    const resKd = await supabaseClient.from('kunden_stammdaten').select('*').order('name');
    
    if (resObj.data) {
        dbObjekte = resObj.data;
        const selCalc = document.getElementById('calcObjektSelect');
        const tbAdmin = document.getElementById('adminTabelleBody');
        selCalc.innerHTML = '<option value="">-- Objekt aus Datenbank wählen --</option>';
        tbAdmin.innerHTML = '';
        
        dbObjekte.forEach(o => {
            selCalc.innerHTML += `<option value="${o.id}">${o.einheit_name}</option>`;
            tbAdmin.innerHTML += `<tr><td>${o.einheit_name}</td><td>${formatter.format(o.kaufpreis_einheit)}</td><td><button class="remove-btn" onclick="loescheDB('admin_objektstammdaten','${o.id}')">Löschen</button></td></tr>`;
        });
    }

    if (resKd.data) {
        dbKunden = resKd.data;
        const selCalc = document.getElementById('calcKundeSelect');
        const tbKunden = document.getElementById('kundenTabelleBody');
        selCalc.innerHTML = '<option value="">-- Kunden aus Datenbank wählen --</option>';
        tbKunden.innerHTML = '';

        dbKunden.forEach(k => {
            selCalc.innerHTML += `<option value="${k.id}">${k.name}</option>`;
            tbKunden.innerHTML += `<tr><td>${k.name}</td><td>${formatter.format(k.zve_pa)}</td><td>${k.bundesland}</td><td><button class="remove-btn" onclick="loescheDB('kunden_stammdaten','${k.id}')">Löschen</button></td></tr>`;
        });
    }
}

// --- WORKFLOW: 1. OBJEKT ---
document.getElementById('calcObjektSelect').addEventListener('change', (e) => {
    aktuellesObjekt = dbObjekte.find(o => o.id === e.target.value);
    if (!aktuellesObjekt) { document.getElementById('objektDetailsForm').style.display = 'none'; return; }
    
    document.getElementById('objektDetailsForm').style.display = 'block';
    document.getElementById('calcObjName').value = aktuellesObjekt.einheit_name;
    document.getElementById('calcObjKp').value = aktuellesObjekt.kaufpreis_einheit;
    document.getElementById('calcObjFlaeche').value = aktuellesObjekt.gesamtflaeche_qm;
    document.getElementById('calcObjMiete').value = aktuellesObjekt.miete_kalt_qm;
    document.getElementById('calcObjSanierung').value = aktuellesObjekt.anteil_sanierung_pz;
    document.getElementById('calcObjAlt').value = aktuellesObjekt.anteil_altsubstanz_pz;
    document.getElementById('calcObjBoden').value = Math.max(0, 100 - aktuellesObjekt.anteil_sanierung_pz - aktuellesObjekt.anteil_altsubstanz_pz).toFixed(1);
    checkObjektDeviations();
});

function checkObjektDeviations() {
    if(!aktuellesObjekt) return;
    let hasDeviation = false;
    const checks = [
        { id: 'calcObjName', orig: aktuellesObjekt.einheit_name },
        { id: 'calcObjKp', orig: aktuellesObjekt.kaufpreis_einheit },
        { id: 'calcObjFlaeche', orig: aktuellesObjekt.gesamtflaeche_qm },
        { id: 'calcObjMiete', orig: aktuellesObjekt.miete_kalt_qm },
        { id: 'calcObjSanierung', orig: aktuellesObjekt.anteil_sanierung_pz },
        { id: 'calcObjAlt', orig: aktuellesObjekt.anteil_altsubstanz_pz }
    ];
    
    checks.forEach(c => {
        let current = document.getElementById(c.id).type === 'number' ? parseFloat(document.getElementById(c.id).value) : document.getElementById(c.id).value;
        if(current != c.orig) {
            document.getElementById(c.id).classList.add('changed-input');
            hasDeviation = true;
        } else {
            document.getElementById(c.id).classList.remove('changed-input');
        }
    });

    // Auto-Berechne Boden
    let pSan = parseFloat(document.getElementById('calcObjSanierung').value) || 0;
    let pAlt = parseFloat(document.getElementById('calcObjAlt').value) || 0;
    document.getElementById('calcObjBoden').value = Math.max(0, 100 - pSan - pAlt).toFixed(1);

    document.getElementById('objektWarnung').classList.toggle('visible', hasDeviation);
}
document.querySelectorAll('.stammdaten-feld').forEach(el => el.addEventListener('input', checkObjektDeviations));

// --- WORKFLOW: 2. KUNDE ---
document.getElementById('calcKundeSelect').addEventListener('change', (e) => {
    aktuellerKunde = dbKunden.find(k => k.id === e.target.value);
    if (!aktuellerKunde) { document.getElementById('kundeDetailsForm').style.display = 'none'; return; }
    
    document.getElementById('kundeDetailsForm').style.display = 'block';
    document.getElementById('calcKundeName').value = aktuellerKunde.name;
    document.getElementById('calcKundeZve').value = aktuellerKunde.zve_pa;
    document.getElementById('calcKundeBl').value = aktuellerKunde.bundesland;
    document.getElementById('calcKundeKirche').value = aktuellerKunde.kirchensteuer_pz;
    document.getElementById('calcKundeSplit').checked = aktuellerKunde.is_splitting;
    checkKundeDeviations();
});

function checkKundeDeviations() {
    if(!aktuellerKunde) return;
    let hasDeviation = false;
    const checks = [
        { id: 'calcKundeZve', orig: aktuellerKunde.zve_pa, isCb: false },
        { id: 'calcKundeBl', orig: aktuellerKunde.bundesland, isCb: false },
        { id: 'calcKundeKirche', orig: aktuellerKunde.kirchensteuer_pz, isCb: false },
        { id: 'calcKundeSplit', orig: aktuellerKunde.is_splitting, isCb: true }
    ];
    
    checks.forEach(c => {
        let el = document.getElementById(c.id);
        let current = c.isCb ? el.checked : (el.type === 'number' ? parseFloat(el.value) : el.value);
        if(current != c.orig) {
            el.classList.add('changed-input');
            if(c.isCb) el.nextElementSibling.style.color = '#f39c12';
            hasDeviation = true;
        } else {
            el.classList.remove('changed-input');
            if(c.isCb) el.nextElementSibling.style.color = 'inherit';
        }
    });
    document.getElementById('kundeWarnung').classList.toggle('visible', hasDeviation);
}
document.querySelectorAll('.kunden-feld').forEach(el => el.addEventListener('input', checkKundeDeviations));

// --- WORKFLOW: 3. FINANZIERUNG (KACHELN) ---
function berechneFinanzierung() {
    if(!aktuellesObjekt) return;
    
    // Grunderwerbsteuer je nach Bundesland
    const grestSatzMap = { 'BW':5.0, 'BY':3.5, 'BE':6.0, 'BB':6.5, 'HB':5.0, 'HH':5.5, 'HE':6.0, 'MV':6.0, 'NI':5.0, 'NRW':6.5, 'RP':5.0, 'SL':6.5, 'SN':5.5, 'ST':5.0, 'SH':6.5, 'TH':5.0 };
    let aktuellesBl = document.getElementById('calcKundeBl').value || 'NRW';
    let grestPz = grestSatzMap[aktuellesBl] || 5.0;
    
    let kp = parseFloat(document.getElementById('calcObjKp').value) || 0;
    let nkBetrag = kp * ((2.0 + grestPz) / 100);
    let gesamtInvestition = kp + nkBetrag;

    // EK Initial setzen (nur beim ersten Mal)
    let ekInput = document.getElementById('calcEk');
    if(!ekInput.value) ekInput.value = Math.round(nkBetrag);
    
    let ek = parseFloat(ekInput.value) || 0;
    let restBedarf = gesamtInvestition - ek;

    // Kacheln durchrechnen (Hauptdarlehen ist der Restbetrag)
    let hauptIndex = darlehenList.findIndex(d => d.id === 'haupt');
    
    if (hauptIndex !== -1) {
        let summeZusatz = darlehenList.filter(d => d.id !== 'haupt').reduce((sum, d) => sum + d.amount, 0);
        let kalkuliertesHaupt = restBedarf - summeZusatz;
        
        if (kalkuliertesHaupt < 0) {
            // Wenn man mehr Kredite aufnimmt als man braucht, sinkt das nötige EK automatisch
            ekInput.value = Math.max(0, gesamtInvestition - summeZusatz).toFixed(0);
            darlehenList[hauptIndex].amount = 0;
        } else {
            darlehenList[hauptIndex].amount = kalkuliertesHaupt;
        }
    } else {
        // Falls Hauptdarlehen gelöscht wurde, wird EK der Restbetrag
        let summeZusatz = darlehenList.reduce((sum, d) => sum + d.amount, 0);
        ekInput.value = Math.max(0, gesamtInvestition - summeZusatz).toFixed(0);
    }

    renderKacheln();
    berechneDurchschnittszins();
}

document.getElementById('calcEk').addEventListener('input', berechneFinanzierung);

function renderKacheln() {
    const container = document.getElementById('darlehenContainer');
    container.innerHTML = '';
    
    darlehenList.forEach(d => {
        const isHaupt = d.id === 'haupt';
        let kfwDisplay = d.isKfw ? 'block' : 'none';
        
        let html = `
            <div class="darlehen-kachel ${isHaupt ? 'hauptdarlehen' : 'zusatzdarlehen'}">
                <div class="kachel-header">
                    <h4>${d.type}</h4>
                    <button type="button" class="remove-btn" onclick="removeLoan('${d.id}')">✖</button>
                </div>
                <div class="input-group">
                    <label>Kredithöhe (€) ${isHaupt ? '🔒' : ''}</label>
                    <input type="number" ${isHaupt ? 'readonly class="readonly-field"' : 'class="darlehen-amount"'} value="${d.amount.toFixed(0)}" onchange="updateLoan('${d.id}', 'amount', this.value)">
                </div>
                <div class="checkbox-group" style="margin-bottom:15px;">
                    <input type="checkbox" ${d.isKfw ? 'checked' : ''} onchange="updateLoan('${d.id}', 'isKfw', this.checked)"> <label>KfW Darlehen (Zuschuss)</label>
                </div>
                <div class="grid-2-col">
                    <div class="input-group"><label>Zins (%)</label><input type="number" step="0.01" value="${d.zins}" onchange="updateLoan('${d.id}', 'zins', this.value)"></div>
                    <div class="input-group"><label>Zinsbindung</label><input type="number" value="${d.bindung}" onchange="updateLoan('${d.id}', 'bindung', this.value)"></div>
                    <div class="input-group"><label>Anf. Tilgung (%)</label><input type="number" step="0.01" value="${d.tilg}" onchange="updateLoan('${d.id}', 'tilg', this.value)"></div>
                    <div class="input-group"><label>Anschluss-Tilgung (%)</label><input type="number" step="0.01" value="${d.anschluss}" onchange="updateLoan('${d.id}', 'anschluss', this.value)"></div>
                </div>
                <div class="input-group" style="display:${kfwDisplay}; margin-top:10px;">
                    <label>Tilgungszuschuss (€)</label>
                    <input type="number" value="${d.zuschuss}" onchange="updateLoan('${d.id}', 'zuschuss', this.value)">
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

window.updateLoan = function(id, field, value) {
    let loan = darlehenList.find(d => d.id === id);
    if(loan) {
        loan[field] = (field === 'isKfw') ? value : parseFloat(value) || 0;
        berechneFinanzierung();
    }
}

document.getElementById('btnAddLoan').addEventListener('click', () => {
    darlehenList.push({ id: 'dl_'+Date.now(), type: 'Zusatzdarlehen', amount: 50000, isKfw: false, zins: 3.5, tilg: 2.0, anschluss: 2.0, bindung: 10, zuschuss: 0 });
    berechneFinanzierung();
});

window.removeLoan = function(id) {
    darlehenList = darlehenList.filter(d => d.id !== id);
    berechneFinanzierung();
}

function berechneDurchschnittszins() {
    let gesamtKredit = darlehenList.reduce((sum, d) => sum + d.amount, 0);
    if(gesamtKredit === 0) {
        document.getElementById('avgZinsOutput').innerText = '0,00 %';
        return;
    }
    
    let gewichteterZins = 0;
    darlehenList.forEach(d => {
        let gewicht = d.amount / gesamtKredit;
        gewichteterZins += (d.zins * gewicht);
    });
    
    document.getElementById('avgZinsOutput').innerText = gewichteterZins.toFixed(2) + ' %';
}

// --- DATENBANK CRUD LOGIK (Admin) ---
document.getElementById('kundenForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('dbKundeName').value,
        zve_pa: parseFloat(document.getElementById('dbKundeZve').value),
        bundesland: document.getElementById('dbKundeBl').value,
        kirchensteuer_pz: parseFloat(document.getElementById('dbKundeKirche').value),
        is_splitting: document.getElementById('dbKundeSplit').checked
    };
    await supabaseClient.from('kunden_stammdaten').insert([data]);
    e.target.reset(); ladeStammdaten();
});

document.getElementById('adminForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        einheit_name: document.getElementById('adminEinheit').value,
        kaufpreis_einheit: parseFloat(document.getElementById('adminKaufpreis').value),
        gesamtflaeche_qm: parseFloat(document.getElementById('adminFlaeche').value),
        miete_kalt_qm: parseFloat(document.getElementById('adminMieteQm').value),
        anteil_sanierung_pz: parseFloat(document.getElementById('adminSanierungPz').value),
        anteil_altsubstanz_pz: parseFloat(document.getElementById('adminAltsubstanzPz').value)
    };
    await supabaseClient.from('admin_objektstammdaten').insert([data]);
    e.target.reset(); ladeStammdaten();
});

window.loescheDB = async function(table, id) {
    if(confirm("Wirklich unwiderruflich löschen?")) {
        await supabaseClient.from(table).delete().eq('id', id);
        ladeStammdaten();
    }
}

// Initialisieren
ladeStammdaten();