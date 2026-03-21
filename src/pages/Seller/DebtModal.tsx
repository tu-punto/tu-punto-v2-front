import { useEffect, useState } from "react";
import { Form, DatePicker, InputNumber, Col, Row, message, Radio } from "antd";
import dayjs from "dayjs";
import { renewSellerAPI } from "../../api/seller";
import { getSucursalsAPI } from "../../api/sucursal";
import { ISucursalPago } from "../../models/sellerModels";
import FormModal from "../../components/FormModal";
import DynamicBranchSection from "../../components/DynamicBranchSection";

interface DebtModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  seller: any;
}

export default function DebtModal({ visible, onCancel, onSuccess, seller }: DebtModalProps) {
  const [loading, setLoading] = useState(false);
  const [sucursalOptions, setSucursalOptions] = useState<any[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!visible) return;

    (async () => {
      const sucursales = await getSucursalsAPI();
      //console.log("👉 Sucursales cargadas desde API:", sucursales);
      setSucursalOptions(sucursales);

      const initSucursales = (seller.pago_sucursales || []).map(
        (p: ISucursalPago) => {
          const id = p.id_sucursal?.$oid || p.id_sucursal;
          const sucursal = sucursales.find((s) => s._id === id);
          return {
            ...p,
            id_sucursal: id,
            sucursalName:
              sucursal?.nombre || p.sucursalName || "Sucursal sin nombre",
            alquiler: p.alquiler,
            almacenamiento: p.alquiler,
            exhibicion: p.exhibicion,
            delivery: p.delivery,
            entrega_simple: p.entrega_simple,
            fecha_ingreso: p.fecha_ingreso ? dayjs(p.fecha_ingreso) : null,
            fecha_salida: p.fecha_salida ? dayjs(p.fecha_salida) : null,
            comentario: p.comentario || "",
          };
        }
      );

      form.setFieldsValue({
        fecha_vigencia: dayjs(seller.fecha_vigencia, "D/M/YYYY/"),
        comision_porcentual: seller.comision_porcentual,
        comision_fija: seller.comision_fija,
        isDebt: true,
        sucursales: initSucursales.length ? initSucursales : [{}],
      });
    })();
  }, [visible]);

  const addBranch = () => {
    const list = form.getFieldValue("sucursales") || [];
    if (list.length >= sucursalOptions.length) {
      return message.warning("Ya agregaste todas las sucursales");
    }
    form.setFieldsValue({ sucursales: [...list, {}] });
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const montoFinanceFlux = (values.sucursales || []).reduce(
        (tot: number, p: any) =>
          tot +
          Number(p.alquiler || 0) +
          Number(p.exhibicion || 0) +
          Number(p.delivery || 0),
        0
      );

      let nuevaDeuda = Number(seller.deudaInt || 0);
      if (values.isDebt) nuevaDeuda -= montoFinanceFlux;

      const payload = {
        ...values,
        fecha_vigencia: values.fecha_vigencia.toISOString(),
        pago_sucursales: values.sucursales.map((formSucursal: any) => ({
          ...formSucursal,
          alquiler: formSucursal.almacenamiento,
          sucursalName: sucursalOptions.find(
            (optionSucursal) => optionSucursal._id === formSucursal.id_sucursal
          )?.nombre,
        })),
        deuda: nuevaDeuda,
        esDeuda: values.isDebt,
      };

      const res = await renewSellerAPI(seller._id, payload);
      if (!res?.success) throw new Error("update fail");

      message.success("Vendedor renovado con éxito");
      onSuccess();
    } catch (err: any) {
      console.error("Error al renovar vendedor:", err);

      const msg =
        err?.response?.data?.msg || err?.message || "Error al renovar vendedor";

      message.error({
        content: (
          <div>
            <strong>No se pueden eliminar estas sucursales:</strong>
            <br />
            <span style={{ color: "#cf1322", fontWeight: 600 }}>
              {msg.split("stock:")[1]?.trim() || msg}
            </span>
          </div>
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      title="Renovar vendedor"
      open={visible}
      onClose={onCancel}
      submitLoading={loading}
      onFinish={onFinish}
      width={850}
      form={form}
    >
      <Form.Item name="isDebt" label="¿Es deuda?">
        <Radio.Group>
          <Radio.Button value={true}>SI</Radio.Button>
          <Radio.Button value={false}>NO</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="fecha_vigencia"
            label="Fecha final del servicio"
            rules={[{ required: true }]}
          >
            <DatePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="comision_porcentual" label="Comisión %">
            <InputNumber className="w-full" min={0} max={100} suffix="%" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="comision_fija" label="Comisión fija">
            <InputNumber className="w-full" prefix="Bs." />
          </Form.Item>
        </Col>
      </Row>

      <DynamicBranchSection
        form={form}
        branchOptions={sucursalOptions}
        handleAddBranch={addBranch}
      />
    </FormModal>
  )
}
