package model;

import java.math.BigDecimal;
import java.time.LocalDate;

public class Evento {
	
    private int id;
    private String titolo;
    private String descr;
    private String tipoEvento;
    private LocalDate data;
    private String luogo;
    private int postiTotali;
    private int postiDisp;
    private BigDecimal prezzo;
	private boolean pagCassa;

    public Evento(int id, String titolo, String descrizione, String tipoEvento, LocalDate data, String luogo, int postiTotali, int postiDisponibili, BigDecimal prezzo, boolean pagCassa) {
        this.id = id;
        this.titolo = titolo;
        this.descr = descrizione;
        this.tipoEvento = tipoEvento;
        this.data = data;
        this.luogo = luogo;
        this.postiTotali = postiTotali;
        this.postiDisp = postiDisponibili;
        this.prezzo = prezzo;
        this.pagCassa = pagCassa;
    }

    public int getId() {
    	return id;
    }
    public void setId(int id) {
    	this.id = id;
    }
    public String getTitolo() {
    	return titolo;
    }
    public void setTitolo(String titolo) {
    	this.titolo = titolo;
    }
    public String getDescrizione() {
    	return descr;
    }
    public void setDescrizione(String descr) {
    	this.descr = descr;
    }
    public String getTipoEvento() {
    	return tipoEvento;
    }
    public void setTipoEvento(String tipoEvento) {
    	this.tipoEvento = tipoEvento;
    }
    public LocalDate getData() {
    	return data;
    }
    public void setData(LocalDate data) {
    	this.data = data;
    }
    public String getLuogo() {
    	return luogo;
    }
    public void setLuogo(String luogo) {
    	this.luogo = luogo;
    }
    public int getPostiTot() {
    	return postiTotali;
    }
    public void setPostiTot(int postiTotali) {
    	this.postiTotali = postiTotali;
    }
    public int getPostiDisponibili() {
    	return postiDisp;
    }
    public void setPostiDisponibili(int postiD) {
    	this.postiDisp = postiD;
    }
    public BigDecimal getPrezzo() {
    	return prezzo;
    }
    public void setPrezzo(BigDecimal prezzo) {
    	this.prezzo = prezzo;
    }
    public boolean isPagCassa() { 
    	return pagCassa;
    }
    public void setPagCassa(boolean pagCassa) {
    	this.pagCassa = pagCassa;
    }
}