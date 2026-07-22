import { useEffect, useState } from "react";
import { Button, Input, Modal, Space, Steps, Tag, Typography } from "antd";
import { CheckOutlined } from "@ant-design/icons";

const PRIMARY_REASONS = [
  { value: "no_lo_que_necesitaba", label: "El servicio no es lo que necesitaba ahora." },
  { value: "costo_alto", label: "No vendo lo suficiente para justificar el costo." },
  { value: "mejor_alternativa", label: "Encontré una alternativa mejor." },
  { value: "entregas_propia", label: "Prefiero hacer las entregas por mi cuenta." },
  { value: "poco_uso", label: "No utilizaba el servicio lo suficiente." },
  { value: "problemas_servicio", label: "Tuve problemas con el servicio o la atención." },
  { value: "problemas_plataforma", label: "Tuve problemas con la plataforma o la aplicación." },
  { value: "pausa_temporal", label: "Necesito una pausa temporal (volveré más adelante)." },
  { value: "cerrar_negocio", label: "Cerraré mi negocio." },
  { value: "otro", label: "Otro" },
];

const RETURN_OPTIONS = [
  { value: "muy_probable", label: "Muy probable" },
  { value: "probable", label: "Probable" },
  { value: "no_estoy_seguro", label: "No estoy seguro" },
  { value: "poco_probable", label: "Poco probable" },
  { value: "nunca", label: "Nunca" },
];

type DeclinePayload = {
  motivo_principal?: string;
  motivo_principal_otro?: string;
  probabilidad_retorno?: string;
  omitir_motivo_principal?: boolean;
  omitir_probabilidad_retorno?: boolean;
};

type Props = {
  open: boolean;
  loading?: boolean;
  title: string;
  description?: string;
  okText?: string;
  allowSkip?: boolean;
  onCancel: () => void;
  onConfirm: (payload: DeclinePayload) => Promise<void> | void;
};

const OptionCard = ({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative w-full overflow-hidden rounded-2xl border bg-white p-4 text-left outline-none transition-all duration-200 focus:outline-none focus-visible:outline-none ${
      active
        ? "!border-blue-500 bg-blue-50 ring-2 ring-blue-500 shadow-[0_12px_30px_rgba(59,130,246,0.12)]"
        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
    }`}
  >
    {active ? <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" /> : null}
    <div className="flex items-start gap-3">
      {active ? (
        <div className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
          <CheckOutlined style={{ fontSize: 10 }} />
        </div>
      ) : null}
      <span className="text-sm leading-6 text-slate-800">{label}</span>
    </div>
  </button>
);

export default function DeclineServiceReasonModal({
  open,
  loading,
  title,
  description,
  okText = "Confirmar",
  allowSkip = false,
  onCancel,
  onConfirm,
}: Props) {
  const [step, setStep] = useState(0);
  const [primaryReason, setPrimaryReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [omittedPrimary, setOmittedPrimary] = useState(false);
  const [omittedReturn, setOmittedReturn] = useState(false);

  const selectedPrimary = PRIMARY_REASONS.find((option) => option.value === primaryReason);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setPrimaryReason("");
      setOtherReason("");
      setReturnReason("");
      setOmittedPrimary(false);
      setOmittedReturn(false);
    }
  }, [open]);

  const handlePrimarySelect = (value: string) => {
    setPrimaryReason(value);
    setOmittedPrimary(false);
    if (value !== "otro") {
      setOtherReason("");
    }
  };

  const handleReturnSelect = (value: string) => {
    setReturnReason(value);
    setOmittedReturn(false);
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!primaryReason && !omittedPrimary) return;
      if (primaryReason === "otro" && !otherReason.trim() && !omittedPrimary) return;
      setStep(1);
      return;
    }

    if (!returnReason && !omittedReturn) return;

    await onConfirm({
      motivo_principal: primaryReason || undefined,
      motivo_principal_otro: primaryReason === "otro" ? otherReason.trim() || undefined : undefined,
      probabilidad_retorno: returnReason || undefined,
      omitir_motivo_principal: omittedPrimary,
      omitir_probabilidad_retorno: omittedReturn,
    });
  };

  const handleSkip = async () => {
    if (!allowSkip) return;

    if (step === 0) {
      setOmittedPrimary(true);
      setPrimaryReason("");
      setOtherReason("");
      setStep(1);
      return;
    }

    setOmittedReturn(true);
    await onConfirm({
      motivo_principal: primaryReason || undefined,
      motivo_principal_otro: primaryReason === "otro" ? otherReason.trim() || undefined : undefined,
      probabilidad_retorno: returnReason || undefined,
      omitir_motivo_principal: omittedPrimary,
      omitir_probabilidad_retorno: true,
    });
  };

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      footer={null}
      width={860}
      destroyOnClose
      centered
      className="decline-service-modal"
      styles={{ body: { paddingTop: 18 } }}
    >
      {description ? (
        <Typography.Paragraph type="secondary" className="mb-5">
          {description}
        </Typography.Paragraph>
      ) : null}

      <Steps
        current={step}
        size="small"
        items={[{ title: "Motivo" }, { title: "Retorno en 6 meses" }]}
        className="mb-6"
      />

      <div>
        {step === 0 && (
          <div className="space-y-5">
            <div className="text-sm font-medium text-slate-700">
              Cual es el motivo principal por el que dejas el servicio?
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRIMARY_REASONS.map((option) => (
                <OptionCard
                  key={option.value}
                  active={primaryReason === option.value}
                  label={option.label}
                  onClick={() => handlePrimarySelect(option.value)}
                />
              ))}
            </div>

            {primaryReason === "otro" ? (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700">Especifica el motivo</div>
                <Input.TextArea
                  rows={3}
                  maxLength={250}
                  showCount
                  placeholder="Describe el motivo"
                  value={otherReason}
                  onChange={(event) => setOtherReason(event.target.value)}
                />
              </div>
            ) : null}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="text-sm font-medium text-slate-700">
              Que tan probable es que retorne al servicio en los siguientes 6 meses?
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {RETURN_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  active={returnReason === option.value}
                  label={option.label}
                  onClick={() => handleReturnSelect(option.value)}
                />
              ))}
            </div>

            {selectedPrimary ? (
              <Tag color="blue" className="rounded-full px-3 py-1">
                Seleccionaste: {selectedPrimary.label}
              </Tag>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Space>
          <Button onClick={onCancel}>Cancelar</Button>
          {allowSkip ? (
            <Button onClick={handleSkip} disabled={loading}>
              Omitir pregunta
            </Button>
          ) : null}
        </Space>

        <Space>
          {step > 0 ? (
            <Button onClick={() => setStep(0)} disabled={loading}>
              Volver
            </Button>
          ) : null}
          <Button
            type="primary"
            danger
            loading={loading}
            onClick={handleNext}
            disabled={step === 0 ? ((!primaryReason && !omittedPrimary) || (primaryReason === "otro" && !otherReason.trim() && !omittedPrimary)) : (!returnReason && !omittedReturn)}
          >
            {step === 0 ? "Continuar" : okText}
          </Button>
        </Space>
      </div>
    </Modal>
  );
}
