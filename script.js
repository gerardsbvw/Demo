const SUPABASE_URL = "https://xdnmaqjqufeelrjbheky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_t1w477Z6EHsGWpWZEJfY0Q_xzx4KOXN";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let alleObjekte = [];
const formatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// 1. OBJEKTE AUS DATENBANK IN DAS DROPDOWN LADEN
async function ladeObjekte() {
    const { data, error } = await supabaseClient.from('admin_objektstammdaten').select('*').order('einheit_name');
    if (data) {
        alleObjekte = data;
        const select = document.getElementById('objektAuswahl');
        data.forEach(obj => {
            const option = document.createElement('option');
            option.value = obj.id;
            option.textContent = `${obj.einheit_name} (${formatter.format(obj.kaufpreis_einheit)})`;
            select.appendChild(option);
        });
    }
}

// 2. HISTORIE DER BERECHNUNGEN AUSLESEN
async function ladeHistorie() {
    const { data, error } = await supabaseClient.from('kunden_berechnungen').select('*').order('created_at', { ascending: false }).limit(10);
    const tbody = document.getElementById('tabellenBody');
    tbody.innerHTML = "";
    if (data) {
        data.forEach(e => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${e.objekt_name}</strong></td>
                <td>${formatter.format(e.kapitalbedarf_fremdkapital || 0)}</td>
                <td style="color: ${e.ergebnis_cashflow_j1 < 0 ? '#d9534f' : '#28a745'};">${formatter.format(e.ergebnis_cashflow_j1 || 0)}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

// 3. AUTO-FILL BEI AUSWAHL EINER IMMOBILIE
document.getElementById('objektAuswahl').addEventListener('change', (e) => {
    const obj = alleObjekte.find(o => o.id === e.target.value);
    if (!obj) return;

    document.getElementById('projektName').value = obj.einheit_name;
    document.getElementById('kaufpreis').value = obj.kaufpreis_einheit;
    document.getElementById('sanierungsanteil').value = obj.anteil_sanierung_pz || 75;
    
    liveBerechnung(); // Sofortige Kalkulation auslösen
});

// 4. MATHEMATISCHE LIVE-BERECHNUNG (Ersetzt deine VBA-Logik temporär/reaktiv)
function berechneImmobilie() {
    const kaufpreis = parseFloat(document.getElementById('kaufpreis').value) || 0;
    const eigenkapital = parseFloat(document.getElementById('eigenkapital').value) || 0;
    
    // Kaufnebenkosten-Simulation (z.B. 8% für Notar + Grunderwerbsteuer)
    const nk_quote = 0.08; 
    const kaufpreis_inkl_nk = kaufpreis * (1 + nk_quote);
    
    // Kapitalbedarf berechnen (Kaufpreis inkl. NK abzüglich Eigenkapital)
    let fremdkapitalbedarf = kaufpreis_inkl_nk - eigenkapital;
    if(fremdkapitalbedarf < 0) fremdkapitalbedarf = 0;

    // Kredithöhe im schreibgeschützten Feld live eintragen
    document.getElementById('d1Kredit').value = Math.round(fremdkapitalbedarf);

    // Cashflow-Simulation Jahr 1
    const zinsSatz = parseFloat(document.getElementById('d1Zins').value) || 3.9;
    const tilgSatz = parseFloat(document.getElementById('d1Tilgung').value) || 1.5;
    const jahresAufwandBank = fremdkapitalbedarf * ((zinsSatz + tilgSatz) / 100);
    const fiktiveMiete = kaufpreis * 0.045; // Angenommene 4.5% Mietrendite
    const cashflowJ1 = fiktiveMiete - jahresAufwandBank;

    return {
        kaufpreisInklNk: kaufpreis_inkl_nk,
        kapitalbedarf: fremdkapitalbedarf,
        cashflowJahr1: cashflowJ1
    };
}

// 5. OBERFLÄCHE AKTUALISIEREN
function liveBerechnung() {
    const ergebnis = berechneImmobilie();
    
    document.getElementById('liveKaufpreisNK').innerText = formatter.format(ergebnis.kaufpreisInklNk);
    document.getElementById('liveFremdkapital').innerText = formatter.format(ergebnis.kapitalbedarf);
    
    const cashflowEl = document.getElementById('liveCashflow');
    cashflowEl.innerText = formatter.format(ergebnis.cashflowJahr1);
    cashflowEl.style.color = ergebnis.cashflowJahr1 < 0 ? '#d9534f' : '#28a745';
}

// 6. EVENT-LISTENER AN ALLE INPUTS BINDEN
document.querySelectorAll('#calcForm input').forEach(el => {
    el.addEventListener('input', liveBerechnung);
});

// 7. EXPEDITION IN DIE DATENBANK: SZENARIO SPEICHERN
document.getElementById('btnSaveScenario').addEventListener('click', async () => {
    const btn = document.getElementById('btnSaveScenario');
    btn.innerText = "Speichere im System...";
    btn.disabled = true;

    const ergebnis = berechneImmobilie();

    const neuerEintrag = {
        objekt_name: document.getElementById('projektName').value || "Individuell",
        kaufpreis_gesamt_snapshot: parseFloat(document.getElementById('kaufpreis').value) || 0,
        sanierungsanteil_betrag_snapshot: parseFloat(document.getElementById('sanierungsanteil').value) || 0,
        zve_jahr_1_bis_5: parseFloat(document.getElementById('zve').value) || 0,
        is_splitting: document.getElementById('splitting').checked,
        eigenkapital_einsatz: parseFloat(document.getElementById('eigenkapital').value) || 0,
        kapitalbedarf_fremdkapital: ergebnis.kapitalbedarf,
        d1_kredithoehe: parseFloat(document.getElementById('d1Kredit').value) || 0,
        d1_zins_nominal: parseFloat(document.getElementById('d1Zins').value) || 0,
        ergebnis_cashflow_j1: ergebnis.cashflowJahr1
    };

    const { error } = await supabaseClient.from('kunden_berechnungen').insert([neuerEintrag]);

    if (error) {
        alert("Datenbankfehler: " + error.message);
    } else {
        ladeHistorie();
        alert("Szenario erfolgreich in Historie gesichert!");
    }

    btn.innerText = "Szenario dauerhaft speichern";
    btn.disabled = false;
});

// Start-Initialisierung
ladeObjekte();
ladeHistorie();
liveBerechnung();