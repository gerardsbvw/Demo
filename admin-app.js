// admin-app.js

async function ladeAdminObjekte() {
    const { data, error } = await supabaseClient.from('admin_objektstammdaten').select('*').order('einheit_name');
    const tbody = document.getElementById('adminTabelleBody');
    tbody.innerHTML = "";
    if(data) {
        data.forEach(obj => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${obj.einheit_name}</strong></td>
                    <td>${obj.gesamtflaeche_qm} m²</td>
                    <td>${formatter.format(obj.kaufpreis_einheit)}</td>
                    <td><button onclick="loescheObjekt('${obj.id}')" style="background:none; color:#d9534f; font-size:1rem; padding:0; height:auto; width:auto; text-decoration:underline;">Löschen</button></td>
                </tr>
            `;
        });
    }
}

document.getElementById('adminForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;

    const neuesObjekt = {
        einheit_name: document.getElementById('adminEinheit').value,
        gesamtflaeche_qm: parseFloat(document.getElementById('adminFlaeche').value),
        kaufpreis_einheit: parseFloat(document.getElementById('adminKaufpreis').value),
        anteil_sanierung_pz: parseFloat(document.getElementById('adminSanierungPz').value),
        miete_kalt_qm: parseFloat(document.getElementById('adminMieteQm').value)
    };

    const { error } = await supabaseClient.from('admin_objektstammdaten').insert([neuesObjekt]);
    if(error) {
        alert("Fehler beim Speichern: " + error.message);
    } else {
        document.getElementById('adminForm').reset();
        ladeAdminObjekte();
    }
    btn.disabled = false;
});

window.loescheObjekt = async function(id) {
    if(confirm("Möchtest du diese Immobilie wirklich unwiderruflich aus den Stammdaten löschen?")) {
        await supabaseClient.from('admin_objektstammdaten').delete().eq('id', id);
        ladeAdminObjekte();
    }
};

// INITIALISIERUNG
ladeAdminObjekte();