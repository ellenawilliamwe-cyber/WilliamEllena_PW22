package controller;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

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

import dao.EventoDAO;
import model.Evento;
import model.Persona;
import model.Admin;

@WebServlet("/api/eventi")
public class EventoController extends HttpServlet {

	private static final long serialVersionUID = 1L;

	private final Gson gson = new GsonBuilder()
			.registerTypeAdapter(LocalDate.class,
					(JsonSerializer<LocalDate>) (src, typeOfSrc, context) -> new JsonPrimitive(src.toString()))
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

	private boolean vuoto(String testo) {
		return testo == null || testo.trim().isEmpty() || "undefined".equalsIgnoreCase(testo.trim());
	}

	private static class DatiEv {
		String azione;
		String id;
		String titolo;
		String descr;
		String tipoEvento;
		String data;
		String luogo;
		String postiTot;
		String prezzo;
		String pagCassa;
	}

	private DatiEv leggiDati(HttpServletRequest req) throws IOException {
		if (req.getContentType() != null && req.getContentType().contains("application/json")) {
			try (BufferedReader br = req.getReader()) {
				return gson.fromJson(br, DatiEv.class);
			}
		}

		DatiEv d = new DatiEv();
		d.azione = req.getParameter("azione");
		d.id = req.getParameter("id");
		d.titolo = req.getParameter("titolo");
		d.descr = req.getParameter("descrizione");
		d.tipoEvento = req.getParameter("tipoEvento");
		d.data = req.getParameter("data");
		d.luogo = req.getParameter("luogo");
		d.postiTot = req.getParameter("postiTotali");
		d.prezzo = req.getParameter("prezzo");
		d.pagCassa = req.getParameter("pagamentoCassa");
		return d;
	}

	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		impostaCors(req, resp);
		resp.setContentType("application/json");
		resp.setCharacterEncoding("UTF-8");
		PrintWriter out = resp.getWriter();

		try {
			EventoDAO evDAO = new EventoDAO();
			// Per i filtri
			String fTitolo = req.getParameter("titolo");
			String fLuogo = req.getParameter("luogo");

			String prezzoMaxStr = req.getParameter("prezzoMax");

			if (vuoto(fTitolo))
				fTitolo = null;
			if (vuoto(fLuogo))
				fLuogo = null;

			BigDecimal prezzoMax = null;
			if (!vuoto(prezzoMaxStr)) {
				prezzoMax = new BigDecimal(prezzoMaxStr.trim());
			}

			List<Evento> catalogo = evDAO.filtriEventi(fTitolo, fLuogo, prezzoMax);
			out.print(this.gson.toJson(catalogo));

		} catch (Exception e) {
			e.printStackTrace();
			resp.setStatus(500);
			out.print("Errore nel recupero degli eventi.");
		} finally {
			out.flush();
		}
	}

	@Override
	protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		EventoDAO evDAO = new EventoDAO();
		impostaCors(req, resp);
		resp.setContentType("application/json");
		resp.setCharacterEncoding("UTF-8");
		PrintWriter out = resp.getWriter();

		try {
			DatiEv d = leggiDati(req);
			String caso = (d.azione != null) ? d.azione.trim().toLowerCase() : "";

			HttpSession hs = req.getSession(false);
			Persona p = (hs != null) ? (Persona) hs.getAttribute("utente") : null;

			String grado = "LETTURA";
			if (p instanceof Admin) {
				grado = ((Admin) p).getPermessi().name();
			}

			boolean cambiaStato = "inserisci".equals(caso) || "modifica".equals(caso) || "elimina".equals(caso);
			if (cambiaStato) {
				if (p == null) {
					resp.setStatus(401);
					out.print("Autenticazione richiesta.");
					return;
				}
				if ("LETTURA".equalsIgnoreCase(grado)) {
					resp.setStatus(403);
					out.print("Accesso negato: modalità Sola Lettura.");
					return;
				}
			}

			switch (caso) {
			case "inserisci":
				if ("MODERATORE".equalsIgnoreCase(grado)) {
					resp.setStatus(403);
					out.print("Accesso negato: azione non disponibile per moderatori.");
					break;
				}
				LocalDate dataIns = (d.data != null && !d.data.isEmpty()) ? LocalDate.parse(d.data) : null;
				int postiIns = (d.postiTot != null && !d.postiTot.isEmpty())
						? Integer.parseInt(d.postiTot.split("\\.")[0])
						: 0;
				BigDecimal prezzoIns = (d.prezzo != null && !d.prezzo.isEmpty()) ? new BigDecimal(d.prezzo)
						: BigDecimal.ZERO;
				boolean cassaIns = d.pagCassa != null && Boolean.parseBoolean(d.pagCassa);

				Evento nuovo = new Evento(0, d.titolo, d.descr, d.tipoEvento, dataIns, d.luogo, postiIns, postiIns,
						prezzoIns, cassaIns);
				if (evDAO.setEvento(nuovo)) {
					out.print("Evento inserito con successo!");
				} else {
					resp.setStatus(400);
					out.print("Impossibile inserire l'evento.");
				}
				break;

			case "modifica":
				int idMod = (d.id != null && !d.id.isEmpty()) ? Integer.parseInt(d.id.split("\\.")[0]) : 0;
				Evento vecchio = evDAO.getEventoById(idMod);

				int nuoviPostiTot = (d.postiTot != null && !d.postiTot.isEmpty())
						? Integer.parseInt(d.postiTot.split("\\.")[0])
						: 0;
				int disp = nuoviPostiTot;

				if (vecchio != null) {
					int occupati = vecchio.getPostiTot() - vecchio.getPostiDisponibili();
					disp = nuoviPostiTot - occupati;
					if (disp < 0)
						disp = 0; // controllo prenotazioni disp.
				}

				LocalDate dataMod = (d.data != null && !d.data.isEmpty()) ? LocalDate.parse(d.data) : null;
				BigDecimal prezzoMod = (d.prezzo != null && !d.prezzo.isEmpty()) ? new BigDecimal(d.prezzo)
						: BigDecimal.ZERO;
				boolean cassaMod = d.pagCassa != null && Boolean.parseBoolean(d.pagCassa);

				Evento mod = new Evento(idMod, d.titolo, d.descr, d.tipoEvento, dataMod, d.luogo, nuoviPostiTot, disp,
						prezzoMod, cassaMod);
				if (evDAO.modificaEvento(mod)) {
					out.print("Evento modificato con successo!");
				} else {
					resp.setStatus(400);
					out.print("Impossibile aggiornare l'evento.");
				}
				break;

			case "elimina":
				if ("MODERATORE".equalsIgnoreCase(grado)) {
					resp.setStatus(403);
					out.print("Accesso negato: rimozione non consentita per moderatori.");
					break;
				}
				int idCanc = (d.id != null && !d.id.isEmpty()) ? Integer.parseInt(d.id.split("\\.")[0]) : 0;
				if (idCanc > 0 && evDAO.eliminaEvento(idCanc)) {
					out.print("Evento rimosso con successo!");
				} else {
					resp.setStatus(400);
					out.print("Impossibile eliminare l'evento.");
				}
				break;

			default:
				resp.setStatus(400);
				out.print("Azione CRUD eventi non riconosciuta.");
				break;
			}
		} catch (Exception e) {
			e.printStackTrace();
			resp.setStatus(500);
			out.print("Errore interno del server durante il salvataggio.");
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