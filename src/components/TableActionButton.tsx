import { MouseEventHandler, ReactNode } from "react";
import { Button, Tooltip } from "antd";

interface TableActionButtonProps {
    title: string,
    onClick: MouseEventHandler,
    icon: ReactNode,
    backgroundColor?: string,
    color?: string
}

function TableActionButton({title, onClick, icon, backgroundColor, color}: TableActionButtonProps) {
    return (
        <Tooltip
            title={title}
            className="mx-0.5"
        >
            <Button
                type="default"
                onClick={onClick}
                icon={icon}
                className="text-mobile-sm xl:text-desktop-sm"
                style={{
                    backgroundColor,
                    color
                }}
            />
        </Tooltip>
    );
}

export default TableActionButton;