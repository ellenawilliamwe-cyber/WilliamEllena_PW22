package dao;

import java.math.BigDecimal;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import config.ConnessioneDB;
import model.PrenDettAdmin;
import model.Prenotazione;

public class PrenotazioneDAO {

    private final PagamentoDAO pagDAO = new PagamentoDAO(); 

    public boolean prenota(int idUtente, int idEvento, int nPostiPren, String metodoPagamento, BigDecimal prezzoFinale, String notePagamento, String statoPren) throws SQLException {
        String sele = "SELECT posti_disponibili FROM eventi WHERE id = ? FOR UPDATE";
        Connection c = null; 
        String statoPagCalc = "COMPLETATO"; 
        String statoBiglietto = "COMPLETATA";
        
        if (statoPren != null) {
            String confr = statoPren.trim().toUpperCase();
            if ("ATTIVA".equals(confr)) {
                statoBiglietto = "ATTIVA";
                statoPagCalc = "IN_ATTESA";
            } else if ("ANNULLATA".equals(confr) || "ANNULLATO".equals(confr)) {
                statoBiglietto = "ANNULLATA";
            }
        }
        
        try {
            c = ConnessioneDB.getConnection();            
            c.setAutoCommit(false);

            try (PreparedStatement prep = c.prepareStatement(sele)) {
                prep.setInt(1, idEvento);
                try (ResultSet res = prep.executeQuery()) {
                    if (!res.next() || res.getInt("posti_disponibili") < nPostiPren) {
                        c.rollback(); 
                        return false;
                    }
                }
            }
            
            String ins = "INSERT INTO prenotazioni (id_utente, id_evento, data_prenotazione, stato, metodo_pagamento, prezzo_finale, numero_posti) VALUES (?, ?, ?, ?, ?, ?, ?)";
            int idPren = -1;
            
            try (PreparedStatement prep = c.prepareStatement(ins, Statement.RETURN_GENERATED_KEYS)) {
                prep.setInt(1, idUtente);
                prep.setInt(2, idEvento);
                prep.setTimestamp(3, Timestamp.valueOf(LocalDateTime.now()));
                prep.setString(4, statoBiglietto);
                prep.setString(5, metodoPagamento);
                prep.setBigDecimal(6, prezzoFinale);
                prep.setInt(7, nPostiPren); 
                prep.executeUpdate();

                try (ResultSet res = prep.getGeneratedKeys()) {
                    if (res.next()) idPren = res.getInt(1);
                }
            }

            if (idPren == -1) {
                c.rollback(); 
                return false;
            }
            
            if (!pagDAO.registraPagamento(c, idPren, idUtente, prezzoFinale, metodoPagamento, statoPagCalc, notePagamento)) {
                c.rollback(); 
                return false;
            }

            if (!aggPostiDB(c, idEvento)) {
                c.rollback(); 
                return false;
            }

            c.commit(); 
            return true;

        } catch (SQLException ex) {
            if (c != null) { try { c.rollback(); } catch (SQLException e) { e.printStackTrace(); } }
            throw ex;
        } finally {
            if (c != null) { try { c.setAutoCommit(true); c.close(); } catch (SQLException e) { e.printStackTrace(); } }
        }
    }

    //Aggiorna il DB
    public boolean aggPostiDB(Connection c, int idEvento) throws SQLException {
        String seleConto = "SELECT SUM(p.numero_posti) AS totali_venduti " +
                              "FROM prenotazioni p " +
                              "JOIN pagamento pag ON p.id = pag.id_prenotazione " +
                              "WHERE p.id_evento = ? " +
                              "AND pag.stato_pagamento IN ('COMPLETATO', 'IN_ATTESA')";
        
        String seleEv = "SELECT posti_totali FROM eventi WHERE id = ?";
        
        String upd = "UPDATE eventi SET posti_disponibili = ? WHERE id = ?";

        int postiVen = 0;
        int postiTot = 0;

        try (PreparedStatement prepCount = c.prepareStatement(seleConto)) {
            prepCount.setInt(1, idEvento);
            try (ResultSet resCount = prepCount.executeQuery()) {
                if (resCount.next()) {
                    postiVen = resCount.getInt("totali_venduti");
                    if (resCount.wasNull()) postiVen = 0;
                }
            }
        }

        try (PreparedStatement prepInfo = c.prepareStatement(seleEv)) {
            prepInfo.setInt(1, idEvento);
            try (ResultSet resInfo = prepInfo.executeQuery()) {
                if (resInfo.next()) {
                    postiTot = resInfo.getInt("posti_totali");
                } else {
                    return false;
                }
            }
        }

        int nPostiDisp = postiTot - postiVen;
        if (nPostiDisp < 0) nPostiDisp = 0;

        try (PreparedStatement prepUpd = c.prepareStatement(upd)) {
            prepUpd.setInt(1, nPostiDisp);
            prepUpd.setInt(2, idEvento);
            prepUpd.executeUpdate();
        }

        return true;
    }
    
    public boolean annullaPren(int idPren) throws SQLException {
        String sele = "SELECT id_evento, numero_posti, stato FROM prenotazioni WHERE id = ?"; 
        Connection c = null;
        
        try {
            c = ConnessioneDB.getConnection();
            c.setAutoCommit(false);

            int idEv = -1;
            int aggPosti = 0;
            String vecchioStato = "";

            try (PreparedStatement prep = c.prepareStatement(sele)) {
                prep.setInt(1, idPren);
                try (ResultSet res = prep.executeQuery()) {
                    if (!res.next()) {
                        c.rollback(); 
                        return false;
                    }
                    idEv = res.getInt("id_evento");
                    vecchioStato = res.getString("stato");
                    aggPosti = res.getInt("numero_posti");
                    if (res.wasNull()) aggPosti = 1; 
                }
            }

            if ("ANNULLATA".equalsIgnoreCase(vecchioStato)) {
                c.rollback(); 
                return false;
            }
            
            String updPren = "UPDATE prenotazioni SET stato = 'ANNULLATA' WHERE id = ?";
            try (PreparedStatement prep = c.prepareStatement(updPren)) {
                prep.setInt(1, idPren); 
                prep.executeUpdate();
            }
            
            String updEv = "UPDATE eventi SET posti_disponibili = posti_disponibili + ? WHERE id = ?";
            try (PreparedStatement prep = c.prepareStatement(updEv)) {
                prep.setInt(1, aggPosti); 
                prep.setInt(2, idEv);
                prep.executeUpdate();
            }

            if (!pagDAO.aggiornaStatoPagamento(c, idPren, "Rimborsato")) {
                c.rollback(); 
                return false;
            }
            c.commit(); 
            return true;

        } catch (SQLException ex) {
            if (c != null) {
                try { c.rollback(); } catch (SQLException e) { e.printStackTrace(); }
            }
            throw ex;
        } finally {
            if (c != null) {
                try { c.setAutoCommit(true); c.close(); } catch (SQLException e) { e.printStackTrace(); }
            }
        }
    }
    
    public List<Prenotazione> prenUtente(int idUtente) throws SQLException {
        List<Prenotazione> lista = new ArrayList<>();
        String comd = "SELECT p.*, e.titolo AS evento_titolo FROM prenotazioni p "
                    + "INNER JOIN eventi e ON p.id_evento = e.id WHERE p.id_utente = ?";

        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement prep = c.prepareStatement(comd)) {
            prep.setInt(1, idUtente);
            try (ResultSet res = prep.executeQuery()) {
                while (res.next()) {
                    Timestamp t = res.getTimestamp("data_prenotazione");
                    LocalDateTime dataPren = (t != null) ? t.toLocalDateTime() : null;

                    lista.add(new Prenotazione(
                        res.getInt("id"),
                        res.getInt("id_utente"),
                        res.getInt("id_evento"),
                        dataPren,
                        res.getString("stato"),
                        res.getString("metodo_pagamento"),
                        res.getBigDecimal("prezzo_finale"),
                        res.getInt("numero_posti"),
                        res.getString("evento_titolo") 
                    ));
                }
            }
        }
        return lista;
    }

    public List<Prenotazione> listaPren() throws SQLException {
        List<Prenotazione> lista = new ArrayList<>();
        String sel = "SELECT p.id, p.id_utente, p.id_evento, p.data_prenotazione, p.stato, p.metodo_pagamento, "
                   + "pag.importo AS prezzo_finale, p.numero_posti, e.titolo AS evento_titolo FROM prenotazioni p "
                   + "INNER JOIN pagamento pag ON p.id = pag.id_prenotazione "
                   + "INNER JOIN eventi e ON p.id_evento = e.id "
                   + "ORDER BY p.id DESC";  

        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement prep = c.prepareStatement(sel);
             ResultSet res = prep.executeQuery()) {
            
            while (res.next()) {
                Timestamp t = res.getTimestamp("data_prenotazione");
                LocalDateTime dataPren = (t != null) ? t.toLocalDateTime() : null;
                
                lista.add(new Prenotazione(
                    res.getInt("id"),
                    res.getInt("id_utente"),
                    res.getInt("id_evento"),
                    dataPren,
                    res.getString("stato"),
                    res.getString("metodo_pagamento"),
                    res.getBigDecimal("prezzo_finale"),
                    res.getInt("numero_posti"),
                    res.getString("evento_titolo")
                ));
            }
        }
        return lista;
    }

    public List<PrenDettAdmin> prenGestibili(String email, String cercaEvento) throws SQLException {
        List<PrenDettAdmin> lista = new ArrayList<>();
        
        String queryBase = "SELECT p.id, u.email AS utente_email, e.titolo AS evento_titolo, "
                         + "pag.importo AS prezzo_fiscale, p.numero_posti, p.stato "
                         + "FROM prenotazioni p "
                         + "INNER JOIN utenti u ON p.id_utente = u.id "
                         + "INNER JOIN eventi e ON p.id_evento = e.id "
                         + "LEFT JOIN pagamento pag ON p.id = pag.id_prenotazione "
                         + "WHERE 1=1";

        if (email != null && !email.trim().isEmpty()) {
            queryBase += " AND u.email LIKE ?";
        }
        if (cercaEvento != null && !cercaEvento.trim().isEmpty()) {
            queryBase += " AND e.titolo LIKE ?";
        }
        
        queryBase += " ORDER BY p.id DESC";

        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement prep = c.prepareStatement(queryBase)) {
            int indiceParametro = 1;
            
            if (email != null && !email.trim().isEmpty()) {
                prep.setString(indiceParametro++, "%" + email.trim() + "%");
            }
            if (cercaEvento != null && !cercaEvento.trim().isEmpty()) {
                prep.setString(indiceParametro++, "%" + cercaEvento.trim() + "%");
            }

            try (ResultSet res = prep.executeQuery()) {
                while (res.next()) {
                    BigDecimal prezzo = res.getBigDecimal("prezzo_fiscale");
                    if (prezzo == null) prezzo = BigDecimal.ZERO;
                    
                    lista.add(new PrenDettAdmin(
                        res.getInt("id"),
                        res.getString("utente_email"),
                        res.getString("evento_titolo"),
                        prezzo,
                        res.getInt("numero_posti"),
                        res.getString("stato")
                    ));
                }
            }
        }
        return lista;
    }
    
    public Prenotazione getPrenotazioneById(int id) throws SQLException {
        String sele = "SELECT id, id_utente, id_evento, numero_posti, stato FROM prenotazioni WHERE id = ?";
        
        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement prep = c.prepareStatement(sele)) {
            prep.setInt(1, id);
            try (ResultSet res = prep.executeQuery()) {
                if (res.next()) {
                    Prenotazione p = new Prenotazione();
                    p.setId(res.getInt("id"));
                    p.setIdUtente(res.getInt("id_utente"));
                    p.setIdEvento(res.getInt("id_evento"));
                    p.setNumeroPosti(res.getInt("numero_posti"));
                    p.setStato(res.getString("stato"));
                    return p;
                }
            }
        } 
        return null;
    }
}

