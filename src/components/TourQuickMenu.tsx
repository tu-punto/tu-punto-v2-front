import { Button, Popover, Typography } from "antd";
import { CompassOutlined } from "@ant-design/icons";
import { TourMenuList } from "../context/tourContext";

const TourQuickMenu = ({ compact = false }: { compact?: boolean }) => {
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={
        <div style={{ width: compact ? 300 : 340 }}>
          <div style={{ marginBottom: 12 }}>
            <Typography.Text strong>Tours rápidos</Typography.Text>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Repite ayudas guiadas para ubicarte dentro del sistema.
              </Typography.Text>
            </div>
          </div>
          <TourMenuList />
        </div>
      }
    >
      <Button
        type="text"
        aria-label="Tours rápidos"
        data-tour-id={compact ? "tour-quick-menu-trigger-mobile" : "tour-quick-menu-trigger-desktop"}
        style={{
          color: "#eaf5ff",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.22)",
          background: "rgba(255,255,255,0.08)",
          width: compact ? 40 : 44,
          height: compact ? 40 : 44,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CompassOutlined style={{ fontSize: compact ? 18 : 20, color: "#eaf5ff" }} />
      </Button>
    </Popover>
  );
};

export default TourQuickMenu;
