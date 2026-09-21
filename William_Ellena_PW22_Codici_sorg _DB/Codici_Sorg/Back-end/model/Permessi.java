package model;

public enum Permessi {
	 LETTURA,
	 TOTALE,
	 MODERATORE;
	    
	 public boolean controllo() {
	     return this == TOTALE || this == MODERATORE; 
	 }
}
