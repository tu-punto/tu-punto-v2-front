import { ReactNode } from "react";

type PageTemplateProps = {
    title: string,
    iconSrc?: string,
    children: ReactNode
}

function PageTemplate({ title, iconSrc = "/box-icon.png", children }: PageTemplateProps) {
    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
                    <img src={iconSrc} alt="Cierre de Caja" className="w-8 h-8" />
                    <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
                        {title}
                    </h1>
                </div>
            </div>

            {children}
        </>
    );
}

export default PageTemplate;