package model;

public class Admin extends Persona {
	
	private Permessi permessi;

	public Admin(Integer id, String nome, String email, String passwordHash, Permessi permessi) {
		super(id, nome, email, passwordHash, Ruolo.ADMIN);
		this.permessi = permessi;
	}

	@Override
	public boolean accessoDashboard() {
		return true;
	}
	
	public Permessi getPermessi() {
		return this.permessi;
	}

	public void setPermessi(Permessi permessi) {
		this.permessi = permessi;
	}
}
