import { CheckCircleFilled } from "@ant-design/icons";
import { Button, Input, Select, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { connectQz, findQzPrinters, isQzConnected } from "../../utils/qzTray";

const QZ_PRINTER_NAME_KEY = "qzPrinterName";
const QZ_MANUAL_PRINTER_KEY = "qzPrinterNameManual";

const QzPrinterSelector = () => {
  const [qzBusy, setQzBusy] = useState(false);
  const [qzConnected, setQzConnected] = useState(false);
  const [qzPrinters, setQzPrinters] = useState<string[]>([]);
  const [selectedQzPrinter, setSelectedQzPrinter] = useState<string | undefined>(
    localStorage.getItem(QZ_PRINTER_NAME_KEY) || undefined
  );
  const [manualQzPrinter, setManualQzPrinter] = useState("");

  const qzPrinterOptions = useMemo(() => {
    const names = new Set(qzPrinters);
    if (selectedQzPrinter) names.add(selectedQzPrinter);
    return Array.from(names).map((name) => ({ value: name, label: name }));
  }, [qzPrinters, selectedQzPrinter]);

  useEffect(() => {
    void isQzConnected().then(setQzConnected);
  }, []);

  const selectPrinter = (printerName: string, manual = false) => {
    setSelectedQzPrinter(printerName);
    localStorage.setItem(QZ_PRINTER_NAME_KEY, printerName);
    if (manual) {
      localStorage.setItem(QZ_MANUAL_PRINTER_KEY, "true");
    } else {
      localStorage.removeItem(QZ_MANUAL_PRINTER_KEY);
    }
  };

  const handleConnectQz = async () => {
    setQzBusy(true);
    try {
      await connectQz();
      setQzConnected(true);
      message.success("QZ Tray conectado");
    } catch (error) {
      console.error(error);
      setQzConnected(false);
      message.error("No se pudo conectar con QZ Tray. Verifica que este abierto.");
    } finally {
      setQzBusy(false);
    }
  };

  const handleLoadQzPrinters = async () => {
    setQzBusy(true);
    try {
      const printers = await findQzPrinters({ refresh: true });
      setQzPrinters(printers);
      setQzConnected(true);

      if (!printers.length) {
        message.warning("No se encontraron impresoras en QZ Tray");
        return;
      }
      if (selectedQzPrinter && printers.includes(selectedQzPrinter)) return;

      selectPrinter(printers.find((name) => /epson|tm[\s-]?l90|m313a/i.test(name)) || printers[0]);
    } catch (error) {
      console.error(error);
      message.error("No se pudo obtener la lista de impresoras");
    } finally {
      setQzBusy(false);
    }
  };

  const handleUseManualPrinter = () => {
    const printerName = manualQzPrinter.trim();
    if (!printerName) {
      message.warning("Escribe el nombre exacto de la impresora");
      return;
    }

    setQzPrinters((current) => (current.includes(printerName) ? current : [...current, printerName]));
    selectPrinter(printerName, true);
    setManualQzPrinter("");
    message.success("Impresora guardada para impresion directa");
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        marginTop: 16,
        alignItems: "end",
      }}
    >
      <div>
        <Typography.Text strong>Conexion</Typography.Text>
        <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
          <Button onClick={() => void handleConnectQz()} loading={qzBusy}>
            {qzConnected ? "Verificar QZ" : "Conectar QZ"}
          </Button>
          {qzConnected ? (
            <span style={{ color: "#389e0d", fontWeight: 600, fontSize: 13 }}>
              <CheckCircleFilled /> Conectado
            </span>
          ) : (
            <span style={{ color: "#8c8c8c", fontSize: 12 }}>Sin conexion</span>
          )}
        </div>
      </div>
      <div>
        <Typography.Text strong>Impresoras</Typography.Text>
        <div style={{ marginTop: 4 }}>
          <Button onClick={() => void handleLoadQzPrinters()} loading={qzBusy} disabled={!qzConnected}>
            Buscar impresoras
          </Button>
        </div>
      </div>
      <div>
        <Typography.Text strong>Impresora directa</Typography.Text>
        <Select
          value={selectedQzPrinter}
          onChange={(value) => selectPrinter(value)}
          options={qzPrinterOptions}
          placeholder="Selecciona una impresora (EPSON TM-L90...)"
          showSearch
          optionFilterProp="label"
          style={{ width: "100%", marginTop: 4 }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Input
            value={manualQzPrinter}
            onChange={(event) => setManualQzPrinter(event.target.value)}
            onPressEnter={handleUseManualPrinter}
            placeholder="Nombre exacto si no aparece en QZ"
          />
          <Button onClick={handleUseManualPrinter}>Usar</Button>
        </div>
      </div>
    </div>
  );
};

export default QzPrinterSelector;
