// 1. SUPABASE INITIALISIEREN
const SUPABASE_URL = "https://xdnmaqjqufeelrjbheky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_t1w477Z6EHsGWpWZEJfY0Q_xzx4KOXN";

// Supabase-Client erstellen (benannt als supabaseClient, um Namenskonflikte zu vermeiden)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elemente selektieren
const calcForm = document.getElementById('calcForm');
const datenTabelle = document.getElementById('datenTabelle');

// 2. DATEN AUSLESEN (GET)
async function ladeDaten() {
  const { data, error } = await supabaseClient
    .from('Berechnungsdaten')
    .select('*');

  if (error) {
    console.error("Fehler beim Laden:", error.message);
    return;
  }

  // Tabelle leeren, bevor wir sie neu befüllen
  datenTabelle.innerHTML = "";

  // Daten in HTML-Tabelle rendern
  if (data) {
    data.forEach(eintrag => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${eintrag.projekt_name}</td>
        <td>${eintrag.wert_a}</td>
        <td>${eintrag.wert_b}</td>
        <td>${eintrag.ergebnis}</td>
      `;
      datenTabelle.appendChild(row);
    });
  }
}

// 3. DATEN SPEICHERN & RECHNEN (POST)
calcForm.addEventListener('submit', async (e) => {
  e.preventDefault(); // Verhindert das Neuladen der Seite

  // Werte aus dem Formular holen
  const projektName = document.getElementById('projektName').value;
  const wertA = parseFloat(document.getElementById('wertA').value);
  const wertB = parseFloat(document.getElementById('wertB').value);

  // HIER IST DEINE EXCEL-LOGIK
  const ergebnis = wertA * wertB; 

  // Objekt für Supabase vorbereiten
  const neuerEintrag = {
    projekt_name: projektName,
    wert_a: wertA,
    wert_b: wertB,
    ergebnis: ergebnis
  };

  // In Supabase Tabelle einfügen
  const { error } = await supabaseClient
    .from('Berechnungsdaten')
    .insert([neuerEintrag]);

  if (error) {
    alert("Fehler beim Speichern: " + error.message);
  } else {
    // Formular zurücksetzen und Tabelle sofort neu laden
    calcForm.reset();
    ladeDaten(); 
  }
});

// Beim ersten Laden der Seite direkt die vorhandenen Daten anzeigen
ladeDaten();