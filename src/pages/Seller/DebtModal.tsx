import {
  Modal,
  Form,
  DatePicker,
  InputNumber,
  Button,
  Col,
  Row,
  message,
  Radio,
  Card,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import dayjs from "dayjs";

import { getSucursalsAPI } from "../../api/sucursal";
import { renewSellerAPI } from "../../api/seller";

import BranchFields from "./components/BranchFields";
import { ISucursalPago } from "../../models/sellerModels";

interface Props {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  seller: any; // SellerRow
}

export default function DebtModal({ visible, onCancel, onSuccess, seller }: Props) {
  const [loading, setLoading] = useState(false);
  const [sucursalOptions, setSucursalOptions] = useState<any[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setSucursalOptions(await getSucursalsAPI());

      const initSucursales = (seller.pago_sucursales || []).map((p: ISucursalPago) => ({
        id_sucursal: p.id_sucursal,
        sucursalName: p.sucursalName,
        alquiler: p.alquiler,
        exhibicion: p.exhibicion,
        delivery: p.delivery,
        entrega_simple: p.entrega_simple,
      }));

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
        pago_sucursales: values.sucursales,
        deuda: nuevaDeuda,
        esDeuda: values.isDebt,
      };

      const res = await renewSellerAPI(seller._id, payload);
      if (!res?.success) throw new Error("update fail");

      message.success("Vendedor renovado con éxito");
      onSuccess();
    } catch (err) {
      console.error(err);
      message.error("Error al renovar vendedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Renovar vendedor" open={visible} footer={null} onCancel={onCancel} width={850}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
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

        {/* Sucursales dinámicas */}
        <Row justify="space-between" align="middle">
          <Col><h3>Sucursales</h3></Col>
          <Col>
            <Button type="dashed" icon={<PlusOutlined />} onClick={addBranch}>
              Añadir sucursal
            </Button>
          </Col>
        </Row>

        <Form.List name="sucursales">
          {(fields, { remove }) => (
            <>
              {fields.map((field) => (
                <Card key={field.key} style={{ marginTop: 16 }}>
                  <BranchFields
                    field={field}
                    remove={remove}
                    sucursalOptions={sucursalOptions}
                  />
                </Card>
              ))}
            </>
          )}
        </Form.List>

        <Form.Item className="mt-6">
          <Button type="primary" htmlType="submit" loading={loading}>
            Guardar
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
