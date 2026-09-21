package model;

import java.math.BigDecimal;

public class PrenDettAdmin {
    private int id;
    private String emailUtente;
    private String titoloEvento;
    private BigDecimal prezzoFinale;
    private int numPosti;
    private String stato;

    public PrenDettAdmin(int id, String emailUtente, String titoloEvento, BigDecimal prezzoFinale, int numPosti, String stato) {
        this.id = id;
        this.emailUtente = emailUtente;
        this.titoloEvento = titoloEvento;
        this.prezzoFinale = prezzoFinale;
        this.numPosti = numPosti;
        this.stato = stato;
    }

    public int getId() {
    	return id;
    }
    public String getEmailUtente() {
    	return emailUtente;
    }
    public String getTitoloEvento() {
    	return titoloEvento;
    }
    public BigDecimal getPrezzoFinale() {
    	return prezzoFinale;
    }
    public int getNumeroPosti() {
    	return numPosti;
    }
    public String getStato() {
    	return stato;
    }
}

