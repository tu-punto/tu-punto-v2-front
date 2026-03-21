import { Button } from "antd";
import { ReactNode } from "react";

type PageTemplateProps = {
    title: string,
    iconSrc?: string,
    children: ReactNode,
    actions?: FunctionButtonProps[]
}

export type FunctionButtonProps = {
    visible: boolean,
    title: string,
    onClick: () => void,
    icon?: ReactNode
}

function PageTemplate({ title, iconSrc = "/box-icon.png", children, actions = [] }: PageTemplateProps) {
    return (
        <>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 p-4 border-b border-gray-200">
                <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
                    <img src={iconSrc} alt={title} className="w-8 h-8" />
                    <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
                        {title}
                    </h1>
                </div>
                <div className="flex gap-3 items-center w-full md:w-auto">
                    {actions.map((act) => 
                        act.visible && (
                            <Button
                                key={act.title}
                                onClick={act.onClick}
                                type="primary"
                                className="text-mobile-sm xl:text-desktop-sm flex-1 md:flex-none"
                                icon={act.icon}
                            >
                                {act.title}
                            </Button>
                        )
                    )}
                </div>
            </div>

            {children}
        </>
    );
}

export default PageTemplate;