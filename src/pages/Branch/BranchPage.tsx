import { useContext, useEffect, useState } from "react";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Button, Form, InputNumber, Modal, Popover, Typography } from "antd";
import { getSucursalsAPI } from "../../api/sucursal";
import { UserContext } from "../../context/userContext";
import { IBranch } from "../../models/branchModel";
import { normalizeRole } from "../../utils/role";
import BranchFormModal from "./BranchFormModal";
import BranchSellerInfoPanel from "./BranchSellerInfoPanel";
import BranchTable from "./BranchTable";

const QUOTE_FORMULA =
  "(if([ALTO]>180,180,[ALTO]) * [ANCHO] * if([PROFUNDIDAD]<30,30,[PROFUNDIDAD])) * 169 / (100 * 25 * 30)";

const BranchPage = () => {
  const [branches, setBranches] = useState<IBranch[]>();
  const [selectedBranch, setSelectedBranch] = useState<IBranch | null>(null);
  const [isFormModal, setIsFormModal] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteHeight, setQuoteHeight] = useState<number | undefined>();
  const [quoteWidth, setQuoteWidth] = useState<number | undefined>();
  const [quoteDepth, setQuoteDepth] = useState<number | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const { user } = useContext(UserContext);
  const normalizedRole = normalizeRole(user?.role || "");
  const isOperator = normalizedRole === "operator";
  const canUseQuoteCalculator = normalizedRole === "admin" || normalizedRole === "operator";
  const canManageBranches = normalizedRole === "admin";

  const fetchBranches = async () => {
    try {
      const branches = await getSucursalsAPI();
      setBranches(branches);
    } catch (error) {
      console.error(error);
    }
  };

  const showEditModal = (branch: IBranch) => {
    setSelectedBranch(branch);
    setIsFormModal(true);
  };

  const getMonthlyQuote = () => {
    if (quoteHeight == null || quoteWidth == null || quoteDepth == null) return null;

    const normalizedHeight = Math.min(quoteHeight, 180);
    const normalizedDepth = Math.max(quoteDepth, 30);

    return (normalizedHeight * quoteWidth * normalizedDepth * 169) / (100 * 25 * 30);
  };

  const monthlyQuote = getMonthlyQuote();
  const quoteInfoContent = (
    <div className="max-w-[320px]">
      <Typography.Text code className="block whitespace-pre-wrap break-words text-xs">
        {QUOTE_FORMULA}
      </Typography.Text>
    </div>
  );

  useEffect(() => {
    fetchBranches();
  }, [refreshKey]);

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-2 shadow-md">
          <img src="/branches-icon.png" alt="Sucursales" className="h-8 w-8" />
          <h1 className="text-mobile-3xl font-bold text-gray-800 xl:text-desktop-3xl">
            Sucursales
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {canUseQuoteCalculator && (
            <Button
              onClick={() => setIsQuoteModalOpen(true)}
              className="text-mobile-sm xl:text-desktop-sm"
            >
              Cotizador del servicio
            </Button>
          )}
          {canManageBranches && (
            <Button
              onClick={() => {
                setIsFormModal(true);
                setSelectedBranch(null);
              }}
              type="primary"
              className="text-mobile-sm xl:text-desktop-sm"
            >
              Agregar Sucursal
            </Button>
          )}
        </div>
      </div>

      <BranchTable
        refreshKey={refreshKey}
        branches={branches || []}
        showEditModal={showEditModal}
      />
      {isOperator && (
        <BranchSellerInfoPanel
          branchId={localStorage.getItem("sucursalId") || undefined}
          branchName={localStorage.getItem("sucursalNombre") || undefined}
        />
      )}
      <Modal
        title="Cotizador del servicio"
        open={isQuoteModalOpen}
        onCancel={() => setIsQuoteModalOpen(false)}
        footer={null}
        destroyOnClose
        width={640}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 via-white to-amber-50 px-4 py-3">
            <div className="min-w-0">
              <Typography.Text className="block text-mobile-sm font-medium text-gray-700 xl:text-desktop-sm">
                Informacion del calculo
              </Typography.Text>
              <div className="mt-2 space-y-1">
                <Typography.Text className="block text-xs text-gray-500">
                  Si el ancho es menor a 30 cm el precio ya no varia.
                </Typography.Text>
                <Typography.Text className="block text-xs text-gray-500">
                  Si el alto es mayor a 180 no varia y no puede ser mayor a 250 cm.
                </Typography.Text>
                <Typography.Text className="block text-xs text-gray-500">
                  El precio parametro es 169 Bs.
                </Typography.Text>
              </div>
            </div>
            <Popover trigger={["hover"]} placement="bottomRight" content={quoteInfoContent}>
              <button
                type="button"
                aria-label="Ver informacion del calculo"
                className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:text-orange-600 hover:shadow-md"
              >
                <InfoCircleOutlined className="text-lg" />
              </button>
            </Popover>
          </div>

          <Typography.Text className="block text-mobile-sm text-gray-500 xl:text-desktop-sm">
            El alto no puede superar 250 cm (2.5 m).
          </Typography.Text>

          <Form layout="vertical" className="grid gap-4">
            <Form.Item label="Alto (cm)" required>
              <InputNumber
                value={quoteHeight}
                min={0}
                max={250}
                step={1}
                style={{ width: "100%" }}
                placeholder="Ingresa el alto"
                onChange={(value) => {
                  if (value == null || Number.isNaN(Number(value))) {
                    setQuoteHeight(undefined);
                    return;
                  }

                  setQuoteHeight(Math.min(Number(value), 250));
                }}
              />
            </Form.Item>

            <Form.Item label="Ancho (cm)" required>
              <InputNumber
                value={quoteWidth}
                min={0}
                step={1}
                style={{ width: "100%" }}
                placeholder="Ingresa el ancho"
                onChange={(value) => {
                  if (value == null || Number.isNaN(Number(value))) {
                    setQuoteWidth(undefined);
                    return;
                  }

                  setQuoteWidth(Number(value));
                }}
              />
            </Form.Item>

            <Form.Item label="Profundidad (cm)" required>
              <InputNumber
                value={quoteDepth}
                min={0}
                step={1}
                style={{ width: "100%" }}
                placeholder="Ingresa la profundidad"
                onChange={(value) => {
                  if (value == null || Number.isNaN(Number(value))) {
                    setQuoteDepth(undefined);
                    return;
                  }

                  setQuoteDepth(Number(value));
                }}
              />
            </Form.Item>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <Typography.Text className="mb-1 block text-mobile-sm text-gray-500 xl:text-desktop-sm">
                Precio mensual
              </Typography.Text>
              <Typography.Title level={3} className="!mb-0">
                {monthlyQuote == null ? "-" : `Bs.${monthlyQuote.toFixed(2)}`}
              </Typography.Title>
            </div>
          </Form>
        </div>
      </Modal>
      <BranchFormModal
        visible={isFormModal}
        onClose={() => setIsFormModal(false)}
        onSubmit={() => {
          setIsFormModal(false);
          setRefreshKey((prev) => prev + 1);
          setSelectedBranch(null);
        }}
        branch={selectedBranch}
      />
    </div>
  );
};

export default BranchPage;
