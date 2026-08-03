import { Table, Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect } from "react";

interface PaymentProofProps {
  data: any[];
}

const PaymentProofTable = ({ data }: PaymentProofProps) => {
  const columns = [
    {
      title: "Fecha",
      dataIndex: "createdAt",
      key: "fecha_de_ingreso",
      render: (text: string) => {
        return dayjs(text).format("DD/MM/YYYY");
      },
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Hora",
      dataIndex: "createdAt",
      key: "hora_emision",
      render: (text: string) => {
        return dayjs(text).format("HH:mm");
      },
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Metodo de pago",
      dataIndex: "metodo_pago",
      key: "metodo_pago",
      render: (value?: string) => {
        if (value === "efectivo") return "Efectivo";
        if (value === "qr") return "QR";
        return "No registrado";
      },
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "PDF",
      dataIndex: "comprobante_entrada_pdf",
      key: "pdf_url",
      width: 80,
      render: (link: string) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => window.open(link, "_blank")}
          title="Ver PDF"
        >
          Ver
        </Button>
      ),
      className: "text-mobile-sm xl:text-desktop-sm",
    },
  ];

  useEffect(() => {}, [data]);

  return (
    <div>
      <Table
        rowKey={(record: any) =>
          String(record?._id || record?.id || record?.comprobante_entrada_pdf || record?.createdAt)
        }
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 5 }}
      />
    </div>
  );
};
export default PaymentProofTable;
