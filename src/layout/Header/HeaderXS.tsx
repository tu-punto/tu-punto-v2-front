import "./Header.css";
import logoImg from "../../../public/logo-no-letter-dark-bg.png";
import { useBranchHeaderInfo } from "../../hooks/useBranchHeaderInfo";

const HeaderXS = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const { sucursalNombre, sucursalImagenHeader, pillLabel } = useBranchHeaderInfo();

  const cardStyle = sucursalImagenHeader
    ? {
        backgroundImage: `linear-gradient(92deg, rgba(8,46,84,0.96) 0%, rgba(8,46,84,0.88) 56%, rgba(8,46,84,0.18) 100%), url(${sucursalImagenHeader})`,
      }
    : undefined;

  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-blue border-light-gray">
      <button className="tp-menu-btn" onClick={toggleSidebar} aria-label="Abrir menu">
        &#9776;
      </button>

      <div className="tp-brand-card tp-brand-card--mobile" style={cardStyle}>
        <img src={logoImg} alt="logo" className="tp-brand-card__logo tp-brand-card__logo--xs" />
        <div className="tp-brand-card__text">
          <h1 className="tp-brand-card__title tp-brand-card__title--xs">TU PUNTO</h1>
          <div className="tp-branch-pill tp-branch-pill--xs">
            <span className="tp-branch-pill__dot" />
            <span className="tp-branch-pill__label">{pillLabel}</span>
            <span className="tp-branch-pill__name">{sucursalNombre}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderXS;
