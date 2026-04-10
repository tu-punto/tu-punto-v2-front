import { Layout } from "antd";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar/Sidebar";
import Header from "./Header/Header";
import { Outlet } from "react-router-dom";
import HeaderXS from "./Header/HeaderXS";
import Sider from "antd/es/layout/Sider";
import BottomMenu from "./MobileMenu/BottomMenu";
import { useMediaQuery } from "../hooks/useMediaQuery";
import ServiceAnnouncementGate from "../components/ServiceAnnouncementGate";

const { Content } = Layout;

const AppLayout = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(prev => !prev);

  useEffect(() => {
    if (!isMobile) setIsOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMobile, isOpen]);

  return (
      <Layout className="flex min-h-screen w-full">
        {!isMobile && (
            <Sider
              trigger={null}
              collapsible
              collapsed={!isOpen}
              width={200}
              collapsedWidth={80}
              style={{ background: "#094f89" }}
            >
              <Sidebar
                  isOpen={isOpen}
                  toggleSidebar={toggleSidebar}
                  isMobile={false}
              />
            </Sider>
        )}

        <Layout>
          {isMobile ? <HeaderXS toggleSidebar={toggleSidebar} /> : <Header />}
          {isMobile && (
              <>
                <button
                    aria-label="Cerrar menú"
                    onClick={() => setIsOpen(false)}
                    className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
                        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                />
                <div
                    className={`fixed inset-y-0 left-0 z-50 w-[200px] max-w-[85%] bg-blue transform transition-transform ${
                        isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                  <Sidebar
                      isOpen={isOpen}
                      toggleSidebar={toggleSidebar}
                      isMobile={true}
                  />
                </div>
              </>
          )}
          <Content className={`flex flex-col bg-white p-6 ${isMobile ? "pb-28" : ""}`}>
            <Outlet />
          </Content>

          <ServiceAnnouncementGate />

          {isMobile && <BottomMenu />}
        </Layout>
      </Layout>
  );
};

export default AppLayout;
