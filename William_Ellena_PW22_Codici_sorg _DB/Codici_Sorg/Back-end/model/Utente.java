package model;

import java.time.LocalDate;

public class Utente extends Persona {
	
    private boolean studente;
    private LocalDate dataNascita;
    private String sesso;

    public Utente(Integer id, String nome, String email, String passwordHash, boolean studente, LocalDate dataNascita, String sesso) {
        super(id, nome, email, passwordHash, Ruolo.UTENTE);
        this.studente = studente;
        this.dataNascita = dataNascita;
        this.sesso = sesso;
    }

    @Override
    public boolean accessoDashboard() {
        return false; 
    }
	
    public boolean isStudente() { return studente; }
    public void setStudente(boolean studente) { this.studente = studente; }

    public LocalDate getDataNascita() { return dataNascita; }
    public void setDataNascita(LocalDate dataNascita) { this.dataNascita = dataNascita; }

    public String getSesso() { return sesso; }
    public void setSesso(String sesso) { this.sesso = sesso; }
}