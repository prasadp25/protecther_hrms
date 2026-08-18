import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 11, fontFamily: 'Helvetica', color: '#111', lineHeight: 1.5 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingBottom: 10, borderBottom: '2px solid #0f2540' },
  logo: { width: 52, height: 52, marginRight: 12 },
  companyName: { fontSize: 16, fontWeight: 'bold' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 18, fontSize: 10, color: '#333' },
  title: { fontSize: 13, fontWeight: 'bold', textAlign: 'center', textDecoration: 'underline', marginBottom: 18 },
  para: { marginBottom: 12, textAlign: 'justify' },
  addr: { marginBottom: 12 },
  sign: { marginTop: 46 },
  bold: { fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 24, left: 44, right: 44, textAlign: 'center', fontSize: 8, color: '#999', borderTop: '0.5px solid #ddd', paddingTop: 6 },
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (d) => {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split('-');
  if (!y || !m || !day) return s;
  return `${day} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
};

// employee: full record (first_name, last_name, employee_code, designation,
// department, date_of_joining, date_of_leaving, status, company_name)
const RelievingLetterPDF = ({ employee: e }) => {
  const company = e.company_name || 'the Company';
  const fullName = `${e.first_name} ${e.last_name || ''}`.trim();
  const today = fmtDate(new Date().toISOString());
  const year = new Date().getFullYear();
  const terminated = e.status === 'TERMINATED';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image style={styles.logo} src="/protecther-logo.png" />
          <Text style={styles.companyName}>{company}</Text>
        </View>

        <View style={styles.meta}>
          <Text>Ref: REL/{e.employee_code}/{year}</Text>
          <Text>Date: {today}</Text>
        </View>

        <Text style={styles.title}>RELIEVING LETTER</Text>

        <View style={styles.addr}>
          <Text style={styles.bold}>{fullName}</Text>
          <Text>Employee Code: {e.employee_code}</Text>
        </View>

        <Text style={styles.para}>Dear {e.first_name},</Text>

        <Text style={styles.para}>
          {terminated
            ? `This letter is to confirm the conclusion of your employment with ${company}. `
            : `This is with reference to your resignation from the services of ${company}. `}
          You have been relieved from your duties as {e.designation}
          {e.department ? `, ${e.department} department,` : ''} with effect from the close of
          business on {fmtDate(e.date_of_leaving)}.
        </Text>

        <Text style={styles.para}>
          As per our records, {fullName} was associated with {company} from
          {' '}{fmtDate(e.date_of_joining)} to {fmtDate(e.date_of_leaving)}, and all handover
          and exit formalities have been completed. Any dues, if applicable, are settled through
          the Full & Final settlement.
        </Text>

        <Text style={styles.para}>
          We thank you for your service and wish you success in your future endeavours.
        </Text>

        <View style={styles.sign}>
          <Text>For {company},</Text>
          <Text style={{ marginTop: 34, ...styles.bold }}>Authorised Signatory</Text>
          <Text>Human Resources</Text>
        </View>

        <Text style={styles.footer}>
          This is a system-generated relieving letter and is valid without a physical signature.
        </Text>
      </Page>
    </Document>
  );
};

export default RelievingLetterPDF;
