package dao;

import java.math.BigDecimal;
import java.sql.*;
import java.sql.Date;
import java.util.*;
import java.time.*;

import config.ConnessioneDB;
import model.*;

public class EventoDAO {
    
    private List<Evento> estraiEventi(Integer id, String titolo, String luogo, BigDecimal prezzoMax) throws SQLException {
        List<Evento> lista = new ArrayList<>();
        StringBuilder sele = new StringBuilder("SELECT * FROM eventi WHERE 1=1"); // Con questa condizione evito controlli sul primo WHERE
        List<Object> param = new ArrayList<>();
        
        if (id != null) {
            sele.append(" AND id = ?");
            param.add(id);
        }
        
        if (titolo != null && !titolo.trim().isEmpty()) {
            String[] parole = titolo.trim().split("\\s+");
            for (String p : parole) {
                sele.append(" AND titolo LIKE ?");
                param.add("%" + p + "%");
            }
        }
        
        if (luogo != null && !luogo.trim().isEmpty()) {
            String[] paroleLuogo = luogo.trim().split("\\s+");
            for (String parola : paroleLuogo) {
                sele.append(" AND luogo LIKE ?");
                param.add("%" + parola + "%");
            }
        }
        
        if (prezzoMax != null) {
            sele.append(" AND prezzo <= ?");
            param.add(prezzoMax);
        }
        
        try (Connection connessione = ConnessioneDB.getConnection(); 
             PreparedStatement prepS = connessione.prepareStatement(sele.toString())) {

            for (int i = 0; i < param.size(); i++) {
                prepS.setObject(i + 1, param.get(i));
            }

            try (ResultSet res = prepS.executeQuery()) {
                while (res.next()) {
                    Date dataDB = res.getDate("DATA");
                    LocalDate d = (dataDB != null) ? dataDB.toLocalDate() : null;
                    
                    lista.add(new Evento(
                        res.getInt("id"),
                        res.getString("titolo"),
                        res.getString("descrizione"),
                        res.getString("tipo_evento"),
                        d,
                        res.getString("luogo"),
                        res.getInt("posti_totali"),
                        res.getInt("posti_disponibili"),
                        res.getBigDecimal("prezzo"),
                        res.getBoolean("pagamento_cassa")
                    ));
                }
            }
        }
        return lista;
    }
    
    public Evento getEventoById(int id) throws SQLException {
        if (id >= 0) {
            List<Evento> e = estraiEventi(id, null, null, null);
            if (!e.isEmpty()) return e.get(0);
        }
        return null;
    }
    
    public List<Evento> filtriEventi(String titolo, String luogo, BigDecimal prezzoMax) throws SQLException {
        return estraiEventi(null, titolo, luogo, prezzoMax);
    }
        
    public boolean setEvento(Evento e) throws SQLException {
        if (e == null) return false;

        String ins = "INSERT INTO eventi (titolo, descrizione, tipo_evento, data, luogo, posti_totali, posti_disponibili, prezzo, pagamento_cassa) "
                   + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement prepS = c.prepareStatement(ins)) {
            prepS.setString(1, e.getTitolo());
            prepS.setString(2, e.getDescrizione());
            prepS.setString(3, e.getTipoEvento());
            prepS.setDate(4, e.getData() != null ? Date.valueOf(e.getData()) : null);
            prepS.setString(5, e.getLuogo());
            prepS.setInt(6, e.getPostiTot());
            prepS.setInt(7, e.getPostiDisponibili());
            prepS.setBigDecimal(8, e.getPrezzo());
            prepS.setBoolean(9, e.isPagCassa());

            return prepS.executeUpdate() > 0;
        }
    }
    
    public boolean modificaEvento(Evento e) throws SQLException {
        if (e == null || e.getId() <= 0) return false;

        String upd = "UPDATE eventi SET titolo = ?, descrizione = ?, tipo_evento = ?, data = ?, luogo = ?, "
                   + "posti_totali = ?, posti_disponibili = ?, prezzo = ?, pagamento_cassa = ? WHERE id = ?";
        
        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement prepS = c.prepareStatement(upd)) {
            prepS.setString(1, e.getTitolo());
            prepS.setString(2, e.getDescrizione());
            prepS.setString(3, e.getTipoEvento());
            prepS.setDate(4, e.getData() != null ? Date.valueOf(e.getData()) : null);
            prepS.setString(5, e.getLuogo());
            prepS.setInt(6, e.getPostiTot());
            prepS.setInt(7, e.getPostiDisponibili());
            prepS.setBigDecimal(8, e.getPrezzo());
            prepS.setBoolean(9, e.isPagCassa());
            prepS.setInt(10, e.getId());
            
            return prepS.executeUpdate() > 0;
        }
    }
    
    public boolean eliminaEvento(int id) throws SQLException {
        if (id <= 0) return false;

        String elimina = "DELETE FROM eventi WHERE id = ?";
        try (Connection connessione = ConnessioneDB.getConnection(); PreparedStatement prepS = connessione.prepareStatement(elimina)) {
            prepS.setInt(1, id);
            return prepS.executeUpdate() > 0;
        }
    }
}
