import fs from 'fs-extra';
import Papa from 'papaparse';
import { XMLParser } from 'fast-xml-parser';

const INVOICES = {
  Clave: { path: 'FacturaElectronica.Clave', default: null },
  CodigoActividadEmisor: { path: 'FacturaElectronica.CodigoActividadEmisor', default: null },
  NumeroConsecutivo: { path: 'FacturaElectronica.NumeroConsecutivo', default: null },
  FechaEmision: { path: 'FacturaElectronica.FechaEmision', default: null },
  Nombre: { path: 'FacturaElectronica.Emisor.Nombre', default: null },
  NombreComercial: { path: 'FacturaElectronica.Emisor.NombreComercial', default: null },
  IdentificacionTipo: { path: 'FacturaElectronica.Emisor.Identificacion.Tipo', default: null },
  IdentificacionNumero: { path: 'FacturaElectronica.Emisor.Identificacion.Numero', default: null },
  CorreoElectronico: { path: 'FacturaElectronica.Emisor.CorreoElectronico', default: null },
  CondicionVenta: { path: 'FacturaElectronica.CondicionVenta', default: null },
  Moneda: { path: 'FacturaElectronica.ResumenFactura.CodigoTipoMoneda.CodigoMoneda', default: 'CRC' },
  TipoCambio: { path: 'FacturaElectronica.ResumenFactura.CodigoTipoMoneda.TipoCambio', default: 1.0 },
  TotalServGravados: { path: 'FacturaElectronica.ResumenFactura.TotalServGravados', default: 0.0 },
  TotalServExentos: { path: 'FacturaElectronica.ResumenFactura.TotalServExentos', default: 0.0 },
  TotalServExonerado: { path: 'FacturaElectronica.ResumenFactura.TotalServExonerado', default: 0.0 },
  TotalMercanciasGravadas: { path: 'FacturaElectronica.ResumenFactura.TotalMercanciasGravadas', default: 0.0 },
  TotalMercanciasExentas: { path: 'FacturaElectronica.ResumenFactura.TotalMercanciasExentas', default: 0.0 },
  TotalMercExonerada: { path: 'FacturaElectronica.ResumenFactura.TotalMercExonerada', default: 0.0 },
  TotalGravado: { path: 'FacturaElectronica.ResumenFactura.TotalGravado', default: 0.0 },
  TotalExento: { path: 'FacturaElectronica.ResumenFactura.TotalExento', default: 0.0 },
  TotalExonerado: { path: 'FacturaElectronica.ResumenFactura.TotalExonerado', default: 0.0 },
  TotalVenta: { path: 'FacturaElectronica.ResumenFactura.TotalVenta', default: 0.0 },
  TotalDescuentos: { path: 'FacturaElectronica.ResumenFactura.TotalDescuentos', default: 0.0 },
  TotalVentaNeta: { path: 'FacturaElectronica.ResumenFactura.TotalVentaNeta', default: 0.0 },
  TotalImpuesto: { path: 'FacturaElectronica.ResumenFactura.TotalImpuesto', default: 0.0 },
  TotalComprobante: { path: 'FacturaElectronica.ResumenFactura.TotalComprobante', default: 0.0 },
};

const DETAILS = {
  NumeroLinea: { path: 'NumeroLinea', default: 0 },
  Codigo: { path: 'Codigo', default: null },
  Cantidad: { path: 'Cantidad', default: null },
  UnidadMedida: { path: 'UnidadMedida', default: null },
  Detalle: { path: 'Detalle', default: null },
  RegistroMedicamento: { path: 'RegistroMedicamento', default: null },
  FormaFarmaceutica: { path: 'FormaFarmaceutica', default: null },
  PrecioUnitario: { path: 'PrecioUnitario', default: null },
  MontoTotal: { path: 'MontoTotal', default: 0.0 },
  MontoDescuento: { path: 'Descuento.MontoDescuento', default: 0.0 },
  NaturalezaDescuento: { path: 'Descuento.NaturalezaDescuento', default: null },
  SubTotal: { path: 'SubTotal', default: 0.0 },
  ImpuestoCodigo: { path: 'Impuesto.Codigo', default: null },
  ImpuestoCodigoTarifa: { path: 'Impuesto.CodigoTarifa', default: null },
  ImpuestoTarifa: { path: 'Impuesto.Tarifa', default: 0 },
  ImpuestoMonto: { path: 'Impuesto.Monto', default: 0.0 },
  MontoTotalLinea: { path: 'MontoTotalLinea', default: 0.0 },
};

const DATA_PATH = './data';
const XML_PATH = `${DATA_PATH}/xml`;
const JSON_PATH = `${DATA_PATH}/json`;
const CSV_PATH = `${DATA_PATH}/csv`;

fs.ensureDirSync(XML_PATH);
fs.ensureDirSync(JSON_PATH);
fs.ensureDirSync(CSV_PATH);

const getValue = (obj, path, def) => {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return def;
    }
  }
  return current;
};

const xmls = fs.readdirSync(XML_PATH).filter((file) => file.endsWith('.xml'));

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: true,
  parseTagValue: true,
});

const invoices = [];
const details = [];
const amountsObj = {};
const taxesObj = {};
const summaryObj = {
  Totales: {
    TotalServGravados: 0.0,
    TotalServExentos: 0.0,
    TotalServExonerado: 0.0,
    TotalMercanciasGravadas: 0.0,
    TotalMercanciasExentas: 0.0,
    TotalMercExonerada: 0.0,
    TotalGravado: 0.0,
    TotalExento: 0.0,
    TotalExonerado: 0.0,
    TotalVenta: 0.0,
    TotalDescuentos: 0.0,
    TotalVentaNeta: 0.0,
    TotalImpuesto: 0.0,
    TotalComprobante: 0.0,
    MontoTotal: 0.0,
    MontoDescuento: 0.0,
    SubTotal: 0.0,
    ImpuestoMonto: 0.0,
    MontoTotalLinea: 0.0,
  },
};

xmls.forEach((xml) => {
  console.info(`Processing file: ${xml}`);
  const filePath = `${XML_PATH}/${xml}`;
  const content = fs.readFileSync(filePath, 'utf8');
  const json = xmlParser.parse(content);
  const jsonFilePath = `${JSON_PATH}/${xml.replace('.xml', '.json')}`;
  fs.writeFileSync(jsonFilePath, JSON.stringify(json, null, 2), 'utf8');
  const invoice = { Archivo: xml };
  Object.keys(INVOICES).forEach((key) => {
    invoice[key] = getValue(json, INVOICES[key].path, INVOICES[key].default);
  });
  invoices.push(invoice);

  const moneda = invoice.Moneda;

  amountsObj[moneda] = amountsObj[moneda] ?? {
    TotalServGravados: 0.0,
    TotalServExentos: 0.0,
    TotalServExonerado: 0.0,
    TotalMercanciasGravadas: 0.0,
    TotalMercanciasExentas: 0.0,
    TotalMercExonerada: 0.0,
    TotalGravado: 0.0,
    TotalExento: 0.0,
    TotalExonerado: 0.0,
    TotalVenta: 0.0,
    TotalDescuentos: 0.0,
    TotalVentaNeta: 0.0,
    TotalImpuesto: 0.0,
    TotalComprobante: 0.0,
  };

  Object.keys(amountsObj[moneda]).forEach((total) => {
    const item = invoice[total];
    amountsObj[moneda][total] += item;
    summaryObj.Totales[total] += item * invoice.TipoCambio;
  });

  taxesObj[moneda] = taxesObj[moneda] ?? {};

  const detailLine = json.FacturaElectronica?.DetalleServicio?.LineaDetalle || [];
  const detailList = detailLine && !Array.isArray(detailLine) ? [detailLine] : detailLine;
  detailList.forEach((line) => {
    const detail = { FacturaNumeroConsecutivo: invoice.NumeroConsecutivo };
    Object.keys(DETAILS).forEach((key) => {
      detail[key] = getValue(line, DETAILS[key].path, DETAILS[key].default);
    });
    details.push(detail);

    const tarifa = detail.ImpuestoTarifa;

    taxesObj[moneda][tarifa] = taxesObj[moneda][tarifa] ?? {
      MontoTotal: 0.0,
      MontoDescuento: 0.0,
      SubTotal: 0.0,
      ImpuestoMonto: 0.0,
      MontoTotalLinea: 0.0,
    };

    Object.keys(taxesObj[moneda][tarifa]).forEach((amount) => {
      taxesObj[moneda][tarifa][amount] += detail[amount];
    });

    const keyTarifa = `${tarifa}%`;
    summaryObj[keyTarifa] = summaryObj[keyTarifa] ?? {
      MontoTotal: 0.0,
      MontoDescuento: 0.0,
      SubTotal: 0.0,
      ImpuestoMonto: 0.0,
      MontoTotalLinea: 0.0,
    };
    Object.keys(summaryObj[keyTarifa]).forEach((key) => {
      const amount = detail[key] * invoice.TipoCambio;
      summaryObj[keyTarifa][key] += amount;
      summaryObj.Totales[key] += amount;
    });
  });
});

const amounts = Object.keys(amountsObj).map((moneda) => ({
  Moneda: moneda,
  ...amountsObj[moneda],
}));

const taxes = [];

Object.keys(taxesObj).forEach((moneda) => {
  Object.keys(taxesObj[moneda]).forEach((tarifa) => {
    const taxDetails = {
      Moneda: moneda,
      ImpuestoTarifa: Number(tarifa),
      ...taxesObj[moneda][tarifa],
    };
    taxes.push(taxDetails);
  });
});

const summary = [];

Object.keys(summaryObj).forEach((key) => {
  Object.keys(summaryObj[key]).forEach((total) => {
    summary.push({
      Rubro: `${key} | ${total}`,
      Monto: Math.round(summaryObj[key][total]),
    });
  });
});

const invoicesCsv = Papa.unparse(invoices);
const csvFilePath = `${CSV_PATH}/Facturas.csv`;
fs.writeFileSync(csvFilePath, invoicesCsv, 'utf8');

const detailsCsv = Papa.unparse(details);
const detailsCsvFilePath = `${CSV_PATH}/Detalles.csv`;
fs.writeFileSync(detailsCsvFilePath, detailsCsv, 'utf8');

const amountsCsv = Papa.unparse(amounts);
const amountsCsvFilePath = `${CSV_PATH}/Montos.csv`;
fs.writeFileSync(amountsCsvFilePath, amountsCsv, 'utf8');

const taxesCsv = Papa.unparse(taxes);
const taxesCsvFilePath = `${CSV_PATH}/Impuestos.csv`;
fs.writeFileSync(taxesCsvFilePath, taxesCsv, 'utf8');

const summaryCsv = Papa.unparse(summary);
const summaryCsvFilePath = `${CSV_PATH}/Resumen.csv`;
fs.writeFileSync(summaryCsvFilePath, summaryCsv, 'utf8');
