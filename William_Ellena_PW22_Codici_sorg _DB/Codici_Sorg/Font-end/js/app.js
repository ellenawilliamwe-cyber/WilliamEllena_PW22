const EVENTI_API_URL = "http://127.0.0.1:8080/PW22_museo/api/eventi";
const PRENOTAZIONI_API_URL = "http://127.0.0.1:8080/PW22_museo/api/prenotazioni";

let eventoInCheckout = null;

function toggleMenuMobile() {
    const menu = document.getElementById("mainNavbar");
    const button = document.getElementById("btnMenuMobile");
    if (!menu || !button) return;

    const aperto = menu.classList.toggle("menuAperto");
    button.setAttribute("aria-expanded", String(aperto));
    button.setAttribute("aria-label", aperto ? "Chiudi menu" : "Apri menu");
}

document.addEventListener("DOMContentLoaded", () => {
    const btnMenuMobile = document.getElementById("btnMenuMobile");
    const mainNavbar = document.getElementById("mainNavbar");
    if (btnMenuMobile && mainNavbar) {
        btnMenuMobile.addEventListener("click", toggleMenuMobile);
        mainNavbar.addEventListener("click", () => {
            mainNavbar.classList.remove("menuAperto");
            btnMenuMobile.setAttribute("aria-expanded", "false");
            btnMenuMobile.setAttribute("aria-label", "Apri menu");
        });
    }

    const btnCerca = document.getElementById("btnCerca");
    if (btnCerca) {
        btnCerca.addEventListener("click", () => {
            const tit = document.getElementById("campoTitolo").value;
            const luo = document.getElementById("campoLuogo").value;
            const prx = document.getElementById("campoPrezzo").value;
            caricaCatalogoMostre(tit, luo, prx);
        });
    }

    const fCheckout = document.getElementById("moduloTransazioneCheckout");
    if (fCheckout) {
        fCheckout.addEventListener("submit", (e) => {
            e.preventDefault();
            eseguiAcquistoBiglietto();
        });
    }

    const btnEliminaMioAccount = document.getElementById("btnEliminaMioAccount");
    if (btnEliminaMioAccount) {
        btnEliminaMioAccount.addEventListener("click", (e) => {
            e.preventDefault();
            cancellaAccountVisitatoreAutonomo();
        });
    }

    const fModProfilo = document.getElementById("moduloModificaProfilo");
    if (fModProfilo) {
        fModProfilo.addEventListener("submit", (e) => {
            e.preventDefault();
            salvaModificheProfiloUtente();
        });
    }

    mostraPagina("paginaMostre");
    caricaCatalogoMostre();
});

function mostraPagina(idPagina) {
    document.querySelectorAll(".pagina").forEach(p => p.classList.add("nascosto"));
    const pag = document.getElementById(idPagina);
    if (pag) pag.classList.remove("nascosto");

    document.querySelectorAll(".voceMenu").forEach(link => link.classList.remove("attivo"));
    const linkAttivo = document.querySelector(`[onclick*="${idPagina}"]`);
    if (linkAttivo) linkAttivo.classList.add("attivo");
}

function chiudiDettaglioMostra(wrapper) {
    if (!wrapper) return;

    wrapper.classList.remove("aperto");
    const origine = wrapper._contenitoreOrigine;
    if (origine) {
        origine.appendChild(wrapper);
        delete wrapper._contenitoreOrigine;
    }

    const btnChiudi = document.getElementById("btnChiudiDinamicoGlobale");
    if (btnChiudi) btnChiudi.remove();
}

async function caricaCatalogoMostre(titolo = "", luogo = "", prezzoMax = "") {
    const box = document.getElementById("contenitoreEventi");
    if (!box) return;

    try {
        const query = `?titolo=${encodeURIComponent(titolo)}&luogo=${encodeURIComponent(luogo)}&prezzoMax=${encodeURIComponent(prezzoMax)}`;
        const risp = await fetch(EVENTI_API_URL + query, { method: "GET", credentials: "include" });
        const mostre = await risp.json();

        box.innerHTML = "";

        if (!mostre || mostre.length === 0) {
            box.innerHTML = "<p class='messaggioNessunDato'>Nessuna mostra disponibile con i criteri inseriti.</p>";
            return;
        }

        for (const m of mostre) {
            const wrapperEspositivo = await recuperaTemplateEsterno("modelloCardMostra");
            if (!wrapperEspositivo) continue;

            const card = wrapperEspositivo.querySelector(".scheda");
            const backdrop = wrapperEspositivo.querySelector(".sfondoMostra");

            card.querySelector(".titoloMostra").innerText = m.titolo;
            card.querySelector(".infoMostra").innerText = `${m.luogo} | ${m.data}`;
            card.querySelector(".prezzoMostra").innerText = `Prezzo: € ${m.prezzo.toFixed(2)}`;

            wrapperEspositivo.querySelector(".descrizioneMostraTesto").innerText = m.descr;

            const badgeDisponibilita = card.querySelector(".disponibilitaMostra");
            if (m.postiDisp <= 0) {
                badgeDisponibilita.innerText = "Esaurito";
                badgeDisponibilita.classList.add("testoPericolo");
                card.querySelector(".btnPrenota").disabled = true;
            } else {
                badgeDisponibilita.innerText = `Posti rimasti: ${m.postiDisp} / ${m.postiTotali}`;
            }

            card.addEventListener("click", (e) => {
                if (e.target.classList.contains("btnPrenota")) return;

                const rootWrapper = card.closest(".contenitoreMostra");

                if (rootWrapper.classList.contains("aperto")) {
                    chiudiDettaglioMostra(rootWrapper);
                } else {
                    document.querySelectorAll(".contenitoreMostra").forEach(w => w.classList.remove("aperto"));
                    rootWrapper._contenitoreOrigine = rootWrapper.parentElement;
                    document.body.appendChild(rootWrapper);
                    rootWrapper.classList.add("aperto");

                    rootWrapper.classList.add("aperto");
                    applicaBottoneChiudiUniversale(rootWrapper, "aperto");

                }
            });

            if (backdrop) {
                backdrop.addEventListener("click", () => {
                    const rootWrapper = backdrop.closest(".contenitoreMostra");
                    chiudiDettaglioMostra(rootWrapper);
                });
            }

            card.querySelector(".btnPrenota").addEventListener("click", () => {
                avviaFlussoCheckout(m);
            });

            box.appendChild(wrapperEspositivo);
        }

    } catch (err) {
        console.error("Errore recupero catalogo:", err);
        mostraNotifica("Impossibile caricare il catalogo delle mostre. Riprova più tardi.", "errore");
    }
}

function avviaFlussoCheckout(mostra) {
    eventoInCheckout = mostra;

    const utenteStringa = sessionStorage.getItem("utenteCorrente");
    if (!utenteStringa) {
        mostraNotifica("Accedi per poter prenotare i biglietti.", "info");
        if (typeof apriSiparioPerAuth === "function") {
            apriSiparioPerAuth();
        } else {
            const container = document.getElementById('siparioContenitore');
            if (container) {
                container.style.display = 'flex';
                container.classList.remove('aperturaSipario');
                container.classList.add('chiusuraSipario');
            }
            const authBox = document.getElementById('authBox');
            if (authBox) authBox.classList.add('visibile');
            if (typeof mostraFormLogin === "function") mostraFormLogin();
        }

        return;
    }

    document.getElementById("checkoutTitoloEvento").innerText = mostra.titolo;
    document.getElementById("checkoutLuogoEvento").innerText = `Sala: ${mostra.luogo}`;
    document.getElementById("checkoutDataEvento").innerText = `Data: ${mostra.data}`;
    document.getElementById("checkoutPrezzoBase").innerText = mostra.prezzo.toFixed(2);
    document.getElementById("checkoutQuantita").value = 1;
    ricalcolaTotaleCheckout();
    mostraPagina("paginaCheckout");

    const optCassa = document.getElementById("optPagamentoCassa");
    if (optCassa) {
        const abilitatoCassa = mostra.pagamentoCassa || mostra.pagCassa;

        if (abilitatoCassa === true || abilitatoCassa === "true") {
            optCassa.classList.remove("nascosto");
        } else {
            optCassa.classList.add("nascosto");
            if (document.getElementById("checkoutMetodo").value === "CASSA") {
                document.getElementById("checkoutMetodo").value = "Carta di Credito";
            }
        }
    }

    ricalcolaTotaleCheckout();
    mostraPagina("paginaCheckout");
}

function ricalcolaTotaleCheckout() {
    if (!eventoInCheckout) return;

    const quantitaInput = document.getElementById("checkoutQuantita");
    let quantita = parseInt(quantitaInput.value) || 1;

    if (quantita < 1) {
        quantita = 1;
        quantitaInput.value = 1;
    } else if (quantita > 10) {
        quantita = 10;
        quantitaInput.value = 10;
        mostraNotifica("Massimo 10 biglietti per singola transazione.", "info");
    }

    let prezzoUnitario = eventoInCheckout.prezzo;
    let totale = prezzoUnitario * quantita;

    const utenteStringa = sessionStorage.getItem("utenteCorrente");
    const badgeSconto = document.getElementById("checkoutBadgeSconto");

    if (utenteStringa) {
        const utente = JSON.parse(utenteStringa);
        if (utente.studente) {
            totale = totale * 0.8; 
            if (badgeSconto) badgeSconto.classList.remove("nascosto");
        } else {
            if (badgeSconto) badgeSconto.classList.add("nascosto");
        }
    }

    document.getElementById("checkoutPrezzoFinale").innerText = totale.toFixed(2);
}

async function eseguiAcquistoBiglietto() {
    if (!eventoInCheckout) return;

    const utenteStringa = sessionStorage.getItem("utenteCorrente");
    if (!utenteStringa) return;

    const utente = JSON.parse(utenteStringa);
    const q = parseInt(document.getElementById("checkoutQuantita").value) || 1;
    const met = document.getElementById("checkoutMetodo").value;
    const nt = document.getElementById("checkoutNota").value;
    const tot = document.getElementById("checkoutPrezzoFinale").innerText;

    const statoIniziale = (met === "CASSA") ? "ATTIVA" : "COMPLETA";

    const payload = {
        azione: "crea",
        idUtente: utente.id.toString(),
        idEvento: eventoInCheckout.id.toString(),
        nPosti: q.toString(),
        metodoPag: met,
        prezzoF: tot,
        notePag: nt,
        stato: statoIniziale
    };

    try {
        const risp = await fetch(PRENOTAZIONI_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
        });

        if (!risp.ok) {
            const errDati = await risp.json().catch(() => ({}));
            throw new Error(errDati.errore || "Impossibile completare la transazione.");
        }

        mostraNotifica("Acquisto completato con successo!", "success");
        eventoInCheckout = null;

        caricaCatalogoMostre();
        caricaStoricoUtente();
        mostraPagina("paginaPrenotazioni");

    } catch (err) {
        mostraNotifica(err.message, "error");
    }
}

async function caricaStoricoUtente() {
    const contenitoreTabella = document.getElementById("tabellaStoricoContenitore");
    if (!contenitoreTabella) return;

    const utenteStringa = sessionStorage.getItem("utenteCorrente");
    if (!utenteStringa) return;

    const utente = JSON.parse(utenteStringa);

    try {
        const risp = await fetch(`${PRENOTAZIONI_API_URL}?idUtente=${utente.id}`, {
            method: "GET",
            credentials: "include"
        });
        const biglietti = await risp.json();

        contenitoreTabella.innerHTML = "";

        if (!biglietti || biglietti.length === 0) {
            contenitoreTabella.innerHTML = "<p class='messaggioNessunDato'>Non hai ancora acquistato nessun biglietto.</p>";
            return;
        }

        const tabellaTpl = await recuperaTemplateEsterno("modelloStrutturaTabellaStorico");
        if (!tabellaTpl) return;

        const tbody = tabellaTpl.querySelector(".corpoTabellaStorico");

        for (const b of biglietti) {
            const riga = await recuperaTemplateEsterno("modelloRigaBigliettoUtente");
            if (!riga) continue;

            const st = b.stato ? b.stato.toUpperCase() : "COMPLETA";
            const prezzoF = parseFloat(b.prezzoFinale) || 0;

            riga.querySelector(".idPrenotazioneTesto").innerText = `#PREN-${b.id}`;
            riga.querySelector(".mostraPrenotazione").innerText = b.titoloEvento ? b.titoloEvento : "N/D";
            riga.querySelector(".postiPrenotazione").innerText = `${b.numeroPosti} ingressi`;
            riga.querySelector(".prezzoPrenotazione").innerText = `€ ${prezzoF.toFixed(2)}`;

            const badgeStato = riga.querySelector(".statoBiglietto");
            badgeStato.innerText = (st === "ATTIVA") ? "DA PAGARE (IN CASSA)" : st;

            const btnAnnulla = riga.querySelector(".btnAnnullaBiglietto");
            if (st === "ATTIVA" || st === "COMPLETA" || st === "COMPLETATA") {
                btnAnnulla.addEventListener("click", () => annullaMioBiglietto(b.id));
            } else {
                btnAnnulla.remove(); 
            }

            tbody.appendChild(riga);
        }

        contenitoreTabella.appendChild(tabellaTpl);
        inizializzaScrollbarStickyUniversali();

    } catch (err) {
        console.error("Errore recupero storico:", err);
        mostraNotifica("Errore nel recupero dello storico dei tuoi biglietti.", "errore");
    }
}

async function annullaMioBiglietto(idPrenotazione) {
    try {
        const risp = await fetch(PRENOTAZIONI_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                azione: "annulla",
                idPren: idPrenotazione.toString()
            })
        });

        const esitoTesto = await risp.text();

        if (!risp.ok) {
            throw new Error(esitoTesto || "Impossibile annullare il biglietto.");
        }

        mostraNotifica("Prenotazione revocata con successo. Posti liberati.", "success");
        caricaStoricoUtente();
        caricaCatalogoMostre();

    } catch (err) {
        mostraNotifica(err.message, "error");
    }
}

function visualizzaProfilo() {
    const utenteStringa = sessionStorage.getItem("utenteCorrente");
    if (!utenteStringa) return;

    const utente = JSON.parse(utenteStringa);

    document.getElementById("profNome").innerText = utente.nome;
    document.getElementById("profEmail").innerText = utente.email;
    document.getElementById("profStato").innerText = utente.studente ? "Studente (Sconto esame)" : "Standard";
    document.getElementById("profSesso").innerText = utente.sesso || "Non specificato";

    if (utente.dataNascita) {
        const nascita = new Date(utente.dataNascita);
        const oggi = new Date();
        let eta = oggi.getFullYear() - nascita.getFullYear();
        const m = oggi.getMonth() - nascita.getMonth();
        if (m < 0 || (m === 0 && oggi.getDate() < nascita.getDate())) {
            eta--;
        }
        document.getElementById("profEta").innerText = `${eta} anni`;
        document.getElementById("modificaDataNascita").value = utente.dataNascita;
    } else {
        document.getElementById("profEta").innerText = "Non specificata";
    }

    document.getElementById("modificaNome").value = utente.nome;
    document.getElementById("modificaStudente").checked = utente.studente;
}

async function salvaModificheProfiloUtente() {
    const utenteStringa = sessionStorage.getItem("utenteCorrente");
    if (!utenteStringa) return;

    const nPw = document.getElementById("modificaPassword").value;
    const vPw = document.getElementById("modificaPasswordAttuale").value;

    const payload = {
        azione: "modificaprofilo",
        nome: document.getElementById("modificaNome").value.trim(),
        dataNascita: document.getElementById("modificaDataNascita").value,
        studente: document.getElementById("modificaStudente").checked,
        pw: nPw ? nPw : null,
        vecchiaPw: vPw
    };

    try {
        const risp = await fetch(AUTH_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
        });

        if (!risp.ok) {
            const txtErr = await risp.text();
            throw new Error(txtErr || "Impossibile aggiornare i dati di profilo.");
        }

        const utenteAggiornato = await risp.json();
        sessionStorage.setItem("utenteCorrente", JSON.stringify(utenteAggiornato));

        mostraNotifica("Profilo aggiornato con successo.", "success");
        document.getElementById("modificaPassword").value = "";
        document.getElementById("modificaPasswordAttuale").value = "";

        visualizzaProfilo();
        aggiornaNavbar();

    } catch (err) {
        mostraNotifica(err.message, "error");
    }
}

async function cancellaAccountVisitatoreAutonomo() {

    const utenteStringa = sessionStorage.getItem("utenteCorrente");
    if (!utenteStringa) {
        mostraNotifica("Nessun utente autenticato trovato.", "error");
        return;
    }

    const utenteOggetto = JSON.parse(utenteStringa);

    const confermato = await chiediConfermaMuseo("Sei sicuro di voler eliminare permanentemente il tuo account? Questa azione è irreversibile secondo le normative GDPR sul diritto all'oblio.");
    if (!confermato) {
        return;
    }
    try {
        const risp = await fetch(AUTH_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                azione: "eliminaAccount",
                txtIn: utenteOggetto.id.toString()
            })
        });

        const esito = await risp.text();

        if (risp.ok && (esito.includes("Account eliminato") || esito.includes("success"))) {
            sessionStorage.removeItem("utenteCorrente");
            mostraNotifica("Il tuo profilo e i tuoi dati sono stati rimossi permanentemente conforme al GDPR.", "info");

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1200);
        } else {
            throw new Error(esito || "Cancellazione rifiutata dal server.");
        }
    } catch (err) {
        mostraNotifica(err.message, "error");
    }
}