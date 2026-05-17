"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   DATA INTERFACE
   Exported so the print page (server component) can build and pass it in.
   ───────────────────────────────────────────────────────────────────────────── */
export interface PrintFormData {
  rank: string;
  fullName: string;
  unitOffice: string;
  age: number;
  height: string;
  weight: string;
  waist: string;
  hip: string;
  wrist: string;
  gender: string;
  dateTaken: string;
  bmiResult: string;
  normalWeightRange: string;
  weightAction: string;
  pnpClassification: string;
  bmiClassification: string;
  interventionPackage: string;
  photoRight: string | null;
  photoFront: string | null;
  photoLeft: string | null;
  /** 12-element array indexed Jan=0 … Dec=11; null = no data that month */
  monthlyWeight: (number | null)[];
  monthlyBmi: (number | null)[];
  certifiedBy: string;
  certifiedTitle: string;
  formId: string;
  generatedAt: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SAMPLE / MOCK FALLBACK
   ───────────────────────────────────────────────────────────────────────────── */
const SAMPLE: PrintFormData = {
  rank:                "PMAJ",
  fullName:            "DELA CRUZ, JUAN M.",
  unitOffice:          "PRO CALABARZON – CAMP VICENTE LIM",
  age:                 34,
  height:              "1.72 m",
  weight:              "62 kg",
  waist:               "78 cm",
  hip:                 "92 cm",
  wrist:               "17 cm",
  gender:              "Male",
  dateTaken:           "15 January 2024",
  bmiResult:           "20.96",
  normalWeightRange:   "55.2 – 79.5 kg",
  weightAction:        "0 kg  (Within Normal Range)",
  pnpClassification:   "NORMAL",
  bmiClassification:   "NORMAL",
  interventionPackage: "B",
  photoRight:          null,
  photoFront:          null,
  photoLeft:           null,
  monthlyWeight:  [62, 65, 65, 63, null, null, null, null, null, null, null, null],
  monthlyBmi:     [23.3, 23.90, 23.90, 24.0, null, null, null, null, null, null, null, null],
  certifiedBy:    "PCOL SANTOS, ROBERTO A.",
  certifiedTitle: "Chief, Health Service",
  formId:         "BMI-2024-001-DLCRZ",
  generatedAt:    "17 May 2026  •  09:42 AM",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ─────────────────────────────────────────────────────────────────────────────
   PDF HELPERS
   ───────────────────────────────────────────────────────────────────────────── */
/**
 * Load any URL the browser can display and return a JPEG data-URL that
 * pdfmake can embed. Using a canvas guarantees the output is always
 * image/jpeg regardless of the source format (WebP, HEIC, PNG, etc.).
 * Returns null if the image cannot be loaded for any reason.
 */
function urlToJpegDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous"; // needed so canvas.toDataURL() isn't tainted
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width  = img.naturalWidth  || 1;
        canvas.height = img.naturalHeight || 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        // White background so transparent PNGs become valid for JPEG output
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      } catch {
        resolve(null); // canvas tainted by CORS or other error
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ── Photo cell geometry (all derived from the constants below) ───────────────
// A4 landscape = 841.89 pt wide; pageMargins = [36, 36, 36, 36]
const PAGE_MARGIN  = 36;
const USABLE_W     = 841.89 - PAGE_MARGIN * 2;         // 769.89 pt printable width

const PHOTO_COL_W  = USABLE_W * 0.50;                  // left column = exactly 50 % of page
const PHOTO_CELL_W = Math.floor(PHOTO_COL_W / 3) - 2;  // one cell (3 across), minus borders
const PHOTO_FIT_W  = PHOTO_CELL_W - 4;                 // 2 pt breathing room each side

const PHOTO_ROW_H  = 243;  // ← one number controls the entire photo block height
const LABEL_H      = 18;   //   bottom label row  (text 8 pt + 5 pt top + 5 pt bottom)
const IMG_AREA_H   = PHOTO_ROW_H - LABEL_H;            // image / icon zone

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makePhotoCell(dataUrl: string | null, label: string): any {
  const bg            = dataUrl ? "#fdfdfd" : "#f8fafc";
  const iconTopMargin = Math.floor((IMG_AREA_H - 10) / 2); // vertically center "NO PHOTO" text

  // Two-row inner table:
  //   Row 1 (IMG_AREA_H) — image or placeholder icon, fills the upper zone
  //   Row 2 (LABEL_H)    — view label, always pinned to the bottom
  return {
    table: {
      widths:  ["*"],
      heights: [IMG_AREA_H, LABEL_H],
      body: [
        [
          dataUrl
            ? { image: dataUrl, fit: [PHOTO_FIT_W, IMG_AREA_H], alignment: "center", fillColor: bg }
            : { text: "[ NO PHOTO ]", fontSize: 8, color: "#94a3b8", alignment: "center", margin: [0, iconTopMargin, 0, 0], fillColor: bg }
        ],
        [
          { text: label, style: "photoLabel", margin: [0, 5, 0, 5], fillColor: bg }
        ],
      ],
    },
    layout: {
      hLineWidth:    () => 0,
      vLineWidth:    () => 0,
      paddingLeft:   () => 0,
      paddingRight:  () => 0,
      paddingTop:    () => 0,
      paddingBottom: () => 0,
    },
  };
}

type PhotoSet = { photoRight: string | null; photoFront: string | null; photoLeft: string | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDocDefinition(d: PrintFormData, photos: PhotoSet): any {
  const year     = d.dateTaken.split(/[\s,]+/).pop() ?? String(new Date().getFullYear());
  const rankName = [d.rank, d.fullName].filter(Boolean).join(" ");

  return {
    pageSize:        "A4",
    pageOrientation: "landscape",
    pageMargins:     [36, 36, 36, 36],

    content: [
      { text: "INDIVIDUAL BMI MONITORING FORM", style: "formTitle", alignment: "center" },

      {
        table: {
          widths: ["*"],
          body: [

            // ── ROW 1: Photos (55%) + Measurements (45%) ──
            [
              {
                table: {
                  widths: ["50%", "50%"],
                  body: [[
                    // LEFT: photo cells
                    {
                      table: {
                        widths:  ["*", "*", "*"],
                        heights: [PHOTO_ROW_H], // lock row height — image or placeholder, same size
                        body: [[
                          makePhotoCell(photos.photoRight, "RIGHT VIEW"),
                          makePhotoCell(photos.photoFront, "FRONT VIEW"),
                          makePhotoCell(photos.photoLeft,  "LEFT VIEW"),
                        ]],
                      },
                      layout: {
                        hLineWidth:    () => 1,
                        vLineWidth:    () => 1,
                        hLineColor:    () => "#cbd5e1",
                        vLineColor:    () => "#cbd5e1",
                        paddingLeft:   () => 0,
                        paddingRight:  () => 0,
                        paddingTop:    () => 0,
                        paddingBottom: () => 0,
                      },
                    },

                    // RIGHT: measurements key-value table
                    {
                      table: {
                        widths:  ["*", "*"],
                        heights: [22, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14],
                        body: [
                          [
                            {
                              text: [
                                { text: "Rank / Name: ", bold: true, color: "#334155" },
                                { text: rankName, color: "#0f172a" },
                              ],
                              fillColor: "#f8fafc", fontSize: 8.5, margin: [6, 3, 4, 3],
                            },
                            {
                              text: [
                                { text: "Unit / Station: ", bold: true, color: "#334155" },
                                { text: d.unitOffice, color: "#0f172a" },
                              ],
                              fillColor: "#f8fafc", fontSize: 8.5, margin: [6, 3, 4, 3],
                            },
                          ],
                          [{ text: "Age:",            style: "measurementLabel" }, { text: `${d.age} years`,    style: "measurementValue" }],
                          [{ text: "Height:",         style: "measurementLabel" }, { text: d.height,            style: "measurementValue" }],
                          [{ text: "Weight:",         style: "measurementLabel" }, { text: d.weight,            style: "measurementValue" }],
                          [{ text: "Waist:",          style: "measurementLabel" }, { text: d.waist,             style: "measurementValue" }],
                          [{ text: "Hip:",            style: "measurementLabel" }, { text: d.hip,               style: "measurementValue" }],
                          [{ text: "Wrist:",          style: "measurementLabel" }, { text: d.wrist,             style: "measurementValue" }],
                          [{ text: "Gender:",         style: "measurementLabel" }, { text: d.gender,            style: "measurementValue" }],
                          [{ text: "Date Taken:",     style: "measurementLabel" }, { text: d.dateTaken,         style: "measurementValue" }],
                          [{ text: "BMI Result:",     style: "measurementLabel" }, { text: d.bmiResult,         style: "measurementValue" }],
                          [{ text: "Normal Weight:",  style: "measurementLabel" }, { text: d.normalWeightRange, style: "measurementValue" }],
                          [{ text: "Weight to Lose:", style: "measurementLabel" }, { text: d.weightAction,      style: "measurementValue" }],
                        ],
                      },
                      layout: {
                        hLineWidth: () => 1, vLineWidth: () => 1,
                        hLineColor: () => "#cbd5e1", vLineColor: () => "#cbd5e1",
                      },
                    },
                  ]],
                },
                layout: {
                  hLineWidth:    () => 0,
                  vLineWidth:    (i: number) => (i === 1 ? 1 : 0),
                  vLineColor:    () => "#cbd5e1",
                  paddingLeft:   () => 0,
                  paddingRight:  () => 0,
                  paddingTop:    () => 0,
                  paddingBottom: () => 0,
                },
              },
            ],

            // ── ROW 2: Standards Block ──
            [
              {
                table: {
                  widths: ["*", "*", "*", "*"],
                  heights: [80],
                  body: [[
                    {
                      stack: [
                        { text: "PNP BMI Acceptable Standard:", style: "standardsBlockTitleLeft" },
                        { text: d.pnpClassification || "—", style: "standardsBlockValueCenter", margin: [0, 6, 0, 0] },
                      ],
                    },
                    {
                      stack: [
                        { text: "WHO Standard:\n(Refer to WHO Classification)", style: "standardsBlockTitleLeft" },
                        { text: d.bmiClassification || "—", style: "standardsBlockValueCenter", margin: [0, 1, 0, 0] },
                      ],
                    },
                    {
                      stack: [
                        { text: "Intervention Package:", style: "standardsBlockTitleLeft" },
                        { text: d.interventionPackage || "—", style: "standardsBlockValueCenter", margin: [0, 6, 0, 0] },
                      ],
                    },
                    {
                      stack: [
                        { text: "Certified by:", style: "standardsBlockTitleLeft" },
                        { text: d.certifiedBy || "___________________________", style: "certifiedByValue", margin: [0, 4, 0, 0] },
                      ],
                    },
                  ]],
                },
                layout: {
                  hLineWidth: () => 1, vLineWidth: () => 1,
                  hLineColor: () => "#cbd5e1", vLineColor: () => "#cbd5e1",
                },
              },
            ],

            // ── ROW 3: Monthly Monitoring Title ──
            [{ text: "MONTHLY WEIGHT MONITORING", style: "trackingTitleFullWidth", alignment: "center" }],

            // ── ROW 4: Monthly Matrix + Verified By ──
            [
              {
                table: {
                  widths: ["*", 180],
                  body: [[
                    {
                      table: {
                        widths: [100, "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"],
                        body: [
                          [
                            { text: "YEAR", style: "matrixLabelCenter" },
                            { text: year, style: "matrixDataYearCenter", colSpan: 12 },
                            "", "", "", "", "", "", "", "", "", "", "",
                          ],
                          [
                            { text: "MONTH", style: "matrixLabelCenter" },
                            ...MONTHS.map((m) => ({ text: m, style: "matrixHeader" })),
                          ],
                          [
                            { text: "WEIGHT (KG)", style: "matrixLabelCenter" },
                            ...d.monthlyWeight.map((v) => ({ text: v != null ? String(v) : "", style: "matrixData" })),
                          ],
                          [
                            { text: "BMI RESULT", style: "matrixLabelCenter" },
                            ...d.monthlyBmi.map((v) => ({ text: v != null ? String(v) : "", style: "matrixData" })),
                          ],
                        ],
                      },
                      layout: {
                        hLineWidth: () => 1, vLineWidth: () => 1,
                        hLineColor: () => "#cbd5e1", vLineColor: () => "#cbd5e1",
                      },
                    },
                    {
                      margin: [4, 16, 4, 4],
                      stack: [
                        { text: "Verified by:", style: "footerSignatureLabel", alignment: "center" },
                        { text: " ", margin: [0, 0, 0, 12] },
                        { text: d.certifiedBy || "___________________________", style: "signerName", alignment: "center" },
                        { text: d.certifiedTitle, style: "signerTitle", alignment: "center" },
                      ],
                    },
                  ]],
                },
                layout: {
                  hLineWidth: () => 0,
                  vLineWidth: (i: number) => (i === 1 ? 1 : 0),
                  vLineColor: () => "#cbd5e1",
                },
              },
            ],

          ],
        },
        layout: {
          hLineWidth:    () => 1.5,
          vLineWidth:    () => 1.5,
          hLineColor:    () => "#0f172a",
          vLineColor:    () => "#0f172a",
          paddingLeft:   () => 0,
          paddingRight:  () => 0,
          paddingTop:    () => 0,
          paddingBottom: () => 0,
        },
      },
    ],

    styles: {
      formTitle:                 { fontSize: 14, bold: true, color: "#0f172a", margin: [0, 0, 0, 8] },
      photoLabel:                { fontSize: 8,  bold: true, color: "#475569", alignment: "center" },
      standardsBlockTitleLeft:   { fontSize: 7.5, bold: true, color: "#475569", alignment: "left",   margin: [4, 2, 0, 0] },
      standardsBlockValueCenter: { fontSize: 11,  bold: true, color: "#0284c7", alignment: "center" },
      certifiedByValue:          { fontSize: 8,   bold: true, color: "#0f172a", alignment: "center" },
      measurementLabel:          { fontSize: 8.5, bold: true, color: "#334155", margin: [6, 2, 0, 2] },
      measurementValue:          { fontSize: 9,              color: "#000000", margin: [4, 2, 0, 2] },
      trackingTitleFullWidth:    { fontSize: 9,   bold: true, color: "#0f172a", margin: [0, 4, 0, 4], fillColor: "#f1f5f9" },
      matrixHeader:              { fontSize: 8,   bold: true, alignment: "center", margin: [0, 3, 0, 3], fillColor: "#f8fafc" },
      matrixLabelCenter:         { fontSize: 8,   bold: true, color: "#1e293b", alignment: "center", margin: [4, 3, 4, 3] },
      matrixData:                { fontSize: 8.5, alignment: "center", margin: [0, 3, 0, 3] },
      matrixDataYearCenter:      { fontSize: 8.5, bold: true, alignment: "center", color: "#000000", margin: [0, 3, 0, 3] },
      footerSignatureLabel:      { fontSize: 8.5, bold: true, color: "#334155" },
      signerName:                { fontSize: 8.5, bold: true, color: "#0f172a", decoration: "underline" },
      signerTitle:               { fontSize: 7.5, color: "#475569" },
    },
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   PDFMAKE LOADER  (handles 0.3.x virtualfs API)
   ───────────────────────────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPdfMake(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw    = await import("pdfmake/build/pdfmake") as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vfsRaw = await import("pdfmake/build/vfs_fonts") as any;

  const pdfMake  = raw.default    ?? raw;
  const pdfFonts = vfsRaw.default ?? vfsRaw;

  // pdfmake 0.2.x: vfs_fonts ships as { pdfMake: { vfs: { filename → base64 } } }
  // Assigning pdfMake.vfs lets the internal font loader resolve filenames → binary.
  pdfMake.vfs = pdfFonts?.pdfMake?.vfs ?? pdfFonts;

  return pdfMake;
}

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */
export default function BmiMonitoringFormPrint({ data }: { data?: PrintFormData }) {
  const d      = data ?? SAMPLE;
  const router = useRouter();

  const [blobUrl, setBlobUrl]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [errMsg,  setErrMsg]    = useState<string | null>(null);
  const blobRef                 = useRef<string | null>(null);

  /* ── Auto-generate PDF on mount ─────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function generate() {
      setLoading(true);
      setErrMsg(null);
      try {
        const [photoRight, photoFront, photoLeft] = await Promise.all([
          d.photoRight ? urlToJpegDataUrl(d.photoRight) : Promise.resolve(null),
          d.photoFront ? urlToJpegDataUrl(d.photoFront) : Promise.resolve(null),
          d.photoLeft  ? urlToJpegDataUrl(d.photoLeft)  : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const pdfMake = await loadPdfMake();
        const docDef  = buildDocDefinition(d, { photoRight, photoFront, photoLeft });

        pdfMake.createPdf(docDef).getBlob((blob: Blob) => {
          if (cancelled) return;
          // Revoke any previous blob URL before creating a new one
          if (blobRef.current) URL.revokeObjectURL(blobRef.current);
          const url       = URL.createObjectURL(blob);
          blobRef.current = url;
          setBlobUrl(url);
          setLoading(false);
        });
      } catch (err) {
        if (cancelled) return;
        console.error("PDF generation error:", err);
        setErrMsg("Could not generate PDF. Please try refreshing the page.");
        setLoading(false);
      }
    }

    generate();

    return () => {
      cancelled = true;
      // Revoke blob URL on unmount
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Open PDF in new tab for printing / saving ──────────────────────────── */
  function handlePrint() {
    if (blobUrl) window.open(blobUrl, "_blank");
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-100">

      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/dashboard/my-profile")}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        <button
          type="button"
          onClick={handlePrint}
          disabled={!blobUrl || loading}
          className="flex items-center gap-2 rounded-md bg-[#1e3a5f] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#162d4a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Printer className="size-4" />
          Print / Download
        </button>
      </div>

      {/* ── PDF Viewer ─────────────────────────────────────────────────────── */}
      <div className="relative flex-1">

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-gray-100">
            <Loader2 className="h-10 w-10 animate-spin text-[#1a3a8a]" />
            <p className="text-sm font-medium text-gray-600">Generating PDF preview…</p>
          </div>
        )}

        {/* Error state */}
        {errMsg && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-100">
            <p className="text-sm font-semibold text-red-600">{errMsg}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* PDF iframe — fills the remaining viewport height */}
        {blobUrl && (
          <iframe
            src={blobUrl}
            title="BMI Monitoring Form PDF"
            className="h-full w-full border-0"
          />
        )}
      </div>
    </div>
  );
}
