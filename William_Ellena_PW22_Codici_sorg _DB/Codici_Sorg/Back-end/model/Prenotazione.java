
package model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class Prenotazione {
	
    private int id;
    private int idUtente;
    private int idEvento;
    private LocalDateTime dataPrenotazione;
    private String stato;
    private String metodoPagamento;
    private BigDecimal prezzoFinale;
    private int numeroPosti;
    private String titoloEvento;

    public Prenotazione(int id, int idUtente, int idEvento, LocalDateTime dataPrenotazione, String stato, String metodoPagamento, BigDecimal bigDecimal, int numeroPosti, String titoloEvento) {
        this.id = id;
        this.idUtente = idUtente;
        this.idEvento = idEvento;
        this.dataPrenotazione = dataPrenotazione;
        this.stato = stato;
        this.metodoPagamento = metodoPagamento;
        this.prezzoFinale = bigDecimal;
        this.numeroPosti = numeroPosti;
        this.titoloEvento = titoloEvento;
    }

    
    public Prenotazione() {
	}
	
    public boolean isAnnullata() {
        return "Annullata".equalsIgnoreCase(this.stato);
    }

    public int getId() {
    	return id;
    }
    public void setId(int id) {
    	this.id = id;
    }
    public int getIdUtente() {
    	return idUtente;
    }
    public void setIdUtente(int idUtente) {
    	this.idUtente = idUtente;
    }
    public int getIdEvento() {
    	return idEvento;
    }
    public void setIdEvento(int idEvento) {
    	this.idEvento = idEvento;
    }
    public LocalDateTime getDataPrenotazione() {
    	return dataPrenotazione;
    }
    public void setDataPrenotazione(LocalDateTime dataPrenotazione) {
    	this.dataPrenotazione = dataPrenotazione;
    }
    public String getStato() {
    	return stato;
    }
    public void setStato(String stato) {
    	this.stato = stato;
    }
    public String getMetodoPagamento() {
    	return metodoPagamento;
    }
    public void setMetodoPagamento(String metodoPagamento) {
    	this.metodoPagamento = metodoPagamento;
    }
    public BigDecimal getPrezzoFinale() {
    	return prezzoFinale;
    }
    public void setPrezzoFin(BigDecimal prezzoF) {
    	this.prezzoFinale = prezzoF;
    }
    public int getNumeroPosti() {
        return numeroPosti;
    }
    public void setNumeroPosti(int numeroPosti) {
        this.numeroPosti = numeroPosti;
    }
    public String getTitoloEvento() {
    	return titoloEvento; 
    }

}