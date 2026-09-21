package controller;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.mindrot.jbcrypt.BCrypt;
import config.ConnessioneDB;

@WebServlet("/api/reset-password-personale")
public class ResetPWController extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        resp.setContentType("text/html;charset=UTF-8");
        PrintWriter out = resp.getWriter();
        
        String pw = "admin123";//pw per test
        String hash = BCrypt.hashpw(pw, BCrypt.gensalt());
        
        String upd = "UPDATE utenti SET password_hash = ? WHERE email = ?";
        
        try (Connection c = ConnessioneDB.getConnection(); 
             PreparedStatement prep = c.prepareStatement(upd)) {
            
            prep.setString(1, hash);
            prep.setString(2, "admin1@artesmuseum.com");
            
            int righe = prep.executeUpdate();
            
            if (righe > 0) {
                out.print("<h3>Reset completato.</h3>");
                out.print("<p>Database aggiornato correttamente.</p>");
                out.print("<p>Password hash" + hash + "</code></p>");
            } else {
                out.print("<h3>Utente non trovato.</h3>");
            }
            
        } catch (Exception e) {
            resp.setStatus(500);
            out.print("<h3>Errore di esecuzione:</h3><pre>");
            e.printStackTrace(out);
            out.print("</pre>");
        }
    }
}
