package dao;

import java.sql.*;
import java.time.*;
import java.util.ArrayList;
import java.util.List;

import org.mindrot.jbcrypt.BCrypt;

import config.ConnessioneDB;
import model.*;

public class UtenteDAO {
	
    public boolean registraUtente(Utente u) {
        if (u == null || u.getNome() == null || u.getNome().trim().isEmpty() ||
            u.getDataNascita() == null || u.getEmail() == null || 
            u.getEmail().trim().isEmpty() || u.getPassword() == null || u.getPassword().trim().isEmpty()) {
                System.out.println("Campi obbligatori mancanti.");
                return false;
        }
        
        int annoCorrente = LocalDate.now().getYear();
        int annoNascita = u.getDataNascita().getYear();
        if ((annoCorrente - annoNascita) <= 14) {// Controllo età
            System.out.println("Età troppo bassa."); 
            return false;
        }
        
        if (confrEmail(u.getEmail())) {
            System.out.println("Email già in uso."); 
            return false;
        }
        if (!controlloPW(u.getPassword())) {
            System.out.println("Password debole."); 
            return false;
        }
        
        String ins = "INSERT INTO utenti (nome, email, password_hash, ruolo, permessi, studente, data_nascita, sesso) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        String hash = BCrypt.hashpw(u.getPassword(), BCrypt.gensalt());
        
        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement p = c.prepareStatement(ins)) {
            p.setString(1, u.getNome().trim());
            p.setString(2, u.getEmail().trim().toLowerCase());
            p.setString(3, hash);
            p.setString(4, u.getRuolo() != null ? u.getRuolo().name() : "UTENTE");
            p.setNull(5, Types.VARCHAR);
            p.setBoolean(6, u.isStudente());
            
            long ms = Instant.from(u.getDataNascita().atStartOfDay(ZoneId.systemDefault())).toEpochMilli();
            p.setDate(7, new Date(ms));
            
            p.setString(8, u.getSesso() != null ? u.getSesso().trim().toUpperCase() : "ALTRO");

            return p.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Errore inserimento utente: " + e.getMessage());
        }
        return false;
    }
    
    public boolean registraAdmin(Admin a) {
        if (a == null || a.getNome() == null || a.getNome().trim().isEmpty() ||
    	    a.getEmail() == null || a.getEmail().trim().isEmpty() ||
    	    a.getPassword() == null || a.getPassword().trim().isEmpty()) {
    	        System.out.println("Dati admin incompleti."); 
    	        return false;
    	}
        
        if (confrEmail(a.getEmail())) return false;
        
        String ins = "INSERT INTO utenti (nome, email, password_hash, ruolo, permessi) VALUES (?, ?, ?, ?, ?)";
        String hash = BCrypt.hashpw(a.getPassword(), BCrypt.gensalt());

        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement p = c.prepareStatement(ins)) {
            p.setString(1, a.getNome().trim());
            p.setString(2, a.getEmail().trim().toLowerCase());
            p.setString(3, hash);
            p.setString(4, a.getRuolo() != null ? a.getRuolo().name() : "ADMIN"); 
            p.setString(5, a.getPermessi() != null ? a.getPermessi().name() : "LETTURA"); 

            return p.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
		return false;
    }
    
    public boolean confrEmail(String email) {
        String sele = "SELECT email FROM utenti WHERE email = ?";
        if (email == null) return false;
        
        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement p = c.prepareStatement(sele)) {
            p.setString(1, email.trim().toLowerCase());
            try (ResultSet res = p.executeQuery()) {
                return res.next();
            }
        } catch (SQLException e) {
        	System.out.println("Errore verifica email: " + e.getMessage());
        }
        return false;
    }
    
    public boolean controlloPW(String pw) {
    	if (pw == null || pw.length() < 8) return false;
    	return pw.matches(".*[A-Za-z].*") && pw.matches(".*\\d.*");
    }

    public Persona login(String email, String pw) {
        if (email == null || email.trim().isEmpty() || pw == null || pw.trim().isEmpty()) {
            return null;
        }
        
        String sele = "SELECT * FROM utenti WHERE email = ?";

        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement p = c.prepareStatement(sele)) {
            p.setString(1, email.trim().toLowerCase());

            try (ResultSet res = p.executeQuery()) {
                if (res.next()) {
                    String pwHash = res.getString("password_hash");

                    if (BCrypt.checkpw(pw, pwHash)) {
                        Ruolo r = Ruolo.valueOf(res.getString("ruolo").toUpperCase());
                        int id = res.getInt("id"); 
                        String nome = res.getString("nome");
                        
                        if (r == Ruolo.ADMIN) {
                            Permessi perm = Permessi.valueOf(res.getString("permessi").toUpperCase());
                            return new Admin(id, nome, email, pwHash, perm);
                        } else {
                            boolean studente = res.getBoolean("studente");
                            
                            Date dbDate = res.getDate("data_nascita");
                            LocalDate dataNascita = null;
                            if (dbDate != null) {
                                dataNascita = Instant.ofEpochMilli(dbDate.getTime()).atZone(ZoneId.systemDefault()).toLocalDate();
                            }
                            
                            String sesso = res.getString("sesso");
                            
                            return new Utente(id, nome, email, pwHash, studente, dataNascita, sesso);
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.out.println("Errore login: " + e.getMessage());
        }
        return null;
    }
    
    public boolean aggProfilo(String nuovoNome, LocalDate dataNascita2, Boolean isStudente, String nuovaPassword, String email) throws SQLException {
        if (email == null || nuovoNome == null) return false;

        String sele = "SELECT ruolo FROM utenti WHERE email = ?";
        String ruolo = "UTENTE";
        
        try (Connection c = ConnessioneDB.getConnection()) {
            try (PreparedStatement p = c.prepareStatement(sele)) {
                p.setString(1, email.trim().toLowerCase());
                try (ResultSet res = p.executeQuery()) {
                    if (res.next()) ruolo = res.getString("ruolo");
                }
            }

            StringBuilder upd = new StringBuilder("UPDATE utenti SET nome = ?");
            
            if (ruolo != null && !ruolo.equalsIgnoreCase("ADMIN") && isStudente != null) {
                upd.append(", studente = ?");
            }
            if (dataNascita2 != null) {
                upd.append(", data_nascita = ?");
            }
            if (nuovaPassword != null && !nuovaPassword.trim().isEmpty()) {
                upd.append(", password_hash = ?");
            }
            upd.append(" WHERE email = ?");

            try (PreparedStatement p = c.prepareStatement(upd.toString())) {
                int i = 1;
                p.setString(i++, nuovoNome.trim());
                
                if (ruolo != null && !ruolo.equalsIgnoreCase("ADMIN") && isStudente != null) {
                    p.setBoolean(i++, isStudente);
                }
                if (dataNascita2 != null) {
                    p.setDate(i++, java.sql.Date.valueOf(dataNascita2));
                }
                if (nuovaPassword != null && !nuovaPassword.trim().isEmpty()) {
                    p.setString(i++, BCrypt.hashpw(nuovaPassword, BCrypt.gensalt()));
                }
                
                p.setString(i, email.trim().toLowerCase());
                return p.executeUpdate() > 0;
            }
        }
    }
    
    public List<Admin> listaAdmin() throws SQLException {
        List<Admin> l = new ArrayList<>();
        String sele = "SELECT id, nome, email, password_hash, permessi FROM utenti WHERE ruolo = 'ADMIN' ORDER BY id DESC";

        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement prep = c.prepareStatement(sele);
             ResultSet res = prep.executeQuery()) {
            while (res.next()) {
                Permessi p = Permessi.valueOf(res.getString("permessi").toUpperCase());
                l.add(new Admin(
                    res.getInt("id"), res.getString("nome"), res.getString("email"), res.getString("password_hash"), p
                ));
            }
        }
        return l;
    }

    public boolean cambiaPermessiAdmin(int idAdmin, String nuoviPermessi) throws SQLException {
        String sql = "UPDATE utenti SET permessi = ? WHERE id = ? AND ruolo = 'ADMIN'";
        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, nuoviPermessi.toUpperCase());
            ps.setInt(2, idAdmin);
            return ps.executeUpdate() > 0;
        }
    }

    public boolean cancellaAccount(Object criterioInput) throws SQLException {
        if (criterioInput == null) return false;
        
        String inputStr = criterioInput.toString().trim();
        if (inputStr.isEmpty()) return false;

        String del;
        boolean cercaPerId = false;

        if (criterioInput instanceof Number) {// Controllo omonimie
            del = "DELETE FROM utenti WHERE id = ?";
            cercaPerId = true;
        } else if (inputStr.contains("@")) {
            del = "DELETE FROM utenti WHERE email = ?";
        } else if (inputStr.matches("\\d+")) {
            del = "DELETE FROM utenti WHERE id = ?";
            cercaPerId = true;
        } else {
            del = "DELETE FROM utenti WHERE nome = ? AND ruolo = 'UTENTE'";
        }
        
        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement ps = c.prepareStatement(del)) {
            if (cercaPerId) {
                int idNum = (criterioInput instanceof Number) ? ((Number) criterioInput).intValue() : Integer.parseInt(inputStr);
                ps.setInt(1, idNum);
            } else {
                ps.setString(1, inputStr);
            }
            return ps.executeUpdate() > 0;
        }
    }
    
    public List<Utente> cercaUtente(String cerca) throws SQLException {
        List<Utente> l = new ArrayList<>();
        if (cerca == null || cerca.trim().isEmpty()) return l;
        
        String val = "%" + cerca.trim() + "%";
        String sele = "SELECT id, nome, email, studente, data_nascita, sesso FROM utenti "
                   + "WHERE (nome LIKE ? OR email LIKE ?) AND ruolo = 'UTENTE'";
        
        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement p = c.prepareStatement(sele)) {
            p.setString(1, val); p.setString(2, val);
            
            try (ResultSet res = p.executeQuery()) {
                while (res.next()) {
                    java.sql.Date dataDB = res.getDate("data_nascita");
                    LocalDate data = (dataDB != null) ? dataDB.toLocalDate() : LocalDate.of(2000, 1, 1);

                    l.add(new Utente(
                        res.getInt("id"), res.getString("nome"), res.getString("email"), "PROTECTED_HASH", 
                        res.getBoolean("studente"), data, res.getString("sesso") != null ? res.getString("sesso") : "ALTRO"
                    ));
                }
            }
        }
        return l;
    }

    public String calcoloPermessiAdmin(int idAdmin) {
        String sele = "SELECT permessi FROM utenti WHERE id = ? AND ruolo = 'ADMIN'";
        try (Connection c = ConnessioneDB.getConnection(); PreparedStatement prep = c.prepareStatement(sele)) {
            prep.setInt(1, idAdmin);
            try (ResultSet res = prep.executeQuery()) {
                if (res.next()) {
                    String p = res.getString("permessi");
                    return (p != null) ? p.trim().toUpperCase() : "LETTURA";
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return "LETTURA";
    }
}