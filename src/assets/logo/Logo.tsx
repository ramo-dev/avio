import logosvg from "./Logo.svg?url";

export const Logo = ({ className }: { className: string }) => {
	return <img src={logosvg} alt="Logo" className={className} />;
};
