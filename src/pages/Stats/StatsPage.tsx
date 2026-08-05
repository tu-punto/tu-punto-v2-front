import { Button, Card, Empty, Spin } from "antd";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatisticsDashboard from "./StatsDashboard";
import ReportsLauncher from "../../components/ReportsLauncher";
import servicesIcon from "../../assets/services.png";
import branchIcon from "../../assets/branchIcon.svg";
import ServiciosResumenTable from "../Service/components/ServicesSummaryTable";
import { getServicesSummaryAPI } from "../../api/services";
import ActionTraceModal from "./ActionTraceModal";
import { UserContext } from "../../context/userContext";
import { isSuperadminUser } from "../../utils/role";
import "../Service/ServicePanelPage.css";

const StatsPage = () => {
  const navigate = useNavigate();
  const { user }: any = useContext(UserContext) || {};
  const canSeeActionTrace = isSuperadminUser(user);
  const [summary, setSummary] = useState<any | null>(null);
  const [sucursals, setSucursals] = useState<string[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [actionTraceOpen, setActionTraceOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSummary = async () => {
      try {
        setLoadingSummary(true);
        const data = await getServicesSummaryAPI();
        if (!mounted) return;
        const sucursalesFiltradas = Object.keys(data || {}).filter((s) => s !== "TOTAL");
        setSummary(data);
        setSucursals(sucursalesFiltradas);
      } catch (err) {
        if (!mounted) return;
        setSummary(null);
        setSucursals([]);
      } finally {
        if (mounted) setLoadingSummary(false);
      }
    };

    void loadSummary();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <div className="px-4 pt-4 flex justify-end gap-2 flex-wrap">
        <ReportsLauncher />
        <Button type="default" onClick={() => navigate("/servicesPage")} icon={<img src={servicesIcon} alt="Comunicados y Tutoriales" className="w-4 h-4" />}>
          Comunicados y Tutoriales
        </Button>
        {canSeeActionTrace ? (
          <Button type="default" onClick={() => setActionTraceOpen(true)}>
            Trazabilidad
          </Button>
        ) : null}
        <Button type="default" onClick={() => navigate("/branch")} icon={<img src={branchIcon} alt="Sucursales" className="w-4 h-4" />}>
          Sucursales
        </Button>
      </div>
      <ActionTraceModal open={actionTraceOpen} onClose={() => setActionTraceOpen(false)} />
      <StatisticsDashboard />
      <div className="p-2 space-y-2">
        <Card className="service-announcement-card" title="Resumen administrativo">
          {loadingSummary ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
              <Spin />
            </div>
          ) : summary && sucursals.length ? (
            <ServiciosResumenTable summary={summary} allSucursals={sucursals} />
          ) : (
            <Empty description="No se pudo cargar el resumen de servicios" />
          )}
        </Card>
      </div>
    </div>

  );
};
export default StatsPage;
