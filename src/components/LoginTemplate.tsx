import { Button } from "antd";
import logoImg from "/logo.png";
import LoginForm from "./LoginForm";

interface LoginTemplateProps {
    title: string,
    buttonTitle: string,
    buttonOnClick: () => void,
    showBranchSelect?: boolean,
    redirectTo: string
}

function LoginTemplate({ title, buttonTitle, buttonOnClick, showBranchSelect = false, redirectTo }: LoginTemplateProps) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 bg-[url('/background-login.png')] bg-cover bg-center">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <img
                        alt="logo"
                        src={logoImg}
                        className="mx-auto h-20 w-auto rounded-full"
                    />
                    <h2 className="mt-6 text-mobile-2xl xl:text-desktop-3xl font-bold text-gray-900">
                        {title}
                    </h2>

                    {/* LoginForm revisar carga de sucursales - error */}
                    <LoginForm showBranchSelect={showBranchSelect} redirectTo={redirectTo} />

                    <div className="text-center">
                        <Button
                            type="default"
                            onClick={buttonOnClick}
                            className="w-full"
                        >
                            {buttonTitle}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginTemplate;