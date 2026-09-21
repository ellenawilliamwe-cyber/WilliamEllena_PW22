package config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.SQLException;

public class ConnessioneDB {
    
    private static HikariDataSource hds = null;

    private static synchronized void apriConn() {
    	if (hds != null) return;
    	
        try {
        	HikariConfig conf = new HikariConfig();
            
            conf.setJdbcUrl("jdbc:mysql://localhost:3306/museo");
            conf.setUsername("root");
            conf.setPassword("");
            conf.setDriverClassName("com.mysql.cj.jdbc.Driver");
            conf.setMaximumPoolSize(10);

            hds = new HikariDataSource(conf);
        }catch (Exception e) {
            System.err.println("Errore nell'inizializzazione del pool DB");
            e.printStackTrace();
        }
    }

    private ConnessioneDB() {}//Privato per non permettere la creazione della classe

    public static Connection getConnection() throws SQLException {
    	
    	if (hds == null) {
    		apriConn();
    		if (hds == null) {
                throw new SQLException("Pool di connessioni non inizializzato correttamente.");
            }
    	}
    	
        return hds.getConnection();
    }
}

