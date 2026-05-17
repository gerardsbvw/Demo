// math-logic.js

function berechneESt(zve, isSplitting) {
    let a = isSplitting ? zve / 2 : zve;
    let est = 0;
    if (a <= 12348) est = 0;
    else if (a <= 17799) { let y = (a - 12348) / 10000; est = (914.51 * y + 1400) * y; }
    else if (a <= 69878) { let z = (a - 17799) / 10000; est = (173.1 * z + 2397) * z + 1034.9; }
    else if (a <= 277825) est = 0.42 * a - 11135.63;
    else est = 0.45 * a - 19470.38;
    return isSplitting ? est * 2 : est;
}

function berechneSoli(est, isSplitting) {
    if (est === 0) return 0;
    const freigrenze = isSplitting ? 40700 : 20350; 
    if (est <= freigrenze) return 0;
    return Math.min((est - freigrenze) * 0.119, est * 0.055);
}

function berechneImmobilie(inputs) {
    const kaufpreisGesamt = inputs.kaufpreis + inputs.preisExtra;
    const nkBetrag = inputs.kaufpreis * ((inputs.notarPz + inputs.grestPz) / 100);
    const investitionsSumme = kaufpreisGesamt + nkBetrag;
    
    let fremdkapitalBedarf = Math.max(0, investitionsSumme - inputs.eigenkapital);
    let kfwKredit = Math.min(inputs.kfwKredit, fremdkapitalBedarf);
    let bankDarlehen = Math.max(0, fremdkapitalBedarf - kfwKredit);

    const basisSanierung = inputs.kaufpreis * (inputs.anteilSanierung / 100);
    const basisAltsubstanz = inputs.kaufpreis * (inputs.anteilAltsubstanz / 100);
    const afaSatzAlt = inputs.baujahrVor1925 ? 0.025 : 0.02;

    const mietePA = inputs.flaeche * inputs.mieteQm * 12;
    const instandhaltungPA = inputs.flaeche * 12; 
    const kiStSatz = inputs.kirchensteuer / 100;

    let jahresVerlauf = [];
    let monatsVerlaufJ1 = [];
    let darlehen = [
        { name: "Bank", restschuld: bankDarlehen, zins: inputs.d1Zins/100, tilgung: inputs.d1Tilgung/100, annuitaet: bankDarlehen * ((inputs.d1Zins + inputs.d1Tilgung)/100) },
        { name: "KfW", restschuld: kfwKredit, zins: inputs.kfwZins/100, tilgung: inputs.kfwTilgung/100, annuitaet: kfwKredit * ((inputs.kfwZins + inputs.kfwTilgung)/100) }
    ];

    let jahr = 1;
    let summeEkNachschuss = 0;

    while (jahr <= 60) {
        let zinsSumme = 0, tilgungSumme = 0;
        let restschuldAnfang = darlehen.reduce((sum, d) => sum + Math.max(0, d.restschuld), 0);
        if (restschuldAnfang <= 0.01 && jahr > inputs.betrachtungsJahr) break; 

        for (let monat = 1; monat <= 12; monat++) {
            let zinsMonat = 0, tilgMonat = 0;
            darlehen.forEach(d => {
                if (d.restschuld > 0) {
                    let z = d.restschuld * (d.zins / 12);
                    let mRate = d.annuitaet / 12;
                    let t = mRate - z;
                    if (t > d.restschuld) t = d.restschuld;
                    d.restschuld -= t;
                    zinsMonat += z; tilgMonat += t;
                    if (jahr === 1) monatsVerlaufJ1.push({ monat, darlehen: d.name, zins: z, tilgung: t, restschuld: d.restschuld, rate: mRate });
                }
            });
            zinsSumme += zinsMonat; tilgungSumme += tilgMonat;
        }

        let restschuldEnde = darlehen.reduce((sum, d) => sum + Math.max(0, d.restschuld), 0);
        
        let afaSan = (jahr <= 8) ? basisSanierung * 0.09 : ((jahr <= 12) ? basisSanierung * 0.07 : 0);
        let afaAlt = (jahr <= Math.ceil(1/afaSatzAlt)) ? basisAltsubstanz * afaSatzAlt : 0;
        
        let steuerlicherVerlust = mietePA - zinsSumme - (afaSan + afaAlt); 
        
        let estVor = berechneESt(inputs.zve, inputs.isSplitting);
        let estNach = berechneESt(inputs.zve + steuerlicherVerlust, inputs.isSplitting);
        let steuerersparnisGesamt = (estVor - estNach) + (berechneSoli(estVor, inputs.isSplitting) - berechneSoli(estNach, inputs.isSplitting)) + ((estVor * kiStSatz) - (estNach * kiStSatz));

        let cashflow = mietePA - zinsSumme - tilgungSumme - instandhaltungPA + steuerersparnisGesamt;
        if (cashflow < 0) summeEkNachschuss += Math.abs(cashflow);

        jahresVerlauf.push({
            jahr, miete: mietePA, zinsen: zinsSumme, tilgung: tilgungSumme,
            afaSan, afaAlt, verlust: steuerlicherVerlust, steuerersparnis: steuerersparnisGesamt,
            cashflow, nachschussKumuliert: summeEkNachschuss, restschuld: restschuldEnde,
            immoWert: kaufpreisGesamt * Math.pow(1 + (inputs.wertsteigerung / 100), jahr)
        });
        jahr++;
    }

    let targetJahr = Math.min(inputs.betrachtungsJahr, jahresVerlauf.length) - 1;
    let datenZieljahr = jahresVerlauf[targetJahr];
    let nettoRenditeBetrag = datenZieljahr.immoWert - datenZieljahr.restschuld - inputs.eigenkapital - datenZieljahr.nachschussKumuliert;
    
    let gesamtRentabilitaet = nettoRenditeBetrag / (inputs.eigenkapital + (0.5 * datenZieljahr.nachschussKumuliert));
    let renditePA = (Math.pow(1 + Math.max(0, gesamtRentabilitaet), 1 / inputs.betrachtungsJahr) - 1) * 100;

    return {
        investitionsSumme, bankDarlehen, kfwKredit, jahresVerlauf, monatsVerlaufJ1,
        kpi: { ekAnfang: inputs.eigenkapital, ekNachschuss: datenZieljahr.nachschussKumuliert, nettoRendite: nettoRenditeBetrag, renditePA, cashflowJ1: jahresVerlauf[0].cashflow }
    };
}