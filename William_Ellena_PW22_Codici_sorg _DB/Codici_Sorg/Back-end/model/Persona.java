package model;

public abstract class Persona {
	private Integer id;
    private String nome;
    private String email;
    private String password;
    private Ruolo ruolo;
    
    public Persona(Integer id, String nome, String email, String passwordHash, Ruolo ruolo) {
    	this.id =id;
    	this.nome = nome;
        this.email = email;
        this.password = passwordHash;
        this.ruolo = ruolo;
    }
    
    public abstract boolean accessoDashboard();
    
    public int getId() { 
    	return id;
    }
    public void setId(int id) {
    	this.id = id;
    }

    public String getNome() {
    	return nome;
    }
    public void setNome(String nome) {
    	this.nome = nome;
    	
    }

    public String getEmail() {
    	return email;
    	}
    public void setEmail(String email) {
    	this.email = email;
    }

    public String getPassword() {
    	return password;
    }
    public void setPassword(String passwordHash) {
    	this.password = passwordHash;
    }

    public Ruolo getRuolo() {
    	return ruolo;
    }
    public void setRuolo(Ruolo ruolo) {
    	this.ruolo = ruolo;
    	
    }
    
    

}
