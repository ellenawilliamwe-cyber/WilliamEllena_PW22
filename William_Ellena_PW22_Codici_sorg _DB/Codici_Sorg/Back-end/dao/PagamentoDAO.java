package dao;

import java.math.BigDecimal;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.UUID;

public class PagamentoDAO {

    public boolean registraPagamento(Connection conn, int idPrenotazione, int idUtente, BigDecimal importo, String metodoPagamento, String statoPag, String note) throws SQLException {
        String ins = "INSERT INTO pagamento (id_prenotazione, id_utente, importo, metodo_pagamento, data_pagamento, stato_pagamento, codice_transazione, note) "
                   + "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        String cod = "TX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        try (PreparedStatement prep = conn.prepareStatement(ins)) {
             prep.setInt(1, idPrenotazione);
             prep.setInt(2, idUtente);
             prep.setBigDecimal(3, importo);
             prep.setString(4, metodoPagamento);
             prep.setTimestamp(5, Timestamp.valueOf(LocalDateTime.now()));
             
             if (statoPag!=null) prep.setString(6, statoPag.trim().toUpperCase());
             else
            	 prep.setString(6, "IN_ATTESA");
             prep.setString(7, cod);
            
            if (note != null && !note.trim().isEmpty()) {
                prep.setString(8, note);
            } else {
                prep.setNull(8, Types.VARCHAR);
            }

            return prep.executeUpdate() > 0;
        }
    }
    
    public boolean aggiornaStatoPagamento(Connection c, int idPren, String modStato) throws SQLException {
        String upd = "UPDATE pagamento SET stato_pagamento = ? WHERE id_prenotazione = ?";
        
        try (PreparedStatement prep = c.prepareStatement(upd)) {
            prep.setString(1, modStato);
            prep.setInt(2, idPren);
            return prep.executeUpdate() > 0;
        }
    }
}