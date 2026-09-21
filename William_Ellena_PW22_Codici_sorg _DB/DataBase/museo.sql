-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://phpmyadmin.net
--
-- Host: 127.0.0.1
-- Creato il: Set 19, 2026 alle 15:46
-- Versione del server: 10.4.32-MariaDB
-- Versione PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `museo`
--

-- --------------------------------------------------------

--
-- Struttura della tabella `eventi`
--

CREATE TABLE `eventi` (
  `id` int(11) NOT NULL,
  `titolo` varchar(100) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `tipo_evento` varchar(50) DEFAULT NULL,
  `DATA` date NOT NULL,
  `luogo` varchar(100) DEFAULT NULL,
  `posti_totali` int(11) NOT NULL,
  `posti_disponibili` int(11) NOT NULL,
  `prezzo` decimal(8,2) NOT NULL,
  `pagamento_cassa` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `pagamento`
--

CREATE TABLE `pagamento` (
  `id` int(11) NOT NULL,
  `id_prenotazione` int(11) NOT NULL,
  `id_utente` int(11) NOT NULL,
  `importo` decimal(8,2) NOT NULL,
  `metodo_pagamento` varchar(50) NOT NULL,
  `data_pagamento` datetime NOT NULL,
  `stato_pagamento` enum('IN_ATTESA','COMPLETATO','FALLITO','RIMBORSATO') NOT NULL DEFAULT 'IN_ATTESA',
  `codice_transazione` varchar(50) DEFAULT NULL,
  `note` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `prenotazioni`
--

CREATE TABLE `prenotazioni` (
  `id` int(11) NOT NULL,
  `id_utente` int(11) DEFAULT NULL,
  `id_evento` int(11) NOT NULL,
  `data_prenotazione` datetime NOT NULL,
  `stato` enum('ATTIVA','ANNULLATA','COMPLETATA') NOT NULL,
  `metodo_pagamento` varchar(50) NOT NULL,
  `prezzo_finale` decimal(10,2) NOT NULL,
  `numero_posti` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `utenti`
--

CREATE TABLE `utenti` (
  `id` int(11) NOT NULL,
  `nome` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ruolo` enum('ADMIN','UTENTE') NOT NULL,
  `studente` tinyint(1) DEFAULT 0,
  `data_nascita` date DEFAULT NULL,
  `sesso` enum('M','F','ALTRO','') DEFAULT NULL,
  `permessi` enum('LETTURA','TOTALE','MODERATORE') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `eventi`
--
ALTER TABLE `eventi`
  ADD PRIMARY KEY (`id`);

--
-- Indici per le tabelle `pagamento`
--
ALTER TABLE `pagamento`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pagamento_utente` (`id_utente`),
  ADD KEY `fk_pagamento_prenotazione` (`id_prenotazione`);

--
-- Indici per le tabelle `prenotazioni`
--
ALTER TABLE `prenotazioni`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_prenotazioni_eventi` (`id_evento`),
  ADD KEY `fk_prenotazioni_utenti` (`id_utente`);

--
-- Indici per le tabelle `utenti`
--
ALTER TABLE `utenti`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT per le tabelle scaricate
--

--
-- AUTO_INCREMENT per la tabella `eventi`
--
ALTER TABLE `eventi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `pagamento`
--
ALTER TABLE `pagamento`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `prenotazioni`
--
ALTER TABLE `prenotazioni`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT per la tabella `utenti`
--
ALTER TABLE `utenti`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `pagamento`
--
ALTER TABLE `pagamento`
  ADD CONSTRAINT `fk_pagamento_prenotazione` FOREIGN KEY (`id_prenotazione`) REFERENCES `prenotazioni` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pagamento_utente` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id`) ON DELETE CASCADE;

--
-- Limiti per la tabella `prenotazioni`
--
ALTER TABLE `prenotazioni`
  ADD CONSTRAINT `fk_prenotazioni_eventi` FOREIGN KEY (`id_evento`) REFERENCES `eventi` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_prenotazioni_utenti` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
