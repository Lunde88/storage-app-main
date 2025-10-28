// NO "use client"; keep this file purely server/render-safe
import {
  Document as PDFDocument,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

export type JpegSource = {
  data: Buffer;
  format: "jpg";
  width: number;
  height: number;
};

export type MarkerPhotoPdf = { id: string; pdfSrc?: JpegSource };
export type MarkerPdf = {
  id: string;
  x: number;
  y: number;
  w: number | null;
  h: number | null;
  label?: string | null;
  note?: string | null;
  photos?: MarkerPhotoPdf[];
};

export type SidePdf = {
  id: string;
  side: "front" | "nearside" | "back" | "offside" | "interior";
  main?: JpegSource;
  cardWidth: number;
  displayWidth: number;
  displayHeight: number;
  markers?: MarkerPdf[];
};

export type ReportPdfProps = {
  vehicleIdentifier: string;
  reportTitle: string;
  createdAt: string;
  updatedAt?: string | null;
  submittedAt?: string | null;
  status?: string | null;
  odometerMiles?: number | null;
  inspector?: string | null;

  // Optional movement block
  movement?: {
    event: string;
    when: string;
    from?: string | null;
    to?: string | null;
    createdBy?: string | null;
    quantity?: number | null;
    notes?: string | null;
  };

  // Optional levels (already computed to percentages 0..100)
  levels?: Array<{ key: string; label: string; pct: number }>;

  // Photos and marker thumbnails (already converted to JPEG buffers)
  sides?: SidePdf[];

  // Optional free text notes
  notes?: string | null;

  pdfGeneratedAt?: string;
};

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10 },
  h1: { fontSize: 16, marginBottom: 8 },
  h2: { fontSize: 12, marginTop: 12, marginBottom: 6 },
  section: { marginBottom: 10 },
  box: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  small: { color: "#666" },
  barOuter: {
    height: 6,
    backgroundColor: "#eee",
    borderRadius: 3,
    overflow: "hidden",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", // makes two fixed-width cards sit side-by-side
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    overflow: "hidden", // safety
  },
  photoWrap: { position: "relative", overflow: "hidden" }, // safety
  imageAbs: { position: "absolute", left: 0, top: 0 },

  markerDot: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#86101E",
    backgroundColor: "#FFE4E7",
    alignItems: "center",
    justifyContent: "center",
  },
  markerNum: { fontSize: 8, color: "#86101E" },
  markerBox: { position: "absolute", borderWidth: 2, borderColor: "#c00" },
  thumb: {
    width: 70,
    height: 70,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
  },
});

export function buildReportPdf(props: ReportPdfProps) {
  const {
    vehicleIdentifier,
    reportTitle,
    createdAt,
    updatedAt,
    submittedAt,
    status,
    odometerMiles,
    inspector,
    movement,
    levels,
    sides,
    notes,
    pdfGeneratedAt,
  } = props;

  const pdfGenerated =
    pdfGeneratedAt ??
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/London",
    }).format(new Date());

  return (
    <PDFDocument>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>
          {vehicleIdentifier.toUpperCase()} — {reportTitle} Condition Report
        </Text>

        {/* Meta */}
        <View style={styles.box}>
          <View style={styles.row}>
            <Text>PDF Generated</Text>
            <Text>{pdfGenerated}</Text>
          </View>
          <View style={styles.row}>
            <Text>Report Completed</Text>
            <Text>{createdAt}</Text>
          </View>
          {updatedAt && (
            <View style={styles.row}>
              <Text>Last Updated</Text>
              <Text>{updatedAt}</Text>
            </View>
          )}
          {submittedAt && (
            <View style={styles.row}>
              <Text>Submitted</Text>
              <Text>{submittedAt}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text>Status</Text>
            <Text>{status?.toUpperCase() ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text>Inspector</Text>
            <Text>{inspector ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text>Odometer</Text>
            <Text>{odometerMiles != null ? `${odometerMiles}` : "—"}</Text>
          </View>
        </View>

        {/* Movement */}
        <Text style={styles.h2}>Reason & Context</Text>
        <View style={styles.box}>
          {movement ? (
            <>
              <View style={styles.row}>
                <Text>Event</Text>
                <Text>{movement.event}</Text>
              </View>
              <View style={styles.row}>
                <Text>When</Text>
                <Text>{movement.when}</Text>
              </View>
              <View style={styles.row}>
                <Text>From</Text>
                <Text>{movement.from ?? "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text>To</Text>
                <Text>{movement.to ?? "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text>Report carried out by</Text>
                <Text>{movement.createdBy ?? "—"}</Text>
              </View>
              {typeof movement.quantity === "number" && (
                <View style={styles.row}>
                  <Text>Quantity</Text>
                  <Text>{movement.quantity}</Text>
                </View>
              )}
              {movement.notes && (
                <Text style={styles.small}>{movement.notes}</Text>
              )}
            </>
          ) : (
            <Text style={styles.small}>No recent movement recorded.</Text>
          )}
        </View>

        {/* Levels */}
        {levels && levels.length > 0 && (
          <>
            <Text style={styles.h2}>Vehicle Levels</Text>
            <View style={styles.box}>
              {levels.map((lvl) => (
                <View key={lvl.key} style={{ marginBottom: 6 }}>
                  <View style={styles.row}>
                    <Text>{lvl.label}</Text>
                    <Text>{lvl.pct}%</Text>
                  </View>
                  <View style={styles.barOuter}>
                    <View
                      style={{
                        height: 6,
                        width: `${lvl.pct}%`,
                        backgroundColor: "#444",
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Photos */}
        {sides && sides.length > 0 && <Text style={styles.h2}>Photos</Text>}
        <View style={styles.grid}>
          {sides?.map((sp) => (
            <View key={sp.id} style={[styles.card, { width: sp.cardWidth }]}>
              <Text style={{ fontSize: 11, marginBottom: 6 }}>
                {sp.side.charAt(0).toUpperCase() + sp.side.slice(1)}
              </Text>

              {sp.main ? (
                <View
                  style={[
                    styles.photoWrap,
                    { width: sp.displayWidth, height: sp.displayHeight },
                  ]}
                >
                  {/* base image absolutely positioned to fill the wrapper */}
                  <Image
                    src={sp.main}
                    style={[
                      styles.imageAbs,
                      { width: sp.displayWidth, height: sp.displayHeight },
                    ]}
                  />

                  {/* overlay markers */}
                  {sp.markers?.map((m, idx) => {
                    const left = Math.max(
                      0,
                      Math.min(
                        sp.displayWidth,
                        Math.round(sp.displayWidth * m.x),
                      ),
                    );
                    const top = Math.max(
                      0,
                      Math.min(
                        sp.displayHeight,
                        Math.round(sp.displayHeight * m.y),
                      ),
                    );
                    const hasBox =
                      m.w != null && m.h != null && m.w > 0 && m.h > 0;
                    const boxW = hasBox
                      ? Math.round(sp.displayWidth * (m.w as number))
                      : 0;
                    const boxH = hasBox
                      ? Math.round(sp.displayHeight * (m.h as number))
                      : 0;

                    return (
                      <View key={m.id}>
                        {hasBox ? (
                          <View
                            style={[
                              styles.markerBox,
                              { left, top, width: boxW, height: boxH },
                            ]}
                          />
                        ) : (
                          <View
                            style={[
                              styles.markerDot,
                              { left: left - 7, top: top - 7 },
                            ]}
                          >
                            <Text style={styles.markerNum}>{idx + 1}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.small}>No image available</Text>
              )}

              {/* marker notes + thumbs */}
              {sp.markers?.map((m, idx) => (
                <View key={m.id} style={{ marginTop: 6 }}>
                  <Text style={styles.small}>Marker {idx + 1}</Text>
                  {m.label && <Text>{m.label}</Text>}
                  <Text style={styles.small}>{m.note ?? "No note."}</Text>

                  {m.photos && m.photos.some((p) => !!p.pdfSrc) && (
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        marginTop: 4,
                      }}
                    >
                      {m.photos
                        .filter((p) => !!p.pdfSrc)
                        .map((p) => (
                          <Image
                            key={p.id}
                            src={p.pdfSrc!}
                            style={styles.thumb}
                          />
                        ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>

        {notes && (
          <>
            <Text style={styles.h2}>Report Notes</Text>
            <View style={styles.box}>
              <Text>{notes}</Text>
            </View>
          </>
        )}
      </Page>
    </PDFDocument>
  );
}
