import { Layout } from "antd";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar/Sidebar";
import Header from "./Header/Header";
import { Outlet } from "react-router-dom";
import HeaderXS from "./Header/HeaderXS";
import Sider from "antd/es/layout/Sider";

const { Content } = Layout;

const AppLayout = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (!isMobile) setIsOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  return (
    <Layout className="flex min-h-screen w-full">
      {!isMobile ? (
        <Sider trigger={null} collapsible collapsed={!isOpen}>
          <Sidebar
            isOpen={isOpen}
            toggleSidebar={toggleSidebar}
            isMobile={isMobile}
          />
        </Sider>
      ) : (
        isOpen && (
          <div className="absolute z-50">
            <Sidebar
              isOpen={isOpen}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
            />
          </div>
        )
      )}

      <Layout>
        {isMobile ? <HeaderXS toggleSidebar={toggleSidebar} /> : <Header />}
        <Content className="flex flex-col bg-white p-6">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
