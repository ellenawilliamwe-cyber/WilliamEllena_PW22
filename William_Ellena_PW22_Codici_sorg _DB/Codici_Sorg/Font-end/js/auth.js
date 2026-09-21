const AUTH_API_URL = "http://127.0.0.1:8080/PW22_museo/api/autenticazione";

function chiediConfermaMuseo(messaggio) {
    return new Promise((resolve) => {
        const vecchiaModal = document.getElementById('modaleConfermaDinamicaGlobale');
        if (vecchiaModal) vecchiaModal.remove();

        const modalCont = document.createElement('div');
        modalCont.id = 'modaleConfermaDinamicaGlobale';
        modalCont.className = 'backdropConfermaGlobale';

        const scrigno = document.createElement('div');
        scrigno.className = 'scrignoConfermaContenuto';

        scrigno.innerHTML = `
            <h3 class="titoloOro" style="text-align:center; margin-bottom:1.5rem; font-family:'Cinzel', serif; color:#ffe89e; text-transform:uppercase; letter-spacing:0.8px;">Richiesta di Conferma</h3>
            <p style="font-family:'Georgia', serif; color:#e2d7c5; text-align:center; line-height:1.6; margin-bottom:2.5rem; font-size:1rem;">${messaggio}</p>
            <div style="display:flex; gap:20px; justify-content:center; flex-wrap:wrap; width:100%;">
                <button id="dynBtnAnnulla" class="btnIndietro" style="height:44px; padding:0 24px; cursor:pointer; background:transparent; border:1px solid #d4af37; color:#e2d7c5; font-family:'Cinzel', serif; font-weight:700; text-transform:uppercase; border-radius:6px;">Annulla</button>
                <button id="dynBtnConferma" class="btnPagamento" style="height:44px; padding:0 28px; cursor:pointer; background:linear-gradient(135deg, #b32d38 0%, #7a1b22 100%); border:1px solid #d4af37; color:#fff; font-family:'Cinzel', serif; font-weight:700; text-transform:uppercase; border-radius:6px;">Conferma</button>
            </div>
        `;

        modalCont.appendChild(scrigno);
        document.body.appendChild(modalCont);

        document.getElementById('dynBtnAnnulla').onclick = function(e) {
            e.preventDefault();
            modalCont.remove();
            resolve(false);
        };

        document.getElementById('dynBtnConferma').onclick = function(e) {
            e.preventDefault();
            modalCont.remove();
            resolve(true);
        };
    });
}



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

    if (fLogin) {
        
        fLogin.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!fLogin.checkValidity()) {
                arsNovaDebug("form-login", new Error("Validazione login fallita"), { tipo: "validazione" });
                fLogin.reportValidity();
                return;
            }

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
                        pw: pw
                    })
                });

                if (!risp.ok) {
                    const messaggioErrore = await risp.text();
                    throw new Error(messaggioErrore || "Credenziali errate.");
                }

                const uLog = await risp.json();
                sessionStorage.setItem("utenteCorrente", JSON.stringify(uLog));

                mostraNotifica(`Benvenuto ${uLog.nome}`, "success");

                aggiornaNavbar();
                const authBox = document.getElementById('authBox');
                if (authBox) {
                    authBox.classList.remove('visibile');
                }
                setTimeout(() => {
                    if (typeof apriSiparioCompleto === "function") {
                        apriSiparioCompleto();
                    }
                    if (typeof caricaCatalogoMostre === "function") {
                        caricaCatalogoMostre();
                    }
                    if (typeof mostraPagina === "function") {
                        mostraPagina("paginaMostre");
                    }
                }, 200);

            } catch (err) {
                arsNovaDebug("form-login", err, { email: em, tipo: "invio-login" });
                mostraNotifica(err.message, "error");
            }
        });
    }

    if (fReg) {
        fReg.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!fReg.checkValidity()) {
                arsNovaDebug("form-registrazione", new Error("Validazione registrazione fallita"), { tipo: "validazione" });
                fReg.reportValidity();
                return;
            }

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
                    throw new Error(messaggioErrore || "Registrazione respinta dal server.");
                }

                const uLog = await risp.json();
                sessionStorage.setItem("utenteCorrente", JSON.stringify(uLog));

                mostraNotifica("Iscrizione completata con successo.", "success");
                fReg.reset();

                aggiornaNavbar();
                const authBox = document.getElementById('authBox');
                if (authBox) {
                    authBox.classList.remove('visibile');
                }
                setTimeout(() => {
                    sessionStorage.setItem("siparioGiaAperto", "true");

                    if (typeof apriSiparioCompleto === "function") {
                        apriSiparioCompleto();
                    }
                    if (typeof caricaCatalogoMostre === "function") {
                        caricaCatalogoMostre();
                    }
                    if (typeof mostraPagina === "function") {
                        mostraPagina("paginaMostre");
                    }
                }, 200);

            } catch (err) {
                arsNovaDebug("form-registrazione", err, { email: dati.email, tipo: "invio-registrazione" });
                mostraNotifica(err.message, "error");
            }
        });
    }

    const pulsantiLogoutApp = document.querySelectorAll("#btnLogoutClick, #btnLogoutAdminClick, #btn-logout-rosso, .btnLogout, .btnLogoutTeatrale");

    pulsantiLogoutApp.forEach(btn => {
        btn.addEventListener("click", (e) => {
            if (btn.id === "btnLogoutAdminClick") {
                return;
            }
            e.preventDefault();

            if (typeof logoutSignalController !== "undefined") {
                logoutSignalController.abort();
            }

            sessionStorage.removeItem("utenteCorrente");
            sessionStorage.removeItem("ultimoRadioCheckedAdmin");
            sessionStorage.removeItem("ultimaPaginaAdminAttiva");
            sessionStorage.removeItem("ultimoTriggerAdminAttivo");
            sessionStorage.removeItem("siparioGiaAperto")

            mostraNotifica("Sessione chiusa. Torna a trovarci!", "info");
            setTimeout(() => { window.location.reload(); }, 1200);
        });
    });

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

