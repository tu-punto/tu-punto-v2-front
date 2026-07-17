import { useEffect, useState, useContext } from "react";
import { getSucursalsAPI } from "../../api/sucursal";
import BranchTable from "./BranchTable";
import { IBranch } from "../../models/branchModel";
import { Button, Form, InputNumber, Modal, Typography } from "antd";
import BranchFormModal from "./BranchFormModal";
import { UserContext } from "../../context/userContext";
import BranchSellerInfoPanel from "./BranchSellerInfoPanel";
import { normalizeRole } from "../../utils/role";

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
    const normalizedDepth = Math.max(quoteDepth, 40);

    return (normalizedHeight * quoteWidth * normalizedDepth * 169) / (100 * 25 * 30);
  };

  const monthlyQuote = getMonthlyQuote();

  useEffect(() => {
    fetchBranches();
  }, [refreshKey]);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
          <img src="/branches-icon.png" alt="Sucursales" className="w-8 h-8" />
          <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
            Sucursales
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
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
          <Typography.Paragraph className="mb-0 text-mobile-sm xl:text-desktop-sm text-gray-600">
            Usa la siguiente fórmula: <br />
            <Typography.Text code>
              (if([ALTO]&gt;180,180,[ALTO]) * [ANCHO] * if([PROFUNDIDAD]&lt;40,40,[PROFUNDIDAD])) * 169 / (100 * 25 * 30)
            </Typography.Text>
          </Typography.Paragraph>

          <Typography.Text className="block text-mobile-sm xl:text-desktop-sm text-gray-500">
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

            <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
              <Typography.Text className="block text-mobile-sm xl:text-desktop-sm text-gray-500 mb-1">
                Precio mensual
              </Typography.Text>
              <Typography.Title level={3} className="!mb-0">
                {monthlyQuote == null ? "—" : `Bs.${monthlyQuote.toFixed(2)}`}
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
