window.arsNovaDebug = function (categoria, errore, contesto = {}) {
    console.error(`[ArsNova][${categoria}]`, { errore, contesto, timestamp: new Date().toISOString() });
};

window.addEventListener("error", (evento) => {
    window.arsNovaDebug("runtime", evento.error || evento.message, {
        file: evento.filename,
        line: evento.lineno,
        column: evento.colno
    });
});

window.addEventListener("unhandledrejection", (evento) => {
    window.arsNovaDebug("promise", evento.reason);
});

if (!window.__arsNovaFetchTracciata) {
    const arsNovaFetchOriginale = window.fetch.bind(window);
    window.fetch = async (...argomenti) => {
        try {
            const risposta = await arsNovaFetchOriginale(...argomenti);
            if (!risposta.ok) {
                arsNovaDebug("fetch-http", new Error(`HTTP ${risposta.status}`), {
                    url: String(argomenti[0]),
                    status: risposta.status
                });
            }
            return risposta;
        } catch (errore) {
            arsNovaDebug("fetch-rete", errore, { url: String(argomenti[0]) });
            throw errore;
        }
    };
    window.__arsNovaFetchTracciata = true;
}

document.addEventListener("DOMContentLoaded", () => {
    if (window.__arsNovaAnimazioniInizializzate) return;
    window.__arsNovaAnimazioniInizializzate = true;

    const container = document.getElementById('siparioContenitore');
    const uStr = sessionStorage.getItem("utenteCorrente");
    creaDrappeggi('tendaSinistra');
    creaDrappeggi('tendaDestra');
    generaGlitterCasuali();

    if (uStr) {
        const utente = JSON.parse(uStr);
        if (utente.ruolo === "ADMIN" || sessionStorage.getItem("siparioGiaAperto") === "true") {
            if (container) {
                container.style.display = 'none';
            }
            return;
        }
    }


    setTimeout(() => {
        if (container) {
            apriSiparioCompleto();
        }
        sessionStorage.setItem("siparioGiaAperto", "true");
    }, 1000);
});

function creaDrappeggi(idTenda) {
    const tenda = document.getElementById(idTenda);
    if (!tenda) return;

    const numeroStrisce = 8;

    for (let i = 0; i < numeroStrisce; i++) {
        const striscia = document.createElement('div');
        striscia.classList.add('strisciaTenda');
        const durataVento = (Math.random() * 2.5 + 4).toFixed(2);
        const ritardoVento = (Math.random() * -3).toFixed(2);
        const intensitaVento = (Math.random() * 0.8 + 0.5).toFixed(1);
        striscia.style.animationDuration = `${durataVento}s`;
        striscia.style.animationDelay = `${ritardoVento}s`;
        striscia.style.setProperty('--oscillazione', `${intensitaVento}deg`);

        tenda.appendChild(striscia);
    }
}

function apriSiparioCompleto() {
    const container = document.getElementById('siparioContenitore');
    if (!container) return;

    container.classList.remove('chiusuraSipario');
    container.classList.add('aperturaSipario');

    setTimeout(() => {
        if (container.classList.contains('aperturaSipario')) {
            container.style.display = 'none';
        }
    }, 2000);
}

function apriSiparioPerAuth() {
    const container = document.getElementById('siparioContenitore');
    const authBox = document.getElementById('authBox');
    if (!container || !authBox) return;

    container.style.display = 'flex';
    void container.offsetWidth;

    container.classList.remove('aperturaSipario');
    container.classList.add('chiusuraSipario');

    authBox.classList.add('visibile');
    mostraFormLogin();
    if (typeof applicaBottoneChiudiUniversale === "function") {
        applicaBottoneChiudiUniversale(authBox, "visibile");
    }
}

function mostraFormReg() {
    const fLogin = document.getElementById('moduloLoginSchema');
    const fReg = document.getElementById('moduloRegistrazioneSchema');
    const authBox = document.getElementById('authBox');
    
    if (fLogin) fLogin.classList.add('nascosto');
    if (fReg) fReg.classList.remove('nascosto');
    if (authBox && typeof applicaBottoneChiudiUniversale === "function") {
        applicaBottoneChiudiUniversale(authBox, "visibile");
    }
}

function mostraFormLogin() {
    const fLogin = document.getElementById('moduloLoginSchema');
    const fReg = document.getElementById('moduloRegistrazioneSchema');
    const authBox = document.getElementById('authBox');
    
    if (fReg) fReg.classList.add('nascosto');
    if (fLogin) fLogin.classList.remove('nascosto');
    if (authBox && typeof applicaBottoneChiudiUniversale === "function") {
        applicaBottoneChiudiUniversale(authBox, "visibile");
    }
}

function chiudiAuthERiapriSipario() {
    const authBox = document.getElementById('authBox');
    if (authBox) authBox.classList.remove('visibile');

    setTimeout(() => {
        apriSiparioCompleto();
    }, 4000);
}

function annullaAutenticazione() {
    if (sessionStorage.getItem("utenteCorrente")) {
        return;
    }

    const authBox = document.getElementById('authBox');
    if (authBox) {
        authBox.classList.remove('visibile');
    }

    setTimeout(() => {
        apriSiparioCompleto();
        mostraNotifica("Accesso annullato. Benvenuto nella galleria!");
        if (typeof mostraPagina === "function") {
            mostraPagina("paginaMostre");
        }
        if (typeof caricaCatalogoMostre === "function") {
            caricaCatalogoMostre();
        }
    }, 300);
}


function generaGlitterCasuali() {
    const parete = document.querySelector('.pareteFondo');
    if (!parete) return;

    const numeroGlitter = 400;
    for (let i = 0; i < numeroGlitter; i++) {
        const glitter = document.createElement('div');
        glitter.classList.add('scintilla');
        
        glitter.style.left = `${(Math.random() * 100).toFixed(2)}%`;
        glitter.style.top = `${(Math.random() * 100).toFixed(2)}%`;

        const dimMinima = 0.4;
        const dimMassima = 0.69;
        const tonalita = Math.floor(Math.random() * 360);
        const scalaRaggioX = (Math.random() * 0.6 + 0.8).toFixed(2);
        const scalaRaggioY = (Math.random() * 0.6 + 0.8).toFixed(2);
        const angoloRotazione = Math.floor(Math.random() * 360);
        const tempoMinimo = 3.0;
        const tempoMassimo = 5;
        const durataVita = (Math.random() * (tempoMassimo - tempoMinimo) + tempoMinimo).toFixed(2);
        const ritardoVita = (Math.random() * -4).toFixed(2);
        glitter.style.setProperty('--colore-glitter', `hsl(${tonalita}, 100%, 70%)`);

        const dimensioneCasuale = (Math.random() * (dimMassima - dimMinima) + dimMinima).toFixed(3);

        glitter.style.setProperty('--rotazione-glitter', `${angoloRotazione}deg`);
        glitter.style.setProperty('--scala-raggio-x', scalaRaggioX);
        glitter.style.setProperty('--scala-raggio-y', scalaRaggioY);
        glitter.style.width = `${dimensioneCasuale}px`;
        glitter.style.height = `${dimensioneCasuale}px`;
        glitter.style.transform = `rotate(var(--rotazione-glitter)) scale(0.5)`;
        glitter.style.animation = `brillioAscensoreGlitter ${durataVita}s ease-in-out ${ritardoVita}s infinite`;
        glitter.addEventListener('animationiteration', () => {
            glitter.style.left = `${(Math.random() * 100).toFixed(2)}%`;
            glitter.style.top = `${(Math.random() * 100).toFixed(2)}%`;
            const nuovaDimensione = (Math.random() * (dimMassima - dimMinima) + dimMinima).toFixed(3);

            glitter.style.setProperty('--colore-glitter', `hsl(${tonalita}, 60%, 92%)`);
            glitter.style.setProperty('--rotazione-glitter', `${angoloRotazione}deg`);
            glitter.style.setProperty('--scala-raggio-x', scalaRaggioX);
            glitter.style.setProperty('--scala-raggio-y', scalaRaggioX);

            glitter.style.width = `${nuovaDimensione}px`;
            glitter.style.height = `${nuovaDimensione}px`;
        });

        parete.appendChild(glitter);
    }
}

function apriModal() {
    const modal = document.getElementById('customModale');
    if (!modal) return;
    modal.classList.remove('nascosto');
    modal.style.opacity = '0';
    void modal.offsetWidth;
    modal.style.transition = 'opacity 0.4s ease';
    modal.style.opacity = '1';
}

function chiudiModal() {
    const modal = document.getElementById('customModale');
    if (!modal) return;
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.classList.add('nascosto');
        document.getElementById('modaleDinamicaCorpo').innerHTML = '';
    }, 4000);
}

function mostraNotifica(messaggio, tipo = 'success') {
    const container = document.getElementById('notificheContenitore');
    if (!container) {
        console.warn("[Notifica] Contenitore #notificheContenitore non trovato. Messaggio:", messaggio);
        return;
    }

    const toast = document.createElement('div');
    
    const classeTipo = (tipo === 'error' || tipo === 'errore') ? 'errore' : 'success';
    toast.className = `custom-toast ${classeTipo}`;

    toast.innerHTML = `<span class="testoNotifica">${messaggio}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transform = 'translateY(20px)';
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById('siparioContenitore');

    window.addEventListener('scroll', () => {
        if (container && container.style.display !== 'none') return;

        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        
        if (docHeight <= 0) return;
        
        const scrollPercent = scrollTop / docHeight;

        const minSize = 60; 
        const maxSize = 100; 
        const currentSize = minSize + (scrollPercent * (maxSize - minSize));
        
        document.documentElement.style.setProperty('--dimensione-maniglia', `${currentSize}%`);
    });
});

function inizializzaScrollbarStickyUniversali() {
    const wrappers = document.querySelectorAll('.contenitoreTabella');
    
    wrappers.forEach((wrapperReale) => {
        const wrapperId = wrapperReale.id || "wrapper-anonimo-" + Math.random().toString(36).substr(2, 9);
        if (!wrapperReale.id) wrapperReale.id = wrapperId;

        const cloneId = "sticky-clone-for-" + wrapperId;
        
        if (document.getElementById(cloneId)) {
            const barraEsistente = document.getElementById(cloneId);
            const fintoContenuto = barraEsistente.querySelector('.contenutoScorrimento');
            if (fintoContenuto) {
                fintoContenuto.style.width = `${wrapperReale.scrollWidth}px`;
            }
            return;
        }

        const fintaBarraContainer = document.createElement('div');
        fintaBarraContainer.id = cloneId;
        fintaBarraContainer.className = 'barraScorrimento';

        const fintoContenuto = document.createElement('div');
        fintoContenuto.className = 'contenutoScorrimento';
        fintaBarraContainer.appendChild(fintoContenuto);
        
        document.body.appendChild(fintaBarraContainer);

        function adattaMeccanicaEPosizione() {
            fintoContenuto.style.width = `${wrapperReale.scrollWidth}px`;

            const rect = wrapperReale.getBoundingClientRect();
            const altezzaFinestra = window.innerHeight;

            if (rect.top < altezzaFinestra && rect.bottom > 0) {
                fintaBarraContainer.style.setProperty('display', 'block', 'important');
                fintaBarraContainer.style.position = 'fixed';
                fintaBarraContainer.style.left = `${rect.left}px`;
                fintaBarraContainer.style.width = `${rect.width}px`;
                fintaBarraContainer.style.top = 'auto';
                fintaBarraContainer.style.bottom = '0';
                const maxScrollReale = wrapperReale.scrollWidth - wrapperReale.clientWidth;
                const maxScrollFinto = fintaBarraContainer.scrollWidth - fintaBarraContainer.clientWidth;
                if (maxScrollReale > 0 && maxScrollFinto > 0) {
                    const percentuale = wrapperReale.scrollLeft / maxScrollReale;
                    fintaBarraContainer.scrollLeft = percentuale * maxScrollFinto;
                }
            } else {
                fintaBarraContainer.style.setProperty('display', 'none', 'important');
            }
        }

        adattaMeccanicaEPosizione();
        window.addEventListener('scroll', adattaMeccanicaEPosizione, { passive: true });
        window.addEventListener('resize', adattaMeccanicaEPosizione);
        
        document.querySelectorAll('#globaleAdmin, .pagina, #pannelloRegistro, #pannelloAssistenza').forEach(el => {
            el.addEventListener('scroll', adattaMeccanicaEPosizione, { passive: true });
        });

        fintaBarraContainer.addEventListener('mouseenter', adattaMeccanicaEPosizione);
        fintaBarraContainer.addEventListener('mousedown', adattaMeccanicaEPosizione);
        wrapperReale.addEventListener('mouseenter', adattaMeccanicaEPosizione);

        let inibisciEventi = false;

        fintaBarraContainer.addEventListener('scroll', () => {
            if (inibisciEventi) return;
            
            const maxScrollFinto = fintaBarraContainer.scrollWidth - fintaBarraContainer.clientWidth;
            const maxScrollReale = wrapperReale.scrollWidth - wrapperReale.clientWidth;
            
            if (maxScrollFinto > 0 && maxScrollReale > 0) {
                inibisciEventi = true;
                const percentuale = fintaBarraContainer.scrollLeft / maxScrollFinto;
                wrapperReale.scrollLeft = percentuale * maxScrollReale;
                requestAnimationFrame(() => { inibisciEventi = false; });
            }
        });
        wrapperReale.addEventListener('scroll', () => {
            if (inibisciEventi) return;

            const maxScrollFinto = fintaBarraContainer.scrollWidth - fintaBarraContainer.clientWidth;
            const maxScrollReale = wrapperReale.scrollWidth - wrapperReale.clientWidth;
            if (maxScrollFinto > 0 && maxScrollReale > 0) {
                inibisciEventi = true;
                const percentuale = wrapperReale.scrollLeft / maxScrollReale;
                fintaBarraContainer.scrollLeft = percentuale * maxScrollFinto;
                requestAnimationFrame(() => { inibisciEventi = false; });
            }
        });
    });
}

function applicaBottoneChiudiUniversale(elementoPadreDaChiudere, classeCSSRimozione = "quadro-aperto") {
    const vecchioBottone = document.getElementById("btnChiudiDinamicoGlobale");
    if (vecchioBottone) vecchioBottone.remove();

    const btnChiudi = document.createElement("div");
    btnChiudi.id = "btnChiudiDinamicoGlobale";
    btnChiudi.className = "btnChiudiFisso";
    btnChiudi.setAttribute("role", "button");
    btnChiudi.setAttribute("aria-label", "Chiudi");

    btnChiudi.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (elementoPadreDaChiudere) {
            elementoPadreDaChiudere.classList.remove(classeCSSRimozione);
            if (elementoPadreDaChiudere.id === "authBox") {
                elementoPadreDaChiudere.classList.remove("visibile");
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
                }, 100);
            } else if (classeCSSRimozione === "visibile" || elementoPadreDaChiudere.id === "customModale" || elementoPadreDaChiudere.id === "modaleEventoCrud") {
                elementoPadreDaChiudere.classList.add("nascosto", "nascosto");
                elementoPadreDaChiudere.style.setProperty("display", "none", "important");
            } else if (classeCSSRimozione === "aperto" && typeof chiudiDettaglioMostra === "function") {
                chiudiDettaglioMostra(elementoPadreDaChiudere);
            }
        }
        
        btnChiudi.remove();
    });

    document.body.appendChild(btnChiudi);
}


function rimuoviBottoneChiudiUniversale() {
    const btnChiudi = document.getElementById("btnConfermaDinamicaGlobale") || document.getElementById("btnChiudiDinamicoGlobale");
    if (btnChiudi) btnChiudi.remove();
}
