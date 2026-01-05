import { MouseEventHandler, ReactNode } from "react";
import { Button, Tooltip } from "antd";

interface TableActionButtonProps {
    title: string,
    onClick: MouseEventHandler,
    icon: ReactNode
}

function TableActionButton({title, onClick, icon}: TableActionButtonProps) {
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
            />
        </Tooltip>
    );
}

export default TableActionButton;