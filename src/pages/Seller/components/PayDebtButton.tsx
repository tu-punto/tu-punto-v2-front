import { useState } from "react";
import { Button, Checkbox, Image, Popover, Tooltip, message } from "antd";
import { DollarOutlined } from "@ant-design/icons";

import { paySellerDebtAPI } from "../../../api/seller";

interface Props {
  seller: any; // SellerRow
  onSuccess: () => void; // para refrescar la tabla
}

const PayDebtButton: React.FC<Props> = ({ seller, onSuccess }) => {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  /** click “Pagar” */
  const handleConfirm = async () => {
    if (!checked) {
      message.warning("Marca la casilla para confirmar el pago.");
      return;
    }

    setLoading(true);
    try {
      const res = await paySellerDebtAPI(seller._id, { payAll: true });
      if (!res?.success) throw new Error("fail");

      const pdfBlob = new Blob([res.data], { type: "application/pdf" });
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");

      message.success("Pago realizado con éxito y PDF generado");
      onSuccess();
    } catch (err) {
      console.error(err);
      message.error("Error al realizar el pago");
    } finally {
      setLoading(false);
      setVisible(false);
      setChecked(false);
    }
  };

  /** cancelar */
  const handleCancel = () => {
    setVisible(false);
    setChecked(false);
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
