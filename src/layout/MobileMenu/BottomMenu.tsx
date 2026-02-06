import { Menu } from "antd";
import { menu } from "../../constants/menu";
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../context/userContext";
import { Link, useLocation } from "react-router-dom";
import plusIcon from "../../assets/plusIcon.svg";
import minusIcon from "../../assets/minusIcon.svg";
import "./bottom-menu.css";

const BottomMenu = () => {
    const { user } = useContext(UserContext)!;
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [plusMenuItems, setPlusMenuItems] = useState<any[]>([]);
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const filtered = menu.filter(i => i.roles.includes(user.role));
        const bottom: any[] = [];
        const plus: any[] = [];
        filtered.forEach(i => (["Pedidos","Stock","Vender"].includes(i.label) ? bottom : plus).push(i));
        setMenuItems(bottom);
        setPlusMenuItems(plus);
    }, [user]);

    useEffect(() => setShowPlusMenu(false), [location.pathname]);

    return (
        <div
            className="fixed bottom-0 left-0 right-0 shadow-lg z-40"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <div className="relative bottom-menu">
                {showPlusMenu && (
                    <div className="absolute bottom-full left-0 right-0 z-50 bg-[#0a5aa3] rounded-t-xl shadow-2xl p-3 pb-4 border-t border-white/10">
                        <div className="grid grid-cols-2 gap-2">
                            {plusMenuItems.map(item => {
                                const active = location.pathname.startsWith(item.path);
                                return (
                                    <Link
                                        to={item.path}
                                        key={item.path}
                                        className={`rounded-xl px-4 py-3 text-gray-100 text-sm
                                ${active ? "bg-white/20" : "bg-white/10"}
                                hover:bg-white/15 active:bg-white/25 transition-colors`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                <Menu
                    mode="horizontal"
                    theme="dark"
                    disabledOverflow
                    className="!bg-[#094f89] !border-0 h-20"
                    selectable={false}
                >
                    {menuItems.map(item => {
                        const active = location.pathname.startsWith(item.path);
                        return (
                            <Menu.Item key={item.path} style={{ flex: 1, textAlign: "center", padding: 0 }}>
                                <Link
                                    to={item.path}
                                    className={`flex flex-col items-center justify-center h-20
                              px-3 gap-1.5 rounded-md transition-colors
                              ${active ? "bg-white/15" : "bg-transparent"}
                              hover:bg-white/10 active:bg-white/20`}
                                >
                                    <img src={item.icon} alt={item.label} className="w-7 h-7 mb-0.5" />
                                    <p className="text-gray-100 text-sm leading-none">{item.label}</p>
                                </Link>
                            </Menu.Item>
                        );
                    })}

                    <Menu.Item key="plus" style={{ flex: 1, textAlign: "center", padding: 0 }}>
                        <button
                            type="button"
                            onClick={() => setShowPlusMenu(v => !v)}
                            className={`flex flex-col items-center justify-center h-20
                          w-full px-3 gap-1.5 rounded-md transition-colors
                          ${showPlusMenu ? "bg-white/15" : "bg-transparent"}
                          hover:bg-white/10 active:bg-white/20`}
                        >
                            <img src={showPlusMenu ? minusIcon : plusIcon} alt="Más" className="w-7 h-7 mb-0.5" />
                            <p className="text-gray-100 text-sm leading-none">{showPlusMenu ? "Menos" : "Más"}</p>
                        </button>
                    </Menu.Item>
                </Menu>
            </div>
        </div>
    );
};

export default BottomMenu;
