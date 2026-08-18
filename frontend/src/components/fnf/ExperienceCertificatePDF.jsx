import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 11, fontFamily: 'Helvetica', color: '#111', lineHeight: 1.6 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingBottom: 10, borderBottom: '2px solid #0f2540' },
  logo: { width: 52, height: 52, marginRight: 12 },
  companyName: { fontSize: 16, fontWeight: 'bold' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 22, fontSize: 10, color: '#333' },
  title: { fontSize: 13, fontWeight: 'bold', textAlign: 'center', textDecoration: 'underline', marginBottom: 22 },
  para: { marginBottom: 14, textAlign: 'justify' },
  sign: { marginTop: 50 },
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

const ExperienceCertificatePDF = ({ employee: e }) => {
  const company = e.company_name || 'the Company';
  const fullName = `${e.first_name} ${e.last_name || ''}`.trim();
  const today = fmtDate(new Date().toISOString());
  const year = new Date().getFullYear();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image style={styles.logo} src="/protecther-logo.png" />
          <Text style={styles.companyName}>{company}</Text>
        </View>

        <View style={styles.meta}>
          <Text>Ref: EXP/{e.employee_code}/{year}</Text>
          <Text>Date: {today}</Text>
        </View>

        <Text style={styles.title}>EXPERIENCE CERTIFICATE</Text>

        <Text style={styles.para}>
          This is to certify that <Text style={styles.bold}>{fullName}</Text> (Employee Code:
          {' '}{e.employee_code}) was employed with {company} from {fmtDate(e.date_of_joining)} to
          {' '}{fmtDate(e.date_of_leaving)}.
        </Text>

        <Text style={styles.para}>
          At the time of leaving, {e.first_name} was working as {e.designation}
          {e.department ? ` in the ${e.department} department` : ''}.
        </Text>

        <Text style={styles.para}>
          During the tenure with {company}, conduct and performance were found to be satisfactory.
          We wish {e.first_name} all the best for future endeavours.
        </Text>

        <View style={styles.sign}>
          <Text>For {company},</Text>
          <Text style={{ marginTop: 34, ...styles.bold }}>Authorised Signatory</Text>
          <Text>Human Resources</Text>
        </View>

        <Text style={styles.footer}>
          This is a system-generated experience certificate and is valid without a physical signature.
        </Text>
      </Page>
    </Document>
  );
};

export default ExperienceCertificatePDF;
