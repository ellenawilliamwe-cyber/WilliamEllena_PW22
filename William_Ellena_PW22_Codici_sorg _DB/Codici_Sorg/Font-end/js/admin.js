let logoutSignalController = new AbortController();

async function recuperaTemplateEsterno(idTemplate, fileSorgente = "templates.html") {
    try {
        const risp = await fetch(fileSorgente);
        const testo = await risp.text();

        const parser = new DOMParser();
        const docVirtuale = parser.parseFromString(testo, "text/html");
        const tpl = docVirtuale.getElementById(idTemplate);

        if (!tpl) {
            console.error(`[DOM] Template con ID #${idTemplate} non trovato in ${fileSorgente}`);
            return null;
        }
        return tpl.content.cloneNode(true);
    } catch (err) {
        console.error("[RETE] Impossibile caricare il file dei template:", err);
        return null;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const fLogin = document.getElementById("moduloLoginSchema");
    const fReg = document.getElementById("moduloRegistrazioneSchema");
    const btnLogout = document.getElementById("btnLogoutClick");

    if (fLogin) {
        fLogin.addEventListener("submit", async (e) => {
            e.preventDefault();

            const em = document.getElementById("loginEmail").value.trim();
            const pw = document.getElementById("loginPassword").value;

            try {
                const risp = await fetch(AUTH_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        azione: "login",
                        email: em,
                        password: pw
                    })
                });

                if (!risp.ok) {
                    const messaggioErrore = await risp.text();
                    throw new Error(messaggioErrore || "Impossibile effettuare il login.");
                }

                const uLog = await risp.json();
                sessionStorage.setItem("utenteCorrente", JSON.stringify(uLog));

                mostraNotifica(`Benvenuto ${uLog.nome}`, "success");

                aggiornaNavbar();
                setTimeout(() => { window.location.reload(); }, 1200);

            } catch (err) {
                mostraNotifica(err.message, "error");
            }
        });
    }

    if (fReg) {
        fReg.addEventListener("submit", async (e) => {
            e.preventDefault();

            const dati = {
                azione: "registra",
                nome: document.getElementById("regNome").value,
                email: document.getElementById("regEmail").value,
                pw: document.getElementById("regPassword").value,
                studente: document.getElementById("regStudente").checked,
                dataNascita: document.getElementById("regDataNascita").value,
                sesso: document.getElementById("regSesso").value || null
            };

            try {
                const risp = await fetch(AUTH_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(dati)
                });

                if (!risp.ok) {
                    const messaggioErrore = await risp.text();
                    throw new Error(messaggioErrore || "Impossibile registrarsi.");
                }

                const uLog = await risp.json();
                sessionStorage.setItem("utenteCorrente", JSON.stringify(uLog));

                mostraNotifica("Iscrizione completata con successo.", "success");
                fReg.reset();

                aggiornaNavbar();
                setTimeout(() => { mostraPagina('paginaMostre'); }, 1200);

            } catch (err) {
                mostraNotifica(err.message, "error");
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener("click", (e) => {
            e.preventDefault();
            logoutSignalController.abort();
            sessionStorage.removeItem("utenteCorrente");
            sessionStorage.removeItem("ultimoTriggerAdminAttivo");
            mostraNotifica("Sessione chiusa.", "info");
            setTimeout(() => { window.location.reload(); }, 1200);
        });
    }

    aggiornaNavbar();
});

function aggiornaNavbar() {
    const uStr = sessionStorage.getItem("utenteCorrente");
    const guestLinks = document.querySelectorAll(".soloOspite");
    const userLinks = document.querySelectorAll(".soloUtente");
    const adminLinks = document.querySelectorAll(".soloAdmin");
    const uTag = document.getElementById("navbarUserTag");

    if (uStr) {
        const u = JSON.parse(uStr);
        guestLinks.forEach(el => el.classList.add("nascosto"));
        userLinks.forEach(el => el.classList.remove("nascosto"));

        if (uTag) {
            uTag.classList.remove("nascosto");
            uTag.innerText = `👤 ${u.nome} (${u.ruolo})`;
        }
        if (u.ruolo === "ADMIN") {
            adminLinks.forEach(el => el.classList.remove("nascosto"));
        } else {
            adminLinks.forEach(el => el.classList.add("nascosto"));
        }
    } else {
        guestLinks.forEach(el => el.classList.remove("nascosto"));
        userLinks.forEach(el => el.classList.add("nascosto"));
        adminLinks.forEach(el => el.classList.add("nascosto"));
        if (uTag) uTag.classList.add("nascosto");
    }
}

function togglePassword(idInput) {
    const el = document.getElementById(idInput);
    if (el) {
        el.type = (el.type === "password") ? "text" : "password";
    }
}

const ADMIN_EVENTI_URL = "http://127.0.0.1:8080/PW22_museo/api/eventi";
const ADMIN_PREN_URL = "http://127.0.0.1:8080/PW22_museo/api/prenotazioni";

document.addEventListener("DOMContentLoaded", () => {

    const pulsantiMenuAdmin = document.querySelectorAll(".menuSchedeAdmin label");
    pulsantiMenuAdmin.forEach(label => {
        label.addEventListener("click", () => {
            const idRadioTarget = label.getAttribute("for");
            if (idRadioTarget) {
                sessionStorage.setItem("ultimoTriggerAdminAttivo", idRadioTarget);
            }
        });
    });

    const triggerSalvato = sessionStorage.getItem("ultimoTriggerAdminAttivo");
    if (triggerSalvato) {
        const radioDaAttivare = document.getElementById(triggerSalvato);
        if (radioDaAttivare) {
            radioDaAttivare.checked = true;
        }
    }

    const btnCercaPren = document.getElementById("btnCercaPrenotazioni");
    if (btnCercaPren) {
        btnCercaPren.addEventListener("click", () => {
            const em = document.getElementById("cercaPrenEmail").value;
            const ev = document.getElementById("cercaPrenEvento").value;
            caricaTabellaAssistenzaPrenotazioni(em, ev);
        });
    }

    const uStr = sessionStorage.getItem("utenteCorrente");
    if (!uStr || JSON.parse(uStr).ruolo !== "ADMIN") {
        mostraNotifica("Accesso negato: privilegi insufficienti.", "error");
        setTimeout(() => { window.location.href = "index.html"; }, 1200);
        return;
    }

    const fEvento = document.getElementById("moduloEventoAdmin");
    if (fEvento) {
        fEvento.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!fEvento.checkValidity()) {
                arsNovaDebug("form-evento", new Error("Validazione form evento fallita"), { tipo: "validazione" });
                fEvento.reportValidity();
                return;
            }
            salvaEventoCRUD();
        });
    }

    const btnApriModal = document.getElementById("btnApriModaleNuovo");
    if (btnApriModal) btnApriModal.addEventListener("click", apriModalInserimento);

    const btnChiudiModal = document.getElementById("btnChiudiModale");
    if (btnChiudiModal) btnChiudiModal.addEventListener("click", chiudiModal);

    const btnLogoutAdmin = document.getElementById("btnLogoutAdminClick");
    if (btnLogoutAdmin) {
        btnLogoutAdmin.addEventListener("click", (e) => {
            e.preventDefault();
            logoutSignalController.abort();
            sessionStorage.removeItem("utenteCorrente");
            sessionStorage.removeItem("ultimoTriggerAdminAttivo");
            sessionStorage.removeItem("siparioGiaAperto");
            mostraNotifica("Sessione amministrativa chiusa con successo.", "info");
            const pannelloCorpo = document.getElementById("corpoGestionePersonale");
            if (pannelloCorpo) pannelloCorpo.innerHTML = "";
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1200);
        });
    }

    const fCreaAdmin = document.getElementById("moduloCreaSottoadmin");
    if (fCreaAdmin) {
        fCreaAdmin.addEventListener("submit", async (e) => {
            e.preventDefault();
            await registraNuovoAdminDalPannello();
        });
    }

    const btnDelUtente = document.getElementById("btnAdminEliminaUtente");
    const boxCollisione = document.getElementById("boxCollisioneOmonimia");
    const selectCollisione = document.getElementById("selectUtenteCollisione");
    const btnRisolviCollisione = document.getElementById("btnAdminRisolviCollisione");

    if (btnDelUtente) {
        btnDelUtente.addEventListener("click", async () => {
            const valInput = document.getElementById("campoEliminaUtenteUniversale").value.trim();
            if (!valInput) {
                mostraNotifica("Inserisci un parametro di ricerca.", "error");
                return;
            }
            const confermato = await chiediConfermaMuseo(`Sei sicuro di voler eliminare permanentemente l'utente "${valInput}"? Questa azione è irreversibile.`);
            if (!confermato) return;

            if (boxCollisione) boxCollisione.classList.add("nascosto");

            try {
                const risp = await fetch(AUTH_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        azione: "eliminaAccount",
                        idUtente: valInput,
                        txtIn: valInput
                    })
                });

                const esitoTesto = (await risp.text()).trim();

                if (risp.ok && (esitoTesto.toLowerCase().includes("eliminato") || esitoTesto === "")) {
                    mostraNotifica("Utente rimosso con successo.", "success");
                    document.getElementById("campoEliminaUtenteUniversale").value = "";
                    caricaInfrastrutturaAdmin();
                } else {
                    mostraNotifica(esitoTesto || "Account non trovato o eliminazione non consentita.", "error");
                }

            } catch (err) {
                console.error("Errore di rete:", err);
                mostraNotifica("Errore di comunicazione con il server.", "error");
            }
        });
    }

    if (btnRisolviCollisione) {
        btnRisolviCollisione.addEventListener("click", async () => {
            const emSel = selectCollisione.value;
            try {
                const risp = await fetch(AUTH_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        azione: "eliminaAccount",
                        txtIn: emSel
                    })
                });

                const esitoTesto = await risp.text();

                if (risp.ok && esitoTesto.includes("Account eliminato.")) {
                    mostraNotifica("Account specifico rimosso con successo.", "success");
                    if (boxCollisione) boxCollisione.classList.add("nascosto");
                    document.getElementById("campoEliminaUtenteUniversale").value = "";
                    caricaInfrastrutturaAdmin();
                } else {
                    mostraNotifica(esitoTesto || "Impossibile eliminare l'account.", "error");
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    const btnCercaUtente = document.getElementById("btnAdminCercaUtente");
    const containerRisultati = document.getElementById("contenitoreRisultatiRicercaUtenti");
    const tbodyRisultati = document.getElementById("corpoRisultatiRicercaUtenti");

    if (btnCercaUtente) {
        btnCercaUtente.addEventListener("click", async () => {
            const nInput = document.getElementById("campoEliminaUtenteUniversale").value.trim();
            if (!nInput) {
                mostraNotifica("Digita una chiave di ricerca.", "error"); return;
            }

            try {
                const risp = await fetch(AUTH_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ azione: "cercaUtenti", txtIn: nInput })
                });

                if (!risp.ok) throw new Error("Errore di risposta dal server.");

                const trovati = await risp.json();
                tbodyRisultati.innerHTML = "";

                if (!trovati || trovati.length === 0) {
                    mostraNotifica("Nessun utente trovato.", "info");
                    containerRisultati.classList.add("nascosto"); return;
                }

                containerRisultati.classList.remove("nascosto");

                for (const u of trovati) {
                    const rigaTpl = await recuperaTemplateEsterno("modelloRigaRicercaUtente");
                    if (!rigaTpl) continue;

                    rigaTpl.querySelector(".idTesto").innerText = `#USER-${u.id}`;
                    rigaTpl.querySelector(".nomeTesto").innerText = u.nome;
                    rigaTpl.querySelector(".emailTesto").innerText = u.email;
                    rigaTpl.querySelector(".sessoTesto").innerText = u.sesso;
                    rigaTpl.querySelector(".statoTesto").innerText = u.studente ? "Studente" : "Standard";

                    const btnDelDiretto = rigaTpl.querySelector(".btnEliminaDiretto");
                    btnDelDiretto.addEventListener("click", async () => {
                        try {
                            const rispDel = await fetch(AUTH_API_URL, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({ azione: "eliminaAccount", txtIn: u.email })
                            });

                            const esitoTestoDel = (await rispDel.text()).trim();
                            if (rispDel.ok && esitoTestoDel.toLowerCase().includes("eliminato")) {
                                mostraNotifica("Account eliminato con successo.", "success");
                                btnDelDiretto.closest("tr").remove();
                                if (tbodyRisultati.children.length === 0) {
                                    containerRisultati.classList.add("nascosto");
                                }
                                caricaInfrastrutturaAdmin();
                            } else {
                                mostraNotifica(esitoTestoDel || "Impossibile completare la rimozione.", "error");
                            }
                        } catch (e) {
                            mostraNotifica("Impossibile completare la rimozione.", "error");
                        }
                    });

                    tbodyRisultati.appendChild(rigaTpl);
                }
            } catch (err) {
                mostraNotifica(err.message, "error");
            }
        });
    }

    caricaInfrastrutturaAdmin();
});

async function caricaInfrastrutturaAdmin() {
    await caricaTabellaEventiCRUD();
    await caricaRegistroPagamentiFiscale();
    await caricaTabellaPersonaleRBAC();
    await caricaTabellaAssistenzaPrenotazioni();
    inizializzaScrollbarStickyUniversali();
}

async function caricaTabellaEventiCRUD() {
    const tbody = document.getElementById("corpoCrudEventi");
    if (!tbody) return;

    try {
        const risp = await fetch(ADMIN_EVENTI_URL, { method: "GET", credentials: "include" });
        const eventi = await risp.json();
        tbody.innerHTML = "";

        let mostraTop = "Nessun dato";
        let maxV = -1;
        const uAttivo = JSON.parse(sessionStorage.getItem("utenteCorrente"));
        const puoEditare = uAttivo && uAttivo.permessi !== "LETTURA";

        for (const ev of eventi) {
            const venduti = ev.postiTotali - ev.postiDisp;
            if (venduti > maxV && venduti > 0) {
                maxV = venduti;
                mostraTop = ev.titolo;
            }

            const rigaTpl = await recuperaTemplateEsterno("modelloRigaEventoCrud");
            if (!rigaTpl) continue;

            rigaTpl.querySelector(".idEventoTesto").innerText = `#${ev.id}`;
            rigaTpl.querySelector(".titoloEvento").innerText = ev.titolo;
            rigaTpl.querySelector(".tipoEvento").innerText = ev.tipoEvento ? ev.tipoEvento : 'MOSTRA';
            rigaTpl.querySelector(".dataEvento").innerText = ev.data;
            rigaTpl.querySelector(".luogoEvento").innerText = ev.luogo;
            rigaTpl.querySelector(".postiEvento").innerText = `${ev.postiDisp} / ${ev.postiTotali}`;
            rigaTpl.querySelector(".prezzoEvento").innerText = `€ ${ev.prezzo.toFixed(2)}`;

            const containerAzioni = rigaTpl.querySelector(".azioniCrud");
            if (puoEditare) {
                const btnEdit = rigaTpl.querySelector(".btnModifica");
                const btnDel = rigaTpl.querySelector(".btnElimina");

                btnEdit.addEventListener("click", () => apriModalModifica(ev));
                btnDel.addEventListener("click", () => eliminaEventoCRUD(ev.id));
            } else {
                containerAzioni.innerHTML = '<span style="color:#64748b; font-size:13px;">Sola Lettura</span>';
            }

            tbody.appendChild(rigaTpl);
        }

        const lblTop = document.getElementById("kpiMostraTop");
        if (lblTop) lblTop.innerText = `${mostraTop} (${maxV > -1 ? maxV : 0} biglietti)`;

    } catch (err) {
        console.error("Errore griglia eventi:", err);
    }
}

async function salvaEventoCRUD() {
    const idEv = document.getElementById("moduloEventoId").value;
    const azioneAttuale = idEv ? "modifica" : "inserisci";

    const payload = {
        azione: azioneAttuale,
        id: idEv ? parseInt(idEv) : null,
        titolo: document.getElementById("moduloEventoTitolo").value,
        descr: document.getElementById("moduloEventoDescrizione").value,
        tipoEvento: document.getElementById("moduloEventoTipo").value,
        data: document.getElementById("moduloEventoData").value,
        luogo: document.getElementById("moduloEventoLuogo").value,
        postiTot: parseInt(document.getElementById("moduloEventoPosti").value),
        prezzo: parseFloat(document.getElementById("moduloEventoPrezzo").value),
        pagCassa: document.getElementById("moduloEventoCassa").checked
    };

    try {
        const risp = await fetch(ADMIN_EVENTI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
        });

        const testoRisposta = await risp.text();

        if (risp.ok && (testoRisposta.includes("successo") || testoRisposta.includes("inserito") || testoRisposta.includes("modificato"))) {
            mostraNotifica("Configurazione catalogo salvata con successo.", "success");

            const modal = document.getElementById("modaleEventoCrud");
            if (modal) modal.classList.add("nascosto");
            document.getElementById("moduloEventoAdmin").reset();

            caricaTabellaEventiCRUD();
        } else {
            mostraNotifica(testoRisposta || "Operazione non consentita dal sistema.", "error");
            mostraNotifica("Errore di rete: impossibile salvare le modifiche alla mostra.", "errore");
        }

    } catch (err) {
        console.error(">> Errore nel salvataggio della mostra:", err);
        mostraNotifica("Impossibile completare l'operazione a causa di un errore hardware.", "error");
    }
}

async function eliminaEventoCRUD(id) {
    try {
        const risp = await fetch(ADMIN_EVENTI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ azione: "elimina", id: parseInt(id) })
        });
        const testoRisposta = await risp.text();

        if (risp.ok && (testoRisposta.includes("successo") || testoRisposta.includes("rimossa"))) {
            mostraNotifica("Mostra espunta dal catalogo commerciale.", "success");

            caricaTabellaEventiCRUD();
        } else {
            mostraNotifica(testoRisposta || "Operazione non consentita dal sistema.", "error");
        }
    } catch (err) {
        mostraNotifica(err.message, "error");
    }
}

function apriModalInserimento() {
    arsNovaDebug("modal-evento", "Apertura form nuovo evento");
    document.getElementById("moduloEventoAdmin").reset();
    document.getElementById("moduloEventoId").value = "";
    document.getElementById("moduloEventoPostiDisponibili").value = "";
    document.getElementById("modaleTitoloAzione").innerText = "Nuova Mostra";
    document.getElementById("modaleEventoCrud").classList.remove("nascosto");
}

function apriModalModifica(ev) {
    document.getElementById("moduloEventoId").value = ev.id;
    document.getElementById("moduloEventoTitolo").value = ev.titolo;
    document.getElementById("moduloEventoDescrizione").value = ev.descr;
    document.getElementById("moduloEventoTipo").value = ev.tipoEvento ? ev.tipoEvento.toUpperCase() : "MOSTRA";
    document.getElementById("moduloEventoData").value = ev.data;
    document.getElementById("moduloEventoLuogo").value = ev.luogo;
    document.getElementById("moduloEventoPosti").value = ev.postiTotali;
    document.getElementById("moduloEventoPostiDisponibili").value = ev.postiDisp;
    document.getElementById("moduloEventoPrezzo").value = ev.prezzo.toFixed(2);
    document.getElementById("moduloEventoCassa").checked = ev.pagCassa;

    document.getElementById("modaleTitoloAzione").innerText = `Modifica Mostra #${ev.id}`;
    document.getElementById("modaleEventoCrud").classList.remove("nascosto");
}

function chiudiModal() {
    document.getElementById("modaleEventoCrud").classList.add("nascosto");
}

async function caricaRegistroPagamentiFiscale() {
    const tbody = document.getElementById("corpoRegistroPagamenti");
    if (!tbody) return;

    try {
        const risp = await fetch(`${ADMIN_PREN_URL}?idUtente=0`, { method: "GET", credentials: "include" });
        const registro = await risp.json();
        tbody.innerHTML = "";

        let incasso = 0; let tBiglietti = 0;

        if (!registro || registro.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#64748b;">Nessuna transazione rilevata.</td></tr>`;
            document.getElementById("kpiIncassoTotale").innerText = "€ 0.00";
            document.getElementById("kpiBigliettiTotali").innerText = "0";
            return;
        }

        for (const p of registro) {
            const q = p.numeroPosti || 0;
            const st = p.stato ? p.stato.toUpperCase().trim() : "COMPLETA";
            const imp = parseFloat(p.prezzoFinale) || 0;

            let lblStato = st; let stileBadge = "";

            if (st === "COMPLETA" || st === "COMPLETATA") {
                incasso += imp; tBiglietti += q; lblStato = "SALDATO";
                stileBadge = "badge-success";
            } else if (st === "ATTIVA") {
                lblStato = "IN CASSA"; stileBadge = "badge-warning";
            } else if (st === "ANNULLATA" || st === "ANNULLATO") {
                lblStato = "RIMBORSATO"; stileBadge = "badge-danger";
            }
            const rigaTpl = await recuperaTemplateEsterno("modelloRigaRegistroFiscale");
            if (!rigaTpl) continue;

            rigaTpl.querySelector(".idPagamentoTesto").innerText = `#PAG-${p.id + 100}`;
            rigaTpl.querySelector(".idPrenotazioneTesto").innerText = `#PREN-${p.id}`;
            rigaTpl.querySelector(".idUtenteTesto").innerText = `ID: ${p.idUtente || 'N/D'}`;
            rigaTpl.querySelector(".importoTesto").innerText = `€ ${imp.toFixed(2)}`;
            rigaTpl.querySelector(".metodoPagamento").innerText = p.metodoPagamento || "CARTA";
            rigaTpl.querySelector(".codicePagamento").innerText = `TX-${p.id}A9B8`;

            const badge = rigaTpl.querySelector(".statoFiscale");
            badge.innerText = lblStato;
            badge.classList.add(stileBadge);

            rigaTpl.querySelector(".titoloMostra").innerText = p.titoloEvento ? p.titoloEvento : "N/D";

            tbody.appendChild(rigaTpl);
        }

        document.getElementById("kpiIncassoTotale").innerText = `€ ${incasso.toFixed(2)}`;
        document.getElementById("kpiBigliettiTotali").innerText = tBiglietti;

    } catch (err) {
        console.error("Errore registro pagamenti:", err);
    }
}

async function registraNuovoAdminDalPannello() {
    try {
        const risp = await fetch(AUTH_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                azione: "registraAdmin",
                nome: document.getElementById("adminNome").value,
                email: document.getElementById("adminEmail").value,
                pw: document.getElementById("adminPassword").value,
                permessi: document.getElementById("adminPermessi").value
            })
        });
        const rispostaTesto = await risp.text();
        if (!risp.ok) {
            throw new Error(rispostaTesto || "Errore durante la creazione dell'account.");
        }
        mostraNotifica(rispostaTesto, "success");
        document.getElementById("moduloCreaSottoadmin").reset();
        if (typeof caricaTabellaPersonaleRBAC === "function") caricaTabellaPersonaleRBAC();
    } catch (err) {
        mostraNotifica(err.message, "error");
    }
}

async function caricaTabellaPersonaleRBAC() {
    const tbody = document.getElementById("corpoGestionePersonale");
    if (!tbody) return;

    try {
        const risp = await fetch(AUTH_API_URL, { method: "GET", credentials: "include" });
        const listaAdmin = await risp.json();
        tbody.innerHTML = "";

        if (listaAdmin.errore || !Array.isArray(listaAdmin)) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef4444;">Impossibile caricare il pannello gestione admin.</td></tr>`;
            return;
        }

        const uAttivo = JSON.parse(sessionStorage.getItem("utenteCorrente"));
        const haPotereSupremo = uAttivo && (uAttivo.permessi === "TOTALE" || (uAttivo.ruolo === "ADMIN" && !uAttivo.permessi));

        for (const adm of listaAdmin) {
            const rigaTpl = await recuperaTemplateEsterno("modelloRigaOperatoreRbac");
            if (!rigaTpl) continue;

            rigaTpl.querySelector(".idAdminTesto").innerText = `#ADMIN-${adm.id}`;
            rigaTpl.querySelector(".nomeAdmin").innerText = adm.nome;
            rigaTpl.querySelector(".emailAdmin").innerText = adm.email;

            const containerModifica = rigaTpl.querySelector(".modificaPermessi");
            const containerRimozione = rigaTpl.querySelector(".revocaAccesso");

            if (haPotereSupremo) {
                const select = containerModifica.querySelector(".selettorePermessi");
                select.id = `select-perm-${adm.id}`;
                select.value = adm.permessi || "LETTURA";

                const btnConf = containerModifica.querySelector(".btnApplicaPermessi");
                btnConf.addEventListener("click", async () => {
                    const scatto = document.getElementById(`select-perm-${adm.id}`).value;
                    try {
                        const rispH = await fetch(AUTH_API_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ azione: "cambiaPermessi", id: adm.id, permessi: scatto })
                        });
                        const testoRisp = await rispH.text();

                        if (!rispH.ok) {
                            throw new Error(testoRisp || "Impossibile aggiornare i privilegi.");
                        }
                        mostraNotifica("Privilegi aggiornati.", "success"); caricaTabellaPersonaleRBAC();
                    } catch (e) {
                        mostraNotifica("Impossibile aggiornare i privilegi.", e.message);
                    }
                });

                const btnLicenzia = containerRimozione.querySelector(".btnRevocaAdmin");
                if (!btnLicenzia) {
                    arsNovaDebug("rbac-revoca", new Error("Pulsante Revoca e Rimuovi non trovato"), { adminId: adm.id });
                    continue;
                }
                btnLicenzia.addEventListener("click", async () => {
                    const sicuro = await chiediConfermaMuseo(`Sei sicuro di voler revocare permanentemente l'accesso all'account di ${adm.nome}?`);
                    if (!sicuro) return;
                    try {
                        const rispD = await fetch(AUTH_API_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                                azione: "eliminaAccount",
                                idUtente: adm.id.toString(),
                                txtIn: adm.id.toString()
                            })
                        });
                        const es = await rispD.text();

                        const esito = es.trim().toLowerCase();
                        if (rispD.ok && !esito.includes("errore") && !esito.includes("impossibile")) {
                            mostraNotifica("Collaboratore rimosso con successo.", "success");
                            caricaTabellaPersonaleRBAC();
                            return;
                        }
                        mostraNotifica(es || "Impossibile completare l'operazione.", "error");
                    } catch (e) {
                        console.error("Error: ", e);
                        mostraNotifica("Errore hardware di rete.", "error");
                    }
                });
            } else {
                containerModifica.innerHTML = `<span class="etichettaAdmin">${adm.permessi || 'LETTURA'}</span>`;
                containerRimozione.innerHTML = '<span style="color:#cbd5e1; font-size:13px;">Inibito</span>';
            }

            tbody.appendChild(rigaTpl);
        }
    } catch (err) {
        console.error("Errore organigramma:", err);
    }
}

async function caricaTabellaAssistenzaPrenotazioni(email = "", evento = "") {
    const tbody = document.getElementById("corpoCustomerServicePrenotazioni");
    if (!tbody) return;

    try {
        const url = `${ADMIN_PREN_URL}?idUtente=admin_panel`
            + `&cercaEmail=${encodeURIComponent(email)}`
            + `&cercaEvento=${encodeURIComponent(evento)}`;

        const risp = await fetch(url, {
            method: "GET",
            credentials: "include",
            signal: logoutSignalController.signal
        });

        if (!risp.ok) {
            const txtErr = await risp.text();
            throw new Error(txtErr);
        }

        const elenco = await risp.json();
        tbody.innerHTML = "";

        if (!elenco || elenco.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748b;">Nessun record corrispondente ai filtri.</td></tr>`;
            return;
        }

        const uAttivo = JSON.parse(sessionStorage.getItem("utenteCorrente"));
        const grado = uAttivo ? uAttivo.permessi.toUpperCase() : "LETTURA";
        const puoAnnullare = grado === "TOTALE" || grado === "MODERATORE";

        for (const p of elenco) {
            const rigaTpl = await recuperaTemplateEsterno("modelloRigaAssistenzaPrenotazione");
            if (!rigaTpl) continue;

            const st = p.stato ? p.stato.toUpperCase() : "ATTIVA";
            const isAttiva = st === "ATTIVA" || st === "CONFERMATA" || st === "COMPLETATA";
            const pFloat = parseFloat(p.prezzoFinale) || 0;

            rigaTpl.querySelector(".idAssistenzaTesto").innerText = `#PREN-${p.id}`;
            rigaTpl.querySelector(".emailAssistenza").innerText = p.emailUtente;
            rigaTpl.querySelector(".mostraAssistenza").innerText = p.titoloEvento;
            rigaTpl.querySelector(".prezzoAssistenza").innerText = `€ ${pFloat.toFixed(2)}`;
            rigaTpl.querySelector(".postiAssistenza").innerText = `${p.numPosti} biglietti`;
            rigaTpl.querySelector(".statoAssistenza").innerText = st;

            const containerAzione = rigaTpl.querySelector(".azioneRevoca");
            if (puoAnnullare && isAttiva) {
                const btnAnnulla = rigaTpl.querySelector(".btnRevocaUfficio");
                btnAnnulla.addEventListener("click", async () => {
                    try {
                        const rH = await fetch(ADMIN_PREN_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ azione: "annulla", idPren: p.id })
                        });
                        if (!rH.ok) {
                            throw new Error(testoAnnullamento || "Impossibile revocare il titolo.");
                        }
                        mostraNotifica(testoAnnullamento, "success");
                        caricaInfrastrutturaAdmin();
                    } catch (e) {
                        mostraNotifica("Impossibile revocare il titolo.", "error");
                    }
                });
            } else {
                containerAzione.innerHTML = `<span style="color:#64748b; font-size:13px; font-style:italic;">${isAttiva ? 'Sola Lettura' : 'Archiviata'}</span>`;
            }

            tbody.appendChild(rigaTpl);
        }
    } catch (err) {
        if (err.name === 'AbortError') return;
        console.error("Errore registro assistenza:", err);
    }
}