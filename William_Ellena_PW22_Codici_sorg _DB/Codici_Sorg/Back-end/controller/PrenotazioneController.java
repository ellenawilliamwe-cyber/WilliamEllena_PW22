package controller;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import dao.PrenotazioneDAO;
import dao.UtenteDAO;
import model.Persona;
import model.Prenotazione;
import model.Ruolo;

@WebServlet("/api/prenotazioni")
public class PrenotazioneController extends HttpServlet {

	private static final long serialVersionUID = 1L;

	private final PrenotazioneDAO pDAO = new PrenotazioneDAO();

    private final Gson gson = new GsonBuilder()
            .registerTypeAdapter(LocalDate.class, (com.google.gson.JsonSerializer<LocalDate>) (src, typeOfSrc, context) -> new com.google.gson.JsonPrimitive(src.toString()))
            .registerTypeAdapter(LocalDateTime.class, (com.google.gson.JsonSerializer<LocalDateTime>) (src, typeOfSrc, context) -> new com.google.gson.JsonPrimitive(src.toString()))
            .setDateFormat("yyyy-MM-dd")
            .create();


	private void impostaCors(HttpServletRequest req, HttpServletResponse res) {
		String origine = req.getHeader("Origin");
		if (origine == null || origine.isEmpty()) {
			origine = "http://127.0.0.1:5500";
		}
		res.setHeader("Access-Control-Allow-Origin", origine);
		res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type");
		res.setHeader("Access-Control-Allow-Credentials", "true");
	}

	private static class DatiPren {
		String azione;
		String idPren;
		String idUtente;
		String idEvento;
		String nPosti;
		String metodoPag;
		String prezzoF;
		String notePag;
		String stato;
	}

	private DatiPren leggiDati(HttpServletRequest req) throws IOException {
		if (req.getContentType() != null && req.getContentType().contains("application/json")) {
			try (BufferedReader br = req.getReader()) {
				return gson.fromJson(br, DatiPren.class);
			}
		}

		DatiPren d = new DatiPren();
		d.azione = req.getParameter("azione");
		d.idPren = req.getParameter("idPrenotazione");
		d.idUtente = req.getParameter("idUtente");
		d.idEvento = req.getParameter("idEvento");
		d.nPosti = req.getParameter("numeroPosti");
		d.metodoPag = req.getParameter("metodoPagamento");
		d.prezzoF = req.getParameter("prezzoFinale");
		d.notePag = req.getParameter("notePagamento");
		d.stato = req.getParameter("stato");
		return d;
	}

	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

		impostaCors(req, resp);
		resp.setContentType("application/json");
		resp.setCharacterEncoding("UTF-8");
		PrintWriter out = resp.getWriter();

		String idUStr = req.getParameter("idUtente");

		try {
			if ("admin_panel".equalsIgnoreCase(idUStr)) {
				String cercaEmail = req.getParameter("cercaEmail");
				String cercaEvento = req.getParameter("cercaEvento");

				out.print(gson.toJson(pDAO.prenGestibili(cercaEmail, cercaEvento)));
				return;
			}

			if (idUStr != null && !idUStr.trim().isEmpty()) {
				int idUtente = Integer.parseInt(idUStr.trim());
				List<Prenotazione> storico;

				if (idUtente == 0) {
					storico = pDAO.listaPren();
				} else {
					storico = pDAO.prenUtente(idUtente);
				}
				out.print(gson.toJson(storico));
			} else {
				resp.setStatus(400);
				out.print("Dati mancanti per lo storico.");
			}
		} catch (NumberFormatException e) {
			resp.setStatus(400);
			out.print("ID utente non valido.");
		} catch (Exception e) {
			e.printStackTrace();
			resp.setStatus(500);
			out.print("Errore nel caricamento delle prenotazioni.");
		} finally {
			out.flush();
		}
	}

	@Override
	protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

		impostaCors(req, resp);
		resp.setContentType("application/json");
		resp.setCharacterEncoding("UTF-8");
		PrintWriter out = resp.getWriter();

		try {
			DatiPren d = leggiDati(req);
			String caso = (d.azione != null) ? d.azione.trim().toLowerCase() : "";

			System.out.println("Richiesta prenotazione: " + caso);

			HttpSession session = req.getSession(false);
			Persona p = (session != null) ? (Persona) session.getAttribute("utente") : null;

			switch (caso) {

			case "annulla":
				if (p == null) {
					resp.setStatus(401);
					out.print("Sessione scaduta, riprovare.");
					return;
				}
				if (d.idPren == null || d.idPren.trim().isEmpty()) {
					resp.setStatus(400);
					out.print("ID biglietto mancante.");
					return;
				}

				int idPren = (int) Double.parseDouble(d.idPren.trim().split("\\.")[0]);
				Prenotazione biglietto = pDAO.getPrenotazioneById(idPren);

				if (biglietto == null) {
					resp.setStatus(400);
					out.print("Questa prenotazione non esiste.");
					return;
				}

				boolean puo = false;

				// Verifica permessi per cancellare account
				if (p.getRuolo() == Ruolo.UTENTE) {
					if (p.getId() == biglietto.getIdUtente()) {
						puo = true;
					} else {
						resp.setStatus(403);
						out.print("Non puoi annullare i biglietti di altri utenti.");
						return;
					}
				} else if (p.getRuolo() == Ruolo.ADMIN) {
					UtenteDAO uDAO = new UtenteDAO();
					String grado = uDAO.calcoloPermessiAdmin(p.getId());
					if ("TOTALE".equalsIgnoreCase(grado) || "MODERATORE".equalsIgnoreCase(grado)) {
						puo = true;
					} else {
						resp.setStatus(403);
						out.print("Permessi insufficienti.");
						return;
					}
				}

				if (puo) {
					if (pDAO.annullaPren(idPren)) {
						out.print("Prenotazione annullata.");
					} else {
						resp.setStatus(400);
						out.print("Impossibile annullare.");
					}
				}
				break;

			case "crea":
				if (d.idUtente == null || d.idEvento == null || d.nPosti == null || d.prezzoF == null) {
					resp.setStatus(400);
					out.print("Dati d'acquisto incompleti.");
					return;
				}

				int postiRichiesti = (int) Double.parseDouble(d.nPosti.trim().split("\\.")[0]);
				int idEv = (int) Double.parseDouble(d.idEvento.trim().split("\\.")[0]);
				int idUt = (int) Double.parseDouble(d.idUtente.trim().split("\\.")[0]);

				BigDecimal tot = new BigDecimal(d.prezzoF.trim());
				String statoI = (d.stato != null) ? d.stato : "COMPLETA";

				boolean esito = pDAO.prenota(idUt, idEv, postiRichiesti, d.metodoPag, tot, d.notePag, statoI);

				if (esito) {
					out.print("Prenotazione salvata con successo.");
				} else {
					resp.setStatus(409);
					out.print("Posti esauriti o errore nel pagamento.");
				}
				break;

			default:
				resp.setStatus(400);
				out.print("Azione non riconosciuta.");
				break;
			}

		} catch (Exception e) {
			e.printStackTrace();
			resp.setStatus(500);
			out.print("Errore durante il salvataggio o l'elaborazione dei dati.");
		} finally {
			out.flush();
		}
	}

	@Override
	protected void doOptions(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		impostaCors(request, response);
		response.setStatus(HttpServletResponse.SC_OK);
	}
}
