import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { numberToWords } from '../../utils/numberToWords';

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: 'Helvetica', color: '#111' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '2px solid #0f2540' },
  logo: { width: 46, height: 46, marginRight: 12 },
  companyName: { fontSize: 15, fontWeight: 'bold' },
  docTitle: { fontSize: 12, fontWeight: 'bold', color: '#333', marginTop: 2 },
  watermark: { fontSize: 10, fontWeight: 'bold', color: '#b91c1c' },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  infoCell: { width: '50%', paddingVertical: 2, flexDirection: 'row' },
  infoLabel: { width: 110, color: '#555' },
  infoValue: { flex: 1, fontWeight: 'bold' },

  twoCol: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', backgroundColor: '#0f2540', color: '#fff', padding: 4, marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, paddingHorizontal: 4, borderBottom: '0.5px solid #ddd' },
  rowLabel: { flex: 1 },
  rowAmt: { width: 70, textAlign: 'right' },
  subtotal: { flexDirection: 'row', justifyContent: 'space-between', padding: 4, backgroundColor: '#f1f5f9', fontWeight: 'bold' },

  netBox: { marginTop: 12, padding: 8, border: '1.5px solid #0f2540', backgroundColor: '#f8fafc' },
  netRow: { flexDirection: 'row', justifyContent: 'space-between' },
  netLabel: { fontSize: 12, fontWeight: 'bold' },
  netAmt: { fontSize: 12, fontWeight: 'bold' },
  words: { marginTop: 4, fontStyle: 'italic', color: '#333' },

  refBox: { marginTop: 12, padding: 6, border: '0.5px solid #cbd5e1', backgroundColor: '#fcfcfc' },
  refTitle: { fontSize: 9, fontWeight: 'bold', marginBottom: 3 },
  refNote: { fontSize: 8, color: '#666', marginTop: 3 },

  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
  signBox: { width: '30%', borderTop: '0.5px solid #333', paddingTop: 3, textAlign: 'center', fontSize: 8 },
  footer: { position: 'absolute', bottom: 18, left: 28, right: 28, textAlign: 'center', fontSize: 7, color: '#999' },
});

const inr = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

const LineTable = ({ title, items, total }) => (
  <View style={styles.col}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {items.length === 0 ? (
      <Text style={{ padding: 4, color: '#888' }}>None</Text>
    ) : items.map((it) => (
      <View style={styles.row} key={it.item_id}>
        <Text style={styles.rowLabel}>{it.label}</Text>
        <Text style={styles.rowAmt}>{inr(it.amount)}</Text>
      </View>
    ))}
    <View style={styles.subtotal}>
      <Text>Total</Text>
      <Text>{inr(total)}</Text>
    </View>
  </View>
);

const Info = ({ label, value }) => (
  <View style={styles.infoCell}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '-'}</Text>
  </View>
);

// settlement: header row from the API; items: line items; companyName optional
const FnFStatementPDF = ({ settlement: s, items = [], companyName = 'ProtectHer' }) => {
  const earnings = items.filter((i) => i.kind === 'EARNING');
  const recoveries = items.filter((i) => i.kind === 'RECOVERY');
  const net = Number(s.net_payable || 0);
  const recoverable = net < 0;
  // When gratuity was NOT paid monthly, HR adds it as a payable line; the
  // reference note must then not claim it was already settled monthly.
  const gratuityInPayable = items.some((i) => i.code === 'GRATUITY_OVERRIDE');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image style={styles.logo} src="/protecther-logo.png" />
          <View style={{ flex: 1 }}>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.docTitle}>Full & Final Settlement Statement</Text>
          </View>
          {s.status !== 'PAID' && <Text style={styles.watermark}>{s.status}</Text>}
        </View>

        <View style={styles.infoGrid}>
          <Info label="Employee" value={`${s.employee_name} (${s.employee_code})`} />
          <Info label="Designation" value={s.designation} />
          <Info label="Department" value={s.department} />
          <Info label="Separation" value={s.separation_type} />
          <Info label="Date of Joining" value={s.date_of_joining ? String(s.date_of_joining).slice(0, 10) : '-'} />
          <Info label="Last Working Day" value={String(s.last_working_day).slice(0, 10)} />
          <Info label="Settlement Month" value={s.settlement_month} />
          <Info label="Completed Service" value={`${Number(s.completed_years || 0).toFixed(1)} yrs`} />
        </View>

        <View style={styles.twoCol}>
          <LineTable title="Earnings" items={earnings} total={s.total_earnings} />
          <LineTable title="Recoveries" items={recoveries} total={s.total_recoveries} />
        </View>

        <View style={styles.netBox}>
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>{recoverable ? 'NET RECOVERABLE FROM EMPLOYEE' : 'NET F&F PAYABLE'}</Text>
            <Text style={styles.netAmt}>{inr(Math.abs(net))}</Text>
          </View>
          <Text style={styles.words}>
            ({numberToWords(Math.round(Math.abs(net)))} Rupees Only)
          </Text>
        </View>

        <View style={styles.refBox}>
          <Text style={styles.refTitle}>Statutory reference (already settled monthly — not part of the payable above)</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Gratuity accrued & paid monthly (provision to date)</Text>
            <Text style={styles.rowAmt}>{inr(s.ref_accrued_gratuity)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Statutory gratuity estimate (15/26 x last basic x years)</Text>
            <Text style={styles.rowAmt}>{inr(s.ref_statutory_gratuity)}</Text>
          </View>
          <Text style={styles.refNote}>
            {gratuityInPayable
              ? 'Statutory gratuity has been added to the payable above (this employee was not paid gratuity monthly). Statutory bonus, where applicable, remains part of monthly CTC.'
              : 'Gratuity and statutory bonus are included in monthly CTC and disbursed with each payslip. These figures are shown for compliance reference only.'}
          </Text>
        </View>

        {s.remarks ? <Text style={{ marginTop: 10 }}>Remarks: {s.remarks}</Text> : null}

        <View style={styles.signRow}>
          <Text style={styles.signBox}>Employee</Text>
          <Text style={styles.signBox}>Prepared by (HR)</Text>
          <Text style={styles.signBox}>Authorised Signatory</Text>
        </View>

        <Text style={styles.footer}>
          This is a system-generated Full & Final settlement statement. Status: {s.status}.
        </Text>
      </Page>
    </Document>
  );
};

export default FnFStatementPDF;
