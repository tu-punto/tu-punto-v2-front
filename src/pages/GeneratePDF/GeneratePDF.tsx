import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import Table from '@airthium/react-pdf-table';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#E4E4E4'
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1
  },
  title: {
    margin: 10,
    padding: 10,
    width: "100%",
    textAlign: "center"
  },
  footerContainer: {
    flexDirection: 'row', // Creates a horizontal row
    justifyContent: 'space-between', // Distributes space between the texts
    padding: 10,
    width: '100%',
  }
});

const data = {
  title: 'Fecha: 02/09/2024',
  headers: ['Producto', 'Precio unitario', 'Cantidad', 'Precio Total'],
  rows: [
    ['Adidas Cross Guindo rosado', '170,00 Bs', '-1', '-170,00 Bs'],
    ['in head 1 - 2', 'in head 2 - 2', 'in head 3 - 2', 'in head 3 - 1'],
    ['in head 1 - 3', 'in head 2 - 3', 'in head 3 - 3', 'in head 3 - 1']
  ],
  footer: (
    <View style={styles.footerContainer}>
      <Text strokeWidth={100}>Total</Text>
      <Text strokeWidth={100}>100</Text> {/* This will be aligned to the right */}
    </View>
  )
};

// Create Document Component
const MyDocument = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.title}>
        <Text>COMPROBANTE DE PRODUCTOS ENTREGADOS </Text>
        <Text>AL ALMACÉN</Text>
      </View>

      <Table
        data={data}
      />
    <View style={styles.footerContainer}>
      <Text >Total</Text>
      <Text >100</Text> 
    </View>
    
      <View style={styles.section}>
        <Text>Section #1</Text>
      </View>
      <View style={styles.section}>
        <Text>Section #2</Text>
      </View>
    </Page>
  </Document>
);

export default MyDocument;
