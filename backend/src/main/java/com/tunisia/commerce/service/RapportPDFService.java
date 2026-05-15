package com.tunisia.commerce.service;

import com.ibm.icu.text.ArabicShaping;
import com.ibm.icu.text.ArabicShapingException;
import com.ibm.icu.text.Bidi;
import com.itextpdf.io.font.FontProgram;
import com.itextpdf.io.font.FontProgramFactory;
import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.kernel.font.PdfFontFactory.EmbeddingStrategy;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.tunisia.commerce.entity.DemandeEnregistrement;
import com.tunisia.commerce.entity.DemandeProduit;
import com.tunisia.commerce.entity.ImportateurTunisien;
import com.tunisia.commerce.repository.DemandeEnregistrementRepository;
import com.tunisia.commerce.repository.DemandeProduitRepository;
import com.tunisia.commerce.repository.ImportateurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class RapportPDFService {

    private final DemandeEnregistrementRepository demandeRepository;
    private final DemandeProduitRepository demandeProduitRepository;
    private final ImportateurRepository importateurRepository;
    private final ImportateurService importateurService;

    // ─── Palette sobre ───────────────────────────────────────────────────────
    /** Rouge tunisien — uniquement pour en-tête, filets et barre de section */
    private static final DeviceRgb ROUGE_TN     = new DeviceRgb(206,  17,  38);
    /** Bleu ardoise foncé pour titres, valeurs KPI, en-têtes de tableau */
    private static final DeviceRgb BLEU_OFF     = new DeviceRgb( 30,  58,  96);
    /** En-tête de tableau (bleu ardoise légèrement plus clair) */
    private static final DeviceRgb ENTETE_TAB   = new DeviceRgb( 52,  73, 100);
    /** Texte courant anthracite */
    private static final DeviceRgb TEXTE        = new DeviceRgb( 33,  37,  41);
    /** Texte secondaire gris */
    private static final DeviceRgb TEXTE_SEC    = new DeviceRgb( 90,  90,  90);
    /** Fond très clair (alternance lignes, KPI) */
    private static final DeviceRgb GRIS_CLAIR   = new DeviceRgb(248, 249, 250);
    /** Gris de séparation */
    private static final DeviceRgb GRIS_ALTERNE = new DeviceRgb(233, 236, 239);
    /** Blanc */
    private static final DeviceRgb BLANC        = new DeviceRgb(255, 255, 255);

    private static final String COAT_OF_ARMS_URL =
            "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/" +
                    "Coat_of_arms_of_Tunisia.svg/200px-Coat_of_arms_of_Tunisia.svg.png";

    // ────────────────────────────────────────────────────────────────────────

    public byte[] generateRapportPDF(Long importateurId) {
        log.info("Génération du rapport PDF officiel pour importateur ID: {}", importateurId);
        try {
            Map<String, Object>         stats       = importateurService.getDashboardStats(importateurId);
            List<DemandeEnregistrement> demandes    = demandeRepository.findByImportateurId(importateurId);
            ImportateurTunisien         importateur = importateurRepository.findById(importateurId).orElse(null);

            ByteArrayOutputStream out      = new ByteArrayOutputStream();
            PdfDocument           pdfDoc   = new PdfDocument(new PdfWriter(out));
            Document              document = new Document(pdfDoc, PageSize.A4);
            document.setMargins(40, 50, 40, 50);

            PdfFont fontRegular = PdfFontFactory.createFont("Helvetica");
            PdfFont fontBold    = PdfFontFactory.createFont("Helvetica-Bold");
            PdfFont fontItalic  = PdfFontFactory.createFont("Helvetica-Oblique");
            PdfFont fontArabic  = loadArabicFont();

            String reference = "REF-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
            String dateGen   = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm"));

            addOfficialHeader(document, fontBold, fontRegular, fontArabic);
            addDocumentTitle(document, fontBold, fontItalic, reference, dateGen);
            if (importateur != null) addImporteurSection(document, fontBold, fontRegular, importateur);
            addKpiSection(document, fontBold, fontRegular, stats, demandes);
            addCategoriesSection(document, fontBold, fontRegular, stats);
            addDemandesTable(document, fontBold, fontRegular, demandes);
            addOfficialFooter(document, fontItalic, pdfDoc, dateGen);

            document.close();
            byte[] pdfBytes = out.toByteArray();
            log.info("PDF officiel généré : {} bytes", pdfBytes.length);
            return pdfBytes;

        } catch (Exception e) {
            log.error("Erreur génération PDF : {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la génération du rapport PDF officiel", e);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Chargement police arabe
    // Placez NotoSansArabic-Regular.ttf dans src/main/resources/fonts/
    // Téléchargement : https://fonts.google.com/noto/specimen/Noto+Sans+Arabic
    // ────────────────────────────────────────────────────────────────────────
    private PdfFont loadArabicFont() {
        // 1) Classpath embarqué (recommandé)
        // Placez NotoSansArabic-Regular.ttf dans src/main/resources/fonts/
        // Téléchargement : https://fonts.google.com/noto/specimen/Noto+Sans+Arabic
        try (InputStream is = getClass().getResourceAsStream("/fonts/NotoSansArabic-Regular.ttf")) {
            if (is != null) {
                byte[] fontBytes = is.readAllBytes();
                FontProgram fp = FontProgramFactory.createFont(fontBytes);
                return PdfFontFactory.createFont(fp, PdfEncodings.IDENTITY_H, EmbeddingStrategy.FORCE_EMBEDDED);
            }
        } catch (Exception ignored) {}

        // 2) Système Linux
        try {
            FontProgram fp = FontProgramFactory.createFont(
                    "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf");
            return PdfFontFactory.createFont(fp, PdfEncodings.IDENTITY_H, EmbeddingStrategy.FORCE_EMBEDDED);
        } catch (Exception ignored) {}

        // 3) Système Windows
        try {
            FontProgram fp = FontProgramFactory.createFont("C:/Windows/Fonts/arial.ttf");
            return PdfFontFactory.createFont(fp, PdfEncodings.IDENTITY_H, EmbeddingStrategy.FORCE_EMBEDDED);
        } catch (Exception ignored) {}

        // 4) Fallback sans crash
        log.warn("Police arabe introuvable — placez NotoSansArabic-Regular.ttf dans src/main/resources/fonts/");
        try { return PdfFontFactory.createFont("Helvetica"); }
        catch (Exception e) { throw new RuntimeException(e); }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 1. En-tête officiel - Français à gauche, Armoiries centre, Arabe à droite
    // ────────────────────────────────────────────────────────────────────────
    private void addOfficialHeader(Document doc,
                                   PdfFont fontBold,
                                   PdfFont fontRegular,
                                   PdfFont fontArabic) throws Exception {

        Table headerMain = new Table(UnitValue.createPercentArray(new float[]{40, 20, 40}));
        headerMain.setWidth(UnitValue.createPercentValue(100));
        headerMain.setMarginBottom(6);

        // ===== COLONNE GAUCHE : FRANÇAIS =====
        Cell frenchCell = new Cell();
        frenchCell.setBorder(Border.NO_BORDER);
        frenchCell.setVerticalAlignment(VerticalAlignment.MIDDLE);
        frenchCell.setPadding(0);
        frenchCell.setMargin(0);

        frenchCell.add(new Paragraph("République Tunisienne")
                .setFont(fontBold).setFontSize(11).setFontColor(TEXTE)
                .setTextAlignment(TextAlignment.LEFT)
                .setMargin(0).setPadding(0)
                .setMarginBottom(2));

        frenchCell.add(new Paragraph("Ministère du Commerce")
                .setFont(fontRegular).setFontSize(9).setFontColor(TEXTE_SEC)
                .setTextAlignment(TextAlignment.LEFT)
                .setMargin(0).setPadding(0)
                .setMarginBottom(2));

        frenchCell.add(new Paragraph("et de la Promotion des Exportations")
                .setFont(fontRegular).setFontSize(9).setFontColor(TEXTE_SEC)
                .setTextAlignment(TextAlignment.LEFT)
                .setMargin(0).setPadding(0)
                .setMarginBottom(0));

        headerMain.addCell(frenchCell);

        // ===== COLONNE CENTRALE : ARMORIES =====
        Cell coatCell;
        try {
            String imagePath = "src/main/resources/static/images/Coat_of_arms_of_Tunisia.svg.png";
            Image img = new Image(ImageDataFactory.create(imagePath));
            img.setWidth(55).setHeight(65);

            // ✅ Important : définir l'alignement horizontal de l'image
            img.setHorizontalAlignment(HorizontalAlignment.CENTER);

            coatCell = new Cell()
                    .add(img)
                    .setBorder(Border.NO_BORDER)
                    .setTextAlignment(TextAlignment.CENTER)  // Centrer le contenu de la cellule
                    .setVerticalAlignment(VerticalAlignment.MIDDLE)
                    .setPadding(0)
                    .setMargin(0);

        } catch (Exception ex) {
            log.warn("Armoiries non chargées : {}", ex.getMessage());
            coatCell = new Cell()
                    .add(new Paragraph("RÉPUBLIQUE TUNISIENNE")
                            .setFont(fontBold).setFontSize(8).setFontColor(ROUGE_TN)
                            .setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("MINISTÈRE DU COMMERCE")
                            .setFont(fontRegular).setFontSize(7).setFontColor(TEXTE_SEC)
                            .setTextAlignment(TextAlignment.CENTER))
                    .setBorder(new SolidBorder(GRIS_ALTERNE, 1))
                    .setVerticalAlignment(VerticalAlignment.MIDDLE)
                    .setPadding(10);
        }
        headerMain.addCell(coatCell);

        // ===== COLONNE DROITE : ARABE =====
        Cell arabCell = new Cell();
        arabCell.setBorder(Border.NO_BORDER);
        arabCell.setVerticalAlignment(VerticalAlignment.MIDDLE);
        arabCell.setPadding(0);
        arabCell.setMargin(0);

        arabCell.add(new Paragraph(shapeArabic("الجمهورية التونسية"))
                .setFont(fontArabic).setFontSize(11).setFontColor(TEXTE)
                .setTextAlignment(TextAlignment.RIGHT)
                .setMargin(0).setPadding(0)
                .setMarginBottom(2));

        arabCell.add(new Paragraph(shapeArabic("وزارة التجارة"))
                .setFont(fontArabic).setFontSize(9).setFontColor(TEXTE_SEC)
                .setTextAlignment(TextAlignment.RIGHT)
                .setMargin(0).setPadding(0)
                .setMarginBottom(2));

        arabCell.add(new Paragraph(shapeArabic("وإنعاش الصادرات"))
                .setFont(fontArabic).setFontSize(9).setFontColor(TEXTE_SEC)
                .setTextAlignment(TextAlignment.RIGHT)
                .setMargin(0).setPadding(0)
                .setMarginBottom(0));

        headerMain.addCell(arabCell);

        doc.add(headerMain);
        addRule(doc, ROUGE_TN, 1f);
        addRule(doc, ROUGE_TN, 3f);
        doc.add(spacer(5));
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. Titre du document
    // ────────────────────────────────────────────────────────────────────────
    private void addDocumentTitle(Document doc,
                                  PdfFont fontBold,
                                  PdfFont fontItalic,
                                  String reference,
                                  String dateGen) throws Exception {
        doc.add(spacer(4));

        Table titleBox = new Table(UnitValue.createPercentArray(new float[]{100}));
        titleBox.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(10);
        titleBox.addCell(new Cell()
                .add(new Paragraph("RAPPORT DE SUIVI DES DEMANDES D'IMPORTATION")
                        .setFont(fontBold).setFontSize(13).setFontColor(BLANC)
                        .setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph("Document Officiel de Synthèse")
                        .setFont(fontItalic).setFontSize(8).setFontColor(GRIS_ALTERNE)
                        .setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(ROUGE_TN)
                .setPadding(11).setBorder(Border.NO_BORDER));
        doc.add(titleBox);

        Table refRow = new Table(UnitValue.createPercentArray(new float[]{50, 50}));
        refRow.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(12);
        refRow.addCell(new Cell()
                .add(new Paragraph("Référence : " + reference)
                        .setFont(fontBold).setFontSize(8).setFontColor(TEXTE_SEC))
                .setBorder(Border.NO_BORDER));
        refRow.addCell(new Cell()
                .add(new Paragraph("Date d'émission : " + dateGen)
                        .setFont(fontBold).setFontSize(8).setFontColor(TEXTE_SEC)
                        .setTextAlignment(TextAlignment.RIGHT))
                .setBorder(Border.NO_BORDER));
        doc.add(refRow);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. Identité importateur
    // ────────────────────────────────────────────────────────────────────────
    private void addImporteurSection(Document doc,
                                     PdfFont fontBold,
                                     PdfFont fontRegular,
                                     ImportateurTunisien imp) throws Exception {
        addSectionTitle(doc, fontBold, "I.  INFORMATIONS DE L'IMPORTATEUR");

        String[] lbls = {"Raison sociale", "Adresse e-mail", "Téléphone"};
        String[] vals = {
                imp.getRaisonSociale() != null ? imp.getRaisonSociale() : "N/A",
                imp.getEmail()         != null ? imp.getEmail()         : "N/A",
                imp.getTelephone()     != null ? imp.getTelephone()     : "N/A"
        };

        Table lblTable = new Table(UnitValue.createPercentArray(new float[]{100}));
        lblTable.setWidth(UnitValue.createPercentValue(100));
        Table valTable = new Table(UnitValue.createPercentArray(new float[]{100}));
        valTable.setWidth(UnitValue.createPercentValue(100));

        for (int i = 0; i < lbls.length; i++) {
            lblTable.addCell(new Cell()
                    .add(new Paragraph(lbls[i]).setFont(fontBold).setFontSize(8).setFontColor(TEXTE_SEC))
                    .setBackgroundColor(GRIS_CLAIR).setBorder(Border.NO_BORDER)
                    .setBorderBottom(new SolidBorder(GRIS_ALTERNE, 0.5f))
                    .setPaddingTop(7).setPaddingBottom(7).setPaddingLeft(8));
            valTable.addCell(new Cell()
                    .add(new Paragraph(vals[i]).setFont(fontRegular).setFontSize(9).setFontColor(TEXTE))
                    .setBorder(Border.NO_BORDER)
                    .setBorderBottom(new SolidBorder(GRIS_ALTERNE, 0.5f))
                    .setPaddingTop(7).setPaddingBottom(7).setPaddingLeft(8));
        }

        Table card = new Table(UnitValue.createPercentArray(new float[]{28, 72}));
        card.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(14)
                .setBorder(new SolidBorder(GRIS_ALTERNE, 1));
        card.addCell(new Cell().add(lblTable).setBorder(Border.NO_BORDER)
                .setBorderRight(new SolidBorder(GRIS_ALTERNE, 1)));
        card.addCell(new Cell().add(valTable).setBorder(Border.NO_BORDER));
        doc.add(card);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. Indicateurs clés
    // ────────────────────────────────────────────────────────────────────────
    private void addKpiSection(Document doc,
                               PdfFont fontBold,
                               PdfFont fontRegular,
                               Map<String, Object> stats,
                               List<DemandeEnregistrement> demandes) throws Exception {
        addSectionTitle(doc, fontBold, "II.  INDICATEURS CLÉS");

        String[][] kpiData = {
                {"Volume Mensuel",       stats.get("volumeMensuel")    != null ? stats.get("volumeMensuel")    + " TND" : "0 TND"},
                {"Score de Performance", stats.get("performanceScore") != null ? stats.get("performanceScore") + " %"  : "0 %"},
                {"Total des Demandes",   String.valueOf(demandes.size())}
        };

        Table kpiTable = new Table(UnitValue.createPercentArray(new float[]{33, 33, 34}));
        kpiTable.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(14);
        for (String[] kpi : kpiData) {
            kpiTable.addCell(new Cell()
                    .add(new Paragraph(kpi[0]).setFont(fontRegular).setFontSize(8).setFontColor(TEXTE_SEC)
                            .setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph(kpi[1]).setFont(fontBold).setFontSize(16).setFontColor(BLEU_OFF)
                            .setTextAlignment(TextAlignment.CENTER))
                    .setBackgroundColor(GRIS_CLAIR).setBorder(new SolidBorder(GRIS_ALTERNE, 1))
                    .setPadding(12));
        }
        doc.add(kpiTable);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. Répartition par catégorie
    // ────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private void addCategoriesSection(Document doc,
                                      PdfFont fontBold,
                                      PdfFont fontRegular,
                                      Map<String, Object> stats) throws Exception {
        List<Map<String, Object>> categories =
                (List<Map<String, Object>>) stats.get("volumeParCategorie");
        if (categories == null || categories.isEmpty()) return;

        addSectionTitle(doc, fontBold, "III.  RÉPARTITION PAR CATÉGORIE");

        Table catTable = new Table(UnitValue.createPercentArray(new float[]{40, 45, 15}));
        catTable.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(14);

        for (String h : new String[]{"CATÉGORIE", "RÉPARTITION", "VALEUR"}) {
            catTable.addCell(new Cell()
                    .add(new Paragraph(h).setFont(fontBold).setFontSize(8).setFontColor(BLANC))
                    .setBackgroundColor(ENTETE_TAB).setBorder(Border.NO_BORDER)
                    .setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(8));
        }

        boolean alt = false;
        for (Map<String, Object> cat : categories) {
            String name  = (String)  cat.get("name");
            int    value = (Integer) cat.get("value");
            DeviceRgb bg = alt ? GRIS_ALTERNE : BLANC;

            catTable.addCell(new Cell()
                    .add(new Paragraph(name).setFont(fontRegular).setFontSize(9).setFontColor(TEXTE))
                    .setBackgroundColor(bg).setBorder(Border.NO_BORDER)
                    .setBorderBottom(new SolidBorder(GRIS_ALTERNE, 0.5f)).setPadding(6));
            catTable.addCell(new Cell().add(buildProgressBar(value))
                    .setBackgroundColor(bg).setBorder(Border.NO_BORDER)
                    .setBorderBottom(new SolidBorder(GRIS_ALTERNE, 0.5f))
                    .setPaddingTop(10).setPaddingBottom(10).setPaddingLeft(8).setPaddingRight(8));
            catTable.addCell(new Cell()
                    .add(new Paragraph(value + " %").setFont(fontBold).setFontSize(9).setFontColor(BLEU_OFF)
                            .setTextAlignment(TextAlignment.CENTER))
                    .setBackgroundColor(bg).setBorder(Border.NO_BORDER)
                    .setBorderBottom(new SolidBorder(GRIS_ALTERNE, 0.5f)).setPadding(6));
            alt = !alt;
        }
        doc.add(catTable);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 6. Tableau des demandes
    // ────────────────────────────────────────────────────────────────────────
    private void addDemandesTable(Document doc,
                                  PdfFont fontBold,
                                  PdfFont fontRegular,
                                  List<DemandeEnregistrement> demandes) throws Exception {
        addSectionTitle(doc, fontBold, "IV.  LISTE DES DEMANDES D'ENREGISTREMENT");

        Table table = new Table(UnitValue.createPercentArray(new float[]{22, 14, 17, 16, 31}));
        table.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20);

        for (String h : new String[]{"RÉFÉRENCE", "DATE", "MONTANT (TND)", "STATUT", "PAYS D'ORIGINE"}) {
            table.addCell(new Cell()
                    .add(new Paragraph(h).setFont(fontBold).setFontSize(8).setFontColor(BLANC))
                    .setBackgroundColor(ENTETE_TAB).setBorder(Border.NO_BORDER)
                    .setBorderRight(new SolidBorder(new DeviceRgb(70, 95, 130), 0.5f))
                    .setPaddingTop(7).setPaddingBottom(7).setPaddingLeft(6));
        }

        boolean alt = false;
        for (DemandeEnregistrement d : demandes) {
            List<DemandeProduit> dp = demandeProduitRepository.findByDemandeId(d.getId());
            String pays    = dp.isEmpty() ? "N/A" : dp.get(0).getProduit().getOriginCountry();
            String status  = d.getStatus() != null ? d.getStatus().toString() : "N/A";
            DeviceRgb bg   = alt ? GRIS_ALTERNE : BLANC;

            String ref     = d.getReference()     != null ? d.getReference() : "N/A";
            String date    = d.getSubmittedAt()   != null
                    ? d.getSubmittedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "N/A";
            String montant = d.getPaymentAmount() != null ? d.getPaymentAmount().toString() : "0";

            table.addCell(cellData(ref,     fontRegular, TEXTE,    bg));
            table.addCell(cellData(date,    fontRegular, TEXTE,    bg));
            table.addCell(cellData(montant, fontBold,    BLEU_OFF, bg));
            table.addCell(new Cell()
                    .add(new Paragraph(status).setFont(fontBold).setFontSize(7)
                            .setFontColor(getStatusColor(status)).setTextAlignment(TextAlignment.CENTER))
                    .setBackgroundColor(bg).setBorder(Border.NO_BORDER)
                    .setBorderBottom(new SolidBorder(GRIS_ALTERNE, 0.5f)).setPadding(6));
            table.addCell(cellData(pays, fontRegular, TEXTE, bg));
            alt = !alt;
        }
        doc.add(table);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 7. Pied de page
    // ────────────────────────────────────────────────────────────────────────
    private void addOfficialFooter(Document doc,
                                   PdfFont fontItalic,
                                   PdfDocument pdfDoc,
                                   String dateGen) {
        addRule(doc, GRIS_ALTERNE, 1f);
        addRule(doc, ROUGE_TN,     2f);
        doc.add(spacer(4));

        Table footer = new Table(UnitValue.createPercentArray(new float[]{60, 40}));
        footer.setWidth(UnitValue.createPercentValue(100));
        footer.addCell(new Cell()
                .add(new Paragraph("Ce document est émis automatiquement par le Système d'Information " +
                        "du Ministère du Commerce et de la Promotion des Exportations.")
                        .setFont(fontItalic).setFontSize(7).setFontColor(TEXTE_SEC))
                .setBorder(Border.NO_BORDER));
        footer.addCell(new Cell()
                .add(new Paragraph("Page " + pdfDoc.getPageNumber(pdfDoc.getLastPage()))
                        .setFont(fontItalic).setFontSize(7).setFontColor(TEXTE_SEC)
                        .setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Émis le " + dateGen)
                        .setFont(fontItalic).setFontSize(7).setFontColor(TEXTE_SEC)
                        .setTextAlignment(TextAlignment.RIGHT))
                .setBorder(Border.NO_BORDER));
        doc.add(footer);
    }

    // ────────────────────────────────────────────────────────────────────────
    // UTILITAIRES
    // ────────────────────────────────────────────────────────────────────────

    /** Filet rouge à gauche + titre en bleu ardoise — fond neutre */
    private void addSectionTitle(Document doc, PdfFont fontBold, String text) {
        Table t = new Table(UnitValue.createPercentArray(new float[]{1, 99}));
        t.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(8).setMarginTop(6);
        t.addCell(new Cell().setBackgroundColor(ROUGE_TN).setBorder(Border.NO_BORDER).setPadding(0));
        t.addCell(new Cell()
                .add(new Paragraph(text).setFont(fontBold).setFontSize(10).setFontColor(BLEU_OFF))
                .setBorder(Border.NO_BORDER)
                .setBorderBottom(new SolidBorder(GRIS_ALTERNE, 0.8f))
                .setPaddingLeft(8).setPaddingBottom(4));
        doc.add(t);
    }

    /** Barre de progression bleu ardoise */
    private Table buildProgressBar(int pct) {
        int filled = Math.max(0, Math.min(100, pct));
        int empty  = 100 - filled;
        float[] cols = (filled > 0 && empty > 0) ? new float[]{filled, empty} : new float[]{100};
        Table bar = new Table(UnitValue.createPercentArray(cols));
        bar.setWidth(UnitValue.createPercentValue(100));
        if (filled > 0) bar.addCell(new Cell().setBackgroundColor(BLEU_OFF)
                .setHeight(6).setBorder(Border.NO_BORDER).setPadding(0));
        if (empty  > 0) bar.addCell(new Cell().setBackgroundColor(GRIS_ALTERNE)
                .setHeight(6).setBorder(Border.NO_BORDER).setPadding(0));
        return bar;
    }

    private void addRule(Document doc, DeviceRgb color, float width) {
        SolidLine sl = new SolidLine();
        sl.setColor(color);
        sl.setLineWidth(width);
        doc.add(new LineSeparator(sl));
    }

    private Paragraph spacer(int size) {
        return new Paragraph(" ").setFontSize(size).setMargin(0);
    }

    private Cell cellData(String text, PdfFont font, DeviceRgb color, DeviceRgb bg) {
        return new Cell()
                .add(new Paragraph(text).setFont(font).setFontSize(9).setFontColor(color))
                .setBackgroundColor(bg).setBorder(Border.NO_BORDER)
                .setBorderBottom(new SolidBorder(GRIS_ALTERNE, 0.5f)).setPadding(6);
    }

    /**
     * Reshape et réordonne le texte arabe pour un affichage correct dans iText7 community.
     * Utilise ICU4J (com.ibm.icu) — ajoutez la dépendance Maven si absente :
     *   <dependency>
     *     <groupId>com.ibm.icu</groupId>
     *     <artifactId>icu4j</artifactId>
     *     <version>73.2</version>
     *   </dependency>
     */
    private String shapeArabic(String text) {
        if (text == null || text.isEmpty()) return text;

        try {
            // Pour ICU4J version 73+
            ArabicShaping shaper = new ArabicShaping(ArabicShaping.LETTERS_SHAPE);
            String shaped = shaper.shape(text);

            // Bidi pour inverser la direction
            Bidi bidi = new Bidi(shaped, Bidi.DIRECTION_DEFAULT_RIGHT_TO_LEFT);
            return bidi.writeReordered(Bidi.REORDER_DEFAULT);

        } catch (Exception e) {
            log.warn("Erreur shaping arabe pour '{}' : {}", text, e.getMessage());
            // Fallback : inverser manuellement la chaîne
            return new StringBuilder(text).reverse().toString();
        }
    }

    private DeviceRgb getStatusColor(String status) {
        if (status == null) return TEXTE_SEC;
        switch (status) {
            case "VALIDEE":             return new DeviceRgb( 22, 163,  74);
            case "REJETEE":             return new DeviceRgb(185,  28,  28);
            case "SOUMISE":
            case "EN_COURS_VALIDATION": return new DeviceRgb(161,  98,   7);
            default:                    return TEXTE_SEC;
        }
    }
}