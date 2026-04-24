import { createPortal } from "react-dom";

const Modal = ({ children, onClose, contentClassName = "" }) => {
  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative z-10 w-full p-4 ${contentClassName}`}>{children}</div>
    </div>,
    modalRoot
  );
};

export default Modal;
