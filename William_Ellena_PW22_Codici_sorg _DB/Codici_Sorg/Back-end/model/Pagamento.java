package model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class Pagamento {

	public enum MetodoPagamento {
		CASSA, CARTA_CREDITO, PAYPAL
	}

	private int id;
	private int idPrenotazione;
	private int idUtente;
	private BigDecimal importo;
	private MetodoPagamento metodo;
	private LocalDateTime dataPagamento;
	private String statoPagamento;
	private String codiceTransazione;
	private String note;

	public Pagamento(int id, int idPrenotazione, int idUtente, BigDecimal importo, MetodoPagamento metodo,
			LocalDateTime dataPagamento, String statoPagamento, String codiceTransazione, String note) {
		this.id = id;
		this.idPrenotazione = idPrenotazione;
		this.idUtente = idUtente;
		this.importo = importo;
		this.metodo = metodo;
		this.dataPagamento = dataPagamento;
		this.statoPagamento = statoPagamento;
		this.codiceTransazione = codiceTransazione;
		this.note = note;
	}

	public int getId() {
		return id;
	}

	public void setId(int id) {
		this.id = id;
	}

	public int getIdPrenotazione() {
		return idPrenotazione;
	}

	public void setIdPrenotazione(int idPrenotazione) {
		this.idPrenotazione = idPrenotazione;
	}

	public int getIdUtente() {
		return idUtente;
	}

	public void setIdUtente(int idUtente) {
		this.idUtente = idUtente;
	}

	public BigDecimal getImporto() {
		return importo;
	}

	public void setImporto(BigDecimal importo) {
		this.importo = importo;
	}

	public MetodoPagamento getMetodoPagamento() {
		return metodo;
	}

	public void setMetodoPagamento(MetodoPagamento metodo) {
		this.metodo = metodo;
	}

	public LocalDateTime getDataPagamento() {
		return dataPagamento;
	}

	public void setDataPagamento(LocalDateTime dataPagamento) {
		this.dataPagamento = dataPagamento;
	}

	public String getStatoPagamento() {
		return statoPagamento;
	}

	public void setStatoPagamento(String statoPagamento) {
		this.statoPagamento = statoPagamento;
	}

	public String getCodiceTransazione() {
		return codiceTransazione;
	}

	public void setCodiceTransazione(String codiceTransazione) {
		this.codiceTransazione = codiceTransazione;
	}

	public String getNote() {
		return note;
	}

	public void setNote(String note) {
		this.note = note;
	}
}
