package controller;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.mindrot.jbcrypt.BCrypt;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonPrimitive;
import com.google.gson.JsonSerializer;

import dao.UtenteDAO;
import model.Persona;
import model.Ruolo;
import model.Utente;
import model.Admin;
import model.Permessi;

@WebServlet("/api/autenticazione")
public class AuthController extends HttpServlet {

	private static final long serialVersionUID = 1L;

	private final Gson gson = new GsonBuilder()
			.registerTypeAdapter(LocalDate.class,
					(JsonSerializer<LocalDate>) (src, typeOfSrc, context) -> new JsonPrimitive(src.toString()))
			.registerTypeAdapter(LocalDateTime.class,
					(JsonSerializer<LocalDateTime>) (src, typeOfSrc, context) -> new JsonPrimitive(src.toString()))
			.create();

	private void impostaCors(HttpServletResponse resp) {
		resp.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5500");
		resp.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
		resp.setHeader("Access-Control-Allow-Headers", "Content-Type");
		resp.setHeader("Access-Control-Allow-Credentials", "true");
	}

	private static class DatiAut {
		String azione;
		String email;
		String pw;
		String vecchiaPw;
		String nome;
		String sesso;
		String dataNascita;
		boolean studente;
		Integer id;
		String permessi;
		String txtIn;
	}

	private DatiAut leggiDati(HttpServletRequest req) throws IOException { // Per gestione di fetch e form classici
		if (req.getContentType() != null && req.getContentType().contains("application/json")) {
			try (BufferedReader br = req.getReader()) {
				return gson.fromJson(br, DatiAut.class);
			}
		}

		DatiAut d = new DatiAut();
		d.azione = req.getParameter("azione");
		d.email = req.getParameter("email");
		d.pw = req.getParameter("password");
		d.vecchiaPw = req.getParameter("passwordAttuale");
		if (d.vecchiaPw == null)
			d.vecchiaPw = req.getParameter("passwordActual");
		d.nome = req.getParameter("nome");
		d.sesso = req.getParameter("sesso");
		d.dataNascita = req.getParameter("dataNascita");
		d.permessi = req.getParameter("permessi");
		d.txtIn = req.getParameter("valoreTarget");

		if (req.getParameter("studente") != null) {
			d.studente = Boolean.parseBoolean(req.getParameter("studente"));
		}
		if (req.getParameter("id") != null) {
			try {
				d.id = Integer.parseInt(req.getParameter("id").trim());
			} catch (NumberFormatException e) {
				d.id = null;
			}
		}
		return d;
	}

	@Override
	protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

		UtenteDAO uDAO = new UtenteDAO();
		impostaCors(resp);

		resp.setContentType("application/json");
		resp.setCharacterEncoding("UTF-8");
		PrintWriter out = resp.getWriter();

		try {
			DatiAut d = leggiDati(req);

			String caso = (d.azione != null) ? d.azione.trim().toLowerCase() : "";
			if (d.email != null)
				d.email = d.email.trim();

			System.out.println("Richiesta ricevuta per l'azione: " + caso);

			HttpSession hs = req.getSession(false);
			Persona uLoggato = (hs != null) ? (Persona) hs.getAttribute("utente") : null;

			// Controllo preliminari permessi
			boolean admin = "registraadmin".equals(caso) || "cambiapermessi".equals(caso) || "cercautenti".equals(caso);
			if (admin) {
				if (uLoggato == null) {
					resp.setStatus(401);
					out.print("Effettua il login.");
					return;
				}

				if (uLoggato.getRuolo() != Ruolo.ADMIN) {
					resp.setStatus(403);
					out.print("Operazione bloccata: non sei un amministratore.");
					return;
				}
			}
			// Inizio azioni
			switch (caso) {
			case "login":
				Persona utente = uDAO.login(d.email, d.pw);
				if (utente == null) {
					resp.setStatus(401);
					out.print("Credenziali errate.");
					break;
				}
				req.getSession(true).setAttribute("utente", utente);
				out.print(gson.toJson(utente));
				break;
			case "registra":
				if (d.nome == null || d.email == null || d.pw == null || d.dataNascita == null
						|| d.dataNascita.isEmpty()) {
					resp.setStatus(400);
					out.print("Dati incompleti.");
					break;
				}
				LocalDate dataN = LocalDate.parse(d.dataNascita.trim());

				int annoAttuale = LocalDate.now().getYear();
				int annoNasc = dataN.getYear();
				if (dataN.isAfter(LocalDate.now()) || annoNasc < (annoAttuale - 120)) {
					resp.setStatus(400);
					out.print("Data non valida");
					break;
				}
				if ((annoAttuale - annoNasc) <= 14) {
					resp.setStatus(400);
					out.print("Registrazione fallita: l'età minima è < di 14 anni.");
					break;
				}
				if (uDAO.confrEmail(d.email)) {
					resp.setStatus(400);
					out.print("Email già esistente.");
					break;
				}
				if (!uDAO.controlloPW(d.pw)) {
					resp.setStatus(400);
					out.print(
							"La password deve contenere almeno 8 caratteri, una lettera e un numero.");
					break;
				}
				Utente nuovo = new Utente(0, d.nome, d.email, d.pw, d.studente, dataN, d.sesso);
				if (!uDAO.registraUtente(nuovo)) {
					resp.setStatus(400);
					out.print("Registrazione fallita a causa di errore nel database.");
					break;
				}
				Persona loggato = uDAO.login(d.email, d.pw);
				req.getSession(true).setAttribute("utente", loggato);
				out.print(gson.toJson(loggato));
				break;
			case "registraadmin":
				if (!"TOTALE".equalsIgnoreCase(uDAO.calcoloPermessiAdmin(uLoggato.getId()))) {
					resp.setStatus(403);
					out.print("Privilegi insufficienti.");
					break;
				}
				Admin nuovoAdmin = new Admin(0, d.nome, d.email, d.pw, Permessi.valueOf(d.permessi.toUpperCase()));
				if (uDAO.registraAdmin(nuovoAdmin)) {
					out.print("Nuovo account amministrativo creato.");
				} else {
					resp.setStatus(400);
					out.print("Email già in uso.");
				}
				break;
			case "modificaprofilo":
				if (uLoggato == null) {
					resp.setStatus(401);
					out.print("Sessione scaduta.");
					break;
				}
				if (d.vecchiaPw == null || d.vecchiaPw.isEmpty()) {
					resp.setStatus(400);
					out.print("Password attuale obbligatoria.");
					break;
				}
				if (!BCrypt.checkpw(d.vecchiaPw, uLoggato.getPassword())) {
					resp.setStatus(401);
					out.print("La password attuale inserita non è corretta.");
					break;
				}
				LocalDate dataProfilo = (d.dataNascita != null) ? LocalDate.parse(d.dataNascita.trim()) : null;

				if (!uDAO.aggProfilo(d.nome, dataProfilo, d.studente, d.pw, uLoggato.getEmail())) {
					resp.setStatus(400);
					out.print("Modifica fallita.");
					break;
				}

				uLoggato.setNome(d.nome);
				if (uLoggato instanceof Utente) {
					((Utente) uLoggato).setStudente(d.studente);
					if (dataProfilo != null)
						((Utente) uLoggato).setDataNascita(dataProfilo);
				}
				hs.setAttribute("utente", uLoggato);
				out.print(gson.toJson(uLoggato));
				break;
			case "cambiapermessi":
				if (!"TOTALE".equalsIgnoreCase(uDAO.calcoloPermessiAdmin(uLoggato.getId()))) {
					resp.setStatus(403);
					out.print("Azione consentita solo all'admin supremo.");
					break;
				}
				if (uDAO.cambiaPermessiAdmin(d.id, d.permessi)) {
					out.print("Permessi aggiornati.");
				} else {
					resp.setStatus(400);
					out.print("Modifica fallita.");
				}
				break;
			case "cercautenti":
				if (d.txtIn == null || d.txtIn.isEmpty()) {
					resp.setStatus(400);
					out.print("Inserire una chiave di ricerca.");
					break;
				}
				out.print(gson.toJson(uDAO.cercaUtente(d.txtIn.trim())));
				break;
			case "eliminaaccount":
				if (uLoggato == null) {
					resp.setStatus(401);
					out.print("Autenticazione richiesta.");
					break;
				}
				String cancAcc = d.txtIn;

				if (uLoggato.getRuolo() == Ruolo.ADMIN) {
					if (!"TOTALE".equalsIgnoreCase(uDAO.calcoloPermessiAdmin(uLoggato.getId()))) {
						resp.setStatus(403);
						out.print("Privilegi insufficienti.");
						break;
					}
					if (cancAcc == null || cancAcc.isEmpty())
						cancAcc = String.valueOf(d.id);

					// evita autocancellazione admin
					if (cancAcc.equals(String.valueOf(uLoggato.getId()))
							|| cancAcc.equalsIgnoreCase(uLoggato.getEmail())) {
						resp.setStatus(400);
						out.print("Non puoi auto-eliminarti.");
						break;
					}
				} else {
					cancAcc = String.valueOf(uLoggato.getId());
				}

				if (uDAO.cancellaAccount(cancAcc.trim())) {
					if (uLoggato.getRuolo() != Ruolo.ADMIN)
						hs.invalidate();
					out.print("Account eliminato.");
				} else {
					resp.setStatus(400);
					out.print("Account non trovato.");
				}
				break;

			default:
				resp.setStatus(400);
				out.print("Azione non valida.");
				break;
			}

		} catch (Exception e) {
			e.printStackTrace();
			resp.setStatus(500);
			out.print("Errore nel server.");
		} finally {
			out.flush();
		}
	}

	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse res) throws ServletException, IOException {
		impostaCors(res);
		res.setContentType("application/json");
		res.setCharacterEncoding("UTF-8");
		PrintWriter out = res.getWriter();

		try {
			HttpSession hs = req.getSession(false);
			Persona capo = (hs != null) ? (Persona) hs.getAttribute("utente") : null;

			if (capo != null && capo.getRuolo() == Ruolo.ADMIN) {
				UtenteDAO utenteDAO = new UtenteDAO();
				List<Admin> l = utenteDAO.listaAdmin();
				out.print(this.gson.toJson(l));
			} else {
				res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
				out.print("Accesso negato. Privilegi insufficienti.");
			}
		} catch (Exception e) {
			e.printStackTrace();
			res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			out.print("Errore nel recupero dati.");
		} finally {
			out.flush();
		}
	}

	@Override
	protected void doOptions(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		impostaCors(response);
		response.setStatus(HttpServletResponse.SC_OK);
	}
}