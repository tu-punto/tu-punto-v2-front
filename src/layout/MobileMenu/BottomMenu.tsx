import { Menu } from 'antd';
import { menu } from "../../constants/menu";
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../context/userContext";
import { Link } from 'react-router-dom';

const BottomMenu = () => {
    const { user } = useContext(UserContext)!;
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [plusMenuItems, setPlusMenuItems] = useState<any[]>([]);
    const [showPlusMenu, setShowPlusMenu] = useState(false);

    useEffect(() => {
        const filteredRoleMenuItems = menu.filter((item) =>
            item.roles.includes(user.role)
        )

        const bottomItems: any[] = [];
        const plusItems: any[] = [];

        filteredRoleMenuItems.forEach((item) => {
            if (["Pedidos", "Stock", "Vender"].includes(item.label)) {
                bottomItems.push(item)
            } else {
                plusItems.push(item)
            }
        })
        setMenuItems(bottomItems);
        setPlusMenuItems(plusItems);
    }, [user]);

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-blue shadow-lg">
            <Menu
                mode="horizontal"
                style={{ margin: 0, display: 'flex', justifyContent: 'space-around', backgroundColor: '#094f89' }}
            >
                {menuItems.map((item) => (
                    <Menu.Item key={item.path} style={{ flex: 1, textAlign: 'center' }}>
                        <Link
                            to={item.path}
                            className="flex flex-col items-center bg-blue hover:bg-light-blue/10 transition-colors duration-200 pt-4"
                        >
                            <img src={item.icon} alt={item.label} className="w-6 h-6 mb-1" />
                            <p className='text-gray-200'>{item.label}</p>
                        </Link>
                    </Menu.Item>
                ))}
                <Menu.Item key="plus" style={{ flex: 1, textAlign: 'center' }} onClick={() => setShowPlusMenu(!showPlusMenu)}>
                    {showPlusMenu ? (
                        <div className="flex flex-col items-center bg-blue hover:bg-light-blue/10 transition-colors duration-200 pt-4">
                            <img src="src/assets/minusIcon.svg" alt="Más" className="w-6 h-6 mb-1" />
                            <p className='text-gray-200'>Menos</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center bg-blue hover:bg-light-blue/10 transition-colors duration-200 pt-4">
                            <img src="src/assets/plusIcon.svg" alt="Más" className="w-6 h-6 mb-1" />
                            <p className='text-gray-200'>Más</p>
                        </div>
                    )}
                </Menu.Item>
            </Menu>
            {showPlusMenu && (
                <div className="bg-blue-300 p-2">
                    {plusMenuItems.map((item) => (
                        <Link
                            to={item.path}
                            key={item.path}
                            className="flex flex-col items-center bg-blue hover:bg-light-blue/10 transition-colors duration-200  pt-4"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BottomMenu;
