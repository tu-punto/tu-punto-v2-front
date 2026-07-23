import { useState } from "react";
import { Button, Checkbox, Image, Popover, Radio, Space, Tooltip, Typography, message } from "antd";
import { DollarOutlined } from "@ant-design/icons";

import { paySellerDebtAPI } from "../../../api/seller";

interface Props {
  seller: any; // SellerRow
  onSuccess: () => void; // para refrescar la tabla
}

const PayDebtButton: React.FC<Props> = ({ seller, onSuccess }) => {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "qr" | null>(null);
  const [loading, setLoading] = useState(false);

  /** click “Pagar” */
  const handleConfirm = async () => {
    if (!checked) {
      message.warning("Marca la casilla para confirmar el pago.");
      return;
    }
    if (!paymentMethod) {
      message.warning("Selecciona como se pago al vendedor.");
      return;
    }

    const receiptWindow = window.open("", "_blank");
    if (receiptWindow) {
      receiptWindow.document.write(`
        <html>
          <head><title>Generando comprobante</title></head>
          <body style="font-family: Arial, sans-serif; padding: 24px;">
            <h3>Generando comprobante de pago...</h3>
            <p>Espera un momento, el PDF se abrira automaticamente.</p>
          </body>
        </html>
      `);
      receiptWindow.document.close();
    }

    setLoading(true);
    try {
      const res = await paySellerDebtAPI(seller._id, {
        payAll: true,
        paymentMethod
      });
      if (!res?.success) throw new Error("fail");

      const pdfBlob = new Blob([res.data], { type: "application/pdf" });
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      if (receiptWindow) {
        receiptWindow.location.href = pdfUrl;
      } else {
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = `comprobante_pago_${seller?._id || Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.warning("El navegador bloqueo la ventana. Se intento abrir el comprobante por descarga.");
      }

      message.success("Pago realizado con éxito y PDF generado");
      onSuccess();
    } catch (err) {
      console.error(err);
      if (receiptWindow) {
        receiptWindow.document.open();
        receiptWindow.document.write(`
          <html>
            <head><title>Error de comprobante</title></head>
            <body style="font-family: Arial, sans-serif; padding: 24px;">
              <h3>No se pudo generar el comprobante</h3>
              <p>Revisa el pago e intenta nuevamente.</p>
            </body>
          </html>
        `);
        receiptWindow.document.close();
      }
      message.error("Error al realizar el pago");
    } finally {
      setLoading(false);
      setVisible(false);
      setChecked(false);
      setPaymentMethod(null);
    }
  };

  /** cancelar */
  const handleCancel = () => {
    setVisible(false);
    setChecked(false);
    setPaymentMethod(null);
    message.info("Pago cancelado");
  };

  /* contenido del Popover */
  const content = (
    <div>
      {seller?.qr_pago_url ? (
        <div className="mb-3">
          <div className="mb-2 font-medium">QR del vendedor</div>
          <Image
            src={seller.qr_pago_url}
            alt="QR de pago del vendedor"
            width={180}
            style={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
        </div>
      ) : (
        <div className="mb-3 text-sm text-gray-500">
          Este vendedor no tiene QR cargado.
        </div>
      )}

      <Checkbox
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        style={{ color: "#ff4d4f" }}
        className="text-mobile-sm xl:text-desktop-sm"
      >
        ¿Desea pagar las deudas existentes?
      </Checkbox>

      <div className="mt-3">
        <Typography.Text strong>Metodo de pago</Typography.Text>
        <Radio.Group
          className="mt-2"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
        >
          <Space direction="vertical">
            <Radio value="efectivo">Efectivo</Radio>
            <Radio value="qr">QR</Radio>
          </Space>
        </Radio.Group>
      </div>

      <div className="mt-2 text-right">
        <Button
          onClick={handleCancel}
          className="mr-2 text-mobile-sm xl:text-desktop-sm"
        >
          Cancelar
        </Button>
        <Button
          type="primary"
          danger
          loading={loading}
          onClick={handleConfirm}
          className="text-mobile-sm xl:text-desktop-sm"
        >
          Pagar
        </Button>
      </div>
    </div>
  );

  return (
    <Tooltip title="Pagar deuda">
      {/* detener propagación para que la fila no se seleccione */}
      <div onClick={(e) => e.stopPropagation()}>
        <Popover
          content={content}
          title="Pagar al vendedor"
          trigger="click"
          open={visible}
          onOpenChange={(v) => setVisible(v)}
          placement="right"
        >
          <Button type="default" icon={<DollarOutlined />} />
        </Popover>
      </div>
    </Tooltip>
  );
};

export default PayDebtButton;
